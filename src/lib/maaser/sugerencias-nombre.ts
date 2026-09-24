import { dinero } from "./dinero";
import { diaYMesLargo } from "./fecha-en-palabras";
import { anterioresDelBeneficiario, normalizarNombre } from "./historial-beneficiario";
import { ordenarPorFecha } from "./lista-donaciones";
import type { DonacionMinima } from "./tipos";

// Al escribir el nombre, la app ofrece los que ya usó.
//
// 🔴 El pareo es por IGUALDAD DE PREFIJO normalizado, NUNCA por parecido:
// hay 9 nombres que empiezan con "David" y son personas distintas. Escribir
// "dav" ofrece los nueve; escribir "david s" deja "David Sued México".
//
// Medido: 132 de 140 nombres aparecen UNA sola vez, así que la lista es una
// ayuda, no un catálogo. El que no está, se escribe y ya.

export const CUANTAS_SUGERENCIAS = 5;

export function nombresSugeridos(
  donaciones: DonacionMinima[],
  escrito: string,
  cuantas: number = CUANTAS_SUGERENCIAS
): string[] {
  const prefijo = normalizarNombre(escrito);
  if (!prefijo) return [];

  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const d of ordenarPorFecha(donaciones)) {
    const nombre = (d.beneficiary ?? "").trim();
    if (!nombre) continue;
    const clave = normalizarNombre(nombre);
    if (clave === prefijo) continue;
    if (!clave.startsWith(prefijo)) continue;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push(nombre);
    if (salida.length >= Math.max(0, cuantas)) break;
  }
  return salida;
}

/**
 * La línea azul de debajo del nombre:
 * "Rab Gil · $1,000 el 25 de mayo · «400 mensuales»".
 * Sin historia con ese nombre, null.
 */
export function textoUltimaDonacion(
  donaciones: DonacionMinima[],
  nombre: string,
  excluirId?: number
): string | null {
  const [ultima] = anterioresDelBeneficiario(donaciones, nombre, excluirId, 1);
  if (!ultima) return null;
  const partes = [
    (ultima.beneficiary ?? nombre).trim(),
    `${dinero(ultima.amount)} el ${diaYMesLargo(ultima.date)}`,
  ];
  const nota = (ultima.notes ?? "").replace(/\s+/g, " ").trim();
  if (nota) partes.push(`«${nota}»`);
  return partes.join(" · ");
}
