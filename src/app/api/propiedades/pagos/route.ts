import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { supportsPartialPayments, FALTA_SQL_MSG } from "@/lib/propiedades-db";
import { todayLocalISO } from "@/lib/format";
import {
  allocatePayment,
  amountToCoverThrough,
  contractCoveringMonth,
  firstUnpaidMonth,
  latestContract,
  monthOf,
  monthlyAmountFor,
  describeAllocation,
  type ChargeLike,
  type ContractLike,
} from "@/lib/propiedades-pagos";

export const dynamic = "force-dynamic";

const MAX_MONTHS = 36;

/** Le dice a la pantalla si ya se puede guardar abonos parciales. */
export async function GET() {
  const partial = await supportsPartialPayments();
  return NextResponse.json({
    partial_supported: partial,
    message: partial ? null : FALTA_SQL_MSG,
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const propertyId = Number(body.property_id);
  const mode = body.mode === "hasta" ? "hasta" : "monto";
  const paidDate = typeof body.paid_date === "string" && body.paid_date ? body.paid_date : todayLocalISO();
  // El mes corriente lo manda el telefono (sabe la hora de Panama); el servidor
  // corre en UTC y el ultimo dia del mes se pasaria de mes.
  const currentMonth =
    typeof body.current_month === "string" && /^\d{4}-\d{2}$/.test(body.current_month)
      ? body.current_month
      : monthOf(todayLocalISO());

  if (!propertyId || Number.isNaN(propertyId)) {
    return NextResponse.json({ error: "Falta la propiedad" }, { status: 400 });
  }

  const throughMonth = typeof body.through_month === "string" ? body.through_month : null;
  const rawAmount = Number(body.amount);

  if (mode === "hasta" && !/^\d{4}-\d{2}$/.test(throughMonth || "")) {
    return NextResponse.json({ error: "Elige hasta qué mes te pagó" }, { status: 400 });
  }
  if (mode === "monto" && (!Number.isFinite(rawAmount) || rawAmount <= 0)) {
    return NextResponse.json({ error: "Escribe cuánto te pagó" }, { status: 400 });
  }

  // ── Datos de la propiedad ──────────────────────────────────────────
  const [{ data: property, error: pErr }, { data: contractsRaw, error: cErr }, { data: chargesRaw, error: chErr }] =
    await Promise.all([
      supabase.from("rent_properties").select("*").eq("id", propertyId).single(),
      supabase.from("rent_contracts").select("*").eq("property_id", propertyId),
      supabase.from("rent_charges").select("*").eq("property_id", propertyId).order("month"),
    ]);

  if (pErr || !property) return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

  const contracts = (contractsRaw || []) as ContractLike[];
  const charges = (chargesRaw || []) as ChargeLike[];
  const amountForMonth = (month: string) => monthlyAmountFor(month, contracts, property);

  const startMonth = firstUnpaidMonth(charges, currentMonth);

  const amount =
    mode === "hasta"
      ? amountToCoverThrough({ startMonth, throughMonth: throughMonth!, charges, amountForMonth })
      : rawAmount;

  if (amount <= 0) {
    return NextResponse.json({ error: "Esta propiedad ya está cubierta hasta ese mes" }, { status: 400 });
  }

  const result = allocatePayment({
    amount,
    startMonth,
    charges,
    amountForMonth,
    throughMonth: mode === "hasta" ? throughMonth : null,
    maxMonths: MAX_MONTHS,
  });

  if (result.allocations.length === 0) {
    return NextResponse.json(
      { error: "No hay nada que cobrar. Revisa el monto mensual de la propiedad." },
      { status: 400 },
    );
  }
  if (result.leftover > 0 && mode === "monto") {
    return NextResponse.json(
      { error: `Ese monto cubre más de ${MAX_MONTHS} meses. Revisa la cifra.` },
      { status: 400 },
    );
  }

  const partialSupported = await supportsPartialPayments();
  const needsPartial = result.allocations.some((a) => !a.fullyPaid);
  if (needsPartial && !partialSupported) {
    return NextResponse.json({ error: FALTA_SQL_MSG, needs_migration: true }, { status: 409 });
  }

  // ── Guardar ────────────────────────────────────────────────────────
  const applied: string[] = [];
  for (const alloc of result.allocations) {
    const status = alloc.fullyPaid ? "pagado" : alloc.month < currentMonth ? "mora" : "pendiente";

    if (alloc.chargeId) {
      const row: Record<string, unknown> = { status, paid_date: paidDate };
      if (partialSupported) row.paid_amount = alloc.totalPaid;
      const { error } = await supabase.from("rent_charges").update(row).eq("id", alloc.chargeId);
      if (error) {
        return NextResponse.json(
          { error: `Se guardaron ${applied.length} mes(es) y falló ${alloc.month}: ${error.message}` },
          { status: 500 },
        );
      }
    } else {
      const covering = contractCoveringMonth(contracts, alloc.month);
      const fallback = latestContract(contracts);
      const row: Record<string, unknown> = {
        property_id: propertyId,
        contract_id: covering?.id ?? null,
        tenant_name: covering?.tenant_name || fallback?.tenant_name || property.name,
        month: alloc.month,
        amount: alloc.monthAmount,
        status,
        due_date: `${alloc.month}-01`,
        paid_date: paidDate,
      };
      if (partialSupported) row.paid_amount = alloc.totalPaid;
      const { error } = await supabase.from("rent_charges").insert([row]);
      if (error) {
        return NextResponse.json(
          { error: `Se guardaron ${applied.length} mes(es) y falló ${alloc.month}: ${error.message}` },
          { status: 500 },
        );
      }
    }
    applied.push(alloc.month);
  }

  return NextResponse.json({
    ok: true,
    applied_total: result.applied,
    months: applied,
    months_fully_paid: result.monthsFullyPaid,
    partial_month: result.partialMonth,
    partial_amount: result.partialAmount,
    resumen: describeAllocation(result),
  });
}
