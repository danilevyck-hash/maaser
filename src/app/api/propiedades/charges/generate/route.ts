import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const month = body.month; // 'YYYY-MM'

  if (!month) {
    return NextResponse.json({ error: "El mes es requerido" }, { status: 400 });
  }

  const monthStart = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const monthEnd = new Date(y, m, 0).toISOString().split("T")[0]; // last day

  // Get active contracts that cover this month
  const { data: contracts, error: cErr } = await supabase
    .from("rent_contracts")
    .select("*")
    .eq("active", true)
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  // Get existing charges for this month
  const { data: existing, error: eErr } = await supabase
    .from("rent_charges")
    .select("contract_id")
    .eq("month", month);

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  const existingContractIds = new Set((existing || []).map(c => c.contract_id));

  // Create missing charges
  const toInsert = (contracts || [])
    .filter(c => !existingContractIds.has(c.id))
    .map(c => ({
      property_id: c.property_id,
      contract_id: c.id,
      tenant_name: c.tenant_name,
      month,
      amount: c.rent_amount,
      status: "pendiente",
      due_date: monthStart,
    }));

  if (toInsert.length > 0) {
    const { error: iErr } = await supabase
      .from("rent_charges")
      .insert(toInsert);

    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  // Update old pendiente charges to mora (previous months)
  const { error: uErr } = await supabase
    .from("rent_charges")
    .update({ status: "mora" })
    .eq("status", "pendiente")
    .lt("month", month);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ generated: toInsert.length });
}
