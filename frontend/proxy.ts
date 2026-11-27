import { NextResponse, type NextRequest } from "next/server";

// Edge-fast gate: only checks cookie presence (real validation happens in the API).
const SESSION = "qadam_session";
const PROTECTED = ["/dashboard", "/prepare", "/attempt", "/results", "/history", "/profile", "/admin"];
const AUTH_PAGES = ["/login", "/register"];

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION)?.value);

  if (!hasSession && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (hasSession && AUTH_PAGES.includes(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/prepare/:path*", "/attempt/:path*", "/results/:path*", "/history/:path*", "/profile/:path*", "/admin/:path*", "/login", "/register"],
};
