import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let query = supabase
    .from("finance_expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("id", { ascending: false });

  if (from && to) query = query.gte("date", from).lte("date", to);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { data, error } = await supabase
    .from("finance_expenses")
    .insert([{
      date: body.date,
      amount: body.amount,
      category: body.category,
      notes: body.notes || null,
      payment_method: body.payment_method,
      receipt_url: body.receipt_url || null,
      subcategory: body.subcategory || null,
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
  if (body.date !== undefined) updates.date = body.date;
  if (body.amount !== undefined) updates.amount = body.amount;
  if (body.category !== undefined) updates.category = body.category;
  if (body.notes !== undefined) updates.notes = body.notes || null;
  if (body.payment_method !== undefined) updates.payment_method = body.payment_method;
  if (body.receipt_url !== undefined) updates.receipt_url = body.receipt_url || null;
  if (body.subcategory !== undefined) updates.subcategory = body.subcategory || null;

  const { data, error } = await supabase
    .from("finance_expenses")
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
    .from("finance_expenses")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
