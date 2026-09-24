import { hebrewYearOfDate } from "@/lib/hebrew-year";
import type { DonacionMinima } from "./tipos";

// La lista de la pantalla de inicio es UNA sola lista corrida, de la donación
// más nueva a la más vieja, sin selector de año: al cambiar de año hebreo se
// mete un separador "── AÑO 5786 · $81,198 ──".
//
// El primer grupo NO lleva separador: la tarjeta de arriba ya dice en qué año
// estamos.

export type RenglonLista<T extends DonacionMinima = DonacionMinima> =
  | { tipo: "separador"; anio: number; total: number; cantidad: number }
  | { tipo: "donacion"; donacion: T };

export function ordenarPorFecha<T extends DonacionMinima>(donaciones: T[]): T[] {
  return [...donaciones].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

export function listaCorrida<T extends DonacionMinima>(
  donaciones: T[]
): RenglonLista<T>[] {
  const ordenadas = ordenarPorFecha(donaciones);

  // Totales por año, para que el separador diga cuánto se dio ese año.
  const porAnio = new Map<number, { total: number; cantidad: number }>();
  for (const d of ordenadas) {
    const anio = hebrewYearOfDate(d.date);
    const acum = porAnio.get(anio) ?? { total: 0, cantidad: 0 };
    acum.total += Number(d.amount) || 0;
    acum.cantidad += 1;
    porAnio.set(anio, acum);
  }

  const renglones: RenglonLista<T>[] = [];
  let anioAnterior: number | null = null;

  for (const d of ordenadas) {
    const anio = hebrewYearOfDate(d.date);
    if (anioAnterior !== null && anio !== anioAnterior) {
      const acum = porAnio.get(anio) ?? { total: 0, cantidad: 0 };
      renglones.push({
        tipo: "separador",
        anio,
        total: Math.round(acum.total * 100) / 100,
        cantidad: acum.cantidad,
      });
    }
    renglones.push({ tipo: "donacion", donacion: d });
    anioAnterior = anio;
  }

  return renglones;
}
