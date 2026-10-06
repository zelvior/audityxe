/**
 * Minimal Firestore REST client — just the two operations this Worker's
 * cleanup jobs need (structured query, batch delete). Cloudflare Workers
 * can't use the `@google-cloud/firestore` or `firebase-admin` SDKs (both
 * are Node-only), so this talks to Firestore's REST API directly
 * (https://firebase.google.com/docs/firestore/reference/rest), the same
 * API surface those SDKs themselves call under the hood.
 */

const FIRESTORE_BASE = "https://firestore.googleapis.com/v1";

interface FirestoreDoc {
  name: string; // full resource path, e.g. projects/x/databases/(default)/documents/auditJobs/abc123
}

/**
 * Runs a structured query for documents in `collection` whose `field`
 * (an ISO-8601 string field, matching how this project stores timestamps
 * — see lib/audit-jobs.ts's createdAt/lib/push.ts's savedAt) is older
 * than `olderThanIso`. Returns up to `limit` matching document resource
 * names. Firestore's REST runQuery has no built-in "delete matching"
 * operation, so this is always the first half of a query-then-delete
 * pair — see batchDelete below.
 */
export async function queryOlderThan(
  projectId: string,
  accessToken: string,
  collection: string,
  field: string,
  olderThanIso: string,
  limit: number,
  valueType: "string" | "timestamp" = "string"
): Promise<string[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: "LESS_THAN",
          // string = ISO-8601 / YYYY-MM-DD text fields; timestamp = native Firestore Timestamps
          value: valueType === "timestamp" ? { timestampValue: olderThanIso } : { stringValue: olderThanIso },
        },
      },
      limit,
    },
  };

  const res = await fetch(`${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Firestore runQuery failed for ${collection} (${res.status}): ${errBody}`);
  }

  const rows = (await res.json()) as { document?: FirestoreDoc }[];
  return rows.filter((r) => r.document).map((r) => r.document!.name);
}

/**
 * Deletes documents by their full resource name via Firestore's
 * :commit endpoint, in batches of up to 500 (Firestore's own hard limit
 * per commit request — see
 * https://firebase.google.com/docs/firestore/quotas#writes_and_transactions).
 * Returns the number successfully deleted; a failed batch throws rather
 * than silently under-reporting, since the cleanup summary this Worker
 * returns is the only visibility into whether it's actually working.
 */
export async function batchDelete(projectId: string, accessToken: string, documentNames: string[]): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < documentNames.length; i += 500) {
    const chunk = documentNames.slice(i, i + 500);
    const res = await fetch(`${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents:commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ writes: chunk.map((name) => ({ delete: name })) }),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(`Firestore commit (delete) failed (${res.status}): ${errBody}`);
    }
    deleted += chunk.length;
  }
  return deleted;
}

/**
 * Repeatedly queries + deletes up to `limit` docs per page until a page
 * comes back empty, so a large backlog (e.g. after this Worker was
 * offline for a while) still fully drains in one invocation rather than
 * leaving most of it for the next scheduled run.
 */
export async function drainOlderThan(
  projectId: string,
  accessToken: string,
  collection: string,
  field: string,
  olderThanIso: string,
  pageSize = 500,
  maxPages = 20,
  valueType: "string" | "timestamp" = "string"
): Promise<number> {
  return (await drainOlderThanDetailed(projectId, accessToken, collection, field, olderThanIso, pageSize, maxPages, valueType)).deleted;
}

/** Same as drainOlderThan, but also reports whether the page budget ran out
 * (so the admin panel can show "more remain — continues next run"). */
export async function drainOlderThanDetailed(
  projectId: string,
  accessToken: string,
  collection: string,
  field: string,
  olderThanIso: string,
  pageSize = 500,
  maxPages = 20,
  valueType: "string" | "timestamp" = "string"
): Promise<{ deleted: number; capped: boolean }> {
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const names = await queryOlderThan(projectId, accessToken, collection, field, olderThanIso, pageSize, valueType);
    if (names.length === 0) return { deleted: total, capped: false };
    total += await batchDelete(projectId, accessToken, names);
    if (names.length < pageSize) return { deleted: total, capped: false };
  }
  return { deleted: total, capped: true };
}

// ---- config document access (retention policies set from the admin panel) ----

type FsValue = Record<string, unknown>;

function decodeValue(v: FsValue): unknown {
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("timestampValue" in v) return v.timestampValue;
  if ("nullValue" in v) return null;
  if ("mapValue" in v) return decodeFields(((v.mapValue as { fields?: Record<string, FsValue> }).fields) || {});
  if ("arrayValue" in v) return (((v.arrayValue as { values?: FsValue[] }).values) || []).map(decodeValue);
  return undefined;
}
function decodeFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}
function encodeValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  return { mapValue: { fields: encodeFields(v as Record<string, unknown>) } };
}
function encodeFields(o: Record<string, unknown>): Record<string, FsValue> {
  const out: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = encodeValue(v);
  return out;
}

/** Reads one document (e.g. "config/retention") as plain JS; null if it doesn't exist. */
export async function getDocumentData(projectId: string, accessToken: string, docPath: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${docPath}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Firestore get ${docPath} failed (${res.status}): ${await res.text().catch(() => "")}`);
  const doc = (await res.json()) as { fields?: Record<string, FsValue> };
  return decodeFields(doc.fields || {});
}

/** Creates/replaces one document with the given plain-JS data. */
export async function setDocumentData(projectId: string, accessToken: string, docPath: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${FIRESTORE_BASE}/projects/${projectId}/databases/(default)/documents/${docPath}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFields(data) }),
  });
  if (!res.ok) throw new Error(`Firestore set ${docPath} failed (${res.status}): ${await res.text().catch(() => "")}`);
}
