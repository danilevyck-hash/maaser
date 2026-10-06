import { listaCorrida, ordenarPorFecha, type RenglonLista } from "./lista-donaciones";
import { normalizarNombre } from "./historial-beneficiario";
import { nombreEnPantalla } from "./renglon";
import type { DonacionMinima } from "./tipos";

/**
 * Cómo se ordena el historial.
 *
 * Por fecha es la lista de siempre: de la más nueva a la más vieja, con el
 * separador «5786 · $81,198» al cambiar de año hebreo.
 *
 * Por monto y por nombre son UNA lista pareja, SIN separadores de año: el
 * cheque más grande de la historia no pertenece a ningún año en particular, y
 * un separador en medio de una lista ordenada por monto sería mentira.
 *
 * El empate se rompe por fecha, de la más nueva a la más vieja: se ordena
 * primero por fecha y después se reordena, y `sort` de JavaScript es estable.
 *
 * Vive aparte de `lista-donaciones` a propósito: el orden por nombre necesita
 * `normalizarNombre`, y ese módulo ya importa `lista-donaciones`.
 */

export const ORDENES = [
  { clave: "fecha", texto: "Por fecha" },
  { clave: "monto", texto: "Por monto" },
  { clave: "nombre", texto: "Por nombre" },
] as const;

export type Orden = (typeof ORDENES)[number]["clave"];

export const ORDEN_DE_SIEMPRE: Orden = "fecha";

/** «Por monto», para la línea gris que avisa que la lista no está por fecha. */
export function textoDelOrden(orden: Orden): string {
  return ORDENES.find((o) => o.clave === orden)?.texto ?? "";
}

export function historialOrdenado<T extends DonacionMinima>(
  donaciones: T[],
  orden: Orden = ORDEN_DE_SIEMPRE
): RenglonLista<T>[] {
  if (orden === "fecha") return listaCorrida(donaciones);

  const porFecha = ordenarPorFecha(donaciones);
  const ordenadas =
    orden === "monto"
      ? porFecha.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      : porFecha.sort((a, b) =>
          normalizarNombre(nombreEnPantalla(a)).localeCompare(
            normalizarNombre(nombreEnPantalla(b)),
            "es"
          )
        );

  return ordenadas.map((donacion) => ({ tipo: "donacion", donacion }));
}
