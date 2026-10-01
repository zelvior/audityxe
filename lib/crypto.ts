import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";

/**
 * Encrypts BYOK (bring-your-own-key) AI API keys before storing them in
 * Firestore. Firestore already encrypts data at rest, but a third-party
 * API key is sensitive enough to warrant an extra application-level
 * layer — so even a Firestore export/backup leak doesn't hand out a
 * usable key. Uses AES-256-GCM with a random IV per encryption.
 *
 * BYOK_ENCRYPTION_KEY must be set in production (any string works — it's
 * hashed to a 32-byte key below, no need to generate raw key bytes
 * yourself). Falls back to a fixed dev-only key locally so `npm run dev`
 * doesn't require extra setup, but this fallback must never run in
 * production.
 */
function getKey(): Buffer {
  const secret = process.env.BYOK_ENCRYPTION_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BYOK_ENCRYPTION_KEY is not set — required in production to store BYOK keys safely.");
    }
    return createHash("sha256").update("audityxe-dev-only-insecure-key").digest();
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv.authTag.ciphertext, all base64
  return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string | null {
  try {
    const [ivB64, tagB64, dataB64] = payload.split(".");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = getKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function maskKey(key: string): string {
  if (key.length <= 4) return "****";
  return `${"*".repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
}
