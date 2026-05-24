import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Admin panel access gate.
 *
 * /admin requires a valid token: /admin?token=<ADMIN_ACCESS_TOKEN>
 * Once accessed, a cookie is set so you don't need the URL param every time.
 * Without a valid token, /admin returns 404 — invisible to scanners.
 */
const COOKIE_NAME = "wa_admin_access";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/admin" && pathname !== "/admin/") {
    return NextResponse.next();
  }

  const expectedToken = process.env.ADMIN_ACCESS_TOKEN;

  // If token isn't configured yet, allow access (dev / not set up)
  if (!expectedToken) {
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
