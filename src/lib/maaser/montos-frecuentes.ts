import { normalizarNombre } from "./historial-beneficiario";
import type { DonacionMinima } from "./tipos";

// Los botones de monto NO se escriben a mano: salen de lo que papá dio de verdad.
// Medido el 23-sep-2026 sobre las 266 donaciones, los cinco más repetidos
// ($101, $180, $260, $126, $360) explican el 70 % de todas.
//
// Empate: gana el monto más chico, para que el botón más fácil de tocar por
// costumbre quede primero.

export const CUANTOS_BOTONES = 5;

export function montosFrecuentes(
  donaciones: DonacionMinima[],
  cuantos: number = CUANTOS_BOTONES
): number[] {
  const conteo = new Map<number, number>();
  for (const d of donaciones) {
    const monto = Math.round(Number(d.amount) * 100) / 100;
    if (!Number.isFinite(monto) || monto <= 0) continue;
    conteo.set(monto, (conteo.get(monto) ?? 0) + 1);
  }
  return Array.from(conteo.entries())
    .sort((a, b) => (b[1] !== a[1] ? b[1] - a[1] : a[0] - b[0]))
    .slice(0, Math.max(0, cuantos))
    .map(([monto]) => monto);
}

/**
 * El nombre con el que entró el histórico el 22-mar-2026: 118 donaciones de un
 * solo golpe, todas llamadas "Donación". No es lo que papá teclea, así que no
 * manda sobre los chips.
 */
export const NOMBRE_CARGA_INICIAL = "Donación";

/**
 * Los cinco de respaldo. Medidos el 24-sep-2026 sobre las 147 donaciones del
 * uso corriente (sin la carga inicial): $101 ×35 · $180 ×32 · $260 ×15 ·
 * $126 ×8 · $360 ×8. Si la lectura falla, la pantalla ofrece estos mismos.
 */
export const CHIPS_POR_DEFECTO = [101, 180, 260, 126, 360];

/**
 * Los chips de la pantalla de Anotar: los montos que papá dio DE VERDAD,
 * dejando afuera la carga inicial. Con menos de cinco, los de respaldo.
 */
export function montosParaChips(
  donaciones: DonacionMinima[],
  cuantos: number = CUANTOS_BOTONES
): number[] {
  const carga = normalizarNombre(NOMBRE_CARGA_INICIAL);
  const corrientes = donaciones.filter(
    (d) => normalizarNombre(d.beneficiary) !== carga
  );
  const derivados = montosFrecuentes(corrientes, cuantos);
  return derivados.length < cuantos ? CHIPS_POR_DEFECTO : derivados;
}
