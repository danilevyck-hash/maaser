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
