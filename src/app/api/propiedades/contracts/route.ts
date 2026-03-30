import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("rent_contracts")
    .select("*, property:rent_properties(*)")
    .order("end_date", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.property_id) {
    return NextResponse.json({ error: "La propiedad es requerida" }, { status: 400 });
  }
  if (!body.tenant_name?.trim()) {
    return NextResponse.json({ error: "El nombre del inquilino es requerido" }, { status: 400 });
  }
  if (!body.start_date || !body.end_date) {
    return NextResponse.json({ error: "Las fechas son requeridas" }, { status: 400 });
  }
  if (!body.rent_amount || body.rent_amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a cero" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rent_contracts")
    .insert([{
      property_id: body.property_id,
      tenant_name: body.tenant_name.trim(),
      tenant_phone: body.tenant_phone?.trim() || null,
      tenant_email: body.tenant_email?.trim() || null,
      start_date: body.start_date,
      end_date: body.end_date,
      rent_amount: body.rent_amount,
      active: true,
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
  if (updates.property_id !== undefined) row.property_id = updates.property_id;
  if (updates.tenant_name !== undefined) row.tenant_name = updates.tenant_name.trim();
  if (updates.tenant_phone !== undefined) row.tenant_phone = updates.tenant_phone?.trim() || null;
  if (updates.tenant_email !== undefined) row.tenant_email = updates.tenant_email?.trim() || null;
  if (updates.start_date !== undefined) row.start_date = updates.start_date;
  if (updates.end_date !== undefined) row.end_date = updates.end_date;
  if (updates.rent_amount !== undefined) row.rent_amount = updates.rent_amount;
  if (updates.active !== undefined) row.active = updates.active;

  const { data, error } = await supabase
    .from("rent_contracts")
    .update(row)
    .eq("id", id)
    .select("*, property:rent_properties(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  const { error } = await supabase.from("rent_contracts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
