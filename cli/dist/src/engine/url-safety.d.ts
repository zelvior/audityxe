export declare class UnsafeUrlError extends Error {
    constructor(message: string);
}
/**
 * Validates that a URL is safe to fetch server-side: http(s) only, not a
 * blocked hostname, and — if it resolves via DNS — not a private/internal
 * IP. Throws UnsafeUrlError with a user-safe message on failure. Call
 * this before EVERY outbound fetch to a user/site-supplied URL,
 * including every redirect hop, not just the initial request.
 */
export declare function assertSafeUrl(rawUrl: string): Promise<URL>;
