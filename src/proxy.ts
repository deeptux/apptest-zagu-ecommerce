import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { withBasePath } from "@/lib/base-path";

function parseRoleFromCookie(raw: string | undefined) {
  if (!raw) return null;
  const parts = raw.split(":");
  if (parts.length !== 2) return null;
  return parts[1];
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/products") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/health")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
  const role = parseRoleFromCookie(cookieValue);

  if (!role) {
    return NextResponse.redirect(new URL(withBasePath("/login"), request.url));
  }

  if (pathname.startsWith("/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL(withBasePath("/dealer/dashboard"), request.url));
  }

  if (pathname.startsWith("/dealer") && role === "ADMIN") {
    return NextResponse.redirect(new URL(withBasePath("/admin/dashboard"), request.url));
  }

  if (pathname === "/") {
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL(withBasePath("/admin/dashboard"), request.url));
    }
    return NextResponse.redirect(new URL(withBasePath("/dealer/dashboard"), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|images|products|favicon.ico).*)"],
};
