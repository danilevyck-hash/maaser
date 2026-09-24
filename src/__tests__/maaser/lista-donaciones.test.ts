import { describe, it, expect } from "vitest";
import { listaCorrida, ordenarPorFecha } from "@/lib/maaser/lista-donaciones";
import { getHebrewYearData } from "@/lib/hebrew-year";

// El año hebreo 5786 va del 23-sep-2025 al 11-sep-2026;
// el 5787 arranca el 12-sep-2026.
const d5786 = getHebrewYearData(5786);
const d5787 = getHebrewYearData(5787);

const dos5787 = [
  { id: 10, date: "2026-09-23", amount: 144 },
  { id: 9, date: "2026-09-22", amount: 101 },
];
const dos5786 = [
  { id: 8, date: "2026-09-11", amount: 200 },
  { id: 7, date: "2025-09-23", amount: 101 },
];

describe("la lista corrida de todos los años", () => {
  it("los años del calendario hebreo son los medidos", () => {
    expect(d5786.startDate).toBe("2025-09-23");
    expect(d5786.endDate).toBe("2026-09-11");
    expect(d5787.startDate).toBe("2026-09-12");
  });

  it("va de la más nueva a la más vieja", () => {
    const orden = ordenarPorFecha([...dos5786, ...dos5787]).map((d) => d.id);
    expect(orden).toEqual([10, 9, 8, 7]);
  });

  it("el primer año NO lleva separador: la tarjeta de arriba ya lo dice", () => {
    const renglones = listaCorrida(dos5787);
    expect(renglones.every((r) => r.tipo === "donacion")).toBe(true);
  });

  it("mete un separador al cambiar de año hebreo, con el total de ESE año", () => {
    const renglones = listaCorrida([...dos5787, ...dos5786]);
    const separadores = renglones.filter((r) => r.tipo === "separador");
    expect(separadores).toHaveLength(1);
    expect(separadores[0]).toMatchObject({ anio: 5786, total: 301, cantidad: 2 });
    // Va justo antes de la primera donación de 5786.
    const posicion = renglones.findIndex((r) => r.tipo === "separador");
    const siguiente = renglones[posicion + 1];
    expect(siguiente.tipo).toBe("donacion");
    if (siguiente.tipo === "donacion") expect(siguiente.donacion.id).toBe(8);
  });

  it("un separador por cada año, aunque sean tres", () => {
    const renglones = listaCorrida([
      ...dos5787,
      ...dos5786,
      { id: 1, date: "2025-01-24", amount: 101 }, // 5785
    ]);
    const anios = renglones.filter((r) => r.tipo === "separador").map((r) => r.anio);
    expect(anios).toEqual([5786, 5785]);
  });

  it("dos donaciones del mismo día se ordenan por la más nueva anotada", () => {
    const orden = ordenarPorFecha([
      { id: 1, date: "2026-08-12", amount: 500 },
      { id: 2, date: "2026-08-12", amount: 500 },
    ]).map((d) => d.id);
    expect(orden).toEqual([2, 1]);
  });

  it("sin donaciones no hay renglones", () => {
    expect(listaCorrida([])).toEqual([]);
  });
});
