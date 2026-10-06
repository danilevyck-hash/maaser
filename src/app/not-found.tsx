/**
 * Cuando una dirección ya no existe.
 *
 * El 6-oct-2026 se borraron `/maaser/resumen` y `/maaser/beneficiarios`: dos
 * pantallas viejas que nadie enlazaba, pero que el historial del teléfono
 * todavía puede abrir. Sin esta página caían en el 404 de fábrica, en inglés
 * y sin manera de salir. Ahora caen aquí, con dos botones grandes.
 *
 * Vale para cualquier dirección equivocada, no solo para esas dos.
 */

import Link from "next/link";
import { BOTON_PRINCIPAL, BOTON_BORDE_ANCHO, TEXTO_2, TITULO } from "@/lib/ui/apple";

export default function NoExiste() {
  return (
    <div className="fixed inset-0 flex flex-col justify-center bg-white px-5">
      <div className="w-full max-w-[430px] mx-auto">
        <h1 className={TITULO}>Esta pantalla ya no existe</h1>
        <p className={`${TEXTO_2} mt-2 mb-7`}>
          Lo que buscabas se mudó. Las donaciones, mes por mes, están en Maaser.
        </p>
        <Link
          href="/maaser"
          className={`${BOTON_PRINCIPAL} no-underline flex items-center justify-center`}
        >
          Ir a Maaser
        </Link>
        <Link
          href="/"
          className={`${BOTON_BORDE_ANCHO} no-underline flex items-center justify-center mt-3`}
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
