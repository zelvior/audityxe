import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Scalable exact-match search for the admin panel: a Bloom filter over
 * every user's email/UID/display-name tokens, persisted as a single
 * bitset doc. Membership tests are O(k) and never touch the `users`
 * collection, so a search that's "probably a miss" costs one small doc
 * read no matter how many millions of users exist. A "maybe present"
 * result then does one cheap, indexed Firestore lookup to confirm and
 * fetch the real record — so false positives (inherent to Bloom filters)
 * never leak fake results, they just cost one extra point read.
 */
const BITS = 1 << 20; // 1,048,576 bits (~128KB) — fixed size regardless of user count
const BYTES = BITS / 8;
const K = 4; // hash functions

function fnv1a(str: string, seed: number): number {
  let h = 0x811c9dc5 ^ seed;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function bitIndices(token: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < K; i++) out.push(fnv1a(token, i * 0x9e3779b1) % BITS);
  return out;
}

export function normalizeToken(raw: string): string {
  return raw.trim().toLowerCase();
}

const DOC_REF = () => adminDb().collection("search_index").doc("bloom");

function bufferToBase64(buf: Uint8Array): string {
  return Buffer.from(buf).toString("base64");
}
function base64ToBuffer(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function loadBits(): Promise<Uint8Array> {
  const snap = await DOC_REF().get();
  const b64 = snap.data()?.bits as string | undefined;
  return b64 ? base64ToBuffer(b64) : new Uint8Array(BYTES);
}

/** Adds one or more tokens (already-lowercased email/uid/name) to the
 * shared filter. Read-modify-write on a single small doc — safe for the
 * signup rate this app sees; not meant for high-concurrency bulk loads. */
export async function bloomAddTokens(tokens: string[]): Promise<void> {
  const clean = tokens.map(normalizeToken).filter(Boolean);
  if (clean.length === 0) return;
  const bits = await loadBits();
  for (const t of clean) {
    for (const idx of bitIndices(t)) {
      bits[idx >> 3] |= 1 << (idx & 7);
    }
  }
  await DOC_REF().set({ bits: bufferToBase64(bits), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}

/** True = token is possibly present (needs a Firestore confirm read).
 * False = definitely absent — skip the Firestore lookup entirely. */
export async function bloomMightContain(token: string): Promise<boolean> {
  const t = normalizeToken(token);
  if (!t) return false;
  const bits = await loadBits();
  for (const idx of bitIndices(t)) {
    if ((bits[idx >> 3] & (1 << (idx & 7))) === 0) return false;
  }
  return true;
}
