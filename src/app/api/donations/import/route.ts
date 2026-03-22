import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

function normalizeDate(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // ISO 8601 datetime (e.g. "2026-01-15T00:00:00.000Z" — Date objects serialized to JSON)
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
    }
  }

  // DD/MM/YYYY
  const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const { rows } = await request.json();

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided", success: 0, errors: 0 }, { status: 400 });
  }

  let success = 0;
  let errors = 0;

  // Get current max receipt_number to auto-increment
  const { data: last } = await supabase
    .from("donations")
    .select("receipt_number")
    .order("receipt_number", { ascending: false })
    .limit(1)
    .single();
  let nextReceipt = (last?.receipt_number ?? 0) + 1;

  for (const row of rows) {
    const date = normalizeDate(row.date);
    if (!date) {
      errors++;
      continue;
    }

    const { error } = await supabase.from("donations").insert([{
      receipt_number: nextReceipt,
      date,
      beneficiary: row.beneficiary,
      amount: row.amount,
      status: "valido",
      notes: row.notes || null,
    }]);

    if (error) {
      errors++;
    } else {
      success++;
      nextReceipt++;
    }
  }

  return NextResponse.json({ success, errors });
}
