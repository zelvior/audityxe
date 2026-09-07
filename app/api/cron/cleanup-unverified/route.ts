import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STALE_AFTER_DAYS = 7;

/**
 * Deletes Firebase Auth accounts that have never verified their email
 * and were created more than STALE_AFTER_DAYS ago. This is the real
 * retention mechanism for keeping the user base free of abandoned
 * signups: since ensureUserDoc() (lib/rate-limit.ts) never writes a
 * Firestore document for an unverified account, an account that never
 * verifies has no Firestore footprint at all — this job only needs to
 * clean up the Firebase Auth record itself.
 *
 * Wired up via Vercel Cron (see vercel.json) to run once a day, for
 * free, on Vercel's Hobby plan. Protected by a shared secret so it
 * can't be triggered by anyone who finds the URL.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cutoff = Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let scanned = 0;
  let pageToken: string | undefined;

  try {
    do {
      const page = await adminAuth().listUsers(1000, pageToken);
      pageToken = page.pageToken;

      const staleUids = page.users
        .filter((u) => {
          scanned++;
          const createdAtMs = new Date(u.metadata.creationTime).getTime();
          // Federated (Google/GitHub) sign-ins are effectively pre-verified
          // by their provider and are never targeted by this cleanup, even
          // if Firebase happens to report emailVerified=false for one.
          const isFederatedOnly = u.providerData.some((p) => p.providerId !== "password");
          return !u.emailVerified && !isFederatedOnly && createdAtMs < cutoff;
        })
        .map((u) => u.uid);

      for (const uid of staleUids) {
        try {
          await adminAuth().deleteUser(uid);
          deleted++;
        } catch {
          // Skip and continue — one failed deletion shouldn't abort the run.
        }
      }
    } while (pageToken);

    return NextResponse.json({ ok: true, scanned, deleted, staleAfterDays: STALE_AFTER_DAYS });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cleanup failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
