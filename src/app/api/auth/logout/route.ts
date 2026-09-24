import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { NOMBRE_COOKIE } from "@/lib/sesion";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(NOMBRE_COOKIE);
  return NextResponse.json({ ok: true });
}
