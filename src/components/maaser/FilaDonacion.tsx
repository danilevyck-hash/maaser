"use client";

/**
 * Una donación, en una fila.
 *
 * Lo que manda es el MONTO: es lo primero que se lee de un vistazo. Arriba, a
 * la izquierda, cuándo fue y el número de cheque en negro —es con lo que
 * cuadra con el banco—; abajo, en gris y más chico, a quién y por qué.
 *
 * Daniel, 6-oct-2026: «nada de "rab gil", pon nombre o motivo en gris, no así
 * como está hoy en día».
 *
 * La fila entera se toca y abre la misma pantalla de Anotar, con sus datos.
 */

import type { Donation } from "@/lib/supabase";
import { dinero } from "@/lib/maaser/dinero";
import { esSinNombre, nombreEnPantalla, partesDeLaFila } from "@/lib/maaser/renglon";
import { MONTO_FUERTE, TEXTO_2, TEXTO_3 } from "@/lib/ui/apple";

export default function FilaDonacion({
  donacion,
  hoy,
  onAbrir,
  sangria = false,
  conAnio = false,
}: {
  donacion: Donation;
  hoy: string;
  onAbrir: (d: Donation) => void;
  /** Dentro de un mes abierto, la fila entra un poco. */
  sangria?: boolean;
  /** Con la lista por monto o por nombre, la fecha lleva el año. */
  conAnio?: boolean;
}) {
  const partes = partesDeLaFila(donacion, hoy, { cheque: true, anio: conAnio });
  const nombre = nombreEnPantalla(donacion);

  return (
    <button
      onClick={() => onAbrir(donacion)}
      className={`w-full flex items-center gap-3 py-3 min-h-[56px] text-left bg-transparent border-x-0 border-b-0 border-t border-solid border-[#E5E5EA] cursor-pointer active:bg-[#F2F2F7] transition-colors ${
        sangria ? "pl-4 pr-0" : "px-5"
      }`}
    >
      <span className="flex-1 min-w-0">
        <span className={`block ${TEXTO_2} truncate`}>
          {partes.cuando}
          {partes.cheque && (
            <>
              {" · "}
              <b className="font-semibold text-[#1C1C1E]">Cheque {partes.cheque}</b>
            </>
          )}
        </span>
        <span
          className={`block ${TEXTO_3} truncate ${esSinNombre(donacion) ? "italic" : ""}`}
        >
          {nombre}
          {partes.nota ? ` · ${partes.nota}` : ""}
        </span>
      </span>
      <span className={MONTO_FUERTE}>{dinero(donacion.amount)}</span>
      <span className="text-[17px] text-[#AEAEB2] shrink-0">&rsaquo;</span>
    </button>
  );
}
