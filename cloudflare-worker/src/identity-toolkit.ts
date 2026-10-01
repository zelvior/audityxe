/**
 * Minimal Identity Toolkit (Firebase Authentication's REST surface)
 * client — reimplements just the two calls this Worker needs
 * (list users with pagination, delete a user), matching exactly what
 * the Next.js app's own app/api/cron/cleanup-unverified/route.ts does
 * via firebase-admin's `adminAuth().listUsers()`/`.deleteUser()`, since
 * firebase-admin itself isn't usable in the Workers runtime (Node-only).
 * REST reference:
 * https://cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/batchGet
 */

const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1";

interface IdentityToolkitUser {
  localId: string;
  emailVerified?: boolean;
  createdAt?: string; // milliseconds since epoch, as a string
  providerUserInfo?: { providerId: string }[];
}

interface BatchGetResponse {
  userInfo?: IdentityToolkitUser[];
  nextPageToken?: string;
}

/** One page of up to `maxResults` users (Google's own cap is 1000 per
 * page, matching firebase-admin's listUsers default). */
async function listUsersPage(
  projectId: string,
  accessToken: string,
  maxResults: number,
  nextPageToken?: string
): Promise<BatchGetResponse> {
  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (nextPageToken) params.set("nextPageToken", nextPageToken);

  const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/projects/${projectId}/accounts:batchGet?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Identity Toolkit accounts:batchGet failed (${res.status}): ${body}`);
  }
  return (await res.json()) as BatchGetResponse;
}

async function deleteUser(projectId: string, accessToken: string, localId: string): Promise<void> {
  const res = await fetch(`${IDENTITY_TOOLKIT_BASE}/projects/${projectId}/accounts:delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ localId }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Identity Toolkit accounts:delete failed for ${localId} (${res.status}): ${body}`);
  }
}

/**
 * Deletes every Firebase Auth account that has never verified its email
 * and was created more than `staleAfterDays` ago — identical retention
 * rule to app/api/cron/cleanup-unverified/route.ts, reimplemented here
 * so it can run on Cloudflare's Cron Triggers (which support any
 * interval, unlike Vercel's Hobby-plan cron, which is capped at once
 * per day) instead of Vercel's. Federated sign-ins (Google/GitHub) are
 * excluded the same way: they're effectively pre-verified by their
 * provider regardless of what emailVerified reports.
 */
export async function cleanupUnverifiedUsers(
  projectId: string,
  accessToken: string,
  staleAfterDays: number
): Promise<{ scanned: number; deleted: number }> {
  const cutoffMs = Date.now() - staleAfterDays * 24 * 60 * 60 * 1000;
  let scanned = 0;
  let deleted = 0;
  let pageToken: string | undefined;

  do {
    const page = await listUsersPage(projectId, accessToken, 1000, pageToken);
    pageToken = page.nextPageToken;
    const users = page.userInfo ?? [];
    scanned += users.length;

    const staleIds = users
      .filter((u) => {
        const createdAtMs = u.createdAt ? Number(u.createdAt) : NaN;
        const isFederatedOnly = (u.providerUserInfo ?? []).some((p) => p.providerId !== "password");
        return !u.emailVerified && !isFederatedOnly && Number.isFinite(createdAtMs) && createdAtMs < cutoffMs;
      })
      .map((u) => u.localId);

    for (const localId of staleIds) {
      try {
        await deleteUser(projectId, accessToken, localId);
        deleted++;
      } catch {
        // Skip and continue — one failed deletion shouldn't abort the
        // whole run; it'll be retried on the next scheduled invocation.
      }
    }
  } while (pageToken);

  return { scanned, deleted };
}
