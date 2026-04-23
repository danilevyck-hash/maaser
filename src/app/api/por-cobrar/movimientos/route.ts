import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TIPOS = ["cargo", "abono", "ajuste"] as const;

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.cliente_id) {
    return NextResponse.json({ error: "Cliente requerido" }, { status: 400 });
  }
  if (!body.fecha) {
    return NextResponse.json({ error: "Fecha requerida" }, { status: 400 });
  }
  if (!TIPOS.includes(body.tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  const monto = Number(body.monto);
  if (!monto || monto <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  }

  // Explicitly omit id — let Supabase generate it via gen_random_uuid().
  const payload = {
    cliente_id: body.cliente_id,
    fecha: body.fecha,
    tipo: body.tipo,
    monto,
    descripcion: body.descripcion?.trim() || null,
  };
  console.log("[por-cobrar/movimientos] POST payload", payload);

  const { data, error } = await supabase
    .from("cxc_movimientos")
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error("[por-cobrar/movimientos] POST error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log("[por-cobrar/movimientos] POST inserted", { id: data?.id, cliente_id: data?.cliente_id });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const { error } = await supabase.from("cxc_movimientos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
