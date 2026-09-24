import { ordenarPorFecha } from "./lista-donaciones";
import type { DonacionMinima } from "./tipos";

// Al escribir un nombre que ya existe, la app recuerda lo que le dio antes:
// "A Rab Gil le diste $1,000 en junio · $1,000 en mayo · $1,000 en abril".
//
// El pareo es por IGUALDAD del nombre normalizado (sin tildes, sin mayúsculas,
// sin espacios de más). NUNCA por parecido: "David" y "David Sued México" son
// dos personas distintas, y hay nueve nombres que empiezan con "David".

export const CUANTAS_ANTERIORES = 3;

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function normalizarNombre(nombre: string | null | undefined): string {
  return (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function anterioresDelBeneficiario<T extends DonacionMinima>(
  donaciones: T[],
  nombre: string,
  excluirId?: number,
  cuantas: number = CUANTAS_ANTERIORES
): T[] {
  const clave = normalizarNombre(nombre);
  if (!clave) return [];
  return ordenarPorFecha(
    donaciones.filter(
      (d) =>
        normalizarNombre(d.beneficiary) === clave &&
        (excluirId == null || d.id !== excluirId)
    )
  ).slice(0, Math.max(0, cuantas));
}

/** El texto azul de la pantalla. Sin donaciones anteriores devuelve null. */
export function textoAnteriores(
  nombre: string,
  anteriores: DonacionMinima[]
): string | null {
  if (anteriores.length === 0) return null;
  const partes = anteriores.map((d) => `${dinero(d.amount)} en ${mesDe(d.date)}`);
  return `A ${nombre.trim()} le diste ${partes.join(" · ")}`;
}

function mesDe(fechaISO: string): string {
  const mes = parseInt((fechaISO || "").slice(5, 7), 10);
  return MESES[mes - 1] ?? "";
}

function dinero(monto: number): string {
  return "$" + Number(monto || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
