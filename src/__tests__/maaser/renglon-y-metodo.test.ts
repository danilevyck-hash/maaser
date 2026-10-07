import { describe, it, expect } from "vitest";
import { normalizarMetodo, etiquetaMetodo } from "@/lib/maaser/metodo-pago";
import {
  esSinNombre,
  fechaCorta,
  nombreEnPantalla,
  subtituloRenglon,
} from "@/lib/maaser/renglon";
import { rangoEnPalabras } from "@/lib/maaser/fecha-en-palabras";
import {
  anterioresDelBeneficiario,
  textoAnteriores,
} from "@/lib/maaser/historial-beneficiario";

describe("cómo pagó", () => {
  it("acepta los tres medidos", () => {
    expect(normalizarMetodo("cheque")).toBe("cheque");
    expect(normalizarMetodo("Transferencia")).toBe("transferencia");
    expect(normalizarMetodo("  TARJETA ")).toBe("tarjeta");
    expect(etiquetaMetodo("transferencia")).toBe("Yappy o transferencia");
  });

  it("un valor raro no se guarda ni revienta", () => {
    expect(normalizarMetodo("efectivo")).toBeNull();
    expect(normalizarMetodo(undefined)).toBeNull();
    expect(normalizarMetodo(7)).toBeNull();
  });
});

describe("el renglón de la lista", () => {
  it("sin nombre dice «Sin nombre»", () => {
    expect(nombreEnPantalla({ date: "2026-09-23", amount: 1, beneficiary: "   " })).toBe("Sin nombre");
    expect(esSinNombre({ date: "2026-09-23", amount: 1 })).toBe(true);
    expect(esSinNombre({ date: "2026-09-23", amount: 1, beneficiary: "Rab Gil" })).toBe(false);
  });

  it("la fecha se ve corta", () => {
    expect(fechaCorta("2026-09-23")).toBe("23 sep");
    expect(fechaCorta("2026-01-05")).toBe("5 ene");
  });

  it("junta fecha, cheque y nota en una sola línea", () => {
    expect(
      subtituloRenglon({
        date: "2026-09-14",
        amount: 180,
        check_number: "2933",
        notes: "esposa enferma",
      })
    ).toBe("14 sep · cheque 2933 · esposa enferma");
  });

  it("sin cheque, muestra cómo pagó", () => {
    expect(
      subtituloRenglon({ date: "2026-09-23", amount: 144, metodo: "transferencia" })
    ).toBe("23 sep · Yappy o transferencia");
  });

  it("la nota larga se corta", () => {
    const largo = subtituloRenglon({
      date: "2026-07-02",
      amount: 3120,
      notes: "Yeshiva del Rab Tawill 260xmes pago en tarjetas y algo más",
    });
    expect(largo.endsWith("…")).toBe(true);
    expect(largo.length).toBeLessThan(60);
  });
});

describe("lo que le diste antes a ese beneficiario", () => {
  const donaciones = [
    { id: 1, date: "2026-03-23", beneficiary: "Rab Gil", amount: 1000 },
    { id: 2, date: "2026-04-25", beneficiary: "Rab Gil", amount: 1000 },
    { id: 3, date: "2026-05-25", beneficiary: "rab  gíl", amount: 1000 },
    { id: 4, date: "2026-06-01", beneficiary: "Rab Gilberto", amount: 500 },
  ];

  it("junta el mismo nombre aunque cambien tildes y espacios", () => {
    const anteriores = anterioresDelBeneficiario(donaciones, "RAB GIL");
    expect(anteriores.map((d) => d.id)).toEqual([3, 2, 1]);
  });

  it("NUNCA pega por parecido: «Rab Gilberto» es otra persona", () => {
    const anteriores = anterioresDelBeneficiario(donaciones, "Rab Gilberto");
    expect(anteriores.map((d) => d.id)).toEqual([4]);
  });

  it("al editar, no se cuenta a sí misma", () => {
    const anteriores = anterioresDelBeneficiario(donaciones, "Rab Gil", 3);
    expect(anteriores.map((d) => d.id)).toEqual([2, 1]);
  });

  it("arma la línea azul con las últimas tres", () => {
    const anteriores = anterioresDelBeneficiario(donaciones, "Rab Gil");
    expect(textoAnteriores("Rab Gil", anteriores)).toBe(
      "A Rab Gil le diste $1,000 en mayo · $1,000 en abril · $1,000 en marzo"
    );
  });

  it("sin nombre o sin historia, no dice nada", () => {
    expect(anterioresDelBeneficiario(donaciones, "  ")).toEqual([]);
    expect(textoAnteriores("Nadie", [])).toBeNull();
  });
});

// El mes hebreo, dicho con fechas de verdad y CORTO (Daniel, 6-oct-2026:
// «debajo de cada mes, la fecha» · «más minimalista, 2 feb – 5 oct»).
describe("el rango de un mes, corto", () => {
  it("dentro del mismo año, sin año", () => {
    expect(rangoEnPalabras("2026-09-16", "2026-10-15")).toBe("16 sep – 15 oct");
  });

  it("cuando el mes cruza de año, los DOS años", () => {
    expect(rangoEnPalabras("2025-12-21", "2026-01-18")).toBe("21 dic 2025 – 18 ene 2026");
  });

  it("sin fechas no inventa nada", () => {
    expect(rangoEnPalabras("", "")).toBe("");
    expect(rangoEnPalabras("cualquiera", "2027-01-18")).toBe("");
  });
});
