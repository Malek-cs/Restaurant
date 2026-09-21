import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

/**
 * First line of defence for /admin and /api/admin: rejects requests without a
 * validly signed session cookie before they reach any page or handler.
 * Handlers and layouts still perform the authoritative DB session +
 * permission check (see getCurrentUser / apiRoute).
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySessionToken(token) : null;

  if (pathname.startsWith("/api/admin")) {
    if (!claims) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Please sign in to continue." } }, { status: 401 });
    }
    return NextResponse.next();
  }

  // /admin pages
  const isLogin = pathname === "/admin/login";
  if (!claims && !isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (claims && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
