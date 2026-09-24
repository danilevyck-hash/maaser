import { describe, it, expect } from "vitest";
import { calcularDiezmo } from "@/lib/maaser/diezmo";

describe("el 10 % de lo que gasta", () => {
  it("debe dar el 10 %, y dice cuánto falta", () => {
    const r = calcularDiezmo(800_000, 81_198);
    expect(r).not.toBeNull();
    expect(r!.debeDar).toBe(80_000);
    expect(r!.faltan).toBe(0);
  });

  it("con poco dado, lo que falta es la resta", () => {
    const r = calcularDiezmo(100_000, 678)!;
    expect(r.debeDar).toBe(10_000);
    expect(r.faltan).toBe(9_322);
    expect(r.avance).toBeCloseTo(6.78, 2);
  });

  it("pasarse no deja el faltante en negativo", () => {
    const r = calcularDiezmo(10_000, 5_000)!;
    expect(r.faltan).toBe(0);
    expect(r.avance).toBe(100);
  });

  it("sin el dato NO se inventa un número", () => {
    expect(calcularDiezmo(null, 678)).toBeNull();
    expect(calcularDiezmo(undefined, 678)).toBeNull();
    expect(calcularDiezmo(0, 678)).toBeNull();
    expect(calcularDiezmo(-100, 678)).toBeNull();
  });

  it("redondea a centavos, no arrastra decimales largos", () => {
    const r = calcularDiezmo(1_234.56, 0)!;
    expect(r.debeDar).toBe(123.46);
    expect(r.faltan).toBe(123.46);
  });
});
