import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10);
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const { data: cliente, error: errCliente } = await supabase
    .from("cxc_clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (errCliente) {
    return NextResponse.json({ error: errCliente.message }, { status: 404 });
  }

  const { data: movimientos, error: errMovs } = await supabase
    .from("cxc_movimientos")
    .select("*")
    .eq("cliente_id", id)
    .order("fecha", { ascending: true })
    .order("id", { ascending: true });

  if (errMovs) {
    return NextResponse.json({ error: errMovs.message }, { status: 500 });
  }

  return NextResponse.json({ cliente, movimientos: movimientos || [] });
}
