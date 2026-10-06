import { NextRequest, NextResponse } from "next/server";
import { adminGate, adminFail, pageSize } from "@/lib/admin-api";
import { adminDb } from "@/lib/firebase/admin";
import { listUsersPage, countUsers } from "@/lib/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLANS = new Set(["free", "standard", "pro"]);
const STATUSES = new Set(["active", "suspended", "banned"]);

/**
 * Cursor-paginated user list. Browse = newest first (any size); a query
 * searches by uid / email prefix / name prefix. `?count=1` adds the total
 * (one aggregation query — never a scan).
 */
export async function GET(req: NextRequest) {
  try {
    await adminGate(req);
    const sp = req.nextUrl.searchParams;
    const plan = sp.get("plan") || "";
    const status = sp.get("status") || "";
    const page = await listUsersPage(adminDb(), {
      q: (sp.get("q") || "").slice(0, 200),
      plan: PLANS.has(plan) ? (plan as "free" | "standard" | "pro") : "",
      status: STATUSES.has(status) ? (status as "active" | "suspended" | "banned") : "",
      cursor: sp.get("cursor"),
      limit: pageSize(req),
    });
    const total = sp.get("count") === "1" ? await countUsers() : undefined;
    // `users` is an alias of `items` for the older dashboard tabs that read data.users.
    return NextResponse.json({ ...page, users: page.items, total });
  } catch (err) {
    return adminFail(err, "Failed to list users.");
  }
}
