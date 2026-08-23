import { NextRequest } from "next/server";
import { adminAuth } from "./firebase/admin";
import { DecodedIdentity } from "./rate-limit";

export class AuthError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 401, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

interface RequireAuthOptions {
  /** If true, also rejects (403) accounts that haven't verified their
   * email yet. Used to gate the actual audit tool — kept optional so
   * read-only endpoints (account status, report history) still work for
   * an unverified user while they're waiting on that email. */
  requireEmailVerified?: boolean;
}

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>`.
 * Throws AuthError (401) if missing/invalid — callers should catch and
 * return a JSON 401 response, never let this crash the route.
 */
export async function requireAuth(req: NextRequest, options: RequireAuthOptions = {}): Promise<DecodedIdentity> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    throw new AuthError("Sign in to use Audityxe.");
  }

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token);
  } catch {
    throw new AuthError("Your session has expired. Please sign in again.");
  }

  if (options.requireEmailVerified && !decoded.email_verified) {
    throw new AuthError(
      "Please verify your email before running an audit — check your inbox for the verification link.",
      403,
      "EMAIL_NOT_VERIFIED"
    );
  }

  return { uid: decoded.uid, email: decoded.email || null };
}
