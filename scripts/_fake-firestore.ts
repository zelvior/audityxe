/**
 * Tiny in-memory stand-in for the slice of the Firestore Admin SDK that the
 * admin libraries use, so pagination / retention / payments logic can be
 * tested without a Firestore emulator (which needs Java + a download).
 * Test-only — never imported by app code.
 */
import { Timestamp, FieldValue } from "firebase-admin/firestore";

const DeleteCtor = FieldValue.delete().constructor;
const IncCtor = FieldValue.increment(1).constructor;
const isDelete = (v: unknown) => v instanceof DeleteCtor;
const isInc = (v: unknown) => v instanceof IncCtor;
const incBy = (v: unknown): number => (v as { operand: number }).operand;

type Data = Record<string, unknown>;
const toKey = (v: unknown): number | string | boolean | null => {
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (v === undefined || v === null) return null;
  return v as number | string | boolean;
};
const cmp = (a: unknown, b: unknown) => {
  const x = toKey(a), y = toKey(b);
  if (x === y) return 0;
  if (x === null) return -1;
  if (y === null) return 1;
  return x < y ? -1 : 1;
};
const getPath = (d: Data, path: string): unknown => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Data)[k] : undefined), d);

export class FakeFirestore {
  cols = new Map<string, Map<string, Data>>();
  /** Set to make any query that uses where()+orderBy() on different fields
   * throw like a real Firestore project missing a composite index. */
  requireCompositeIndex = false;
  reads = 0;
  private col(name: string) {
    if (!this.cols.has(name)) this.cols.set(name, new Map());
    return this.cols.get(name)!;
  }
  collection(name: string) { return new FakeQuery(this, name, [], [], null, null); }
  seed(name: string, id: string, data: Data) { this.col(name).set(id, structuredCloneKeepTs(data)); }
  _store(name: string) { return this.col(name); }
  batch() {
    const ops: (() => void)[] = [];
    return {
      set: (ref: FakeDocRef, data: Data, opts?: { merge?: boolean }) => ops.push(() => ref.setSync(data, opts)),
      delete: (ref: FakeDocRef) => ops.push(() => ref.deleteSync()),
      update: (ref: FakeDocRef, data: Data) => ops.push(() => ref.updateSync(data)),
      commit: async () => { ops.forEach((f) => f()); },
    };
  }
  async runTransaction<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    const writes: (() => void)[] = [];
    const tx = {
      get: async (ref: FakeDocRef | FakeQuery) => ref.get(),
      set: (ref: FakeDocRef, data: Data, opts?: { merge?: boolean }) => writes.push(() => ref.setSync(data, opts)),
      update: (ref: FakeDocRef, data: Data) => writes.push(() => ref.updateSync(data)),
      delete: (ref: FakeDocRef) => writes.push(() => ref.deleteSync()),
    };
    const out = await fn(tx);
    writes.forEach((w) => w());
    return out;
  }
  async getAll(...refs: FakeDocRef[]) { return Promise.all(refs.map((r) => r.get())); }
}

function structuredCloneKeepTs(d: Data): Data {
  const out: Data = {};
  for (const [k, v] of Object.entries(d)) {
    out[k] = v instanceof Timestamp || v instanceof Date ? v : v && typeof v === "object" && !Array.isArray(v) ? structuredCloneKeepTs(v as Data) : Array.isArray(v) ? [...v] : v;
  }
  return out;
}
function mergeDeep(target: Data, src: Data) {
  for (const [k, v] of Object.entries(src)) {
    if (isDelete(v)) { delete target[k]; continue; }
    if (isInc(v)) { target[k] = (Number(target[k]) || 0) + incBy(v); continue; }
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Timestamp) && !(v instanceof Date) && target[k] && typeof target[k] === "object" && !(target[k] instanceof Timestamp))
      mergeDeep(target[k] as Data, v as Data);
    else target[k] = v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Timestamp) && !(v instanceof Date) ? structuredCloneKeepTs(v as Data) : v;
  }
}

export class FakeSnap {
  constructor(public ref: FakeDocRef, private _d: Data | undefined) {}
  get id() { return this.ref.id; }
  get exists() { return this._d !== undefined; }
  data() { return this._d ? structuredCloneKeepTs(this._d) : undefined; }
  get(path: string) { return this._d ? getPath(this._d, path) : undefined; }
}

export class FakeDocRef {
  constructor(private db: FakeFirestore, public colName: string, public id: string) {}
  async get() { this.db.reads++; return new FakeSnap(this, this.db._store(this.colName).get(this.id)); }
  setSync(data: Data, opts?: { merge?: boolean }) {
    const store = this.db._store(this.colName);
    if (opts?.merge && store.has(this.id)) mergeDeep(store.get(this.id)!, data);
    else {
      const clean: Data = {};
      for (const [k, v] of Object.entries(data)) if (!isDelete(v)) clean[k] = isInc(v) ? incBy(v) : v;
      store.set(this.id, structuredCloneKeepTs(clean));
    }
  }
  updateSync(data: Data) {
    const store = this.db._store(this.colName);
    if (!store.has(this.id)) throw Object.assign(new Error("NOT_FOUND"), { code: 5 });
    for (const [k, v] of Object.entries(data)) {
      const parts = k.split("."); let o = store.get(this.id)! as Data;
      for (const p of parts.slice(0, -1)) o = (o[p] = (o[p] as Data) || {}) as Data;
      const last = parts[parts.length - 1];
      if (isDelete(v)) delete o[last];
      else if (isInc(v)) o[last] = (Number(o[last]) || 0) + incBy(v);
      else o[last] = v;
    }
  }
  deleteSync() { this.db._store(this.colName).delete(this.id); }
  async set(data: Data, opts?: { merge?: boolean }) { this.setSync(data, opts); }
  async update(data: Data) { this.updateSync(data); }
  async delete() { this.deleteSync(); }
}

type Where = [string, string, unknown];
export class FakeQuery {
  constructor(private db: FakeFirestore, private name: string, private wheres: Where[], private orders: [string, "asc" | "desc"][], private lim: number | null, private after: unknown[] | null) {}
  private clone(p: Partial<{ wheres: Where[]; orders: [string, "asc" | "desc"][]; lim: number | null; after: unknown[] | null }>) {
    return new FakeQuery(this.db, this.name, p.wheres ?? this.wheres, p.orders ?? this.orders, p.lim === undefined ? this.lim : p.lim, p.after === undefined ? this.after : p.after);
  }
  doc(id: string) { return new FakeDocRef(this.db, this.name, id); }
  async add(data: Data) { const id = "auto" + Math.random().toString(36).slice(2, 10); this.doc(id).setSync(data); return this.doc(id); }
  where(f: string, op: string, v: unknown) { return this.clone({ wheres: [...this.wheres, [f, op, v]] }); }
  orderBy(f: string, dir: "asc" | "desc" = "asc") { return this.clone({ orders: [...this.orders, [f, dir]] }); }
  limit(n: number) { return this.clone({ lim: n }); }
  startAfter(...vals: unknown[]) { return this.clone({ after: vals }); }
  count() { return { get: async () => ({ data: () => ({ count: this.filtered().length }) }) }; }
  aggregate(spec: Record<string, { sumField?: string; kind: string }>) {
    return { get: async () => ({ data: () => Object.fromEntries(Object.entries(spec).map(([k, s]) => [k, s.kind === "count" ? this.filtered().length : this.filtered().reduce((a, [, d]) => a + (Number(getPath(d, s.sumField!)) || 0), 0)])) }) };
  }
  private filtered(): [string, Data][] {
    const rows = [...this.db._store(this.name).entries()];
    return rows.filter(([id, d]) => this.wheres.every(([f, op, v]) => {
      const x = f === "__name__" ? id : getPath(d, f);
      switch (op) {
        case "==": return cmp(x, v) === 0 && (x !== undefined || v === undefined);
        case "!=": return cmp(x, v) !== 0;
        case "<": return x !== undefined && x !== null && cmp(x, v) < 0;
        case "<=": return x !== undefined && x !== null && cmp(x, v) <= 0;
        case ">": return x !== undefined && x !== null && cmp(x, v) > 0;
        case ">=": return x !== undefined && x !== null && cmp(x, v) >= 0;
        case "in": return (v as unknown[]).some((y) => cmp(x, y) === 0);
        case "array-contains": return Array.isArray(x) && x.some((y) => cmp(y, v) === 0);
        default: throw new Error("fake: unsupported op " + op);
      }
    }));
  }
  async get() {
    this.db.reads++;
    if (this.db.requireCompositeIndex) {
      const eqFields = new Set(this.wheres.map((w) => w[0]));
      const orderField = this.orders[0]?.[0];
      if (this.wheres.length && orderField && orderField !== "__name__" && (eqFields.size > 1 || !eqFields.has(orderField)))
        throw Object.assign(new Error("9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."), { code: 9 });
    }
    let rows = this.filtered();
    // a field that is missing from a doc drops it from an orderBy on that field (real Firestore behaviour)
    for (const [f] of this.orders) if (f !== "__name__") rows = rows.filter(([, d]) => getPath(d, f) !== undefined);
    const orders = this.orders.length ? this.orders : [["__name__", "asc"] as [string, "asc" | "desc"]];
    const val = (id: string, d: Data, f: string) => (f === "__name__" ? id : getPath(d, f));
    rows.sort((a, b) => {
      for (const [f, dir] of orders) { const c = cmp(val(a[0], a[1], f), val(b[0], b[1], f)); if (c) return dir === "desc" ? -c : c; }
      return 0;
    });
    if (this.after) {
      const idx = rows.findIndex(([id, d]) => {
        for (let i = 0; i < orders.length; i++) {
          const [f, dir] = orders[i]; const c = cmp(val(id, d, f), this.after![i]);
          if (c) return dir === "desc" ? c < 0 : c > 0;
        }
        return false;
      });
      rows = idx === -1 ? [] : rows.slice(idx);
    }
    if (this.lim !== null) rows = rows.slice(0, this.lim);
    const docs = rows.map(([id, d]) => new FakeSnap(new FakeDocRef(this.db, this.name, id), d));
    return { docs, size: docs.length, empty: docs.length === 0 };
  }
}
export const FakeAgg = { count: () => ({ kind: "count" }), sum: (f: string) => ({ kind: "sum", sumField: f }) };
