import { describe, it, expect, vi, beforeEach } from "vitest";

// Doble de Supabase: guarda lo que la ruta intenta escribir en vez de escribirlo.
const db = vi.hoisted(() => ({
  property: { id: 1, name: "Local Via España", rent_amount: 1430 } as Record<string, unknown>,
  contracts: [] as Record<string, unknown>[],
  charges: [] as Record<string, unknown>[],
  updates: [] as { id: number; row: Record<string, unknown> }[],
  inserts: [] as Record<string, unknown>[],
  partialSupported: true,
}));

vi.mock("@/lib/supabase", () => {
  function from(table: string) {
    const ctx: { table: string; op: string; payload: unknown; filters: Record<string, unknown> } = {
      table,
      op: "select",
      payload: null,
      filters: {},
    };
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: (k: string, v: unknown) => { ctx.filters[k] = v; return builder; },
      order: () => builder,
      limit: () => builder,
      single: () => builder,
      update: (row: unknown) => { ctx.op = "update"; ctx.payload = row; return builder; },
      insert: (rows: unknown) => { ctx.op = "insert"; ctx.payload = rows; return builder; },
      then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
        let out: unknown;
        if (ctx.op === "update") {
          db.updates.push({ id: Number(ctx.filters.id), row: ctx.payload as Record<string, unknown> });
          out = { data: null, error: null };
        } else if (ctx.op === "insert") {
          db.inserts.push(...(ctx.payload as Record<string, unknown>[]));
          out = { data: null, error: null };
        } else if (ctx.table === "rent_properties") {
          out = { data: db.property, error: null };
        } else if (ctx.table === "rent_contracts") {
          out = { data: db.contracts, error: null };
        } else {
          out = { data: db.charges, error: null };
        }
        return Promise.resolve(out).then(res, rej);
      },
    };
    return builder;
  }
  return { supabase: { from } };
});

vi.mock("@/lib/propiedades-db", () => ({
  supportsPartialPayments: async () => db.partialSupported,
  FALTA_SQL_MSG: "falta la columna paid_amount",
  resetPaidAmountCache: () => {},
}));

const CONTRATO = {
  id: 9,
  property_id: 1,
  tenant_name: "Marta Gonzalez",
  start_date: "2026-01-01",
  end_date: "2027-12-31",
  rent_amount: 1430,
  active: true,
};

function req(body: Record<string, unknown>) {
  return { json: async () => body } as never;
}

async function post(body: Record<string, unknown>) {
  const { POST } = await import("@/app/api/propiedades/pagos/route");
  const res = await POST(req({ property_id: 1, paid_date: "2026-08-07", current_month: "2026-08", ...body }));
  return { status: res.status, data: await res.json() };
}

beforeEach(() => {
  db.property = { id: 1, name: "Local Via España", rent_amount: 1430 };
  db.contracts = [{ ...CONTRATO }];
  db.charges = [];
  db.updates = [];
  db.inserts = [];
  db.partialSupported = true;
});

describe("POST /api/propiedades/pagos", () => {
  it("rechaza sin propiedad", async () => {
    const { status } = await post({ property_id: 0, mode: "monto", amount: 100 });
    expect(status).toBe(400);
  });

  it("rechaza monto vacio o negativo", async () => {
    expect((await post({ mode: "monto", amount: 0 })).status).toBe(400);
    expect((await post({ mode: "monto", amount: -5 })).status).toBe(400);
  });

  it("rechaza 'hasta' sin mes valido", async () => {
    expect((await post({ mode: "hasta", through_month: "diciembre" })).status).toBe(400);
  });

  it("pago hasta diciembre crea los 5 meses que faltan", async () => {
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pendiente", paid_amount: 0 },
    ];
    const { status, data } = await post({ mode: "hasta", through_month: "2026-12" });
    expect(status).toBe(200);
    expect(data.months).toEqual(["2026-08", "2026-09", "2026-10", "2026-11", "2026-12"]);
    expect(data.applied_total).toBe(1430 * 5);
    // El cobro que ya existia se actualiza, los 4 nuevos se crean.
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).toEqual({ id: 1, row: { status: "pagado", paid_date: "2026-08-07", paid_amount: 1430 } });
    expect(db.inserts).toHaveLength(4);
    expect(db.inserts.every((r) => r.status === "pagado" && r.contract_id === 9)).toBe(true);
    expect(db.inserts[0]).toMatchObject({ property_id: 1, month: "2026-09", amount: 1430, due_date: "2026-09-01" });
  });

  it("abono parcial deja el mes pendiente, no pagado", async () => {
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pendiente", paid_amount: 0 },
    ];
    const { status, data } = await post({ mode: "monto", amount: 500 });
    expect(status).toBe(200);
    expect(data.months_fully_paid).toBe(0);
    expect(db.updates[0].row).toEqual({ status: "pendiente", paid_date: "2026-08-07", paid_amount: 500 });
  });

  it("saldo a favor: $5,000 paga 3 meses y abona $710 al cuarto", async () => {
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pendiente", paid_amount: 0 },
    ];
    const { status, data } = await post({ mode: "monto", amount: 5000 });
    expect(status).toBe(200);
    expect(data.months_fully_paid).toBe(3);
    expect(data.partial_month).toBe("2026-11");
    expect(data.partial_amount).toBe(710);
    expect(db.inserts).toHaveLength(3);
    const noviembre = db.inserts.find((r) => r.month === "2026-11")!;
    expect(noviembre.status).toBe("pendiente");
    expect(noviembre.paid_amount).toBe(710);
  });

  it("un mes viejo sin cubrir queda en mora, no en pendiente", async () => {
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-06", amount: 1430, status: "mora", paid_amount: 0 },
    ];
    await post({ mode: "monto", amount: 500 });
    expect(db.updates[0].row.status).toBe("mora");
  });

  it("arranca por el mes mas viejo que se debe", async () => {
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-07", amount: 1430, status: "mora", paid_amount: 0 },
      { id: 2, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pendiente", paid_amount: 0 },
    ];
    const { data } = await post({ mode: "monto", amount: 2860 });
    expect(data.months).toEqual(["2026-07", "2026-08"]);
    expect(db.updates.map((u) => u.id)).toEqual([1, 2]);
  });

  it("el caso David: sin contrato vigente igual se puede registrar el pago", async () => {
    db.property = { id: 3, name: "Condominio Marquis piso 7A", rent_amount: 800 };
    db.contracts = [
      { ...CONTRATO, id: 5, property_id: 3, tenant_name: "David Harmodio", start_date: "2025-07-03", end_date: "2026-07-02", rent_amount: 800 },
    ];
    db.charges = [
      { id: 7, property_id: 3, contract_id: 5, month: "2026-07", amount: 800, status: "pagado", paid_amount: 0 },
    ];
    const { status, data } = await post({ property_id: 3, mode: "hasta", through_month: "2026-08" });
    expect(status).toBe(200);
    expect(data.months).toEqual(["2026-08"]);
    // El cobro nuevo queda sin contrato pero con el nombre del inquilino.
    expect(db.inserts[0]).toMatchObject({
      property_id: 3,
      contract_id: null,
      tenant_name: "David Harmodio",
      month: "2026-08",
      amount: 800,
      status: "pagado",
    });
  });

  it("no deja pagar dos veces el mismo mes", async () => {
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pagado", paid_amount: 0 },
    ];
    const { status, data } = await post({ mode: "hasta", through_month: "2026-08" });
    expect(status).toBe(400);
    expect(data.error).toContain("ya está cubierta");
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("bloquea el abono parcial cuando falta la columna, sin escribir nada", async () => {
    db.partialSupported = false;
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pendiente" },
    ];
    const { status, data } = await post({ mode: "monto", amount: 500 });
    expect(status).toBe(409);
    expect(data.needs_migration).toBe(true);
    expect(db.updates).toHaveLength(0);
    expect(db.inserts).toHaveLength(0);
  });

  it("sin la columna, un pago de meses completos si se guarda (sin paid_amount)", async () => {
    db.partialSupported = false;
    db.charges = [
      { id: 1, property_id: 1, contract_id: 9, month: "2026-08", amount: 1430, status: "pendiente" },
    ];
    const { status } = await post({ mode: "hasta", through_month: "2026-09" });
    expect(status).toBe(200);
    expect(db.updates[0].row).toEqual({ status: "pagado", paid_date: "2026-08-07" });
    expect(db.inserts[0].paid_amount).toBeUndefined();
  });

  it("rechaza un monto absurdo en vez de crear años de cobros", async () => {
    const { status, data } = await post({ mode: "monto", amount: 500000 });
    expect(status).toBe(400);
    expect(data.error).toContain("Revisa la cifra");
    expect(db.inserts).toHaveLength(0);
  });

  it("no crea nada si la propiedad no tiene monto mensual", async () => {
    db.property = { id: 1, name: "Sin monto", rent_amount: 0 };
    db.contracts = [];
    const { status } = await post({ mode: "monto", amount: 100 });
    expect(status).toBe(400);
    expect(db.inserts).toHaveLength(0);
  });
});
