import { NextRequest, NextResponse } from "next/server";
import { isKillSwitchActive, getMaintenanceMessage } from "@/lib/ops";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maintenance$).*)"],
};

export function middleware(req: NextRequest) {
  if (!isKillSwitchActive()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // Crawler files stay readable during maintenance. A 503 on /robots.txt
  // makes Google treat the WHOLE site as disallowed (after a few days of
  // 5xx), and a 503 on /sitemap.xml shows up in Search Console as
  // "Sitemap could not be read". Pages themselves still get the 503.
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt" || pathname === "/llms.txt" || pathname === "/llms-full.txt") {
    return NextResponse.next();
  }
  if (pathname === "/maintenance" || pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: getMaintenanceMessage(), killSwitch: true }, { status: 503 });
    }
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.rewrite(url, { status: 503 });
}
