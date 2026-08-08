/**
 * Lógica pura del control de pagos POR PROPIEDAD.
 *
 * Reglas de oro:
 * - No toca la base de datos ni el DOM: todo entra por parámetros y sale por retorno.
 * - Toda la plata se calcula en CENTAVOS (enteros) para no arrastrar errores de float.
 * - Un cobro viejo con status 'pagado' vale como pagado COMPLETO aunque su
 *   columna paid_amount sea 0 (los datos históricos no se tocan ni se migran).
 */

export const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// ─────────────────────────────── Meses ───────────────────────────────

/** 'YYYY-MM-DD' -> 'YYYY-MM' */
export function monthOf(dateStr: string): string {
  return (dateStr || "").slice(0, 7);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return `${String(ny).padStart(4, "0")}-${String(nm + 1).padStart(2, "0")}`;
}

/** Meses de `from` a `to` (negativo si `to` es anterior). */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

/** Último día del mes: '2026-02' -> '2026-02-28' */
export function lastDayOfMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m, 0));
  return `${month}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** '2026-12' -> 'diciembre 2026' */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const name = MESES[m - 1] || month;
  return `${name} ${y}`;
}

/** '2026-12' -> 'Diciembre 2026' */
export function monthLabelCap(month: string): string {
  const s = monthLabel(month);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function daysBetweenISO(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
}

// ─────────────────────────────── Plata ───────────────────────────────

export function toCents(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** $1,430.50 · $35,200 (sin decimales cuando son redondos) */
export function fmtMoney(n: number | string | null | undefined): string {
  const v = fromCents(toCents(n));
  const decimals = Number.isInteger(v) ? 0 : 2;
  return "$" + v.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─────────────────────────────── Tipos ───────────────────────────────

export type ChargeLike = {
  id?: number;
  property_id?: number;
  contract_id?: number | null;
  month: string;
  amount: number | string;
  status: string;
  paid_amount?: number | string | null;
  paid_date?: string | null;
};

export type ContractLike = {
  id: number;
  property_id: number;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: number | string;
  active: boolean;
};

export type PropertyLike = {
  id: number;
  name?: string;
  rent_amount: number | string;
};

// ───────────────────────── Cobros: pagado / falta ─────────────────────────

/** Centavos ya cubiertos de un cobro. Un 'pagado' legacy cuenta completo. */
export function paidCents(ch: ChargeLike): number {
  const amount = Math.max(0, toCents(ch.amount));
  if (ch.status === "pagado") return amount;
  const paid = toCents(ch.paid_amount ?? 0);
  return Math.max(0, Math.min(paid, amount));
}

/** Centavos que faltan de un cobro. */
export function pendingCents(ch: ChargeLike): number {
  return Math.max(0, Math.max(0, toCents(ch.amount)) - paidCents(ch));
}

export function isFullyPaid(ch: ChargeLike): boolean {
  return ch.status === "pagado" || pendingCents(ch) === 0;
}

/** Hay abono pero no está completo. */
export function isPartiallyPaid(ch: ChargeLike): boolean {
  return !isFullyPaid(ch) && paidCents(ch) > 0;
}

// ─────────────────────────── Contratos ───────────────────────────

export function contractCoveringMonth(
  contracts: ContractLike[],
  month: string,
): ContractLike | null {
  const start = `${month}-01`;
  const end = lastDayOfMonth(month);
  const matches = contracts.filter((c) => c.start_date <= end && c.end_date >= start);
  return matches.find((c) => c.active) ?? matches[0] ?? null;
}

/** Contrato vigente HOY (activo y con la fecha adentro). */
export function contractCoveringDate(
  contracts: ContractLike[],
  date: string,
): ContractLike | null {
  return contracts.find((c) => c.active && c.start_date <= date && c.end_date >= date) ?? null;
}

/** El contrato más reciente (por fecha fin), vigente o no. */
export function latestContract(contracts: ContractLike[]): ContractLike | null {
  if (contracts.length === 0) return null;
  return [...contracts].sort((a, b) => (a.end_date < b.end_date ? 1 : a.end_date > b.end_date ? -1 : 0))[0];
}

/** Cuánto vale un mes: contrato que lo cubre → último contrato → propiedad. */
export function monthlyAmountFor(
  month: string,
  contracts: ContractLike[],
  property: PropertyLike | null | undefined,
): number {
  const covering = contractCoveringMonth(contracts, month);
  if (covering && toCents(covering.rent_amount) > 0) return Number(covering.rent_amount);
  const latest = latestContract(contracts);
  if (latest && toCents(latest.rent_amount) > 0) return Number(latest.rent_amount);
  return Number(property?.rent_amount ?? 0);
}

export type ContractEndInfo = {
  expired: boolean;
  expiringSoon: boolean;
  days: number;
  text: string;
};

/** Texto humano del vencimiento. Nunca dice "-1 meses restantes". */
export function describeContractEnd(endDate: string, today: string): ContractEndInfo {
  const days = daysBetweenISO(today, endDate);
  if (days < 0) {
    const ago = -days;
    const months = Math.floor(ago / 30);
    const text =
      ago === 1 ? "Vencido hace 1 día"
      : ago < 30 ? `Vencido hace ${ago} días`
      : months === 1 ? "Vencido hace 1 mes"
      : `Vencido hace ${months} meses`;
    return { expired: true, expiringSoon: false, days, text };
  }
  if (days <= 30) {
    const text = days === 0 ? "Vence hoy" : days === 1 ? "Vence mañana" : `Vence en ${days} días`;
    return { expired: false, expiringSoon: true, days, text };
  }
  const months = Math.round(days / 30);
  return {
    expired: false,
    expiringSoon: false,
    days,
    text: months <= 1 ? `Vence en ${days} días` : `Quedan ${months} meses`,
  };
}

// ─────────────────────── Resumen por propiedad ───────────────────────

export type PropertyState = "sin_contrato" | "debe" | "sin_cobro" | "al_dia";

export type PropertySummary = {
  propertyId: number;
  tenantName: string | null;
  monthlyAmount: number;
  hasActiveContract: boolean;
  contractEndDate: string | null;
  contractEnd: ContractEndInfo | null;
  hasChargeThisMonth: boolean;
  debtMonths: number;
  debtAmount: number;
  /** Abono del mes corriente cuando está a medias. */
  partialThisMonth: { paid: number; total: number; missing: number } | null;
  /** Último mes consecutivo cubierto por completo desde el mes actual. */
  paidThrough: string | null;
  monthsAhead: number;
  /** Plata abonada a meses futuros que todavía no completan un mes. */
  creditAmount: number;
  creditMonth: string | null;
  state: PropertyState;
};

export function summarizeProperty(input: {
  property: PropertyLike;
  contracts: ContractLike[];
  charges: ChargeLike[];
  currentMonth: string;
  today: string;
}): PropertySummary {
  const { property, contracts, charges, currentMonth, today } = input;

  const byMonth = new Map<string, ChargeLike>();
  for (const ch of charges) {
    const prev = byMonth.get(ch.month);
    // Si hubiera dos cobros del mismo mes, se suman como uno solo.
    if (prev) {
      byMonth.set(ch.month, {
        ...prev,
        amount: fromCents(toCents(prev.amount) + toCents(ch.amount)),
        status: isFullyPaid(prev) && isFullyPaid(ch) ? "pagado" : "pendiente",
        paid_amount: fromCents(paidCents(prev) + paidCents(ch)),
      });
    } else {
      byMonth.set(ch.month, ch);
    }
  }

  // Deuda: todo mes hasta el actual que no esté completo.
  let debtMonths = 0;
  let debtCents = 0;
  for (const [month, ch] of byMonth) {
    if (month > currentMonth) continue;
    const missing = pendingCents(ch);
    if (missing > 0) {
      debtMonths += 1;
      debtCents += missing;
    }
  }

  const chargeThisMonth = byMonth.get(currentMonth) ?? null;
  const hasChargeThisMonth = !!chargeThisMonth;

  // Pagado hasta: cadena de meses completos que arranca en el mes actual.
  let paidThrough: string | null = null;
  if (chargeThisMonth && isFullyPaid(chargeThisMonth)) {
    paidThrough = currentMonth;
    let next = addMonths(currentMonth, 1);
    while (true) {
      const ch = byMonth.get(next);
      if (!ch || !isFullyPaid(ch)) break;
      paidThrough = next;
      next = addMonths(next, 1);
    }
  }

  // Saldo a favor: abonos en meses futuros que no alcanzan a completar el mes.
  let creditCents = 0;
  let creditMonth: string | null = null;
  const firstFutureMonth = paidThrough ? addMonths(paidThrough, 1) : addMonths(currentMonth, 1);
  for (const [month, ch] of byMonth) {
    if (month < firstFutureMonth) continue;
    if (isFullyPaid(ch)) continue;
    const paid = paidCents(ch);
    if (paid > 0) {
      creditCents += paid;
      if (!creditMonth || month < creditMonth) creditMonth = month;
    }
  }

  const activeContract = contractCoveringDate(contracts, today);
  const reference = activeContract ?? latestContract(contracts);

  let state: PropertyState;
  if (!hasChargeThisMonth && !activeContract) state = "sin_contrato";
  else if (debtMonths > 0) state = "debe";
  else if (!hasChargeThisMonth) state = "sin_cobro";
  else state = "al_dia";

  const partialThisMonth =
    chargeThisMonth && isPartiallyPaid(chargeThisMonth)
      ? {
          paid: fromCents(paidCents(chargeThisMonth)),
          total: fromCents(toCents(chargeThisMonth.amount)),
          missing: fromCents(pendingCents(chargeThisMonth)),
        }
      : null;

  return {
    propertyId: property.id,
    tenantName: reference?.tenant_name ?? null,
    monthlyAmount: monthlyAmountFor(currentMonth, contracts, property),
    hasActiveContract: !!activeContract,
    contractEndDate: reference?.end_date ?? null,
    contractEnd: reference ? describeContractEnd(reference.end_date, today) : null,
    hasChargeThisMonth,
    debtMonths,
    debtAmount: fromCents(debtCents),
    partialThisMonth,
    paidThrough,
    monthsAhead: paidThrough ? monthsBetween(currentMonth, paidThrough) : 0,
    creditAmount: fromCents(creditCents),
    creditMonth,
    state,
  };
}

export type PropertyDisplay = {
  badge: string;
  tone: "green" | "red" | "amber" | "blue";
  headline: string;
  detail: string | null;
};

/** Las dos líneas que ve papá en la tarjeta de la propiedad. */
export function describeProperty(s: PropertySummary): PropertyDisplay {
  const extras: string[] = [];
  if (s.creditAmount > 0) {
    extras.push(
      s.creditMonth
        ? `${fmtMoney(s.creditAmount)} a favor para ${monthLabel(s.creditMonth)}`
        : `${fmtMoney(s.creditAmount)} a favor`,
    );
  }

  if (s.state === "sin_contrato") {
    const detail = [
      s.contractEnd?.expired && s.contractEndDate
        ? `Contrato ${s.contractEnd.text.toLowerCase()}`
        : "No hay contrato registrado",
      s.debtMonths > 0
        ? `debe ${s.debtMonths} ${s.debtMonths === 1 ? "mes" : "meses"} · ${fmtMoney(s.debtAmount)}`
        : null,
      ...extras,
    ].filter(Boolean).join(" · ");
    return { badge: "Sin contrato", tone: "red", headline: "Sin cobro este mes", detail };
  }

  if (s.state === "debe") {
    if (s.debtMonths === 1 && s.partialThisMonth) {
      return {
        badge: "Abonó",
        tone: "amber",
        headline: `Abonó ${fmtMoney(s.partialThisMonth.paid)} de ${fmtMoney(s.partialThisMonth.total)}`,
        detail: [`Falta ${fmtMoney(s.partialThisMonth.missing)}`, ...extras].join(" · "),
      };
    }
    const meses = s.debtMonths === 1 ? "1 mes" : `${s.debtMonths} meses`;
    return {
      badge: "Debe",
      tone: "red",
      headline: `Debe ${meses} · ${fmtMoney(s.debtAmount)}`,
      detail: extras.length > 0 ? extras.join(" · ") : null,
    };
  }

  if (s.state === "sin_cobro") {
    return {
      badge: "Sin cobro",
      tone: "amber",
      headline: "Sin cobro este mes",
      detail: ["Toca Registrar pago para ponerlo al día", ...extras].join(" · "),
    };
  }

  const headline = `Pagado hasta ${monthLabel(s.paidThrough!)}`;
  const detailParts: string[] = [];
  if (s.monthsAhead > 0) {
    detailParts.push(s.monthsAhead === 1 ? "1 mes adelantado" : `${s.monthsAhead} meses adelantados`);
  }
  detailParts.push(...extras);
  return {
    badge: s.monthsAhead > 0 ? "Adelantado" : "Al día",
    tone: "green",
    headline,
    detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
  };
}

// ───────────────────── Registrar pago (asignación) ─────────────────────

export type Allocation = {
  month: string;
  chargeId?: number;
  isNew: boolean;
  monthAmount: number;
  applied: number;
  totalPaid: number;
  fullyPaid: boolean;
};

export type AllocationResult = {
  allocations: Allocation[];
  /** Total efectivamente aplicado. */
  applied: number;
  /** Plata que sobró y NO se pudo aplicar (tope de meses o mensualidad en cero). */
  leftover: number;
  monthsFullyPaid: number;
  /** Mes que quedó a medias (el saldo a favor), si lo hay. */
  partialMonth: string | null;
  partialAmount: number;
};

/**
 * Primer mes que hay que cobrar: el más viejo sin completar; si no hay ninguno,
 * el mes siguiente al último cobro registrado (nunca antes del mes corriente).
 */
export function firstUnpaidMonth(charges: ChargeLike[], currentMonth: string): string {
  let earliest: string | null = null;
  let latest: string | null = null;
  for (const ch of charges) {
    if (!latest || ch.month > latest) latest = ch.month;
    if (pendingCents(ch) > 0 && (!earliest || ch.month < earliest)) earliest = ch.month;
  }
  if (earliest) return earliest;
  if (latest && latest >= currentMonth) return addMonths(latest, 1);
  return currentMonth;
}

/**
 * Reparte un pago mes por mes desde `startMonth`.
 * - Completa cada mes antes de pasar al siguiente.
 * - Crea los meses que todavía no existen (usa `monthlyAmountFor`).
 * - Lo que sobra al final queda como abono del mes siguiente (saldo a favor).
 */
export function allocatePayment(input: {
  amount: number;
  startMonth: string;
  charges: ChargeLike[];
  amountForMonth: (month: string) => number;
  /** Tope: no pasar de este mes (modo "me pagó hasta ..."). */
  throughMonth?: string | null;
  maxMonths?: number;
}): AllocationResult {
  const { amount, startMonth, charges, amountForMonth, throughMonth = null } = input;
  const maxMonths = input.maxMonths ?? 36;

  const byMonth = new Map<string, ChargeLike>();
  for (const ch of charges) if (!byMonth.has(ch.month)) byMonth.set(ch.month, ch);

  let money = Math.max(0, toCents(amount));
  const total = money;
  const allocations: Allocation[] = [];

  for (let i = 0; i < maxMonths; i++) {
    if (money <= 0) break;
    const month = addMonths(startMonth, i);
    if (throughMonth && month > throughMonth) break;

    const existing = byMonth.get(month);
    const monthCents = existing ? Math.max(0, toCents(existing.amount)) : toCents(amountForMonth(month));
    if (monthCents <= 0) break; // sin monto no se puede cobrar: evita ciclo infinito

    const already = existing ? paidCents(existing) : 0;
    const missing = monthCents - already;
    if (missing <= 0) continue; // mes ya cubierto, seguimos al siguiente

    const apply = Math.min(money, missing);
    money -= apply;
    allocations.push({
      month,
      chargeId: existing?.id,
      isNew: !existing,
      monthAmount: fromCents(monthCents),
      applied: fromCents(apply),
      totalPaid: fromCents(already + apply),
      fullyPaid: already + apply >= monthCents,
    });
  }

  const partial = allocations.find((a) => !a.fullyPaid) ?? null;
  return {
    allocations,
    applied: fromCents(total - money),
    leftover: fromCents(money),
    monthsFullyPaid: allocations.filter((a) => a.fullyPaid).length,
    partialMonth: partial ? partial.month : null,
    partialAmount: partial ? partial.totalPaid : 0,
  };
}

/** Cuánto hace falta para dejar cubierto desde `startMonth` hasta `throughMonth`. */
export function amountToCoverThrough(input: {
  startMonth: string;
  throughMonth: string;
  charges: ChargeLike[];
  amountForMonth: (month: string) => number;
}): number {
  const { startMonth, throughMonth, charges, amountForMonth } = input;
  const byMonth = new Map<string, ChargeLike>();
  for (const ch of charges) if (!byMonth.has(ch.month)) byMonth.set(ch.month, ch);

  const span = monthsBetween(startMonth, throughMonth);
  if (span < 0) return 0;

  let cents = 0;
  for (let i = 0; i <= span; i++) {
    const month = addMonths(startMonth, i);
    const existing = byMonth.get(month);
    if (existing) cents += pendingCents(existing);
    else cents += Math.max(0, toCents(amountForMonth(month)));
  }
  return fromCents(cents);
}

/** 'agosto, septiembre y octubre 2026' — sin repetir el año. */
export function listMonths(months: string[]): string {
  if (months.length === 0) return "";
  const years = new Set(months.map((m) => m.slice(0, 4)));
  if (years.size === 1) {
    const nombres = months.map((m) => MESES[Number(m.slice(5, 7)) - 1]);
    const joined =
      nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
    return `${joined} ${months[0].slice(0, 4)}`;
  }
  const nombres = months.map(monthLabel);
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** Resumen en español de lo que va a pasar, para confirmar antes de guardar. */
export function describeAllocation(result: AllocationResult): string[] {
  const lines: string[] = [];
  const completos = result.allocations.filter((a) => a.fullyPaid);
  if (completos.length > 0) {
    const lista = listMonths(completos.map((a) => a.month));
    lines.push(completos.length === 1 ? `Queda pagado ${lista}` : `Quedan pagados ${lista}`);
  }
  const parcial = result.allocations.find((a) => !a.fullyPaid);
  if (parcial) {
    lines.push(
      `Sobran ${fmtMoney(parcial.applied)} que quedan a favor para ${monthLabel(parcial.month)} (de ${fmtMoney(parcial.monthAmount)})`,
    );
  }
  if (result.leftover > 0) {
    lines.push(`Quedan ${fmtMoney(result.leftover)} sin aplicar. Revisa el monto.`);
  }
  if (lines.length === 0) lines.push("No hay nada que cobrar con ese monto.");
  return lines;
}
