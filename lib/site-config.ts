import { adminDb } from "./firebase/admin";
import { PLANS } from "./plans";

type AnyDb = any;

/* ---------------------------------------------------------------------------
 * Prices — config/pricing { standard?: number, pro?: number }
 * The static price in lib/plans.ts is the default; an admin override wins
 * everywhere money is charged or shown: checkout, the pricing page, MRR.
 * ------------------------------------------------------------------------- */

export type PaidPlan = "standard" | "pro";
export const PRICE_BOUNDS = { min: 1, max: 1000 } as const;

export interface EffectivePrices {
  standard: number;
  pro: number;
  overridden: Record<PaidPlan, boolean>;
  defaults: Record<PaidPlan, number>;
  updatedAt: string | null;
  updatedBy: string | null;
}

const validPrice = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= PRICE_BOUNDS.min && v <= PRICE_BOUNDS.max;

export function resolvePrices(raw: Record<string, unknown> | null | undefined): EffectivePrices {
  const defaults = { standard: PLANS.standard.priceUsd, pro: PLANS.pro.priceUsd };
  const s = validPrice(raw?.standard) ? (raw!.standard as number) : null;
  const p = validPrice(raw?.pro) ? (raw!.pro as number) : null;
  return {
    standard: s ?? defaults.standard,
    pro: p ?? defaults.pro,
    overridden: { standard: s !== null, pro: p !== null },
    defaults,
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null,
    updatedBy: typeof raw?.updatedBy === "string" ? raw.updatedBy : null,
  };
}

export function validatePrices(input: { standard?: unknown; pro?: unknown }): { ok: true; value: Partial<Record<PaidPlan, number | null>> } | { ok: false; error: string } {
  const out: Partial<Record<PaidPlan, number | null>> = {};
  for (const plan of ["standard", "pro"] as const) {
    const v = input[plan];
    if (v === undefined) continue;
    if (v === null || v === "") { out[plan] = null; continue; } // reset to default
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < PRICE_BOUNDS.min || n > PRICE_BOUNDS.max) return { ok: false, error: `${PLANS[plan].name} price must be between $${PRICE_BOUNDS.min} and $${PRICE_BOUNDS.max}.` };
    if (Math.round(n * 100) !== n * 100 && Math.abs(Math.round(n * 100) - n * 100) > 1e-6) return { ok: false, error: `${PLANS[plan].name} price can have at most 2 decimal places.` };
    out[plan] = Math.round(n * 100) / 100;
  }
  return { ok: true, value: out };
}

const TTL_MS = 30_000;
let priceCache: { at: number; prices: EffectivePrices } | null = null;

export async function getEffectivePrices(db: AnyDb = adminDb(), opts: { fresh?: boolean } = {}): Promise<EffectivePrices> {
  if (!opts.fresh && priceCache && Date.now() - priceCache.at < TTL_MS) return priceCache.prices;
  try {
    const snap = await db.collection("config").doc("pricing").get();
    const prices = resolvePrices(snap.exists ? snap.data() : null);
    priceCache = { at: Date.now(), prices };
    return prices;
  } catch {
    return priceCache?.prices || resolvePrices(null); // a Firestore hiccup must never block checkout
  }
}

export async function savePrices(db: AnyDb, input: Parameters<typeof validatePrices>[0], actor: string): Promise<{ ok: true; prices: EffectivePrices } | { ok: false; error: string }> {
  const v = validatePrices(input);
  if (!v.ok) return v;
  const ref = db.collection("config").doc("pricing");
  const snap = await ref.get();
  const cur = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  const next: Record<string, unknown> = { ...cur };
  for (const plan of ["standard", "pro"] as const) {
    if (v.value[plan] === undefined) continue;
    if (v.value[plan] === null) delete next[plan];
    else next[plan] = v.value[plan];
  }
  next.updatedAt = new Date().toISOString();
  next.updatedBy = actor;
  await ref.set(next);
  priceCache = null;
  return { ok: true, prices: resolvePrices(next) };
}

/* ---------------------------------------------------------------------------
 * Content blocks + categories — config/content
 * Only the keys registered here are editable, and each is rendered somewhere
 * real (see components/SiteNote.tsx). Plain text only, never HTML.
 * ------------------------------------------------------------------------- */

export const CONTENT_BLOCKS = {
  pricingNote: { label: "Pricing page note", help: "Shown under the plans on /pricing (e.g. a launch offer or a billing reminder).", max: 280 },
  footerNote: { label: "Footer note", help: "A short line shown in the site footer on every page.", max: 160 },
} as const;
export type ContentBlockKey = keyof typeof CONTENT_BLOCKS;
export const MAX_CATEGORIES = 30;

export interface SiteContent {
  blocks: Record<ContentBlockKey, string>;
  categories: string[];
  updatedAt: string | null;
  updatedBy: string | null;
}

const cleanText = (s: string) => s.replace(/[\x00-\x1F\x7F]/g, " ").replace(/\s+/g, " ").trim();

export function resolveContent(raw: Record<string, unknown> | null | undefined): SiteContent {
  const blocks = {} as Record<ContentBlockKey, string>;
  const rb = (raw?.blocks && typeof raw.blocks === "object" ? raw.blocks : {}) as Record<string, unknown>;
  for (const k of Object.keys(CONTENT_BLOCKS) as ContentBlockKey[]) blocks[k] = typeof rb[k] === "string" ? cleanText(rb[k] as string).slice(0, CONTENT_BLOCKS[k].max) : "";
  const cats = Array.isArray(raw?.categories) ? (raw!.categories as unknown[]).filter((c): c is string => typeof c === "string").map(cleanText).filter(Boolean) : [];
  return { blocks, categories: Array.from(new Set(cats)).slice(0, MAX_CATEGORIES), updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : null, updatedBy: typeof raw?.updatedBy === "string" ? raw.updatedBy : null };
}

export function validateContentUpdate(input: { blocks?: Record<string, unknown>; categories?: unknown }): { ok: true; blocks?: Partial<Record<ContentBlockKey, string>>; categories?: string[] } | { ok: false; error: string } {
  let blocks: Partial<Record<ContentBlockKey, string>> | undefined;
  if (input.blocks !== undefined) {
    if (!input.blocks || typeof input.blocks !== "object") return { ok: false, error: "Invalid content blocks." };
    blocks = {};
    for (const [k, v] of Object.entries(input.blocks)) {
      if (!(k in CONTENT_BLOCKS)) return { ok: false, error: `Unknown content block "${k}".` };
      if (typeof v !== "string") return { ok: false, error: `"${k}" must be text.` };
      const t = cleanText(v);
      const max = CONTENT_BLOCKS[k as ContentBlockKey].max;
      if (t.length > max) return { ok: false, error: `${CONTENT_BLOCKS[k as ContentBlockKey].label} is too long (${t.length}/${max} characters).` };
      blocks[k as ContentBlockKey] = t;
    }
  }
  let categories: string[] | undefined;
  if (input.categories !== undefined) {
    if (!Array.isArray(input.categories)) return { ok: false, error: "Categories must be a list." };
    const list = input.categories.map((c) => (typeof c === "string" ? cleanText(c) : "")).filter(Boolean);
    if (list.some((c) => c.length > 40)) return { ok: false, error: "Category names can be at most 40 characters." };
    const unique = Array.from(new Set(list));
    if (unique.length > MAX_CATEGORIES) return { ok: false, error: `At most ${MAX_CATEGORIES} categories.` };
    categories = unique;
  }
  return { ok: true, blocks, categories };
}

let contentCache: { at: number; content: SiteContent } | null = null;

export async function getSiteContent(db: AnyDb = adminDb(), opts: { fresh?: boolean } = {}): Promise<SiteContent> {
  if (!opts.fresh && contentCache && Date.now() - contentCache.at < TTL_MS) return contentCache.content;
  try {
    const snap = await db.collection("config").doc("content").get();
    const content = resolveContent(snap.exists ? snap.data() : null);
    contentCache = { at: Date.now(), content };
    return content;
  } catch {
    return contentCache?.content || resolveContent(null);
  }
}

export async function saveSiteContent(db: AnyDb, input: Parameters<typeof validateContentUpdate>[0], actor: string): Promise<{ ok: true; content: SiteContent } | { ok: false; error: string }> {
  const v = validateContentUpdate(input);
  if (!v.ok) return v;
  const ref = db.collection("config").doc("content");
  const snap = await ref.get();
  const cur = resolveContent(snap.exists ? snap.data() : null);
  const next = { blocks: { ...cur.blocks, ...(v.blocks || {}) }, categories: v.categories ?? cur.categories, updatedAt: new Date().toISOString(), updatedBy: actor };
  await ref.set(next);
  contentCache = null;
  return { ok: true, content: resolveContent(next) };
}
