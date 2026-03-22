import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { rows } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided", success: 0, errors: 0 }, { status: 400 });
  }

  let success = 0;
  let errors = 0;

  for (const row of rows) {
    const { error } = await supabase.from("donations").insert([{
      date: row.date,
      beneficiary: row.beneficiary,
      amount: row.amount,
      status: "valido",
      notes: row.notes || null,
    }]);

    if (error) {
      errors++;
    } else {
      success++;
    }
  }

  return NextResponse.json({ success, errors });
}
