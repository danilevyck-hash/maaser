import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get("month");

  let query = supabase
    .from("rent_charges")
    .select("*, property:rent_properties(*)")
    .order("status", { ascending: true })
    .order("tenant_name");

  if (month) {
    query = query.eq("month", month);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.property_id || !body.tenant_name?.trim() || !body.amount || !body.month) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rent_charges")
    .insert([{
      property_id: body.property_id,
      contract_id: body.contract_id || null,
      tenant_name: body.tenant_name.trim(),
      month: body.month,
      amount: body.amount,
      status: body.status || "pendiente",
      due_date: body.due_date || `${body.month}-01`,
      paid_date: body.paid_date || null,
    }])
    .select("*, property:rent_properties(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const row: Record<string, unknown> = {};
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.paid_date !== undefined) row.paid_date = updates.paid_date;
  if (updates.amount !== undefined) row.amount = updates.amount;

  const { data, error } = await supabase
    .from("rent_charges")
    .update(row)
    .eq("id", id)
    .select("*, property:rent_properties(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  const { error } = await supabase.from("rent_charges").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
