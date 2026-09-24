import { describe, it, expect } from "vitest";
import { aniosHebreosConDatos } from "@/lib/maaser/anios-con-datos";
import { hebrewYearOfDate } from "@/lib/hebrew-year";

describe("los años hebreos del Resumen", () => {
  it("una fecha cae en el año hebreo que le toca", () => {
    expect(hebrewYearOfDate("2026-09-23")).toBe(5787); // ya arrancó 5787
    expect(hebrewYearOfDate("2026-09-11")).toBe(5786); // último día de 5786
    expect(hebrewYearOfDate("2025-09-23")).toBe(5786); // primer día de 5786
    expect(hebrewYearOfDate("2025-01-24")).toBe(5785);
  });

  it("salen de las fechas, del más nuevo al más viejo", () => {
    const anios = aniosHebreosConDatos([
      { date: "2026-09-23", amount: 144 },
      { date: "2026-09-11", amount: 200 },
      { date: "2025-01-24", amount: 101 },
    ]);
    expect(anios.map((a) => a.anio)).toEqual([5787, 5786, 5785]);
  });

  it("cada año trae su total y su cantidad", () => {
    const anios = aniosHebreosConDatos([
      { date: "2026-09-23", amount: 144 },
      { date: "2026-09-22", amount: 101 },
      { date: "2026-09-11", amount: 200 },
    ]);
    expect(anios[0]).toEqual({ anio: 5787, total: 245, cantidad: 2 });
    expect(anios[1]).toEqual({ anio: 5786, total: 200, cantidad: 1 });
  });

  it("el año en curso se ofrece aunque esté en cero", () => {
    const anios = aniosHebreosConDatos([{ date: "2026-09-11", amount: 200 }], 5787);
    expect(anios.map((a) => a.anio)).toEqual([5787, 5786]);
    expect(anios[0]).toEqual({ anio: 5787, total: 0, cantidad: 0 });
  });

  it("sin donaciones y sin año en curso, la lista queda vacía", () => {
    expect(aniosHebreosConDatos([])).toEqual([]);
  });
});
