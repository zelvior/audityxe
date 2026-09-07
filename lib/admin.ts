import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { DecodedIdentity } from "./rate-limit";
import { AuthError } from "./auth-server";
import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Comma-separated allowlist of admin emails — read strictly from
 * ADMIN_EMAILS. No hardcoded fallback: if it's unset, the allowlist is
 * empty and isAdminIdentity() rejects everyone, rather than silently
 * granting access to some baked-in address.
 */
function adminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function isAdminIdentity(identity: DecodedIdentity): boolean {
  if (!identity.email || !identity.emailVerified) return false;
  const emails = adminEmails();
  if (emails.length === 0) return false; // ADMIN_EMAILS not configured — deny everyone
  return emails.includes(identity.email.toLowerCase());
}

function checkAdminPassword(req: NextRequest): boolean {
  const configured = process.env.ADMIN_PASSWORD || "";
  if (!configured) return false; // not configured — never silently allow

  const supplied = req.headers.get("x-admin-password") || "";
  if (!supplied) return false;

  // Direct constant-time comparison of the raw strings — no hashing
  // involved. timingSafeEqual just prevents the comparison itself from
  // leaking how many leading characters matched via response time; it
  // requires equal-length buffers, so a length mismatch is checked
  // (and rejected) separately first.
  const a = Buffer.from(supplied, "utf8");
  const b = Buffer.from(configured, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const MAX_PASSWORD_ATTEMPTS_PER_HOUR = 8;

/** Atomic per-uid attempt counter so a stolen/guessed admin-page URL
 * can't be brute-forced against the password even by an already
 * authenticated (but non-admin) account. Resets hourly. */
async function checkPasswordAttemptBudget(uid: string): Promise<boolean> {
  const db = adminDb();
  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
  const ref = db.collection("admin_password_attempts").doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const count = data?.hour === hourKey ? (data.count as number) || 0 : 0;
    if (count >= MAX_PASSWORD_ATTEMPTS_PER_HOUR) return false;
    tx.set(ref, { hour: hourKey, count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
}

/** Full admin gate: verified email on the allowlist AND the correct
 * shared admin password header. Both are required — neither alone is
 * sufficient. Password attempts are rate-limited per-uid to block
 * brute-forcing even from an authenticated but non-admin account. */
export async function requireAdmin(identity: DecodedIdentity, req: NextRequest): Promise<void> {
  if (!isAdminIdentity(identity)) {
    throw new AuthError("Admin access required.", 403, "NOT_ADMIN");
  }
  const withinBudget = await checkPasswordAttemptBudget(identity.uid);
  if (!withinBudget) {
    throw new AuthError("Too many admin password attempts. Try again later.", 429, "RATE_LIMITED");
  }
  if (!checkAdminPassword(req)) {
    throw new AuthError("Admin password required or incorrect.", 403, "BAD_ADMIN_PASSWORD");
  }
}

