import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

/**
 * Root cause of the previously broken Qualys/MDN badges: they were
 * shields.io "dynamic JSON" badges that made shields.io's own server
 * fetch api.ssllabs.com / observatory-api.mdn.mozilla.net on every
 * single badge image request, live, with no caching of its own. Two
 * problems compounded:
 *
 *  1. SSL Labs' analyze endpoint can take 60+ seconds on an uncached
 *     scan — far past whatever shields.io's own fetch timeout is —
 *     so the badge image request itself timed out and rendered broken.
 *  2. Even when it didn't time out, that's a live third-party API call
 *     on *every browser page load* of a public page, with no cache in
 *     front of it at all — exactly the "hits the url every single
 *     time" problem flagged for a fix.
 *
 * The fix: we own the caching layer instead of relying on shields.io's
 * (nonexistent) one. A scheduled job (see app/api/cron/security-badges)
 * hits SSL Labs / MDN Observatory at most once a day and writes the
 * result to Firestore. The badge SVG routes (app/api/badge/qualys,
 * app/api/badge/mdn) only ever read that cached doc — never the live
 * API — so a badge image request is a single fast Firestore read plus
 * inline SVG generation, with its own long-lived HTTP Cache-Control on
 * top of that. Nothing in the badge-serving request path ever calls
 * ssllabs.com or observatory-api.mdn.mozilla.net directly.
 */

const TARGET_HOST = "audityxe.vercel.app";
const COLLECTION = "security_badges";

export interface SslLabsGrade {
  grade: string; // worst grade across all live endpoints — see refreshSslLabsGrade
  provider: "ssllabs";
  checkedAt: string;
  endpoints: { ip: string; grade: string }[]; // per-endpoint breakdown, for "show my rank/scores"
}

export interface MdnObservatoryGrade {
  grade: string; // e.g. "A+", "B-"
  score: number; // 0-135ish, MDN's own scale
  provider: "mdn-observatory";
  checkedAt: string;
}

function tsToIso(v: unknown): string | null {
  // Duck-typed rather than `instanceof Timestamp` — see lib/api-keys.ts
  // for why: a duplicate-resolved firebase-admin package can make
  // `instanceof` fail against a structurally-identical instance.
  if (v && typeof v === "object" && typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

export async function getCachedSslLabsGrade(): Promise<SslLabsGrade | null> {
  const db = adminDb();
  const snap = await db.collection(COLLECTION).doc("ssllabs").get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const checkedAt = tsToIso(data.checkedAt);
  if (!data.grade || !checkedAt) return null;
  const endpoints = Array.isArray(data.endpoints)
    ? data.endpoints.filter((e: unknown): e is { ip: string; grade: string } => !!e && typeof e === "object" && "ip" in e && "grade" in e)
    : [];
  return { grade: data.grade, provider: "ssllabs", checkedAt, endpoints };
}

export async function getCachedMdnObservatoryGrade(): Promise<MdnObservatoryGrade | null> {
  const db = adminDb();
  const snap = await db.collection(COLLECTION).doc("mdn-observatory").get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const checkedAt = tsToIso(data.checkedAt);
  if (!data.grade || !checkedAt) return null;
  return { grade: data.grade, score: typeof data.score === "number" ? data.score : 0, provider: "mdn-observatory", checkedAt };
}

const FETCH_TIMEOUT_MS = 20_000;

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Best → worst. SSL Labs also uses "T" (trust issues) and "M" (certificate
// name mismatch), which are worse than a plain "F" in practice — ranked
// accordingly so the worst-case selection below treats them as such.
const GRADE_RANK = ["A+", "A", "A-", "B", "C", "D", "E", "F", "T", "M"];
function worstGrade(grades: string[]): string {
  return grades.reduce((worst, g) => (GRADE_RANK.indexOf(g) > GRADE_RANK.indexOf(worst) ? g : worst), grades[0]);
}

/** Called only from the daily cron job — never from a badge request. */
export async function refreshSslLabsGrade(): Promise<{ ok: boolean; grade?: string; error?: string }> {
  try {
    // fromCache=on + maxAge=24: returns SSL Labs' own cached assessment
    // (at most a day old) instantly if one exists, instead of forcing a
    // fresh multi-minute handshake scan on every cron run. If nothing is
    // cached yet, SSL Labs starts a new scan and reports IN_PROGRESS —
    // that run's write is simply skipped and picked up the next day.
    const res = await fetchWithTimeout(
      `https://api.ssllabs.com/api/v3/analyze?host=${encodeURIComponent(TARGET_HOST)}&fromCache=on&maxAge=24&all=done`
    );
    if (!res.ok) return { ok: false, error: `SSL Labs returned ${res.status}` };
    const data = await res.json();
    if (data.status !== "READY") {
      return { ok: false, error: `Scan not ready (status: ${data.status})` };
    }
    const readyEndpoints: { ip: string; grade: string }[] = (data.endpoints || [])
      .filter((e: { statusMessage?: string; grade?: string }) => e.statusMessage === "Ready" && typeof e.grade === "string")
      .map((e: { ipAddress: string; grade: string }) => ({ ip: e.ipAddress, grade: e.grade }));
    if (readyEndpoints.length === 0) {
      return { ok: false, error: "No ready endpoints with a grade in SSL Labs response." };
    }
    // A site is only as strong as its weakest server — matches how
    // SSL Labs' own summary page and every other grade aggregator
    // treats a multi-endpoint host, and is the accurate answer rather
    // than an arbitrary "just show endpoint 0" pick.
    const grade = worstGrade(readyEndpoints.map((e) => e.grade));
    const db = adminDb();
    await db.collection(COLLECTION).doc("ssllabs").set({
      grade,
      endpoints: readyEndpoints,
      checkedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, grade };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error." };
  }
}

/** Called only from the daily cron job — never from a badge request. */
export async function refreshMdnObservatoryGrade(): Promise<{ ok: boolean; grade?: string; error?: string }> {
  try {
    const res = await fetchWithTimeout(
      `https://observatory-api.mdn.mozilla.net/api/v2/scan?host=${encodeURIComponent(TARGET_HOST)}`,
      { method: "POST" }
    );
    if (!res.ok) return { ok: false, error: `MDN Observatory returned ${res.status}` };
    const data = await res.json();
    if (data.error) return { ok: false, error: String(data.error) };
    const grade = data.grade;
    const score = data.score;
    if (!grade || typeof grade !== "string") {
      return { ok: false, error: "No grade in MDN Observatory response." };
    }
    const db = adminDb();
    await db.collection(COLLECTION).doc("mdn-observatory").set({
      grade,
      score: typeof score === "number" ? score : null,
      checkedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true, grade };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error." };
  }
}
