import { NextRequest, NextResponse } from "next/server";
import { isKillSwitchActive, getMaintenanceMessage } from "@/lib/ops";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|maintenance$).*)"],
};

export function middleware(req: NextRequest) {
  if (!isKillSwitchActive()) return NextResponse.next();

  const { pathname } = req.nextUrl;
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
