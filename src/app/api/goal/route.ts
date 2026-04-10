import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const year = request.nextUrl.searchParams.get("year") || new Date().getFullYear().toString();

  const { data, error } = await supabase
    .from("annual_goals")
    .select("*")
    .eq("year", parseInt(year))
    .single();

  if (error || !data) {
    return NextResponse.json({ year: parseInt(year), goal_amount: 0 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { year, goal_amount } = body;

  const { data, error } = await supabase
    .from("annual_goals")
    .upsert({ year, goal_amount }, { onConflict: "year" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
