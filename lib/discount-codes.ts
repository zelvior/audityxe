import { adminDb } from "./firebase/admin";
import { FieldValue, Timestamp, QueryDocumentSnapshot, Transaction } from "firebase-admin/firestore";
import { PlanId } from "./plans";

/**
 * Redeem codes are managed entirely from /admin (or directly in
 * Firestore if you prefer) at redeemCodes/{CODE}:
 *
 *   active: boolean            — set false to disable without deleting
 *   plan: "standard" | "pro"   — plan granted on redemption
 *   durationDays: number       — e.g. 30 or 365
 *   maxRedemptions: number     — total redemptions allowed across all users
 *   redemptions: number        — start at 0, incremented automatically
 *   expiresAt: Timestamp|null  — optional hard expiry for the code itself
 *   perUserOnce: boolean       — default true; if true, a uid can only
 *                                redeem this exact code once
 *
 * Codes are redeemed instantly on /account for immediate access — built
 * for giveaways and comps (e.g. "first 50 people on the launch post get
 * a free month of Pro"). There used to also be a percent_off code type
 * applied manually at checkout, but there's no self-serve checkout flow
 * left for it to plug into (NOWPayments' hosted invoice charges exactly
 * the advertised price), so that type was removed rather than kept
 * half-wired to a checkout path that no longer exists.
 */

export interface RedeemCodeDoc {
  code: string;
  active: boolean;
  plan: PlanId;
  durationDays: number;
  maxRedemptions: number;
  redemptions: number;
  expiresAt: string | null;
  perUserOnce: boolean;
  createdAt: string | null;
  note: string | null;
}

function randomCode(length = 8): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export interface CreateCodeInput {
  code?: string; // auto-generated if omitted
  plan: PlanId;
  durationDays: number;
  maxRedemptions: number;
  expiresAt?: string | null;
  perUserOnce?: boolean;
  note?: string | null;
}

function validateCreateInput(input: CreateCodeInput) {
  if (!input.plan || !["standard", "pro"].includes(input.plan)) throw new Error("Invalid plan.");
  if (!Number.isInteger(input.maxRedemptions) || input.maxRedemptions <= 0 || input.maxRedemptions > 1_000_000) {
    throw new Error("Max redemptions must be a whole number between 1 and 1,000,000.");
  }
  if (!Number.isInteger(input.durationDays) || input.durationDays <= 0 || input.durationDays > 3650) {
    throw new Error("Duration must be a whole number of days between 1 and 3650.");
  }
}

function normalizeCode(raw: string): string {
  // Firestore doc IDs can't contain "/", and "." or ".." mid-segment are
  // problematic — strip everything except A-Z0-9-_ so a code can never
  // be crafted to touch an unrelated document.
  return raw.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 40);
}

/** Creates a new redeem code doc, retrying with a fresh random code on
 * the rare collision when auto-generating. */
export async function createRedeemCode(input: CreateCodeInput): Promise<RedeemCodeDoc> {
  validateCreateInput(input);

  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const parsed = new Date(input.expiresAt);
    if (isNaN(parsed.getTime())) throw new Error("Invalid expiry date.");
    expiresAt = parsed.toISOString();
  }

  // Strip control characters and cap length — this is stored as plain
  // data (never interpolated into HTML, a query, or a shell command) but
  // sanitized anyway so nothing downstream that later renders it raw can
  // be abused.
  const note = input.note ? input.note.replace(/[\x00-\x1F\x7F]/g, "").trim().slice(0, 200) || null : null;

  let code = input.code ? normalizeCode(input.code) : "";
  if (input.code && !code) throw new Error("Code must contain only letters, numbers, - or _.");
  if (code.length > 0 && code.length < 3) throw new Error("Code must be at least 3 characters.");
  if (code === "." || code === "..") throw new Error("That code isn't allowed.");

  for (let attempt = 0; attempt < 5; attempt++) {
    if (!code) code = randomCode();
    const ref = adminDb().collection("redeemCodes").doc(code);
    const snap = await ref.get();
    if (snap.exists) {
      if (input.code) throw new Error("That code already exists.");
      code = ""; // regenerate and retry
      continue;
    }
    const doc = {
      active: true,
      plan: input.plan,
      durationDays: input.durationDays,
      maxRedemptions: input.maxRedemptions,
      redemptions: 0,
      expiresAt,
      perUserOnce: input.perUserOnce !== false,
      note,
      createdAt: new Date().toISOString(),
    };
    await ref.set(doc);
    return { code, ...doc };
  }
  throw new Error("Couldn't generate a unique code. Please try again.");
}

/** Generates `count` single-use redeem codes in one call, sharing the
 * same plan/duration/note — for giveaways where you want a batch of
 * distinct one-time codes (e.g. 50 for a YouTube giveaway) instead of
 * one shared code everyone redeems. */
export async function createRedeemCodeBatch(
  count: number,
  base: Omit<CreateCodeInput, "code" | "maxRedemptions" | "perUserOnce">
): Promise<RedeemCodeDoc[]> {
  if (!Number.isInteger(count) || count <= 0 || count > 500) {
    throw new Error("Batch size must be a whole number between 1 and 500.");
  }
  validateCreateInput({ ...base, maxRedemptions: 1 });

  const results: RedeemCodeDoc[] = [];
  for (let i = 0; i < count; i++) {
    // Sequential, not parallel — each createRedeemCode() call needs to
    // see the previous ones' writes to avoid generating duplicate codes.
    const doc = await createRedeemCode({ ...base, maxRedemptions: 1, perUserOnce: true });
    results.push(doc);
  }
  return results;
}

export async function listRedeemCodes(): Promise<RedeemCodeDoc[]> {
  const db = adminDb();
  const snap = await db.collection("redeemCodes").orderBy("createdAt", "desc").get();
  return snap.docs.map((d: QueryDocumentSnapshot) => {
    const data = d.data();
    const expiresAt = data.expiresAt instanceof Timestamp ? data.expiresAt.toDate().toISOString() : data.expiresAt || null;
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt || null;
    return {
      code: d.id,
      active: data.active !== false,
      plan: data.plan,
      durationDays: typeof data.durationDays === "number" ? data.durationDays : 30,
      maxRedemptions: data.maxRedemptions,
      redemptions: data.redemptions || 0,
      expiresAt,
      perUserOnce: data.perUserOnce !== false,
      note: data.note || null,
      createdAt,
    };
  });
}

export async function setRedeemCodeActive(code: string, active: boolean): Promise<void> {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error("Invalid code.");
  const db = adminDb();
  const ref = db.collection("redeemCodes").doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Code not found.");
  await ref.set({ active }, { merge: true });
}

export async function deleteRedeemCode(code: string): Promise<void> {
  const normalized = normalizeCode(code);
  if (!normalized) throw new Error("Invalid code.");
  const db = adminDb();
  await db.collection("redeemCodes").doc(normalized).delete();
}

export interface RedeemResult {
  ok: boolean;
  error?: string;
  plan?: PlanId;
  planExpiresAt?: string | null;
}

export async function redeemCode(uid: string, rawCode: string): Promise<RedeemResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "Enter a redeem code." };

  const db = adminDb();
  const codeRef = db.collection("redeemCodes").doc(code);
  const redemptionRef = codeRef.collection("redemptions").doc(uid);
  const userRef = db.collection("users").doc(uid);

  try {
    return await db.runTransaction(async (tx: Transaction) => {
      const [codeSnap, redemptionSnap] = await Promise.all([tx.get(codeRef), tx.get(redemptionRef)]);

      if (!codeSnap.exists) return { ok: false, error: "That code isn't valid." };
      const data = codeSnap.data()!;

      if (data.active === false) return { ok: false, error: "That code is no longer active." };

      const expiresAt: Date | null =
        data.expiresAt instanceof Timestamp ? data.expiresAt.toDate() : data.expiresAt ? new Date(data.expiresAt) : null;
      if (expiresAt && expiresAt.getTime() < Date.now()) {
        return { ok: false, error: "That code has expired." };
      }

      const maxRedemptions: number = typeof data.maxRedemptions === "number" ? data.maxRedemptions : Infinity;
      const redemptions: number = typeof data.redemptions === "number" ? data.redemptions : 0;
      if (redemptions >= maxRedemptions) {
        return { ok: false, error: "That code has reached its redemption limit." };
      }

      const perUserOnce = data.perUserOnce !== false;
      if (perUserOnce && redemptionSnap.exists) {
        return { ok: false, error: "You've already redeemed this code." };
      }

      const plan: PlanId | undefined = data.plan;
      if (!plan || !["standard", "pro"].includes(plan)) {
        return { ok: false, error: "That code is misconfigured — contact support." };
      }

      const durationDays: number = typeof data.durationDays === "number" ? data.durationDays : 30;
      const now = Date.now();
      const userSnap = await tx.get(userRef);
      const currentExpiry = userSnap.data()?.planExpiresAt;
      const currentExpiryDate =
        currentExpiry instanceof Timestamp ? currentExpiry.toDate() : currentExpiry ? new Date(currentExpiry) : null;
      // Stack onto remaining time if the account already has this-or-better
      // active access, instead of silently shortening it.
      const base = currentExpiryDate && currentExpiryDate.getTime() > now ? currentExpiryDate.getTime() : now;
      const newExpiry = new Date(base + durationDays * 24 * 60 * 60 * 1000);

      tx.set(userRef, { plan, planExpiresAt: newExpiry.toISOString() }, { merge: true });
      tx.set(redemptionRef, { redeemedAt: FieldValue.serverTimestamp() });
      tx.set(codeRef, { redemptions: redemptions + 1 }, { merge: true });

      return { ok: true, plan, planExpiresAt: newExpiry.toISOString() };
    });
  } catch {
    return { ok: false, error: "Something went wrong redeeming that code. Please try again." };
  }
}
