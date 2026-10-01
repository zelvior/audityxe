import { NextRequest } from "next/server";

/**
 * CSRF defense-in-depth. Auth here is a Bearer token (Firebase ID token),
 * not an ambient cookie, so classic CSRF isn't directly exploitable — but
 * we still verify Origin/Referer on state-changing requests in case a
 * future change adds cookie-based auth, and to reject cross-site fetches
 * outright.
 */
export function isTrustedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return false;

  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  // No Origin/Referer at all (some non-browser tools) — allow, since the
  // Bearer token is still required and is the real access control here.
  return true;
}

const BOT_UA_PATTERN =
  /curl|wget|python-requests|scrapy|headlesschrome|phantomjs|bot(?!$)|spider|crawler/i;

/**
 * Heuristic bot detection for abuse-prone endpoints. Not a hard block —
 * used to flag traffic for extra scrutiny (e.g. tighter rate limit)
 * rather than rejecting outright, since legitimate tools sometimes carry
 * generic UAs too.
 */
export function looksLikeBot(req: NextRequest): boolean {
  const ua = req.headers.get("user-agent") || "";
  if (!ua) return true;
  return BOT_UA_PATTERN.test(ua);
}
