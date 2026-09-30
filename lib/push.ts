import webpush from "web-push";
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
          "\"notify me when ready\" will silently do nothing until these are configured. See README env var table."
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

const SUBS_COLLECTION = "auditJobPushSubs";

/** Stored keyed by jobId (not uid) — the notify-me flow works for
 * anonymous, non-signed-in visitors too, since a background audit job
 * has no requirement to be signed in. */
export async function savePushSubscription(jobId: string, token: string, subscription: StoredPushSubscription): Promise<void> {
  const db = adminDb();
  await db.collection(SUBS_COLLECTION).doc(jobId).set(
    { token, subscription, savedAt: new Date().toISOString() },
    { merge: true }
  );
}

/** Sends the "your audit is ready" push and deletes the subscription
 * immediately after — this is a one-shot notification tied to a single
 * job, not a recurring subscription, so there's nothing to keep around
 * once it's been used (or once the job is done and no notify-me
 * subscription was ever registered for it, in which case this is a
 * harmless no-op read). */
export async function sendJobReadyPush(jobId: string, hostname: string, ok: boolean): Promise<void> {
  if (!ensureConfigured()) return;
  const db = adminDb();
  const ref = db.collection(SUBS_COLLECTION).doc(jobId);
  const snap = await ref.get();
  if (!snap.exists) return; // nobody opted in for this job — nothing to do

  const data = snap.data() as { subscription: StoredPushSubscription };
  const payload = JSON.stringify({
    title: ok ? "Your Audityxe audit is ready" : "Your Audityxe audit hit a problem",
    body: ok ? `The audit of ${hostname} finished — tap to see the full report.` : `The audit of ${hostname} couldn't complete. Tap to see why.`,
    jobId,
  });

  try {
    await webpush.sendNotification(data.subscription as unknown as webpush.PushSubscription, payload);
  } catch (err) {
    // A 404/410 means the browser unsubscribed (e.g. the user cleared
    // site data) — expected and not worth logging as an error. Anything
    // else is logged but never thrown: a failed notification must never
    // take down the audit job it's reporting on.
    const status = (err as { statusCode?: number })?.statusCode;
    if (status !== 404 && status !== 410) {
      console.error("[push] sendNotification failed:", err);
    }
  } finally {
    await ref.delete();
  }
}
