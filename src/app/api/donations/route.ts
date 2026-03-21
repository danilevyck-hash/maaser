import { supabase } from "@/lib/supabase";
import { seedData } from "@/lib/seed-data";
import { NextRequest, NextResponse } from "next/server";

async function ensureSeeded() {
  const { count } = await supabase
    .from("donations")
    .select("*", { count: "exact", head: true });

  if (count === 0 || count === null) {
    const rows = seedData.map((d) => ({
      receipt_number: d.receipt_number,
      date: d.date,
      beneficiary: d.beneficiary,
      amount: d.amount,
      status: d.status,
    }));
    await supabase.from("donations").insert(rows);
  }
}

export async function GET(request: NextRequest) {
  await ensureSeeded();

  const year = request.nextUrl.searchParams.get("year");

  let query = supabase
    .from("donations")
    .select("*")
    .order("receipt_number", { ascending: true });

  if (year) {
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

  const { data, error } = await supabase
    .from("donations")
    .insert([body])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

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
