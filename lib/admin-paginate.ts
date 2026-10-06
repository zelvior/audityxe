import { Timestamp } from "firebase-admin/firestore";

/**
 * Cursor pagination for admin lists, built to stay fast and cheap at any
 * collection size: every page reads at most `limit + 1` documents no matter
 * how large the collection is (no offset, no "load everything then filter").
 *
 * Ordered by one field plus document id (a total order, so equal values never
 * skip or repeat). If Firestore refuses the filter+order combination because
 * the composite index isn't deployed yet, the page transparently falls back to
 * filter-only + document-id order (`degraded: true`) instead of erroring, so
 * the admin panel works before `firebase deploy --only firestore:indexes`.
 */

export type WhereClause = [field: string, op: "==" | "!=" | "<" | "<=" | ">" | ">=" | "in", value: unknown];

export interface PageOptions<T> {
  collection: string;
  orderField: string;
  direction?: "asc" | "desc";
  where?: WhereClause[];
  limit?: number;
  cursor?: string | null;
  map: (id: string, data: Record<string, unknown>) => T;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  /** true when the composite index is missing and the fallback ordering was used. */
  degraded: boolean;
}

interface Cursor {
  /** "o" = ordered by field, "d" = document-id fallback */
  m: "o" | "d";
  v?: unknown;
  id: string;
}

const enc = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString("base64url");
function dec(raw: string | null | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return c && typeof c.id === "string" && (c.m === "o" || c.m === "d") ? c : null;
  } catch {
    return null;
  }
}
const packValue = (v: unknown): unknown => (v instanceof Timestamp ? { __ts: v.toMillis() } : v instanceof Date ? { __ts: v.getTime() } : v);
const unpackValue = (v: unknown): unknown => (v && typeof v === "object" && "__ts" in (v as object) ? Timestamp.fromMillis((v as { __ts: number }).__ts) : v);

const isIndexError = (e: unknown) => {
  const err = e as { code?: number | string; message?: string };
  return err?.code === 9 || err?.code === "failed-precondition" || /FAILED_PRECONDITION|requires an index/i.test(err?.message || "");
};

type AnyDb = any;

export async function paginate<T>(db: AnyDb, opts: PageOptions<T>): Promise<Page<T>> {
  const limit = Math.min(Math.max(1, opts.limit || 50), 200);
  const dir = opts.direction || "desc";
  const cursor = dec(opts.cursor);
  const base = () => {
    let q = db.collection(opts.collection);
    for (const [f, op, v] of opts.where || []) q = q.where(f, op, v);
    return q;
  };

  const run = async (mode: "o" | "d") => {
    let q = base();
    if (mode === "o") {
      q = q.orderBy(opts.orderField, dir).orderBy("__name__", dir);
      if (cursor?.m === "o") q = q.startAfter(unpackValue(cursor.v), cursor.id);
    } else {
      q = q.orderBy("__name__", dir);
      if (cursor?.id) q = q.startAfter(cursor.id);
    }
    return (await q.limit(limit + 1).get()).docs as { id: string; data(): Record<string, unknown> }[];
  };

  let mode: "o" | "d" = cursor?.m === "d" ? "d" : "o";
  let docs: { id: string; data(): Record<string, unknown> }[];
  let degraded = mode === "d";
  try {
    docs = await run(mode);
  } catch (e) {
    if (mode === "o" && isIndexError(e)) {
      mode = "d";
      degraded = true;
      docs = await run("d");
    } else throw e;
  }

  const hasMore = docs.length > limit;
  const page = docs.slice(0, limit);
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? enc(mode === "o" ? { m: "o", v: packValue(last.data()[opts.orderField]), id: last.id } : { m: "d", id: last.id }) : null;
  return { items: page.map((d) => opts.map(d.id, d.data())), nextCursor, degraded };
}

/** Firestore Timestamp | Date | ISO string | undefined → ISO string | null. */
export function toIso(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return null;
}

/** Prefix-range bounds for "starts with" Firestore queries. */
export function prefixRange(q: string): [string, string] {
  return [q, q + "\uf8ff"];
}
