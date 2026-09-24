import { describe, it, expect } from "vitest";
import { fechaPanamaISO, hoyPanamaISO } from "@/lib/fecha-panama";

// El defecto medido: 12 donaciones quedaron con la fecha del día siguiente
// porque la app usaba la hora de Londres. Panamá es UTC−5 fijo.

describe("la fecha de Panamá", () => {
  it("a las 22:00 de Panamá la fecha es la de ESE día, no la de mañana", () => {
    // 22:00 del 23-sep en Panamá = 03:00 UTC del 24-sep.
    const momento = new Date("2026-09-24T03:00:00.000Z");
    expect(fechaPanamaISO(momento)).toBe("2026-09-23");
    // Y así es como fallaba antes:
    expect(momento.toISOString().split("T")[0]).toBe("2026-09-24");
  });

  it("a las 23:59 de Panamá todavía es el mismo día", () => {
    expect(fechaPanamaISO(new Date("2026-09-24T04:59:00.000Z"))).toBe("2026-09-23");
  });

  it("a las 00:01 de Panamá ya es el día nuevo", () => {
    expect(fechaPanamaISO(new Date("2026-09-24T05:01:00.000Z"))).toBe("2026-09-24");
  });

  it("al mediodía coincide con la fecha en UTC", () => {
    expect(fechaPanamaISO(new Date("2026-09-23T17:00:00.000Z"))).toBe("2026-09-23");
  });

  it("cruza bien el fin de mes y el fin de año", () => {
    expect(fechaPanamaISO(new Date("2027-01-01T03:30:00.000Z"))).toBe("2026-12-31");
    expect(fechaPanamaISO(new Date("2026-10-01T02:00:00.000Z"))).toBe("2026-09-30");
  });

  it("hoy siempre tiene la forma AAAA-MM-DD", () => {
    expect(hoyPanamaISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
