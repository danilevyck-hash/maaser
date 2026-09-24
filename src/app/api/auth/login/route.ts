import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  DURACION_COOKIE_SEG,
  NOMBRE_COOKIE,
  tokenDeSesion,
} from "@/lib/sesion";
import {
  estadoTrasFallo,
  evaluarFreno,
  type EstadoIntentos,
} from "@/lib/login-freno";

export const dynamic = "force-dynamic";

const APP_PASSWORD = process.env.APP_PASSWORD || "";
const TABLA_INTENTOS = "maaser_login_intentos";

function direccionDe(req: NextRequest): string {
  const reenviada = req.headers.get("x-forwarded-for");
  if (reenviada) return reenviada.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "desconocida";
}

// La base se carga solo cuando hace falta: el freno no debe impedir entrar
// si Supabase no está configurado.
async function base() {
  const { supabase } = await import("@/lib/supabase");
  return supabase;
}

/** Lee los intentos guardados. Si la tabla no existe todavía, falla ABIERTA. */
async function leerIntentos(ip: string): Promise<EstadoIntentos> {
  try {
    const { data, error } = await (await base())
      .from(TABLA_INTENTOS)
      .select("fallos, primer_fallo_en")
      .eq("ip", ip)
      .maybeSingle();
    if (error || !data) return null;
    return { fallos: data.fallos, primer_fallo_en: data.primer_fallo_en };
  } catch {
    return null;
  }
}

async function anotarFallo(ip: string, estado: EstadoIntentos, ahora: Date) {
  const siguiente = estadoTrasFallo(estado, ahora);
  try {
    await (await base()).from(TABLA_INTENTOS).upsert(
      {
        ip,
        fallos: siguiente.fallos,
        primer_fallo_en: siguiente.primer_fallo_en,
        actualizado_en: ahora.toISOString(),
      },
      { onConflict: "ip" }
    );
  } catch {
    // Sin la tabla no se frena a nadie: es el estado de hoy, no un retroceso.
  }
}

async function limpiarIntentos(ip: string) {
  try {
    await (await base()).from(TABLA_INTENTOS).delete().eq("ip", ip);
  } catch {
    // Igual que arriba.
  }
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

    const ip = direccionDe(req);
    const ahora = new Date();
    const estado = await leerIntentos(ip);
    const freno = evaluarFreno(estado, ahora);

    if (freno.bloqueado) {
      return NextResponse.json(
        {
          error: `Demasiados intentos. Vuelve a probar en ${freno.minutosRestantes} minuto${freno.minutosRestantes === 1 ? "" : "s"}.`,
          minutosRestantes: freno.minutosRestantes,
        },
        { status: 429 }
      );
    }

    if (password !== APP_PASSWORD) {
      await anotarFallo(ip, estado, ahora);
      const quedan = Math.max(freno.intentosRestantes - 1, 0);
      return NextResponse.json(
        {
          error: "Clave incorrecta",
          intentosRestantes: quedan,
        },
        { status: 401 }
      );
    }

    await limpiarIntentos(ip);

    const token = await tokenDeSesion(
      APP_PASSWORD,
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

    const cookieStore = await cookies();
    cookieStore.set(NOMBRE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DURACION_COOKIE_SEG,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
