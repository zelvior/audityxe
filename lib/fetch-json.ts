/**
 * Wraps fetch() + response.json() so a non-JSON response (an HTML error
 * page from a 404/500/crashed function, a proxy error page, etc.) never
 * surfaces as a raw "Unexpected token '<'" parse error to the user.
 * Always returns a result object instead of throwing for HTTP-level
 * problems — only a genuine network failure (offline, DNS, CORS) still
 * throws, which callers should keep wrapping in try/catch as before.
 *
 * This is the single shared base for every frontend call to our own
 * API — every component calls fetchJson("/api/...") rather than
 * constructing a URL by hand, so the origin, credential policy, and
 * host allowlist below apply everywhere at once instead of being a
 * convention each call site has to remember on its own.
 */

// Same-origin by default — every real call site passes a relative
// path ("/api/..."), so this only matters for the escape hatch below.
// Overridable via env for a preview/staging deployment that legitimately
// needs to call a different API host; never anything user-influenced.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// If a caller ever passes a full URL instead of a relative path, it
// must resolve to one of these hosts — closes off the SSRF-via-fetch
// shape (an attacker-influenced value reaching fetchJson and pointing
// it at an internal or third-party host) even though nothing in this
// codebase currently constructs a dynamic URL for this function. This
// is defense in depth for future call sites, not a fix for an found bug.
const ALLOWED_HOSTS = new Set<string>(
  [
    typeof window !== "undefined" ? window.location.host : null,
    API_BASE_URL ? (() => {
      try {
        return new URL(API_BASE_URL).host;
      } catch {
        return null;
      }
    })() : null,
  ].filter((h): h is string => !!h)
);

function resolveUrl(input: string): string | null {
  // Relative path — the normal, expected case. Resolved against
  // API_BASE_URL so an override actually takes effect, same-origin
  // otherwise.
  if (input.startsWith("/")) return `${API_BASE_URL}${input}`;
  // A full URL was passed — only allow it through if its host is one
  // we already trust; reject anything else rather than blindly fetching it.
  try {
    const u = new URL(input, typeof window !== "undefined" ? window.location.href : undefined);
    if (!ALLOWED_HOSTS.has(u.host)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export interface SafeJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function fetchJson<T = any>(input: string, init?: RequestInit): Promise<SafeJsonResult<T>> {
  const url = resolveUrl(input);
  if (!url) {
    return { ok: false, status: 0, data: null, error: "Blocked an API request to an untrusted host." };
  }

  const res = await fetch(url, {
    // Same-origin by default so a cookie/session never rides along to
    // an unexpected host even if a future call site passes a full URL
    // — explicit callers can still override this via init.credentials.
    credentials: "same-origin",
    ...init,
  });
  const contentType = res.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    // The server returned something that isn't JSON at all — most often
    // an HTML error page. Surface the real status code instead of
    // letting res.json() throw a confusing parse error.
    return {
      ok: false,
      status: res.status,
      data: null,
      error: `Server returned an unexpected response (status ${res.status}). Please try again shortly.`,
    };
  }

  try {
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: (data as any)?.error || `Request failed (status ${res.status}).` };
    }
    return { ok: true, status: res.status, data, error: null };
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: "The server's response couldn't be read. Please try again.",
    };
  }
}
