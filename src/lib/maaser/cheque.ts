import { diaYMesCorto } from "./fecha-en-palabras";
import { nombreEnPantalla } from "./renglon";
import type { DonacionMinima } from "./tipos";

// La chequera.
//
// Medido el 24-sep-2026: 119 de las 147 donaciones del uso corriente llevan
// número de cheque, el mayor es el 2936, y hay 3 números repetidos. El número
// NO es correlativo de verdad (baja 15 veces), así que lo que se propone es
// "el siguiente al mayor", y un repetido AVISA pero NUNCA frena: la chequera
// se usa salteada y él sabe por qué.

/** El número, comparable: "0002" y "2" son el mismo cheque. */
export function claveDeCheque(valor: unknown): string {
  const texto = String(valor ?? "").trim();
  if (!texto) return "";
  const n = parseInt(texto, 10);
  return Number.isFinite(n) ? String(n) : texto.toLowerCase();
}

/** El siguiente al mayor usado. Sin ningún cheque en la historia, null. */
export function siguienteCheque(donaciones: DonacionMinima[]): string | null {
  let mayor = 0;
  for (const d of donaciones) {
    const n = parseInt(String(d.check_number ?? ""), 10);
    if (Number.isFinite(n) && n > mayor) mayor = n;
  }
  return mayor > 0 ? String(mayor + 1) : null;
}

/** La donación que ya usó ese número, si la hay. */
export function donacionConEseCheque(
  donaciones: DonacionMinima[],
  numero: string,
  excluirId?: number
): DonacionMinima | null {
  const clave = claveDeCheque(numero);
  if (!clave) return null;
  const halladas = donaciones.filter(
    (d) =>
      claveDeCheque(d.check_number) === clave &&
      (excluirId == null || d.id !== excluirId)
  );
  if (halladas.length === 0) return null;
  return halladas.reduce((mas, d) => (d.date > mas.date ? d : mas));
}

/** "Ya lo usaste con Iosef Milszteln el 22 sep". Sin repetido, null. */
export function avisoDeChequeRepetido(
  donaciones: DonacionMinima[],
  numero: string,
  excluirId?: number
): string | null {
  const previa = donacionConEseCheque(donaciones, numero, excluirId);
  if (!previa) return null;
  return `Ya lo usaste con ${nombreEnPantalla(previa)} el ${diaYMesCorto(previa.date)}`;
}
