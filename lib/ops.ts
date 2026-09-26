/**
 * Kill switch + OTA hotfix config.
 *
 * KILL_SWITCH: set env AUDITYXE_KILL_SWITCH=1 in Vercel to take the whole
 * app into maintenance mode instantly, no redeploy needed — middleware.ts
 * reads this at request time.
 *
 * HOTFIX_BANNER: set AUDITYXE_HOTFIX_MESSAGE to push a dismissible banner
 * to every client without a deploy or Firestore write (e.g. "Audits are
 * running slow — we're on it"). Takes priority over the DB-driven
 * announcement and is served through the same /api/announcement route
 * consumed by components/AnnouncementBanner.tsx, so it reuses that
 * banner's UI (dismiss button, styling) with zero extra client code.
 */
export function isKillSwitchActive(): boolean {
  return process.env.AUDITYXE_KILL_SWITCH === "1";
}

export function getHotfixMessage(): string | null {
  return process.env.AUDITYXE_HOTFIX_MESSAGE?.trim() || null;
}

export function getMaintenanceMessage(): string {
  return (
    process.env.AUDITYXE_KILL_SWITCH_MESSAGE?.trim() ||
    "Audityxe is temporarily offline for maintenance. Please check back shortly."
  );
}
