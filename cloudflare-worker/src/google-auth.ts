/**
 * Mints a short-lived Google OAuth2 access token from a service account,
 * entirely with the Web Crypto API — Cloudflare Workers don't have
 * Node's `crypto` module or the `googleapis`/`firebase-admin` SDKs
 * (both assume a Node runtime), so this reimplements just the one thing
 * this project actually needs from them: a signed JWT exchanged for a
 * bearer token, per Google's OAuth2 service-account flow
 * (https://developers.google.com/identity/protocols/oauth2/service-account#jwt-auth).
 *
 * Tokens are cached in module scope for their ~1h lifetime (minus a
 * safety margin) so a burst of requests within one Worker isolate
 * doesn't re-mint a token per call — cheap, but not free, and Google
 * rate-limits the token endpoint.
 */

export interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  /** PEM-encoded PKCS#8 private key, literal `\n` newlines as stored in
   * the Worker secret (same format already used for FIREBASE_PRIVATE_KEY
   * in the Next.js app's own lib/firebase/admin.ts) — unescaped here the
   * same way. */
  privateKey: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  arr.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlEncodeString(s: string): string {
  return base64UrlEncode(new TextEncoder().encode(s));
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const cleaned = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

/**
 * Returns a bearer token scoped to Firestore + Identity Toolkit (Firebase
 * Auth's REST surface) — the two Google APIs this Worker's cleanup jobs
 * actually call. A service account key file grants broad project access
 * by default; requesting only these two scopes in the minted token limits
 * what a leaked/misused token could actually do, independent of what the
 * underlying service account's IAM role allows.
 */
export async function getGoogleAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.clientEmail,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64UrlEncodeString(JSON.stringify(header))}.${base64UrlEncodeString(JSON.stringify(claims))}`;
  const key = await importPrivateKey(sa.privateKey);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in };
  return data.access_token;
}
