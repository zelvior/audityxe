import { adminDb } from "./firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { DEFAULT_THEME, isValidTheme } from "./themes";

const DOC_PATH = ["site_config", "theme"] as const;

// Read on every server-rendered page (root layout needs it to set
// <html data-theme> before first paint), so a short in-memory cache
// avoids a Firestore read per request. 30s means an admin's theme
// change is live for every visitor within half a minute — same
// trade-off the announcement banner already makes implicitly via its
// own client-side poll interval, just applied server-side here.
let cached: { themeId: string; expiresAt: number } | null = null;
const CACHE_MS = 30_000;

export async function getSiteTheme(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.themeId;
  try {
    const db = adminDb();
    const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).get();
    const raw = snap.data()?.themeId;
    const themeId = isValidTheme(raw) ? raw : DEFAULT_THEME;
    cached = { themeId, expiresAt: Date.now() + CACHE_MS };
    return themeId;
  } catch {
    // Fail closed to the default theme rather than breaking every page
    // render on the site if Firestore hiccups.
    return DEFAULT_THEME;
  }
}

export async function setSiteTheme(themeId: string): Promise<void> {
  if (!isValidTheme(themeId)) throw new Error("Unknown theme id.");
  const db = adminDb();
  await db
    .collection(DOC_PATH[0])
    .doc(DOC_PATH[1])
    .set({ themeId, updatedAt: FieldValue.serverTimestamp() });
  cached = { themeId, expiresAt: Date.now() + CACHE_MS };
}
