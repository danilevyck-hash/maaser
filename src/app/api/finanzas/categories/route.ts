import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_CATEGORIES } from "@/lib/finance-categories";

export const dynamic = "force-dynamic";
export async function GET() {
  const { data, error } = await supabase
    .from("finance_categories")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Auto-initialize: if 0 categories, insert all defaults
  if (!data || data.length === 0) {
    const toInsert = DEFAULT_CATEGORIES.map((c) => ({
      name: c.name,
      color: c.color,
      icon: c.icon,
    }));
    const { data: inserted, error: insertError } = await supabase
      .from("finance_categories")
      .insert(toInsert)
      .select();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    return NextResponse.json(inserted || []);
  }

  return NextResponse.json(data);
}

// Toggle category on/off
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, enabled } = body;

  if (!name) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  const defaultCat = DEFAULT_CATEGORIES.find((c) => c.name === name);
  if (!defaultCat) return NextResponse.json({ error: "Categoria no valida" }, { status: 400 });

  if (enabled) {
    // Check if already exists
    const { data: existing } = await supabase
      .from("finance_categories")
      .select("id")
      .eq("name", name)
      .single();

    if (existing) return NextResponse.json(existing);

    const { data, error } = await supabase
      .from("finance_categories")
      .insert([{ name: defaultCat.name, color: defaultCat.color, icon: defaultCat.icon }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    // Delete category (expenses keep their category name)
    const { error } = await supabase
      .from("finance_categories")
      .delete()
      .eq("name", name);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();

  const { error } = await supabase
    .from("finance_categories")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
