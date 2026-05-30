import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, getSessionFromRequest } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Get session token
  const token = getSessionFromRequest(request);

  if (!token && !isPublicPath) {
    // Not authenticated and trying to access protected route
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token) {
    const session = await verifySession(token);

    if (!session && !isPublicPath) {
      // Invalid session, redirect to login
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("session");
      return response;
    }

    if (session && pathname === "/login") {
      // Already authenticated, redirect to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
