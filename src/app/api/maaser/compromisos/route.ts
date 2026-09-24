import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { normalizarMetodo } from "@/lib/maaser/metodo-pago";
import { normalizarNombre } from "@/lib/maaser/historial-beneficiario";

// Los compromisos mensuales.
//
// 🔴 FALLA ABIERTA: mientras la migración `supabase/20260924-maaser-compromisos.sql`
// no esté corrida, la tabla no existe. Entonces esto contesta 200 con
// `hay_tabla: false` y una lista vacía: la pantalla no dibuja el interruptor
// y NADA se rompe. Guardar una donación no depende de esta ruta.

export const dynamic = "force-dynamic";

const TABLA = "maaser_compromisos";

/** ¿El error es "esa tabla todavía no existe"? */
function faltaLaTabla(mensaje: string | undefined, codigo?: string): boolean {
  if (codigo === "PGRST205" || codigo === "42P01") return true;
  const m = (mensaje ?? "").toLowerCase();
  return m.includes(TABLA) && (m.includes("schema cache") || m.includes("does not exist"));
}

const SIN_TABLA = { hay_tabla: false, compromisos: [] };

export async function GET() {
  const { data, error } = await supabase
    .from(TABLA)
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    if (faltaLaTabla(error.message, error.code)) return NextResponse.json(SIN_TABLA);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hay_tabla: true, compromisos: data ?? [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const beneficiary = String(body.beneficiary ?? "").trim();
  const amount = Number(body.amount);

  if (!beneficiary) {
    return NextResponse.json({ error: "Falta a quién se le da" }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  }

  const { data: vivos, error: errorLeer } = await supabase
    .from(TABLA)
    .select("*")
    .eq("activo", true);

  if (errorLeer) {
    if (faltaLaTabla(errorLeer.message, errorLeer.code)) return NextResponse.json(SIN_TABLA);
    return NextResponse.json({ error: errorLeer.message }, { status: 500 });
  }

  const metodo = normalizarMetodo(body.metodo);
  const clave = normalizarNombre(beneficiary);
  const yaEsta = (vivos ?? []).find(
    (c: { beneficiary?: string }) => normalizarNombre(c.beneficiary) === clave
  ) as { id: number } | undefined;

  // El mismo nombre no crea una segunda línea: le cambia el monto.
  const { data, error } = yaEsta
    ? await supabase
        .from(TABLA)
        .update({ amount, metodo })
        .eq("id", yaEsta.id)
        .select()
        .single()
    : await supabase
        .from(TABLA)
        .insert([{ beneficiary, amount, metodo, activo: true }])
        .select()
        .single();

  if (error) {
    if (faltaLaTabla(error.message, error.code)) return NextResponse.json(SIN_TABLA);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hay_tabla: true, compromiso: data });
}

/** "Ya no se repite": se apaga, NUNCA se borra. */
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Falta cuál compromiso" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from(TABLA)
    .update({ activo: body.activo === true })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (faltaLaTabla(error.message, error.code)) return NextResponse.json(SIN_TABLA);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ hay_tabla: true, compromiso: data });
}
