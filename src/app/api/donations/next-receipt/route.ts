import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { data, error } = await supabase
    .from("donations")
    .select("receipt_number")
    .order("receipt_number", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ next: 2667 });
  }

  return NextResponse.json({ next: data.receipt_number + 1 });
}
