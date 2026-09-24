import { fechaDeLaFila } from "./fecha-en-palabras";
import { etiquetaMetodo } from "./metodo-pago";
import type { DonacionMinima } from "./tipos";

// El renglón de la lista: nombre arriba, y debajo una sola línea con la fecha,
// el cheque, cómo pagó y la nota corta. Nada más.

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

export const SIN_NOMBRE = "Sin nombre";
const LARGO_NOTA = 40;

export function nombreEnPantalla(d: DonacionMinima): string {
  const n = (d.beneficiary ?? "").trim();
  return n || SIN_NOMBRE;
}

export function esSinNombre(d: DonacionMinima): boolean {
  return !(d.beneficiary ?? "").trim();
}

export function fechaCorta(fechaISO: string): string {
  if (!fechaISO) return "";
  const dia = parseInt(fechaISO.slice(8, 10), 10);
  const mes = parseInt(fechaISO.slice(5, 7), 10);
  if (!dia || !mes) return fechaISO;
  return `${dia} ${MESES_CORTOS[mes - 1]}`;
}

export function subtituloRenglon(d: DonacionMinima): string {
  const partes: string[] = [fechaCorta(d.date)];
  if (d.check_number) partes.push(`cheque ${d.check_number}`);
  const metodo = etiquetaMetodo(d.metodo);
  if (metodo && !d.check_number) partes.push(metodo);
  const nota = (d.notes ?? "").replace(/\s+/g, " ").trim();
  if (nota) {
    partes.push(nota.length > LARGO_NOTA ? nota.slice(0, LARGO_NOTA - 1) + "…" : nota);
  }
  return partes.filter(Boolean).join(" · ");
}

/**
 * La segunda línea de la fila de la lista: cuándo fue y, si la hay, la nota.
 * "hoy" · "ayer" · "15 sep · Esposa enferma".
 */
export function lineaDeLaFila(d: DonacionMinima, hoyISO: string): string {
  const cuando = fechaDeLaFila(d.date, hoyISO);
  const nota = (d.notes ?? "").replace(/\s+/g, " ").trim();
  if (!nota) return cuando;
  const corta = nota.length > LARGO_NOTA ? nota.slice(0, LARGO_NOTA - 1) + "…" : nota;
  return `${cuando} · ${corta}`;
}
