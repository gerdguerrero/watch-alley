import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Admin panel cookie persistence (proxy).
 *
 * When /admin is accessed with a valid ?token= query parameter, a secure
 * HTTP-only cookie is set so return visitors don't need the URL param.
 *
 * The proxy does NOT block access — the admin panel's own Supabase Auth
 * and `admin_whoami()` allowlist handle authorization. Blocking here would
 * also block Supabase password-reset links, which arrive as bare /admin
 * with an #access_token hash that never reaches the server.
 */
const COOKIE_NAME = "wa_admin_access";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/admin" && pathname !== "/admin/") {
    return NextResponse.next();
  }

  const expectedToken = (process.env.ADMIN_ACCESS_TOKEN ?? "").trim();
  if (expectedToken.length === 0) {
    return NextResponse.next();
  }

  // If the visitor already has a valid cookie, pass through.
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue === expectedToken) {
    return NextResponse.next();
  }

  // If they arrived with a valid token, set the cookie and pass through.
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

  // No valid token — allow access anyway. The admin panel's Supabase Auth
  // and allowlist handle real security. Blocking here would also block
  // password-reset links from Supabase email (hash fragments never reach
  // the server, so we can't distinguish a reset link from a scanner).
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/"],
};
