import { normalizarMetodo, type MetodoPago } from "./metodo-pago";

// Cuatro chips, tres valores.
//
// La columna `metodo` de la base solo acepta cheque | transferencia | tarjeta
// (ver supabase/20260923-donations-metodo.sql). Yappy ES una transferencia:
// se guarda como `transferencia` y se muestra "Yappy", que es la palabra que
// papá escribía a mano en las notas.

export type ChipMetodo = { etiqueta: string; valor: MetodoPago };

export const CHIPS_METODO: ChipMetodo[] = [
  { etiqueta: "Cheque", valor: "cheque" },
  { etiqueta: "Yappy", valor: "transferencia" },
  { etiqueta: "Tarjeta", valor: "tarjeta" },
  { etiqueta: "Transferencia", valor: "transferencia" },
];

/**
 * Qué chip queda marcado al abrir una donación guardada.
 * `transferencia` marca el PRIMERO de los dos que lo guardan: Yappy.
 */
export function chipDeLoGuardado(valor: unknown): string | null {
  const id = normalizarMetodo(valor);
  if (!id) return null;
  return CHIPS_METODO.find((c) => c.valor === id)?.etiqueta ?? null;
}

/** Lo que se ve en pantalla de un método guardado: "Yappy", no el valor crudo. */
export function comoSeMuestra(valor: unknown): string | null {
  return chipDeLoGuardado(valor);
}
