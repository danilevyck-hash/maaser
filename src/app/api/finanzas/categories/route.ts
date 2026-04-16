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

// POST: toggle pre-defined OR create custom category
// Body A (toggle): { name, enabled }
// Body B (custom): { name, color, icon, custom: true }
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, enabled, color, icon, custom } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }

  const cleanName = name.trim();

  if (custom) {
    if (!color || !icon) {
      return NextResponse.json({ error: "Falta color o icono" }, { status: 400 });
    }
    const { data: existing } = await supabase
      .from("finance_categories")
      .select("id, name")
      .ilike("name", cleanName);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Ya existe una categoria con ese nombre" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("finance_categories")
      .insert([{ name: cleanName, color, icon }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const defaultCat = DEFAULT_CATEGORIES.find((c) => c.name === cleanName);
  if (!defaultCat) return NextResponse.json({ error: "Categoria no valida" }, { status: 400 });

  if (enabled) {
    const { data: existing } = await supabase
      .from("finance_categories")
      .select("id")
      .eq("name", cleanName)
      .maybeSingle();

    if (existing) return NextResponse.json(existing);

    const { data, error } = await supabase
      .from("finance_categories")
      .insert([{ name: defaultCat.name, color: defaultCat.color, icon: defaultCat.icon }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } else {
    const { error } = await supabase
      .from("finance_categories")
      .delete()
      .eq("name", cleanName);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }
}

// PUT: rename + migrate expenses/budgets/recurring
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { id, name, color, icon } = body;

  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  if (!name || !name.trim()) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  const cleanName = name.trim();

  const { data: current, error: getErr } = await supabase
    .from("finance_categories")
    .select("id, name")
    .eq("id", id)
    .single();

  if (getErr || !current) return NextResponse.json({ error: "Categoria no encontrada" }, { status: 404 });

  const oldName = current.name;

  if (oldName !== cleanName) {
    const { data: conflict } = await supabase
      .from("finance_categories")
      .select("id")
      .ilike("name", cleanName)
      .neq("id", id);

    if (conflict && conflict.length > 0) {
      return NextResponse.json({ error: "Ya existe una categoria con ese nombre" }, { status: 400 });
    }
  }

  const updates: Record<string, unknown> = { name: cleanName };
  if (color) updates.color = color;
  if (icon) updates.icon = icon;

  const { data, error } = await supabase
    .from("finance_categories")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (oldName !== cleanName) {
    await supabase.from("finance_expenses").update({ category: cleanName }).eq("category", oldName);
    await supabase.from("finance_budgets").update({ category: cleanName }).eq("category", oldName);
    await supabase.from("finance_recurring").update({ category: cleanName }).eq("category", oldName);
  }

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  const { error } = await supabase
    .from("finance_categories")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
