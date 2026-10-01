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
  limit: number
): Promise<string[]> {
  const body = {
    structuredQuery: {
      from: [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: "LESS_THAN",
          value: { stringValue: olderThanIso },
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
  maxPages = 20
): Promise<number> {
  let total = 0;
  for (let page = 0; page < maxPages; page++) {
    const names = await queryOlderThan(projectId, accessToken, collection, field, olderThanIso, pageSize);
    if (names.length === 0) break;
    total += await batchDelete(projectId, accessToken, names);
    if (names.length < pageSize) break;
  }
  return total;
}
