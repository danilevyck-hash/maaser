import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id?.trim();
  console.log("[por-cobrar/clientes/[id]] GET", { id });

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const { data: cliente, error: errCliente } = await supabase
    .from("cxc_clientes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (errCliente) {
    console.error("[por-cobrar/clientes/[id]] cliente error", errCliente);
    return NextResponse.json({ error: errCliente.message }, { status: 500 });
  }

  if (!cliente) {
    return NextResponse.json({ error: `Cliente ${id} no existe` }, { status: 404 });
  }

  const { data: movimientos, error: errMovs } = await supabase
    .from("cxc_movimientos")
    .select("*")
    .eq("cliente_id", id)
    .order("fecha", { ascending: true })
    .order("id", { ascending: true });

  if (errMovs) {
    console.error("[por-cobrar/clientes/[id]] movs error", errMovs);
    return NextResponse.json({ error: errMovs.message }, { status: 500 });
  }

  return NextResponse.json({ cliente, movimientos: movimientos || [] });
}
