import { createHash } from "crypto";
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "./firebase/admin";

/**
 * Real Web Push notifications — the part of "leave the page, get
 * notified when it's ready" that still works after the browser itself is
 * fully closed, not just backgrounded. A backgrounded/polling tab alone
 * can't do that: once every tab is closed there's no JS left running to
 * poll anything. A push message wakes the browser's own push service
 * (independent of Audityxe's uptime) which hands it to public/sw.js.
 *
 * Requires three env vars — generate a keypair once with
 * `npx web-push generate-vapid-keys` and set:
 *   WEB_PUSH_VAPID_PUBLIC_KEY   (also exposed to the client as
 *                                 NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY)
 *   WEB_PUSH_VAPID_PRIVATE_KEY  (server-only, never exposed to the client)
 *   WEB_PUSH_VAPID_SUBJECT      (a mailto: or https: contact URL — required
 *                                 by the Push protocol, shown to push
 *                                 services, never to the end user)
 * Degrades to a clean no-op (logged once) if unset, rather than crashing
 * every audit that happens not to use the notify-me option.
 */

let configured = false;
let warnedOnce = false;

/**
 * Exported so /api/push/subscribe can check this *before* accepting a
 * subscription, rather than only discovering the misconfiguration later
 * inside sendJobReadyPush (by which point the client has already shown
 * the person a false "you're all set, we'll notify you" success state
 * that can never actually fire — a subscription record would exist,
 * but no push would ever be sent). Two separate env vars can each be
 * missing independently (the public key is also read by the client via
 * NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY, so it's easy to set that one
 * and forget the two server-only ones), so this needs to be checked at
 * the point of subscribing, not assumed from the client-side key alone.
 */
export function isPushConfigured(): boolean {
  return ensureConfigured();
}

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    if (!warnedOnce) {
      console.warn(
        "[push] WEB_PUSH_VAPID_PUBLIC_KEY / WEB_PUSH_VAPID_PRIVATE_KEY / WEB_PUSH_VAPID_SUBJECT not fully set — " +
          "audit-complete notifications will silently do nothing until these are configured. See README env var table."
      );
      warnedOnce = true;
    }
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface StoredPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// One document per account, holding every device/browser that account
// has enabled notifications on — so an audit finishing always reaches
// the person, regardless of which tab/device started it or whether any
// tab is still open. Notifications are a required part of onboarding
// (see components/PushGate.tsx), so there is no per-audit opt-in.
const SUBS_COLLECTION = "pushSubscriptions";
const MAX_DEVICES_PER_USER = 10;

function subKey(endpoint: string): string {
  return createHash("sha1").update(endpoint).digest("hex");
}

interface SubsDoc {
  subscriptions?: Record<string, StoredPushSubscription & { savedAt: string }>;
}

export async function savePushSubscription(uid: string, subscription: StoredPushSubscription): Promise<void> {
  const db = adminDb();
  const ref = db.collection(SUBS_COLLECTION).doc(uid);
  const snap = await ref.get();
  const existing = ((snap.data() as SubsDoc | undefined)?.subscriptions ?? {}) as NonNullable<SubsDoc["subscriptions"]>;
  const key = subKey(subscription.endpoint);
  const next = {
    ...existing,
    [key]: {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      savedAt: new Date().toISOString(),
    },
  };
  const entries = Object.entries(next).sort((a, b) => b[1].savedAt.localeCompare(a[1].savedAt)).slice(0, MAX_DEVICES_PER_USER);
  await ref.set({ subscriptions: Object.fromEntries(entries), updatedAt: new Date().toISOString() });
}

export interface AuditPushInput {
  hostname: string;
  ok: boolean;
  score?: number | null;
  /** Present only for background-job audits — lets the notification
   * tap reopen that exact result. The push payload is end-to-end
   * encrypted to the subscribing browser, so carrying the job token in
   * it does not expose it to anyone else. */
  jobId?: string;
  token?: string;
}

/** Sends the "audit finished" push to every device the account has
 * enabled notifications on. Never throws — a failed notification must
 * never take down the audit it's reporting on. */
export async function sendAuditPush(uid: string | null | undefined, input: AuditPushInput): Promise<void> {
  if (!uid || !ensureConfigured()) return;
  try {
    const db = adminDb();
    const ref = db.collection(SUBS_COLLECTION).doc(uid);
    const snap = await ref.get();
    if (!snap.exists) return;
    const subs = (snap.data() as SubsDoc).subscriptions ?? {};
    const entries = Object.entries(subs);
    if (entries.length === 0) return;

    const url = input.jobId && input.token ? `/?job=${encodeURIComponent(input.jobId)}&token=${encodeURIComponent(input.token)}` : "/";
    const payload = JSON.stringify({
      title: input.ok ? "Your Audityxe audit is ready" : "Your Audityxe audit hit a problem",
      body: input.ok
        ? input.score != null
          ? `${input.hostname} scored ${input.score.toFixed(1)}/10 — tap to see the full report.`
          : `The audit of ${input.hostname} finished — tap to see the full report.`
        : `The audit of ${input.hostname} couldn't complete. Tap to see why.`,
      tag: `audit-${input.jobId || Date.now()}`,
      url,
    });

    const dead: string[] = [];
    await Promise.all(
      entries.map(async ([key, sub]) => {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys } as webpush.PushSubscription, payload);
        } catch (err) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) dead.push(key);
          else console.error("[push] sendNotification failed:", err);
        }
      })
    );

    if (dead.length) {
      const update: Record<string, unknown> = {};
      for (const key of dead) update[`subscriptions.${key}`] = FieldValue.delete();
      await ref.update(update).catch(() => {});
    }
  } catch (err) {
    console.error("[push] sendAuditPush failed:", err);
  }
}

export async function deletePushSubscriptions(uid: string): Promise<void> {
  await adminDb().collection(SUBS_COLLECTION).doc(uid).delete();
}
