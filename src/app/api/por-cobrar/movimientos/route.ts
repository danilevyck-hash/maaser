import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const clienteId = request.nextUrl.searchParams.get("cliente_id");

  let query = supabase
    .from("cxc_movimientos")
    .select("*")
    .order("fecha", { ascending: true })
    .order("id", { ascending: true });

  if (clienteId) query = query.eq("cliente_id", clienteId);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("cxc_movimientos")
    .insert([{
      cliente_id: body.cliente_id,
      fecha: body.fecha,
      tipo: body.tipo,
      monto: body.monto,
      descripcion: body.descripcion || null,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  const updates: Record<string, unknown> = {};
  if (body.fecha !== undefined) updates.fecha = body.fecha;
  if (body.monto !== undefined) updates.monto = body.monto;
  if (body.descripcion !== undefined) updates.descripcion = body.descripcion || null;

  const { data, error } = await supabase
    .from("cxc_movimientos")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  const { error } = await supabase
    .from("cxc_movimientos")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
