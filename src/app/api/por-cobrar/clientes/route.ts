import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: clientes, error: errClientes } = await supabase
    .from("cxc_clientes")
    .select("*")
    .order("nombre", { ascending: true });

  if (errClientes) {
    return NextResponse.json({ error: errClientes.message }, { status: 500 });
  }

  const { data: movs, error: errMovs } = await supabase
    .from("cxc_movimientos")
    .select("cliente_id, tipo, monto, fecha");

  if (errMovs) {
    return NextResponse.json({ error: errMovs.message }, { status: 500 });
  }

  const balances = new Map<number, number>();
  const ultimos = new Map<number, string>();
  for (const m of movs || []) {
    const signo = m.tipo === "cargo" ? 1 : -1;
    balances.set(m.cliente_id, (balances.get(m.cliente_id) || 0) + signo * Number(m.monto));
    const prev = ultimos.get(m.cliente_id);
    if (!prev || m.fecha > prev) ultimos.set(m.cliente_id, m.fecha);
  }

  const enriched = (clientes || []).map((c) => ({
    ...c,
    balance: Math.round((balances.get(c.id) || 0) * 100) / 100,
    ultimo_movimiento: ultimos.get(c.id) || null,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.nombre || !body.nombre.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cxc_clientes")
    .insert([{
      nombre: body.nombre.trim(),
      telefono: body.telefono?.trim() || null,
      notas: body.notas?.trim() || null,
    }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.nombre !== undefined) {
    if (!body.nombre.trim()) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }
    updates.nombre = body.nombre.trim();
  }
  if (body.telefono !== undefined) updates.telefono = body.telefono?.trim() || null;
  if (body.notas !== undefined) updates.notas = body.notas?.trim() || null;

  const { data, error } = await supabase
    .from("cxc_clientes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const { error: errMovs } = await supabase
    .from("cxc_movimientos")
    .delete()
    .eq("cliente_id", id);

  if (errMovs) {
    return NextResponse.json({ error: errMovs.message }, { status: 500 });
  }

  const { error } = await supabase.from("cxc_clientes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
