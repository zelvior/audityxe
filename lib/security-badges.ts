import { adminDb } from "./firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

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
  grade: string; // e.g. "A+", "A", "B"
  provider: "ssllabs";
  checkedAt: string;
}

export interface MdnObservatoryGrade {
  grade: string; // e.g. "A+", "B-"
  score: number; // 0-135ish, MDN's own scale
  provider: "mdn-observatory";
  checkedAt: string;
}

function tsToIso(v: unknown): string | null {
  if (v instanceof Timestamp) return v.toDate().toISOString();
  return null;
}

export async function getCachedSslLabsGrade(): Promise<SslLabsGrade | null> {
  const db = adminDb();
  const snap = await db.collection(COLLECTION).doc("ssllabs").get();
  if (!snap.exists) return null;
  const data = snap.data()!;
  const checkedAt = tsToIso(data.checkedAt);
  if (!data.grade || !checkedAt) return null;
  return { grade: data.grade, provider: "ssllabs", checkedAt };
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
    const grade = data.endpoints?.[0]?.grade;
    if (!grade || typeof grade !== "string") {
      return { ok: false, error: "No grade in SSL Labs response." };
    }
    const db = adminDb();
    await db.collection(COLLECTION).doc("ssllabs").set({
      grade,
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
