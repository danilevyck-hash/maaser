"use client";

import type { EstadoMes } from "@/lib/propiedades/estado-mes";

/**
 * El único control de la pantalla.
 *
 * vacío = todavía no · ✓ verde = pagó · ✓ verde hueco = pagó por adelantado ·
 * ✗ rojo = él dijo que no pagó · punteado = un mes que no ha llegado.
 */
export default function Circulo({
  estado,
  adelantado = false,
  futuro = false,
  tamano = 30,
}: {
  estado: EstadoMes;
  adelantado?: boolean;
  futuro?: boolean;
  tamano?: number;
}) {
  const base = "rounded-full border-[1.5px] flex items-center justify-center font-extrabold leading-none";
  const color =
    estado === "pagado" && adelantado
      ? "border-[#34C759] text-[#34C759] bg-transparent"
      : estado === "pagado"
        ? "border-[#34C759] bg-[#34C759] text-white"
        : estado === "no_pago"
          ? "border-[#FF3B30] bg-[#FF3B30] text-white"
          : futuro
            ? "border-[#E5E5EA] border-dashed text-transparent"
            : "border-[#AEAEB2] text-transparent";
  return (
    <span
      className={`${base} ${color}`}
      style={{ width: tamano, height: tamano, fontSize: Math.round(tamano * 0.55) }}
    >
      {estado === "pagado" ? "✓" : estado === "no_pago" ? "✗" : ""}
    </span>
  );
}
