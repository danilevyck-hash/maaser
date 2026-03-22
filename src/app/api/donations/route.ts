import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("donations")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (from && to) {
    query = query.gte("date", from).lte("date", to);
  } else if (year) {
    query = query
      .gte("date", `${year}-01-01`)
      .lte("date", `${year}-12-31`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const row: Record<string, unknown> = {
    date: body.date,
    beneficiary: body.beneficiary,
    amount: body.amount,
    status: body.status || "valido",
    notes: body.notes || null,
  };

  // receipt_number column may still exist in DB with NOT NULL constraint
  if (body.receipt_number != null) {
    row.receipt_number = body.receipt_number;
  } else {
    // Auto-generate: max existing + 1, or 1 if empty
    const { data: last } = await supabase
      .from("donations")
      .select("receipt_number")
      .order("receipt_number", { ascending: false })
      .limit(1)
      .single();
    row.receipt_number = (last?.receipt_number ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("donations")
    .insert([row])
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

  const updates: Record<string, unknown> = {};
  if (body.date !== undefined) updates.date = body.date;
  if (body.beneficiary !== undefined) updates.beneficiary = body.beneficiary;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes || null;

  const { data, error } = await supabase
    .from("donations")
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

  const { error } = await supabase.from("donations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
