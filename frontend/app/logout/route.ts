import { NextResponse, type NextRequest } from "next/server";

// Clears the session cookie (also used to recover from an expired session).
export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next");
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = next && next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  const res = NextResponse.redirect(url);
  res.cookies.delete("qadam_session");
  return res;
}
