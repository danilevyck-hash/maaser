// CANDADO de los módulos puros del historial (6-oct-2026).
//
// Lo que cuida:
//  1. Por fecha = la lista de siempre, con separador de año.
//  2. Por monto y por nombre = UNA lista pareja, sin separadores, y el empate
//     se rompe por fecha (la más nueva primero).
//  3. El número de cheque entra en la línea SOLO si se lo pide; apagado, la
//     línea sale idéntica a la de hoy.
import { describe, it, expect } from "vitest";
import { historialOrdenado, textoDelOrden } from "@/lib/maaser/orden";
import { lineaDeLaFila } from "@/lib/maaser/renglon";
import {
  filtrarPorBeneficiario,
  filtrarPorNombreOCheque,
} from "@/lib/maaser/busqueda";
import { DE_5786, DE_5787, TODAS } from "../maaser-datos-de-prueba";

const HOY = "2026-09-23";

describe("el orden del historial", () => {
  it("por fecha es la lista de siempre, con el separador de 5786", () => {
    const renglones = historialOrdenado(TODAS, "fecha");
    const separadores = renglones.filter((r) => r.tipo === "separador");
    expect(separadores).toHaveLength(1);
    expect(separadores[0]).toMatchObject({ tipo: "separador", anio: 5786 });
    expect(renglones).toHaveLength(TODAS.length + 1);
  });

  it("por monto baja de mayor a menor y no lleva separadores", () => {
    const renglones = historialOrdenado(TODAS, "monto");
    expect(renglones.every((r) => r.tipo === "donacion")).toBe(true);
    const montos = renglones.map((r) => (r.tipo === "donacion" ? r.donacion.amount : 0));
    expect(montos).toEqual([...montos].sort((a, b) => b - a));
    expect(montos[0]).toBe(4800);
  });

  it("por nombre va de la A a la Z, sin tildes ni mayúsculas que estorben", () => {
    const nombres = historialOrdenado(TODAS, "nombre").map((r) =>
      r.tipo === "donacion" ? r.donacion.beneficiary : ""
    );
    expect(nombres[0]).toBe("Alberto Sedani");
    expect(nombres[nombres.length - 1]).toBe("Shaare Jesed");
    // "Rubén Elin" se ordena por "ruben": va después de "Rab Gil".
    expect(nombres.indexOf("Rubén Elin")).toBeGreaterThan(nombres.indexOf("Rab Gil"));
  });

  it("el empate de monto se rompe por fecha: la más nueva primero", () => {
    // $101 dos veces en 5787: el 22 de septiembre y el 15.
    const ciento = historialOrdenado(DE_5787, "monto")
      .map((r) => (r.tipo === "donacion" ? r.donacion : null))
      .filter((d) => d?.amount === 101);
    expect(ciento.map((d) => d?.date)).toEqual(["2026-09-22", "2026-09-15"]);
  });

  it("el empate de nombre se rompe por fecha: Rab Gil, mayo antes que abril", () => {
    const gil = historialOrdenado(DE_5786, "nombre")
      .map((r) => (r.tipo === "donacion" ? r.donacion : null))
      .filter((d) => d?.beneficiary === "Rab Gil");
    expect(gil.map((d) => d?.date)).toEqual(["2026-05-25", "2026-04-25"]);
  });

  it("ninguna donación se pierde ni se repite al cambiar el orden", () => {
    for (const orden of ["fecha", "monto", "nombre"] as const) {
      const ids = historialOrdenado(TODAS, orden)
        .filter((r) => r.tipo === "donacion")
        .map((r) => (r.tipo === "donacion" ? r.donacion.id : 0));
      expect(new Set(ids).size).toBe(TODAS.length);
    }
  });

  it("no toca el arreglo que recibe", () => {
    const copia = [...TODAS];
    historialOrdenado(TODAS, "monto");
    expect(TODAS).toEqual(copia);
  });

  it("sin donaciones, sin renglones", () => {
    expect(historialOrdenado([], "monto")).toEqual([]);
  });

  it("los tres órdenes se dicen en español", () => {
    expect(textoDelOrden("fecha")).toBe("Por fecha");
    expect(textoDelOrden("monto")).toBe("Por monto");
    expect(textoDelOrden("nombre")).toBe("Por nombre");
  });
});

describe("el cheque en la línea de la fila", () => {
  const conCheque = { date: "2026-09-22", amount: 101, check_number: "2936" };

  it("apagado, la línea es la de hoy: ni una palabra más", () => {
    expect(lineaDeLaFila(conCheque, HOY)).toBe("ayer");
    expect(lineaDeLaFila({ ...conCheque, notes: "Esposa enferma" }, HOY)).toBe(
      "ayer · Esposa enferma"
    );
  });

  it("prendido, el cheque va entre la fecha y la nota", () => {
    expect(lineaDeLaFila(conCheque, HOY, { cheque: true })).toBe("ayer · Cheque 2936");
    expect(lineaDeLaFila({ ...conCheque, notes: "Esposa enferma" }, HOY, { cheque: true })).toBe(
      "ayer · Cheque 2936 · Esposa enferma"
    );
  });

  it("un cheque «0000» no es un cheque: no se dibuja", () => {
    expect(
      lineaDeLaFila({ date: "2026-09-22", amount: 101, check_number: "0000" }, HOY, {
        cheque: true,
      }),
    ).toBe("ayer");
  });

  it("con el año, la fecha dice de cuándo es: «22 sep 2026»", () => {
    expect(lineaDeLaFila(conCheque, HOY, { cheque: true, anio: true })).toBe(
      "22 sep 2026 · Cheque 2936",
    );
  });

  it("sin cheque no inventa nada, y «hoy» sigue diciendo hoy", () => {
    expect(lineaDeLaFila({ date: HOY, amount: 144 }, HOY, { cheque: true })).toBe("hoy");
    expect(lineaDeLaFila({ date: HOY, amount: 144, check_number: "  " }, HOY, { cheque: true })).toBe("hoy");
  });
});

// PROPUESTA de la auditoría (6-oct-2026): buscar también por número de
// cheque, que es con lo que cuadra con el banco. Hoy buscar es SOLO por
// nombre y escribir «2936» no encuentra nada.
describe("buscar por número de cheque", () => {
  it("un número encuentra la donación de ese cheque", () => {
    const halladas = filtrarPorNombreOCheque(TODAS, "2936");
    expect(halladas.length).toBeGreaterThan(0);
    expect(halladas.every((d) => String(d.check_number ?? "").includes("2936"))).toBe(true);
    // Y hoy, por nombre, eso no encuentra nada: de ahí la propuesta.
    expect(filtrarPorBeneficiario(TODAS, "2936")).toHaveLength(0);
  });

  it("un nombre sigue buscándose por nombre", () => {
    const porNombre = filtrarPorBeneficiario(TODAS, "alberto");
    expect(porNombre.length).toBeGreaterThan(0);
    expect(filtrarPorNombreOCheque(TODAS, "alberto")).toEqual(porNombre);
  });

  it("sin texto devuelve todo, y un cheque «0000» no se confunde", () => {
    expect(filtrarPorNombreOCheque(TODAS, "   ")).toEqual(TODAS);
    expect(filtrarPorNombreOCheque(TODAS, "999999")).toHaveLength(0);
  });
});
