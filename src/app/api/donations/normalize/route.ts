import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export async function POST() {
  // Fetch all donations
  const { data: donations, error } = await supabase
    .from("donations")
    .select("id, beneficiary");

  if (error || !donations) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }

  let updated = 0;
  for (const d of donations) {
    const normalized = normalizeName(d.beneficiary);
    if (normalized !== d.beneficiary) {
      await supabase
        .from("donations")
        .update({ beneficiary: normalized })
        .eq("id", d.id);
      updated++;
    }
  }

  return NextResponse.json({ total: donations.length, updated });
}
