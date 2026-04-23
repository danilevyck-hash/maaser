import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id?.trim();
  console.log("[por-cobrar/clientes/[id]] GET", { id, rawParams: params });

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  // Use same pattern as the working list endpoint: select * then filter in JS.
  // Avoids any .eq() / UUID / column-type surprises.
  const { data: clientes, error: errClientes } = await supabase
    .from("cxc_clientes")
    .select("*");

  if (errClientes) {
    console.error("[por-cobrar/clientes/[id]] clientes error", errClientes);
    return NextResponse.json({ error: errClientes.message }, { status: 500 });
  }

  const cliente = (clientes || []).find((c) => String(c.id) === id);
  console.log("[por-cobrar/clientes/[id]] cliente found?", !!cliente, "of", clientes?.length);

  if (!cliente) {
    return NextResponse.json({ error: `Cliente ${id} no existe` }, { status: 404 });
  }

  const { data: allMovs, error: errMovs } = await supabase
    .from("cxc_movimientos")
    .select("*");

  if (errMovs) {
    console.error("[por-cobrar/clientes/[id]] movs error", errMovs);
    return NextResponse.json({ error: errMovs.message }, { status: 500 });
  }

  const movimientos = (allMovs || [])
    .filter((m) => String(m.cliente_id) === id)
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return String(a.id).localeCompare(String(b.id));
    });

  console.log("[por-cobrar/clientes/[id]] movimientos", {
    totalMovs: allMovs?.length,
    filtered: movimientos.length,
    sampleCliente: allMovs?.[0]?.cliente_id,
  });

  return NextResponse.json({ cliente, movimientos });
}
