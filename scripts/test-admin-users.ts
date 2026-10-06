import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { FakeFirestore } from "./_fake-firestore";
import { listUsersPage } from "../lib/admin-users";

(async () => {
  const db = new FakeFirestore() as any;
  const names = ["Alice Cooper", "Albert King", "Bob Marley", "alina Stone", "Zed"];
  for (let i = 0; i < 520; i++) {
    const n = names[i % names.length];
    db.seed("users", `uid${String(i).padStart(24, "0")}`, {
      email: `user${i}@${i % 2 ? "acme.io" : "demo.dev"}`, displayName: n, displayNameLower: n.toLowerCase(),
      plan: i % 10 === 0 ? "pro" : i % 4 === 0 ? "standard" : "free",
      planExpiresAt: i % 10 === 0 ? new Date(Date.now() + 86_400_000 * 5).toISOString() : null,
      moderation: i % 50 === 0 ? { status: "banned", reason: "spam" } : { status: "active" },
      limits: i === 7 ? { dailyAudits: 99, perMinute: 5 } : undefined,
      createdAt: Timestamp.fromMillis(1_700_000_000_000 + i * 1000),
    });
  }

  // browse: 520 users in pages of 100, newest first, no dupes
  let cursor: string | null = null, seen: string[] = [], pages = 0;
  do { const p = await listUsersPage(db, { limit: 100, cursor }); seen.push(...p.items.map((u) => u.uid)); cursor = p.nextCursor; pages++; assert.equal(p.mode, "browse"); } while (cursor);
  assert.equal(seen.length, 520); assert.equal(new Set(seen).size, 520); assert.equal(pages, 6);
  assert.ok(seen[0] > seen[519], "newest first");

  // each browse page reads once, however big the collection
  db.reads = 0; await listUsersPage(db, { limit: 50 }); assert.equal(db.reads, 1);

  // search: email prefix, name prefix (case-insensitive), uid, no-match
  const e = await listUsersPage(db, { q: "user12@" }); assert.deepEqual(e.items.map((u) => u.email), ["user12@demo.dev"]);
  const e2 = await listUsersPage(db, { q: "USER51" }); assert.ok(e2.items.length >= 1 && e2.items.every((u) => u.email!.startsWith("user51")), "email search is case-insensitive");
  const nm = await listUsersPage(db, { q: "al", limit: 200 }); const dn = new Set(nm.items.map((u) => u.displayName));
  assert.ok(dn.has("Albert King") && dn.has("Alice Cooper") && !dn.has("Bob Marley"), "name prefix (case-insensitive, sorted, capped at the page size)");
  assert.equal(nm.items.length, 200, "search results are capped at the page size");
  const al = await listUsersPage(db, { q: "alin", limit: 200 }); assert.ok(al.items.length === 104 && al.items.every((u) => u.displayName === "alina Stone"));
  const byUid = await listUsersPage(db, { q: `uid${String(7).padStart(24, "0")}` }); assert.equal(byUid.items.length, 1); assert.deepEqual(byUid.items[0].limits, { dailyAudits: 99, perMinute: 5, note: null, updatedAt: null, updatedBy: null });
  assert.equal((await listUsersPage(db, { q: "nobody-here" })).items.length, 0);

  // filters
  let pro = 0; cursor = null; do { const p = await listUsersPage(db, { plan: "pro", limit: 100, cursor }); pro += p.items.length; assert.ok(p.items.every((u) => u.plan === "pro")); cursor = p.nextCursor; } while (cursor);
  assert.equal(pro, 52);
  const banned = await listUsersPage(db, { status: "banned", limit: 100 }); assert.equal(banned.items.length, 11); assert.ok(banned.items.every((u) => u.moderation.status === "banned"));

  // composite-index missing in production -> still works (degraded), never throws
  db.requireCompositeIndex = true;
  const deg = await listUsersPage(db, { plan: "standard", limit: 100 }); assert.ok(deg.degraded && deg.items.length > 0);
  console.log("admin users tests passed");
})().catch((e) => { console.error(e); process.exit(1); });
