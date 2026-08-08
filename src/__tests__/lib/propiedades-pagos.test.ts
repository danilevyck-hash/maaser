import { describe, it, expect } from "vitest";
import {
  addMonths,
  monthsBetween,
  lastDayOfMonth,
  monthLabel,
  monthLabelCap,
  fmtMoney,
  toCents,
  paidCents,
  pendingCents,
  isFullyPaid,
  isPartiallyPaid,
  describeContractEnd,
  monthlyAmountFor,
  contractCoveringDate,
  summarizeProperty,
  describeProperty,
  firstUnpaidMonth,
  allocatePayment,
  amountToCoverThrough,
  describeAllocation,
  type ChargeLike,
  type ContractLike,
} from "@/lib/propiedades-pagos";

const PROP = { id: 1, name: "PH parque Marbella", rent_amount: 1000 };

function charge(month: string, amount: number, status = "pendiente", paid_amount: number | null = 0, id = 0): ChargeLike {
  return { id: id || Number(month.replace("-", "")), property_id: 1, month, amount, status, paid_amount };
}

function contract(over: Partial<ContractLike> = {}): ContractLike {
  return {
    id: 1,
    property_id: 1,
    tenant_name: "Ana María",
    start_date: "2025-08-01",
    end_date: "2027-07-31",
    rent_amount: 1000,
    active: true,
    ...over,
  };
}

describe("meses", () => {
  it("suma y resta meses cruzando el año", () => {
    expect(addMonths("2026-08", 1)).toBe("2026-09");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-08", 12)).toBe("2027-08");
  });

  it("cuenta meses entre dos", () => {
    expect(monthsBetween("2026-08", "2026-12")).toBe(4);
    expect(monthsBetween("2026-08", "2026-08")).toBe(0);
    expect(monthsBetween("2026-08", "2026-07")).toBe(-1);
  });

  it("da el último día del mes (incluye febrero bisiesto)", () => {
    expect(lastDayOfMonth("2026-02")).toBe("2026-02-28");
    expect(lastDayOfMonth("2028-02")).toBe("2028-02-29");
    expect(lastDayOfMonth("2026-08")).toBe("2026-08-31");
  });

  it("escribe el mes en español", () => {
    expect(monthLabel("2026-12")).toBe("diciembre 2026");
    expect(monthLabelCap("2026-08")).toBe("Agosto 2026");
  });
});

describe("fmtMoney", () => {
  it("no muestra decimales cuando el monto es redondo", () => {
    expect(fmtMoney(1000)).toBe("$1,000");
    expect(fmtMoney(35200)).toBe("$35,200");
    expect(fmtMoney(0)).toBe("$0");
  });

  it("muestra dos decimales cuando hace falta", () => {
    expect(fmtMoney(1430.5)).toBe("$1,430.50");
    expect(fmtMoney(710.25)).toBe("$710.25");
  });

  it("acepta strings de Postgres", () => {
    expect(fmtMoney("17600.00")).toBe("$17,600");
  });

  it("no arrastra errores de float", () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(fmtMoney(0.1 + 0.2)).toBe("$0.30");
  });
});

describe("cobros: cuánto está pagado", () => {
  it("un cobro viejo con status pagado cuenta completo aunque paid_amount sea 0", () => {
    const ch = charge("2026-07", 1430, "pagado", 0);
    expect(paidCents(ch)).toBe(143000);
    expect(pendingCents(ch)).toBe(0);
    expect(isFullyPaid(ch)).toBe(true);
  });

  it("funciona si la columna paid_amount todavía no existe (undefined)", () => {
    const ch: ChargeLike = { id: 1, month: "2026-08", amount: 1430, status: "pendiente" };
    expect(paidCents(ch)).toBe(0);
    expect(pendingCents(ch)).toBe(143000);
  });

  it("reconoce el abono parcial", () => {
    const ch = charge("2026-08", 1430, "pendiente", 500);
    expect(isPartiallyPaid(ch)).toBe(true);
    expect(isFullyPaid(ch)).toBe(false);
    expect(pendingCents(ch)).toBe(93000);
  });

  it("nunca deja pendiente negativo aunque el abono se pase", () => {
    const ch = charge("2026-08", 1430, "pendiente", 5000);
    expect(pendingCents(ch)).toBe(0);
    expect(isFullyPaid(ch)).toBe(true);
  });
});

describe("describeContractEnd", () => {
  it("dice 'Vencido hace 1 mes' en vez de '-1 meses restantes'", () => {
    const r = describeContractEnd("2026-07-02", "2026-08-07");
    expect(r.expired).toBe(true);
    expect(r.text).toBe("Vencido hace 1 mes");
  });

  it("cuenta días cuando venció hace poco", () => {
    expect(describeContractEnd("2026-08-05", "2026-08-07").text).toBe("Vencido hace 2 días");
    expect(describeContractEnd("2026-08-06", "2026-08-07").text).toBe("Vencido hace 1 día");
  });

  it("avisa el vencimiento cercano", () => {
    expect(describeContractEnd("2026-08-07", "2026-08-07").text).toBe("Vence hoy");
    expect(describeContractEnd("2026-08-27", "2026-08-07").text).toBe("Vence en 20 días");
    expect(describeContractEnd("2026-08-27", "2026-08-07").expiringSoon).toBe(true);
  });

  it("muestra meses restantes cuando falta mucho", () => {
    const r = describeContractEnd("2027-07-31", "2026-08-07");
    expect(r.expired).toBe(false);
    expect(r.expiringSoon).toBe(false);
    expect(r.text).toBe("Quedan 12 meses");
  });
});

describe("monthlyAmountFor", () => {
  it("usa el contrato que cubre el mes", () => {
    expect(monthlyAmountFor("2026-08", [contract({ rent_amount: 1200 })], PROP)).toBe(1200);
  });

  it("cae al último contrato cuando el mes quedó fuera", () => {
    const vencido = contract({ end_date: "2026-07-02", rent_amount: 800 });
    expect(monthlyAmountFor("2026-08", [vencido], PROP)).toBe(800);
  });

  it("cae al monto de la propiedad cuando no hay contratos", () => {
    expect(monthlyAmountFor("2026-08", [], PROP)).toBe(1000);
  });

  it("contractCoveringDate ignora contratos vencidos", () => {
    expect(contractCoveringDate([contract({ end_date: "2026-07-02" })], "2026-08-07")).toBeNull();
  });
});

describe("summarizeProperty", () => {
  const base = { property: PROP, currentMonth: "2026-08", today: "2026-08-07" };

  it("Pagado hasta diciembre cuando los meses siguientes están completos", () => {
    const charges = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map((m) =>
      charge(m, 1000, "pagado"),
    );
    const s = summarizeProperty({ ...base, contracts: [contract()], charges });
    expect(s.state).toBe("al_dia");
    expect(s.paidThrough).toBe("2026-12");
    expect(s.monthsAhead).toBe(4);
    expect(describeProperty(s).headline).toBe("Pagado hasta diciembre 2026");
    expect(describeProperty(s).badge).toBe("Adelantado");
  });

  it("corta la cadena en el primer mes que falta", () => {
    const charges = [
      charge("2026-08", 1000, "pagado"),
      charge("2026-09", 1000, "pagado"),
      charge("2026-11", 1000, "pagado"), // hueco en octubre
    ];
    const s = summarizeProperty({ ...base, contracts: [contract()], charges });
    expect(s.paidThrough).toBe("2026-09");
    expect(s.monthsAhead).toBe(1);
  });

  it("Debe 2 meses cuando hay dos meses sin cubrir", () => {
    const charges = [
      charge("2026-07", 17600, "mora"),
      charge("2026-08", 17600, "pendiente"),
    ];
    const s = summarizeProperty({
      ...base,
      contracts: [contract({ tenant_name: "José", rent_amount: 17600 })],
      charges,
    });
    expect(s.state).toBe("debe");
    expect(s.debtMonths).toBe(2);
    expect(s.debtAmount).toBe(35200);
    expect(describeProperty(s).headline).toBe("Debe 2 meses · $35,200");
  });

  it("el caso David: contrato vencido y sin cobro del mes NO puede decir 'Al día'", () => {
    const vencido = contract({ tenant_name: "David Harmodio", end_date: "2026-07-02", rent_amount: 800 });
    const charges = [charge("2026-07", 800, "pagado")];
    const s = summarizeProperty({ ...base, contracts: [vencido], charges });
    expect(s.state).toBe("sin_contrato");
    expect(s.hasChargeThisMonth).toBe(false);
    expect(s.hasActiveContract).toBe(false);
    const d = describeProperty(s);
    expect(d.badge).toBe("Sin contrato");
    expect(d.headline).toBe("Sin cobro este mes");
    expect(d.detail).toBe("Contrato vencido hace 1 mes");
  });

  it("sin contrato pero con deuda vieja: muestra las dos cosas", () => {
    const vencido = contract({ end_date: "2026-07-02", rent_amount: 800 });
    const charges = [charge("2026-07", 800, "pendiente")];
    const s = summarizeProperty({ ...base, contracts: [vencido], charges });
    expect(s.state).toBe("sin_contrato");
    expect(s.debtMonths).toBe(1);
    expect(describeProperty(s).detail).toContain("debe 1 mes · $800");
  });

  it("contrato vigente sin cobro generado: 'Sin cobro este mes', nunca 'Al día'", () => {
    const s = summarizeProperty({ ...base, contracts: [contract()], charges: [] });
    expect(s.state).toBe("sin_cobro");
    expect(describeProperty(s).badge).toBe("Sin cobro");
  });

  it("abono parcial del mes corriente", () => {
    const charges = [charge("2026-08", 1430, "pendiente", 500)];
    const s = summarizeProperty({ ...base, contracts: [contract({ rent_amount: 1430 })], charges });
    expect(s.state).toBe("debe");
    expect(s.partialThisMonth).toEqual({ paid: 500, total: 1430, missing: 930 });
    const d = describeProperty(s);
    expect(d.headline).toBe("Abonó $500 de $1,430");
    expect(d.detail).toBe("Falta $930");
  });

  it("saldo a favor: el abono del mes futuro se reporta aparte", () => {
    const charges = [
      charge("2026-08", 1430, "pagado"),
      charge("2026-09", 1430, "pagado"),
      charge("2026-10", 1430, "pagado"),
      charge("2026-11", 1430, "pendiente", 710),
    ];
    const s = summarizeProperty({ ...base, contracts: [contract({ rent_amount: 1430 })], charges });
    expect(s.paidThrough).toBe("2026-10");
    expect(s.creditAmount).toBe(710);
    expect(s.creditMonth).toBe("2026-11");
    expect(describeProperty(s).detail).toContain("$710 a favor para noviembre 2026");
  });

  it("no cuenta como deuda un mes futuro sin pagar", () => {
    const charges = [charge("2026-08", 1000, "pagado"), charge("2026-09", 1000, "pendiente")];
    const s = summarizeProperty({ ...base, contracts: [contract()], charges });
    expect(s.debtMonths).toBe(0);
    expect(s.state).toBe("al_dia");
    expect(s.paidThrough).toBe("2026-08");
  });
});

describe("firstUnpaidMonth", () => {
  const cur = "2026-08";

  it("toma el mes más viejo que falta", () => {
    const charges = [charge("2026-06", 800, "mora"), charge("2026-08", 800, "pendiente")];
    expect(firstUnpaidMonth(charges, cur)).toBe("2026-06");
  });

  it("si todo está pagado hasta diciembre, arranca en enero", () => {
    const charges = ["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"].map((m) => charge(m, 800, "pagado"));
    expect(firstUnpaidMonth(charges, cur)).toBe("2027-01");
  });

  it("si no hay cobros, arranca en el mes corriente", () => {
    expect(firstUnpaidMonth([], cur)).toBe("2026-08");
  });

  it("si los cobros son todos viejos y pagados, arranca en el mes corriente", () => {
    expect(firstUnpaidMonth([charge("2026-07", 800, "pagado")], cur)).toBe("2026-08");
  });
});

describe("allocatePayment", () => {
  const amountForMonth = () => 1430;

  it("paga exacto un mes", () => {
    const r = allocatePayment({
      amount: 1430,
      startMonth: "2026-08",
      charges: [charge("2026-08", 1430)],
      amountForMonth,
    });
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0].fullyPaid).toBe(true);
    expect(r.leftover).toBe(0);
    expect(r.partialMonth).toBeNull();
  });

  it("paga de menos: queda abono parcial y el mes NO se marca pagado", () => {
    const r = allocatePayment({
      amount: 500,
      startMonth: "2026-08",
      charges: [charge("2026-08", 1430)],
      amountForMonth,
    });
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0].fullyPaid).toBe(false);
    expect(r.allocations[0].totalPaid).toBe(500);
    expect(r.partialMonth).toBe("2026-08");
    expect(r.leftover).toBe(0);
  });

  it("suma sobre un abono anterior hasta completar el mes", () => {
    const r = allocatePayment({
      amount: 930,
      startMonth: "2026-08",
      charges: [charge("2026-08", 1430, "pendiente", 500)],
      amountForMonth,
    });
    expect(r.allocations[0].applied).toBe(930);
    expect(r.allocations[0].totalPaid).toBe(1430);
    expect(r.allocations[0].fullyPaid).toBe(true);
  });

  it("paga de más: 3 meses completos y $710 a favor del cuarto (el caso de Daniel)", () => {
    const r = allocatePayment({
      amount: 5000,
      startMonth: "2026-08",
      charges: [charge("2026-08", 1430)],
      amountForMonth,
    });
    expect(r.monthsFullyPaid).toBe(3);
    expect(r.allocations.map((a) => a.month)).toEqual(["2026-08", "2026-09", "2026-10", "2026-11"]);
    expect(r.allocations.slice(0, 3).every((a) => a.fullyPaid)).toBe(true);
    expect(r.partialMonth).toBe("2026-11");
    expect(r.partialAmount).toBe(710);
    expect(r.applied).toBe(5000);
    expect(r.leftover).toBe(0);
  });

  it("crea los meses que todavía no existen", () => {
    const r = allocatePayment({
      amount: 2860,
      startMonth: "2026-08",
      charges: [],
      amountForMonth,
    });
    expect(r.allocations.every((a) => a.isNew)).toBe(true);
    expect(r.monthsFullyPaid).toBe(2);
  });

  it("respeta el monto propio de cada cobro existente, no la mensualidad nueva", () => {
    const r = allocatePayment({
      amount: 2000,
      startMonth: "2026-07",
      charges: [charge("2026-07", 800)],
      amountForMonth,
    });
    expect(r.allocations[0].monthAmount).toBe(800);
    expect(r.allocations[1].monthAmount).toBe(1430);
  });

  it("salta los meses que ya están pagados sin gastar plata", () => {
    const r = allocatePayment({
      amount: 1430,
      startMonth: "2026-08",
      charges: [charge("2026-08", 1430, "pagado"), charge("2026-09", 1430)],
      amountForMonth,
    });
    expect(r.allocations).toHaveLength(1);
    expect(r.allocations[0].month).toBe("2026-09");
  });

  it("no se pasa del mes tope cuando se cobra 'hasta diciembre'", () => {
    const r = allocatePayment({
      amount: 99999,
      startMonth: "2026-08",
      charges: [],
      amountForMonth,
      throughMonth: "2026-12",
    });
    expect(r.allocations.map((a) => a.month)).toEqual([
      "2026-08", "2026-09", "2026-10", "2026-11", "2026-12",
    ]);
    expect(r.leftover).toBe(99999 - 1430 * 5);
  });

  it("devuelve leftover en vez de crear años de cobros por un tecleo malo", () => {
    const r = allocatePayment({
      amount: 500000,
      startMonth: "2026-08",
      charges: [],
      amountForMonth,
      maxMonths: 36,
    });
    expect(r.allocations).toHaveLength(36);
    expect(r.leftover).toBeGreaterThan(0);
    expect(r.applied + r.leftover).toBe(500000);
  });

  it("no entra en ciclo infinito si la mensualidad es cero", () => {
    const r = allocatePayment({
      amount: 1000,
      startMonth: "2026-08",
      charges: [],
      amountForMonth: () => 0,
    });
    expect(r.allocations).toHaveLength(0);
    expect(r.leftover).toBe(1000);
  });

  it("monto cero o negativo no hace nada", () => {
    for (const amount of [0, -50]) {
      const r = allocatePayment({ amount, startMonth: "2026-08", charges: [], amountForMonth });
      expect(r.allocations).toHaveLength(0);
      expect(r.applied).toBe(0);
    }
  });

  it("los centavos cuadran exacto (nada se pierde ni se inventa)", () => {
    const r = allocatePayment({
      amount: 1000.05,
      startMonth: "2026-08",
      charges: [charge("2026-08", 333.35), charge("2026-09", 333.35), charge("2026-10", 333.35)],
      amountForMonth,
    });
    expect(r.monthsFullyPaid).toBe(3);
    expect(r.applied).toBe(1000.05);
    expect(r.leftover).toBe(0);
  });
});

describe("amountToCoverThrough", () => {
  const amountForMonth = () => 1000;

  it("suma solo lo que falta de cada mes", () => {
    const total = amountToCoverThrough({
      startMonth: "2026-08",
      throughMonth: "2026-12",
      charges: [charge("2026-08", 1000, "pendiente", 400)],
      amountForMonth,
    });
    expect(total).toBe(600 + 1000 * 4);
  });

  it("es cero si el mes tope es anterior al inicio", () => {
    expect(
      amountToCoverThrough({ startMonth: "2026-08", throughMonth: "2026-07", charges: [], amountForMonth }),
    ).toBe(0);
  });

  it("cubrir hasta el mismo mes cuesta un mes", () => {
    expect(
      amountToCoverThrough({ startMonth: "2026-08", throughMonth: "2026-08", charges: [], amountForMonth }),
    ).toBe(1000);
  });

  it("el total calculado deja todo pagado sin sobrantes", () => {
    const charges = [charge("2026-08", 1000, "pendiente", 400)];
    const total = amountToCoverThrough({ startMonth: "2026-08", throughMonth: "2026-10", charges, amountForMonth });
    const r = allocatePayment({
      amount: total,
      startMonth: "2026-08",
      charges,
      amountForMonth,
      throughMonth: "2026-10",
    });
    expect(r.monthsFullyPaid).toBe(3);
    expect(r.partialMonth).toBeNull();
    expect(r.leftover).toBe(0);
  });
});

describe("describeAllocation", () => {
  it("explica en español lo que va a pasar", () => {
    const r = allocatePayment({
      amount: 5000,
      startMonth: "2026-08",
      charges: [],
      amountForMonth: () => 1430,
    });
    const lines = describeAllocation(r);
    expect(lines[0]).toBe("Quedan pagados agosto, septiembre y octubre 2026");
    expect(lines[1]).toBe("Sobran $710 que quedan a favor para noviembre 2026 (de $1,430)");
  });

  it("avisa cuando no alcanza para nada", () => {
    const r = allocatePayment({ amount: 0, startMonth: "2026-08", charges: [], amountForMonth: () => 1000 });
    expect(describeAllocation(r)).toEqual(["No hay nada que cobrar con ese monto."]);
  });
});
