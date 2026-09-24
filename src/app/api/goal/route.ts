import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const COLUMNA_GASTOS = "gastos_anuales";

/**
 * ¿La columna de "lo que gastas" ya está puesta en la base?
 * Sin ella la app funciona igual: no se muestra el 10 % y no se puede guardar.
 * Falla ABIERTA: ante cualquier duda contesta que no está.
 */
async function hayColumnaGastos(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("annual_goals")
      .select(COLUMNA_GASTOS)
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get("year") || new Date().getFullYear().toString();
  const conGastos = await hayColumnaGastos();

  const { data, error } = await supabase
    .from("annual_goals")
    .select("*")
    .eq("year", parseInt(year))
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({
      year: parseInt(year),
      goal_amount: 0,
      gastos_anuales: null,
      columna_gastos: conGastos,
    });
  }

  return NextResponse.json({
    ...data,
    gastos_anuales: conGastos
      ? ((data as Record<string, unknown>)[COLUMNA_GASTOS] as number | null) ?? null
      : null,
    columna_gastos: conGastos,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { year } = body;

  if (!year) {
    return NextResponse.json({ error: "Falta el año" }, { status: 400 });
  }

  const fila: Record<string, unknown> = { year };
  if (body.goal_amount !== undefined) fila.goal_amount = body.goal_amount;

  if (body.gastos_anuales !== undefined) {
    if (!(await hayColumnaGastos())) {
      return NextResponse.json(
        {
          error:
            "Todavía no se puede guardar lo que gastas: falta correr la migración de la base.",
        },
        { status: 409 }
      );
    }
    const monto = Number(body.gastos_anuales);
    fila[COLUMNA_GASTOS] =
      body.gastos_anuales === null || !Number.isFinite(monto) || monto <= 0
        ? null
        : monto;
  }

  // La meta no puede quedar en NULL: la columna existe desde siempre.
  if (fila.goal_amount === undefined) {
    const { data: previa } = await supabase
      .from("annual_goals")
      .select("goal_amount")
      .eq("year", year)
      .maybeSingle();
    fila.goal_amount = previa?.goal_amount ?? 0;
  }

  const { data, error } = await supabase
    .from("annual_goals")
    .upsert(fila, { onConflict: "year" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
