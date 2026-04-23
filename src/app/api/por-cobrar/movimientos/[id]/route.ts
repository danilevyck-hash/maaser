import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.fecha !== undefined) {
    if (!body.fecha) {
      return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
    }
    updates.fecha = body.fecha;
  }

  if (body.monto !== undefined) {
    const monto = Number(body.monto);
    if (!monto || monto <= 0) {
      return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
    }
    updates.monto = monto;
  }

  if (body.descripcion !== undefined) {
    updates.descripcion = body.descripcion?.trim() || null;
  }

  const { data, error } = await supabase
    .from("cxc_movimientos")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("[por-cobrar/movimientos/[id]] update error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id?.trim();
  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const { error } = await supabase.from("cxc_movimientos").delete().eq("id", id);

  if (error) {
    console.error("[por-cobrar/movimientos/[id]] delete error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
