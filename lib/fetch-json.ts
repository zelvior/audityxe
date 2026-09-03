/**
 * Wraps fetch() + response.json() so a non-JSON response (an HTML error
 * page from a 404/500/crashed function, a proxy error page, etc.) never
 * surfaces as a raw "Unexpected token '<'" parse error to the user.
 * Always returns a result object instead of throwing for HTTP-level
 * problems — only a genuine network failure (offline, DNS, CORS) still
 * throws, which callers should keep wrapping in try/catch as before.
 */
export interface SafeJsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}

export async function fetchJson<T = any>(input: string, init?: RequestInit): Promise<SafeJsonResult<T>> {
  const res = await fetch(input, init);
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
