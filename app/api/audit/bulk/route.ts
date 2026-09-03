import { NextRequest, NextResponse } from "next/server";
import { runAudit } from "@/lib/analyze";
import { requireAuth, AuthError } from "@/lib/auth-server";
import { ensureUserDoc, checkAndIncrementUsage, getUsageSnapshot } from "@/lib/rate-limit";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // bulk runs up to 5 sequential batches of real audits (worst case ~150s); ask the platform for headroom — actual cap is still whatever your hosting plan allows

const MAX_BULK_URLS = 20;
const CONCURRENCY = 4;
const MAX_URL_LENGTH = 2048;
const MAX_BODY_BYTES = 50 * 1024; // 20 URLs at 2048 chars each, generously bounded

interface BulkResultItem {
  url: string;
  ok: boolean;
  overall?: number;
  categories?: { key: string; label: string; score: number }[];
  error?: string;
}

async function runWithConcurrency<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runNext(): Promise<void> {
    const i = next++;
    if (i >= items.length) return;
    results[i] = await worker(items[i]);
    return runNext();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runNext()));
  return results;
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }

  let identity;
  try {
    identity = await requireAuth(req, { requireEmailVerified: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Authentication failed." }, { status: 401 });
  }

  let body: { urls?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(body.urls)) {
    return NextResponse.json({ error: "A list of URLs is required." }, { status: 400 });
  }

  const urls = Array.from(
    new Set(
      body.urls
        .filter((u): u is string => typeof u === "string")
        .map((u) => u.trim())
        .filter(Boolean)
    )
  );

  if (urls.length === 0) {
    return NextResponse.json({ error: "At least one URL is required." }, { status: 400 });
  }
  if (urls.length > MAX_BULK_URLS) {
    return NextResponse.json({ error: `Bulk audits are limited to ${MAX_BULK_URLS} URLs at once.` }, { status: 400 });
  }
  if (urls.some((u) => u.length > MAX_URL_LENGTH)) {
    return NextResponse.json({ error: "One or more URLs are too long." }, { status: 400 });
  }

  try {
    await ensureUserDoc(identity);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to set up your account.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // Bulk audits are a Pro-only feature — checked against the account's
  // real, effective (non-expired) plan, not client-supplied data. This is
  // a read-only check: nothing is consumed yet.
  const snapshot = await getUsageSnapshot(identity.uid).catch(() => null);
  if (!snapshot) {
    return NextResponse.json({ error: "Failed to check your usage limit." }, { status: 500 });
  }
  if (snapshot.plan !== "pro") {
    return NextResponse.json(
      {
        error: "Bulk audits are a Pro-plan feature. Upgrade to audit multiple URLs at once.",
        code: "PLAN_REQUIRED",
      },
      { status: 403 }
    );
  }
  if (urls.length > snapshot.remaining) {
    return NextResponse.json(
      {
        error: `This would use ${urls.length} audits, but you only have ${snapshot.remaining} left today.`,
        code: "RATE_LIMITED",
      },
      { status: 429 }
    );
  }

  // Now atomically consume one quota slot per URL, before doing any
  // network work — same fail-fast guarantee as single audits.
  for (let i = 0; i < urls.length; i++) {
    const check = await checkAndIncrementUsage(identity.uid);
    if (!check.allowed) {
      return NextResponse.json(
        { error: "Ran out of daily audits partway through — try fewer URLs.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }

  const results = await runWithConcurrency<string, BulkResultItem>(urls, CONCURRENCY, async (url) => {
    try {
      const result = await runAudit(url);
      return { url: result.url, ok: true, overall: result.overall, categories: result.categories };
    } catch (err) {
      return { url, ok: false, error: err instanceof Error ? err.message : "Failed to audit this URL." };
    }
  });

  return NextResponse.json({ results, plan: PLANS.pro.name });
}
