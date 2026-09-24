import { describe, it, expect } from "vitest";
import { montosFrecuentes } from "@/lib/maaser/montos-frecuentes";

function repetir(monto: number, veces: number) {
  return Array.from({ length: veces }, (_, i) => ({
    id: monto * 1000 + i,
    date: "2026-01-01",
    amount: monto,
  }));
}

describe("los cinco botones de monto", () => {
  // Medido el 23-sep-2026 sobre las 266 donaciones de producción.
  const comoEnProduccion = [
    ...repetir(101, 67),
    ...repetir(180, 58),
    ...repetir(260, 26),
    ...repetir(126, 17),
    ...repetir(360, 17),
    ...repetir(54, 12),
    ...repetir(600, 11),
    ...repetir(72, 9),
  ];

  it("salen de los datos, no de una lista escrita a mano", () => {
    expect(montosFrecuentes(comoEnProduccion)).toEqual([101, 180, 260, 126, 360]);
  });

  it("con empate gana el monto más chico", () => {
    // 126 y 360 empatan en 17 usos: primero el de $126.
    const cinco = montosFrecuentes(comoEnProduccion);
    expect(cinco.indexOf(126)).toBeLessThan(cinco.indexOf(360));
  });

  it("ignora los montos en cero o negativos", () => {
    const sucias = [
      ...repetir(101, 3),
      { id: 1, date: "2026-01-01", amount: 0 },
      { id: 2, date: "2026-01-01", amount: -50 },
    ];
    expect(montosFrecuentes(sucias)).toEqual([101]);
  });

  it("sin donaciones no inventa botones", () => {
    expect(montosFrecuentes([])).toEqual([]);
  });

  it("devuelve como mucho los que se le piden", () => {
    expect(montosFrecuentes(comoEnProduccion, 3)).toEqual([101, 180, 260]);
  });
});
