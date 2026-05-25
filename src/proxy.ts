import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Admin panel access gate (proxy).
 *
 * /admin requires a valid token: /admin?token=<ADMIN_ACCESS_TOKEN>
 * Once accessed, a cookie is set so you don't need the URL param every time.
 * Without a valid token, /admin returns 404 — invisible to scanners.
 *
 * Only activates when ADMIN_ACCESS_TOKEN is explicitly set to a non-empty
 * value in Vercel environment variables. Until then, /admin is open.
 */
const COOKIE_NAME = "wa_admin_access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/admin" && pathname !== "/admin/") {
    return NextResponse.next();
  }

  const expectedToken = (process.env.ADMIN_ACCESS_TOKEN ?? "").trim();

  // Token not configured on Vercel yet — allow open access
  if (expectedToken.length === 0) {
    return NextResponse.next();
  }

  // Check cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue === expectedToken) {
    return NextResponse.next();
  }

  // Check URL query parameter
  const urlToken = request.nextUrl.searchParams.get("token");
  if (urlToken === expectedToken) {
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, expectedToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365,
      path: "/admin",
    });
    return response;
  }

  // No access — looks like any other 404
  return new NextResponse("Not Found", { status: 404 });
}

export const config = {
  matcher: ["/admin", "/admin/"],
};
