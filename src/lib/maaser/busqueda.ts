import { normalizarNombre } from "./historial-beneficiario";
import { nombreEnPantalla } from "./renglon";
import type { DonacionMinima } from "./tipos";

// Buscar es filtrar por beneficiario, sobre lo que ya está en pantalla.
// Subcadena normalizada (sin tildes, sin mayúsculas), nunca por parecido.

export function filtrarPorBeneficiario<T extends DonacionMinima>(
  donaciones: T[],
  texto: string
): T[] {
  const q = normalizarNombre(texto);
  if (!q) return donaciones;
  return donaciones.filter((d) =>
    normalizarNombre(nombreEnPantalla(d)).includes(q)
  );
}
