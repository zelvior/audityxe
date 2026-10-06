import { paginate, toIso, prefixRange, type Page, type WhereClause } from "./admin-paginate";
import { getSiteContent } from "./site-config";

type AnyDb = any;

export interface ListingRow {
  host: string;
  submittedAt: string | null;
  hidden: boolean;
  featured: boolean;
  category: string | null;
  note: string | null;
}

export const toListing = (id: string, d: Record<string, unknown>): ListingRow => ({
  host: id,
  submittedAt: toIso(d.submittedAt),
  hidden: d.hidden === true,
  featured: d.featured === true,
  category: typeof d.category === "string" && d.category ? d.category : null,
  note: typeof d.note === "string" && d.note ? d.note : null,
});

export interface ListingQuery {
  q?: string;
  visibility?: "hidden" | "featured" | "";
  cursor?: string | null;
  limit?: number;
}

export async function listListings(db: AnyDb, q: ListingQuery): Promise<Page<ListingRow>> {
  const where: WhereClause[] = [];
  const query = (q.q || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (q.visibility === "hidden") where.push(["hidden", "==", true]);
  if (q.visibility === "featured") where.push(["featured", "==", true]);
  if (query) {
    const [lo, hi] = prefixRange(query);
    where.push(["__name__", ">=", lo], ["__name__", "<=", hi]);
    return paginate<ListingRow>(db, { collection: "showcase_submissions", orderField: "__name__", direction: "asc", where, limit: q.limit, cursor: q.cursor, map: toListing });
  }
  return paginate<ListingRow>(db, { collection: "showcase_submissions", orderField: "submittedAt", direction: "desc", where, limit: q.limit, cursor: q.cursor, map: toListing });
}

export type ListingAction =
  | { action: "hide" | "unhide" | "feature" | "unfeature" | "delete" }
  | { action: "set-category"; category: string | null }
  | { action: "note"; note: string | null };

export async function applyListingAction(db: AnyDb, host: string, a: ListingAction): Promise<{ ok: true } | { ok: false; error: string }> {
  const ref = db.collection("showcase_submissions").doc(host.toLowerCase());
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Listing not found." };
  switch (a.action) {
    case "hide": await ref.set({ hidden: true }, { merge: true }); break;
    case "unhide": await ref.set({ hidden: false }, { merge: true }); break;
    case "feature": await ref.set({ featured: true }, { merge: true }); break;
    case "unfeature": await ref.set({ featured: false }, { merge: true }); break;
    case "delete": await ref.delete(); break;
    case "set-category": {
      if (a.category !== null) {
        const known = (await getSiteContent(db, { fresh: true })).categories;
        if (!known.includes(a.category)) return { ok: false, error: `"${a.category}" isn't one of your categories — add it under Categories first.` };
      }
      await ref.set({ category: a.category }, { merge: true });
      break;
    }
    case "note": await ref.set({ note: a.note ? a.note.replace(/[\x00-\x1F\x7F]/g, " ").trim().slice(0, 300) : null }, { merge: true }); break;
  }
  return { ok: true };
}
