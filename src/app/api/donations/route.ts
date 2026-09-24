import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { normalizarMetodo } from "@/lib/maaser/metodo-pago";

// Normalize beneficiary name: trim extra spaces, Title Case.
// Una donación puede ir SIN nombre ("Guardar sin nombre"): queda en blanco y
// la pantalla la muestra como "Sin nombre", en gris.
function normalizeName(name: unknown): string {
  if (typeof name !== "string") return "";
  return name
    .trim()
    .replace(/\s+/g, " ") // collapse multiple spaces
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** La columna `metodo` puede no existir todavía: sin ella se guarda igual. */
function esColumnaQueFalta(mensaje: string | undefined): boolean {
  if (!mensaje) return false;
  const m = mensaje.toLowerCase();
  return m.includes("metodo") && (m.includes("column") || m.includes("schema cache"));
}

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("donations")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (from && to) {
    query = query.gte("date", from).lte("date", to);
  } else if (year) {
    query = query
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  }

  const row: Record<string, unknown> = {
    date: body.date,
    beneficiary: normalizeName(body.beneficiary),
    amount: body.amount,
    check_number: body.check_number || null,
    status: body.status || "valido",
    notes: body.notes || null,
  };

  const metodo = normalizarMetodo(body.metodo);

  // receipt_number column may still exist in DB with NOT NULL constraint
  if (body.receipt_number != null) {
    row.receipt_number = body.receipt_number;
  } else {
    // Auto-generate: max existing + 1, or 1 if empty
    const { data: last } = await supabase
      .from("donations")
      .select("receipt_number")
      .order("receipt_number", { ascending: false })
      .limit(1)
      .single();
    row.receipt_number = (last?.receipt_number ?? 0) + 1;
  }

  let { data, error } = await supabase
    .from("donations")
    .insert([metodo ? { ...row, metodo } : row])
    .select()
    .single();

  // Sin la migración de `metodo`, la donación se guarda igual: solo se pierde
  // la forma de pago.
  if (error && metodo && esColumnaQueFalta(error.message)) {
    ({ data, error } = await supabase
      .from("donations")
      .insert([row])
      .select()
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (body.amount !== undefined && body.amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.beneficiary !== undefined) updates.beneficiary = normalizeName(body.beneficiary);
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.check_number !== undefined) updates.check_number = body.check_number || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes || null;

  const conMetodo =
    body.metodo !== undefined
      ? { ...updates, metodo: normalizarMetodo(body.metodo) }
      : updates;

  let { data, error } = await supabase
    .from("donations")
    .update(conMetodo)
    .eq("id", id)
    .select()
    .single();

  if (error && body.metodo !== undefined && esColumnaQueFalta(error.message)) {
    ({ data, error } = await supabase
      .from("donations")
      .update(updates)
      .eq("id", id)
      .select()
      .single());
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  const { error } = await supabase.from("donations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
