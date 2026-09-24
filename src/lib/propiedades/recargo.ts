/**
 * Recargo por atraso — el mes que él marcó «no pagó» y ya se le pasó el día.
 *
 * Dos datos por propiedad, los dos opcionales: a partir de qué día del mes
 * hay recargo, y de cuánto por ciento. Vacíos = esta propiedad no cobra
 * recargo, que es como están hoy las siete.
 *
 * 🔴 Solo un mes en 'no_pago' lleva recargo: un mes sin marcar no debe nada,
 * así que tampoco puede tener recargo.
 * 🔴 Al marcar pagado no se calcula nada: la cuenta la lleva papá.
 * 🔴 Falla ABIERTO: mientras no se corra
 * supabase/20260924-propiedades-recargo.sql las columnas no llegan, y sin
 * ellas el recargo vale 0 y la línea de Editar ni se dibuja.
 */

import { fromCents, toCents } from "@/lib/propiedades-pagos";

export type ReglaDeRecargo = { dia: number; pct: number };

export type PropiedadConRecargo = {
  recargo_dia?: number | null;
  recargo_pct?: number | string | null;
};

/** ¿La base ya tiene las dos columnas? Se pregunta a lo que llegó, sin sondeo. */
export function laBaseSabeDeRecargo(
  propiedades: Array<Record<string, unknown>> | null | undefined,
): boolean {
  const primera = (propiedades ?? [])[0];
  if (!primera) return false;
  return "recargo_dia" in primera && "recargo_pct" in primera;
}

/** La regla de una propiedad, o null si no cobra recargo. */
export function reglaDeRecargo(propiedad: PropiedadConRecargo | null | undefined): ReglaDeRecargo | null {
  const dia = Number(propiedad?.recargo_dia ?? 0);
  const pct = Number(propiedad?.recargo_pct ?? 0);
  if (!Number.isFinite(dia) || !Number.isFinite(pct)) return null;
  if (dia < 1 || dia > 31 || pct <= 0) return null;
  return { dia, pct };
}

/** El día en que ese mes empieza a tener recargo: '2026-08' + día 5 -> '2026-08-05'. */
export function diaDelRecargo(mes: string, dia: number): string {
  return `${mes}-${String(dia).padStart(2, "0")}`;
}

/**
 * Cuánto recargo lleva UN mes no pagado. 0 si no hay regla o si el día
 * todavía no pasó.
 */
export function recargoDelMes(input: {
  mes: string;
  monto: number | string;
  regla: ReglaDeRecargo | null;
  hoy: string;
}): number {
  const { mes, monto, regla, hoy } = input;
  if (!regla) return 0;
  if (hoy <= diaDelRecargo(mes, regla.dia)) return 0;
  return fromCents(Math.round((toCents(monto) * regla.pct) / 100));
}
