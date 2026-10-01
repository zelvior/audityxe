/**
 * Single source of truth for "is this an admin email" — ADMIN_EMAILS only,
 * no hardcoded fallback. Dependency-free on purpose so auth-server,
 * user-moderation and the abuse engine can all import it without
 * creating an import cycle through lib/admin.ts.
 */
export function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = adminEmailList();
  return list.length > 0 && list.includes(email.trim().toLowerCase());
}
