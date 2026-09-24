import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { supportsRecargo } from "@/lib/propiedades-db";

export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await supabase
    .from("rent_properties")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  // 24-sep-2026: el "+" de la lista pide SOLO el nombre; el alquiler se llena
  // después en Editar. Por eso un monto vacío ya no frena la creación.
  if (body.rent_amount !== undefined && body.rent_amount !== null && Number(body.rent_amount) < 0) {
    return NextResponse.json({ error: "El monto no puede ser negativo" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rent_properties")
    .insert([{
      name: body.name.trim(),
      location: body.location?.trim() || "",
      type: body.type || "residencial",
      icon: body.icon || "🏠",
      rent_amount: Number(body.rent_amount ?? 0),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (updates.rent_amount !== undefined && updates.rent_amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  }

  const row: Record<string, unknown> = {};
  if (updates.name !== undefined) row.name = updates.name.trim();
  if (updates.location !== undefined) row.location = updates.location.trim();
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.icon !== undefined) row.icon = updates.icon;
  if (updates.rent_amount !== undefined) row.rent_amount = updates.rent_amount;

  // Recargo por atraso: solo se escribe si la base ya tiene las columnas
  // (supabase/20260924-propiedades-recargo.sql). Sin ellas, se ignora.
  if (
    (updates.recargo_dia !== undefined || updates.recargo_pct !== undefined) &&
    (await supportsRecargo())
  ) {
    if (updates.recargo_dia !== undefined) row.recargo_dia = updates.recargo_dia;
    if (updates.recargo_pct !== undefined) row.recargo_pct = updates.recargo_pct;
  }

  const { data, error } = await supabase
    .from("rent_properties")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  const { error } = await supabase.from("rent_properties").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
