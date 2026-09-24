import { normalizarNombre } from "./historial-beneficiario";
import type { DonacionMinima } from "./tipos";

// Los compromisos mensuales.
//
// Tres notas de papá dicen que la donación se repite ("400 mensuales",
// "180x mes", "260xmes pago en tarjetas") y "Rab Gil" aparece con $1,000 tres
// meses seguidos. Eso es lo que esta tabla recuerda.
//
// 🔴 Un compromiso NO es una deuda: si el mes se acaba sin tocarlo, desaparece
// sin aviso, sin rojo y sin arrastrar nada. Y no escribe una donación solo:
// la escribe él al tocar el círculo.

export type Compromiso = {
  id: number;
  beneficiary: string;
  amount: number;
  metodo?: string | null;
  activo?: boolean | null;
  created_at?: string;
};

export type CompromisoDelMes = {
  compromiso: Compromiso;
  /** Ya se le dio este mes hebreo: la línea no se dibuja. */
  cumplido: boolean;
};

/** ¿Sigue vivo? `activo` en NULL cuenta como sí: falla abierto. */
export function estaActivo(c: Compromiso): boolean {
  return c.activo !== false;
}

/**
 * Los compromisos que TODAVÍA no tienen donación de ese beneficiario dentro
 * del mes hebreo en curso. El pareo del nombre es por igualdad normalizada,
 * nunca por parecido.
 */
export function compromisosPendientes({
  compromisos,
  donaciones,
  desde,
  hasta,
}: {
  compromisos: Compromiso[];
  donaciones: DonacionMinima[];
  desde: string;
  hasta: string;
}): Compromiso[] {
  const delMes = new Set(
    donaciones
      .filter((d) => d.date >= desde && d.date <= hasta)
      .map((d) => normalizarNombre(d.beneficiary))
      .filter(Boolean)
  );
  return compromisos
    .filter(estaActivo)
    .filter((c) => !delMes.has(normalizarNombre(c.beneficiary)));
}

/** La donación que escribe tocar el círculo. La fecha es la de HOY, de afuera. */
export function donacionDelCompromiso(c: Compromiso, hoyISO: string) {
  return {
    date: hoyISO,
    beneficiary: c.beneficiary,
    amount: Number(c.amount),
    metodo: c.metodo ?? null,
    status: "valido" as const,
  };
}
