import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category");
  if (!category) return NextResponse.json([]);

  const { data, error } = await supabase
    .from("finance_expenses")
    .select("notes")
    .eq("category", category)
    .not("notes", "is", null)
    .neq("notes", "")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get distinct notes, preserving order by most recent
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const row of data || []) {
    const note = row.notes as string;
    if (!seen.has(note)) {
      seen.add(note);
      unique.push(note);
      if (unique.length >= 5) break;
    }
  }

  return NextResponse.json(unique);
}
