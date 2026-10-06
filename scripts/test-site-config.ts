import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { FakeFirestore } from "./_fake-firestore";
import { resolvePrices, validatePrices, savePrices, getEffectivePrices, resolveContent, validateContentUpdate, saveSiteContent, getSiteContent } from "../lib/site-config";
import { listListings, applyListingAction } from "../lib/showcase-admin";

(async () => {
  const db = new FakeFirestore() as any;

  // prices: defaults, override, reset, bounds
  const d = resolvePrices(null); assert.equal(d.overridden.pro, false); assert.ok(d.pro > 0 && d.standard > 0);
  assert.equal(validatePrices({ pro: 0 }).ok, false); assert.equal(validatePrices({ pro: 5000 }).ok, false); assert.equal(validatePrices({ standard: "abc" }).ok, false); assert.equal(validatePrices({ standard: 9.999 }).ok, false);
  assert.equal(resolvePrices({ pro: "free!" } as any).pro, d.pro, "garbage override ignored");
  const r: any = await savePrices(db, { pro: 19.5 }, "admin@x.io"); assert.ok(r.ok && r.prices.pro === 19.5 && r.prices.overridden.pro && !r.prices.overridden.standard);
  assert.equal((await getEffectivePrices(db, { fresh: true })).pro, 19.5);
  const r2: any = await savePrices(db, { standard: 7 }, "admin@x.io"); assert.ok(r2.prices.pro === 19.5 && r2.prices.standard === 7, "editing one plan keeps the other");
  const r3: any = await savePrices(db, { pro: null }, "admin@x.io"); assert.equal(r3.prices.overridden.pro, false); assert.equal(r3.prices.pro, d.pro, "null resets to default");
  assert.equal((await savePrices(db, { pro: -3 }, "a") as any).ok, false);

  // content: only registered keys, plain text, length caps, categories
  assert.equal(validateContentUpdate({ blocks: { evil: "x" } }).ok, false);
  assert.equal(validateContentUpdate({ blocks: { pricingNote: "x".repeat(500) } }).ok, false);
  assert.equal(validateContentUpdate({ categories: ["a".repeat(41)] }).ok, false);
  assert.equal(validateContentUpdate({ categories: Array.from({ length: 31 }, (_, i) => "c" + i) }).ok, false);
  const c: any = await saveSiteContent(db, { blocks: { pricingNote: "  Launch   offer\x00 ends Friday " }, categories: ["SaaS", "Blog", "SaaS", " "] }, "admin@x.io");
  assert.equal(c.content.blocks.pricingNote, "Launch offer ends Friday"); assert.deepEqual(c.content.categories, ["SaaS", "Blog"]);
  const c2: any = await saveSiteContent(db, { blocks: { footerNote: "Hello" } }, "admin@x.io"); assert.equal(c2.content.blocks.pricingNote, "Launch offer ends Friday", "partial update keeps other blocks"); assert.deepEqual(c2.content.categories, ["SaaS", "Blog"]);
  assert.equal(resolveContent({ blocks: { pricingNote: 42 } } as any).blocks.pricingNote, "");
  // HTML is stored as inert text — the UI renders it as text, never markup
  const h: any = await saveSiteContent(db, { blocks: { footerNote: "<img src=x onerror=alert(1)>" } }, "a"); assert.equal(h.content.blocks.footerNote, "<img src=x onerror=alert(1)>");

  // listings: pagination at scale, search by prefix, moderation actions, categories
  for (let i = 0; i < 350; i++) db.seed("showcase_submissions", `site${String(i).padStart(3, "0")}.example.com`, { submittedAt: new Date(1_700_000_000_000 + i * 1000).toISOString() });
  let cursor: string | null = null, n = 0; do { const p: any = await listListings(db, { limit: 100, cursor }); n += p.items.length; cursor = p.nextCursor; } while (cursor);
  assert.equal(n, 350);
  const found = await listListings(db, { q: "https://www.site12" }); assert.ok(found.items.length === 10 && found.items.every((x) => x.host.startsWith("site12")));
  assert.deepEqual(await applyListingAction(db, "site001.example.com", { action: "hide" }), { ok: true });
  assert.deepEqual(await applyListingAction(db, "site002.example.com", { action: "feature" }), { ok: true });
  assert.equal((await listListings(db, { visibility: "hidden" })).items.length, 1); assert.equal((await listListings(db, { visibility: "featured" })).items.length, 1);
  assert.equal((await applyListingAction(db, "site003.example.com", { action: "set-category", category: "Nope" }) as any).ok, false, "unknown category rejected");
  assert.deepEqual(await applyListingAction(db, "site003.example.com", { action: "set-category", category: "SaaS" }), { ok: true });
  assert.equal((await listListings(db, { q: "site003" })).items[0].category, "SaaS");
  assert.equal((await applyListingAction(db, "ghost.example.com", { action: "delete" }) as any).ok, false);
  assert.deepEqual(await applyListingAction(db, "site004.example.com", { action: "delete" }), { ok: true }); assert.equal(db._store("showcase_submissions").size, 349);
  console.log("site config, prices, content and listings tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
