import { diaYMesCorto, fechaDeLaFila } from "./fecha-en-palabras";
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
 *
 * Con `cheque` entra el número entre la fecha y la nota: "22 sep · Cheque 2936".
 * Un cheque "0000" NO es un cheque y no se dibuja (hay dos así en la base).
 *
 * Con `anio` la fecha lleva el año: "24 dic 2024". Hace falta cuando la lista
 * NO está por fecha y mezcla años, porque ahí "24 dic" no dice de cuándo es.
 *
 * Sin opciones la línea sale idéntica a la de siempre.
 */
export function lineaDeLaFila(
  d: DonacionMinima,
  hoyISO: string,
  opciones: { cheque?: boolean; anio?: boolean } = {}
): string {
  const { cuando, cheque, nota } = partesDeLaFila(d, hoyISO, opciones);
  return [cuando, cheque && `Cheque ${cheque}`, nota].filter(Boolean).join(" · ");
}

/**
 * La misma línea, en pedazos, para poder pintar el número de cheque más
 * oscuro que el resto: es lo que él busca con el ojo para cuadrar con el banco.
 */
export function partesDeLaFila(
  d: DonacionMinima,
  hoyISO: string,
  { cheque: conCheque = false, anio: conAnio = false }: {
    cheque?: boolean;
    anio?: boolean;
  } = {}
): { cuando: string; cheque: string | null; nota: string | null } {
  const cuando = conAnio
    ? `${diaYMesCorto(d.date)} ${d.date.slice(0, 4)}`
    : fechaDeLaFila(d.date, hoyISO);

  const cheque = String(d.check_number ?? "").trim();
  const numero = parseInt(cheque, 10);
  const seVeElCheque =
    conCheque && !!cheque && (!Number.isFinite(numero) || numero > 0);

  const nota = (d.notes ?? "").replace(/\s+/g, " ").trim();

  return {
    cuando,
    cheque: seVeElCheque ? cheque : null,
    nota: nota
      ? nota.length > LARGO_NOTA
        ? nota.slice(0, LARGO_NOTA - 1) + "…"
        : nota
      : null,
  };
}
