import { normalizarMetodo, type MetodoPago } from "./metodo-pago";

// Tres botones, tres valores.
//
// La columna `metodo` de la base solo acepta cheque | transferencia | tarjeta
// (ver supabase/20260923-donations-metodo.sql). Yappy ES una transferencia, y
// hasta el 6-oct-2026 había DOS botones que guardaban lo mismo: «Yappy» y
// «Transferencia». Son uno solo, con las dos palabras que él usa en las notas
// («Yappy», «TRANFERENCIA»). Las donaciones viejas no cambian de valor: el
// valor guardado sigue siendo `transferencia`.

export type ChipMetodo = { etiqueta: string; valor: MetodoPago };

export const CHIPS_METODO: ChipMetodo[] = [
  { etiqueta: "Cheque", valor: "cheque" },
  { etiqueta: "Tarjeta", valor: "tarjeta" },
  { etiqueta: "Yappy o transferencia", valor: "transferencia" },
];

/** Qué botón queda marcado al abrir una donación guardada. */
export function chipDeLoGuardado(valor: unknown): string | null {
  const id = normalizarMetodo(valor);
  if (!id) return null;
  return CHIPS_METODO.find((c) => c.valor === id)?.etiqueta ?? null;
}

/** Lo que se ve en pantalla de un método guardado, no el valor crudo. */
export function comoSeMuestra(valor: unknown): string | null {
  return chipDeLoGuardado(valor);
}
