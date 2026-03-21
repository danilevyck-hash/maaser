import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";

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

  const { data: existing } = await supabase
    .from("annual_goals")
    .select("*")
    .eq("year", year)
    .single();

  let result;
  if (existing) {
    result = await supabase
      .from("annual_goals")
      .update({ goal_amount })
      .eq("year", year)
      .select()
      .single();
  } else {
    result = await supabase
      .from("annual_goals")
      .insert([{ year, goal_amount }])
      .select()
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
