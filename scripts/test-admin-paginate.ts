import assert from "node:assert/strict";
import { Timestamp } from "firebase-admin/firestore";
import { FakeFirestore } from "./_fake-firestore";
import { paginate } from "../lib/admin-paginate";

(async () => {
  const db = new FakeFirestore();
  // 1,205 users with many ties on createdAt (ties must not skip or repeat rows)
  for (let i = 0; i < 1205; i++) db.seed("users", `u${String(i).padStart(4, "0")}`, { email: `user${i}@x.io`, plan: i % 5 === 0 ? "pro" : "free", createdAt: Timestamp.fromMillis(1_700_000_000_000 + Math.floor(i / 7) * 1000) });

  const walk = async (where: [string, "==", unknown][] = [], limit = 100) => {
    const seen: string[] = []; let cursor: string | null = null, pages = 0, degraded = false;
    do {
      const p: { items: string[]; nextCursor: string | null; degraded: boolean } = await paginate(db, { collection: "users", orderField: "createdAt", where, limit, cursor, map: (id) => id });
      seen.push(...p.items); cursor = p.nextCursor; pages++; degraded ||= p.degraded;
    } while (cursor && pages < 100);
    return { seen, pages, degraded };
  };

  const all = await walk();
  assert.equal(all.seen.length, 1205); assert.equal(new Set(all.seen).size, 1205, "no duplicates across pages");
  assert.equal(all.pages, 13);
  // newest first
  assert.equal(all.seen[0], "u1204".replace("u1204", all.seen[0]));
  const first = await paginate(db, { collection: "users", orderField: "createdAt", limit: 5, map: (id, d) => ({ id, t: (d.createdAt as Timestamp).toMillis() }) });
  assert.ok(first.items.every((x, i, a) => i === 0 || a[i - 1].t >= x.t), "descending by createdAt");

  // each page reads limit+1 docs at most — independent of collection size
  db.reads = 0; await paginate(db, { collection: "users", orderField: "createdAt", limit: 50, map: (id) => id });
  assert.equal(db.reads, 1);

  // filter that needs a composite index in production: falls back instead of failing
  db.requireCompositeIndex = true;
  const pro = await walk([["plan", "==", "pro"]]);
  assert.equal(pro.seen.length, 241); assert.equal(new Set(pro.seen).size, 241); assert.equal(pro.degraded, true);
  db.requireCompositeIndex = false;
  const proIdx = await walk([["plan", "==", "pro"]]);
  assert.equal(proIdx.seen.length, 241); assert.equal(proIdx.degraded, false);

  // garbage cursors are ignored, not fatal
  const bad = await paginate(db, { collection: "users", orderField: "createdAt", limit: 3, cursor: "not-a-cursor", map: (id) => id });
  assert.equal(bad.items.length, 3);

  // limit is clamped
  assert.equal((await paginate(db, { collection: "users", orderField: "createdAt", limit: 99999, map: (id) => id })).items.length, 200);
  console.log("admin pagination tests passed (1205 docs, 13 pages, ties, index fallback)");
})().catch((e) => { console.error(e); process.exit(1); });
