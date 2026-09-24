import { hebrewYearOfDate } from "@/lib/hebrew-year";
import type { DonacionMinima } from "./tipos";

// Los años del Resumen no son una lista escrita a mano: son los años hebreos
// que TIENEN donaciones, derivados de las fechas. Más el año en curso, que
// siempre se ofrece aunque todavía no tenga nada (el 12 de septiembre de 2026
// el año nuevo arrancó en cero y la pantalla no puede quedarse vacía).

export type AnioConDatos = {
  anio: number;
  total: number;
  cantidad: number;
};

export function aniosHebreosConDatos(
  donaciones: DonacionMinima[],
  anioEnCurso?: number
): AnioConDatos[] {
  const mapa = new Map<number, { total: number; cantidad: number }>();

  if (anioEnCurso != null) mapa.set(anioEnCurso, { total: 0, cantidad: 0 });

  for (const d of donaciones) {
    if (!d.date) continue;
    const anio = hebrewYearOfDate(d.date);
    const acum = mapa.get(anio) ?? { total: 0, cantidad: 0 };
    acum.total += Number(d.amount) || 0;
    acum.cantidad += 1;
    mapa.set(anio, acum);
  }

  return Array.from(mapa.entries())
    .map(([anio, v]) => ({ anio, total: redondear(v.total), cantidad: v.cantidad }))
    .sort((a, b) => b.anio - a.anio);
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
