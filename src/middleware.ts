import { NextRequest, NextResponse } from "next/server";

async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

  const session = req.cookies.get("session")?.value;
  const appPassword = process.env.APP_PASSWORD || "";

  if (!session || !appPassword) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const expectedToken = await hashPassword(
    appPassword + process.env.NEXT_PUBLIC_SUPABASE_URL
  );

  if (session !== expectedToken) {
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
