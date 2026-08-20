import { NextRequest } from "next/server";
import { adminAuth } from "./firebase/admin";
import { DecodedIdentity } from "./rate-limit";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the Firebase ID token sent as `Authorization: Bearer <token>`.
 * Throws AuthError (401) if missing/invalid — callers should catch and
 * return a JSON 401 response, never let this crash the route.
 */
export async function requireAuth(req: NextRequest): Promise<DecodedIdentity> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;

  if (!token) {
    throw new AuthError("Sign in to use Audityxe.");
  }

  try {
    const decoded = await adminAuth().verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email || null };
  } catch {
    throw new AuthError("Your session has expired. Please sign in again.");
  }
}
