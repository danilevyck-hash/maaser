// "Debes dar el 10 % de lo que gastas."
//
// Papá escribe UNA vez al año cuánto gasta; de ahí sale cuánto le toca dar y
// cuánto le falta. Si todavía no lo escribió, no se inventa un número: la
// tarjeta dice "poner lo que gastas ›" y aquí se devuelve null.

export const PORCENTAJE_MAASER = 0.1;

export type Diezmo = {
  /** 10 % de lo que gasta. */
  debeDar: number;
  /** Lo que falta para llegar. Nunca negativo. */
  faltan: number;
  /** 0 a 100, para la barra. */
  avance: number;
};

export function calcularDiezmo(
  gastosAnuales: number | null | undefined,
  totalDonado: number
): Diezmo | null {
  const gastos = Number(gastosAnuales);
  if (!Number.isFinite(gastos) || gastos <= 0) return null;

  const dado = Number.isFinite(totalDonado) ? Math.max(totalDonado, 0) : 0;
  const debeDar = redondear(gastos * PORCENTAJE_MAASER);
  const faltan = redondear(Math.max(debeDar - dado, 0));
  const avance = debeDar > 0 ? Math.min((dado / debeDar) * 100, 100) : 0;

  return { debeDar, faltan, avance };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}
