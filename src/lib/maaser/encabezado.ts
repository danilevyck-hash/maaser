import { calcularDiezmo, PORCENTAJE_MAASER } from "./diezmo";
import { dinero } from "./dinero";
import { diaYMesLargo } from "./fecha-en-palabras";

// Las tres líneas de arriba: el año, cuántas donaciones van, y la meta.
//
// 🔴 La meta NO se dibuja si no está escrito lo que gasta en el año. Hoy
// `annual_goals.gastos_anuales` está en NULL para 5787: no se inventa nada,
// no se pone un cero y no se pide nada en pantalla.

/** "5787 · desde el 12 de septiembre". */
export function subtituloDelAnio(anio: number, inicioISO: string): string {
  return `${anio} · desde el ${diaYMesLargo(inicioISO)}`;
}

/** "5 donaciones · el año pasado $81,198". */
export function lineaDeDonaciones(
  cantidad: number,
  anterior?: { anio: number; total: number } | null
): string {
  const cuantas =
    cantidad === 0
      ? "todavía ninguna"
      : `${cantidad} ${cantidad === 1 ? "donación" : "donaciones"}`;
  if (!anterior || anterior.total <= 0) return cuantas;
  return `${cuantas} · el año pasado ${dinero(anterior.total)}`;
}

/**
 * "Meta 10 %: $10,000 · te faltan $9,322", o "· vas $678 adelante".
 * Sin lo que gasta, null: la línea no existe.
 */
export function lineaDeLaMeta(
  gastosAnuales: number | null | undefined,
  totalDado: number
): string | null {
  const cuenta = calcularDiezmo(gastosAnuales, totalDado);
  if (!cuenta) return null;
  const pct = Math.round(PORCENTAJE_MAASER * 100);
  const cola =
    cuenta.faltan > 0
      ? `te faltan ${dinero(cuenta.faltan)}`
      : `vas ${dinero(Math.max(totalDado, 0) - cuenta.debeDar)} adelante`;
  return `Meta ${pct} %: ${dinero(cuenta.debeDar)} · ${cola}`;
}
