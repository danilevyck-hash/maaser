import { NextRequest, NextResponse } from "next/server";
import { NOMBRE_COOKIE, tokenDeSesion } from "@/lib/sesion";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login page, API auth routes, static files, and cron endpoint
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get(NOMBRE_COOKIE)?.value;
  const appPassword = process.env.APP_PASSWORD || "";

  if (!session || !appPassword) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const esperado = await tokenDeSesion(
    appPassword,
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  if (session !== esperado) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except _next/static, _next/image, and files with extensions
     */
    "/((?!_next/static|_next/image|.*\\..*$).*)",
  ],
};
