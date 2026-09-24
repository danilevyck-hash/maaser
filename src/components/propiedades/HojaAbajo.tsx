"use client";

import { RAYA } from "@/lib/ui/apple";

export type OpcionDeHoja = {
  texto: string;
  onClick?: () => void;
  href?: string;
  tono?: "azul" | "rojo" | "verde" | "fuerte";
  desactivada?: boolean;
};

const COLOR = {
  azul: "text-[#007AFF]",
  rojo: "text-[#FF3B30]",
  verde: "text-[#0F6B45]",
  fuerte: "text-[#007AFF] font-semibold",
};

/**
 * La hoja que sube desde abajo, como en el teléfono: un encabezado que dice de
 * quién es, y frases grandes para tocar. Tocar el fondo la cierra.
 */
export default function HojaAbajo({
  abierta,
  encabezado,
  opciones,
  onCerrar,
  children,
}: {
  abierta: boolean;
  encabezado?: React.ReactNode;
  opciones?: OpcionDeHoja[];
  onCerrar: () => void;
  children?: React.ReactNode;
}) {
  if (!abierta) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      <button
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 bg-black/30 border-0 p-0 cursor-pointer"
      />
      <div
        className="relative w-full max-w-[430px] mx-2 mb-2 bg-white rounded-[22px] overflow-hidden"
        style={{
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          marginBottom: "calc(8px + env(safe-area-inset-bottom))",
        }}
      >
        {encabezado && (
          <div
            className="text-center text-[14px] text-[#6E6E73] px-4 pt-3.5 pb-2.5 leading-[1.35]"
          >
            {encabezado}
          </div>
        )}
        {children}
        {(opciones ?? []).map((opcion) =>
          opcion.href ? (
            <a
              key={opcion.texto}
              href={opcion.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={opcion.onClick}
              className={`block w-full text-center text-[19px] px-4 py-[15px] min-h-[54px] no-underline ${COLOR[opcion.tono ?? "azul"]}`}
              style={{ borderTop: `1px solid ${RAYA}` }}
            >
              {opcion.texto}
            </a>
          ) : (
            <button
              key={opcion.texto}
              onClick={opcion.onClick}
              disabled={opcion.desactivada}
              className={`block w-full text-center text-[19px] px-4 py-[15px] min-h-[54px] bg-transparent border-0 cursor-pointer active:bg-[#F2F2F7] disabled:opacity-40 ${COLOR[opcion.tono ?? "azul"]}`}
              style={{ borderTop: `1px solid ${RAYA}` }}
            >
              {opcion.texto}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
