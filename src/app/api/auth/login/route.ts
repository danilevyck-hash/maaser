import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const APP_PASSWORD = process.env.APP_PASSWORD || "";

async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Clave requerida" }, { status: 400 });
    }

    if (!APP_PASSWORD) {
      return NextResponse.json(
        { error: "APP_PASSWORD no configurada en el servidor" },
        { status: 500 }
      );
    }

    if (password !== APP_PASSWORD) {
      return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
    }

    // Create a session token
    const token = await hashPassword(APP_PASSWORD + process.env.NEXT_PUBLIC_SUPABASE_URL);

    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
