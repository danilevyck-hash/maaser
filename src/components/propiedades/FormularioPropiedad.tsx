"use client";

/**
 * Lo fijo de una propiedad, en un solo lugar: cinco campos y «Listo».
 *
 * Los mismos campos sirven para una propiedad nueva (el «+» de la lista solo
 * pide el nombre y manda aquí) y para corregir una vieja.
 */

import { useState } from "react";
import { BOTON_PRINCIPAL, CAMPO, ENLACE, ROTULO, TITULO } from "@/lib/ui/apple";
import type { ContratoLeido, PropiedadLeida } from "@/lib/propiedades/lista-mes";

export type DatosDeLaPropiedad = {
  nombre: string;
  inquilino: string;
  telefono: string;
  alquiler: string;
  desde: string;
  hasta: string;
  /** Recargo por atraso: día del mes y por ciento. Vacíos = sin recargo. */
  recargoDia: string;
  recargoPct: string;
};

export default function FormularioPropiedad({
  propiedad,
  contrato,
  guardando,
  aviso,
  muestraRecargo,
  onGuardar,
  onSeFue,
  onCancelar,
}: {
  propiedad: PropiedadLeida;
  contrato: ContratoLeido | null;
  guardando: boolean;
  aviso: string | null;
  /** Solo cuando la base ya tiene las dos columnas de recargo. */
  muestraRecargo: boolean;
  onGuardar: (datos: DatosDeLaPropiedad) => void;
  onSeFue: () => void;
  onCancelar: () => void;
}) {
  const [datos, setDatos] = useState<DatosDeLaPropiedad>({
    nombre: propiedad.name ?? "",
    inquilino: contrato?.tenant_name ?? "",
    telefono: contrato?.tenant_phone ?? "",
    alquiler: String(contrato?.rent_amount ?? propiedad.rent_amount ?? ""),
    desde: contrato?.start_date ?? "",
    hasta: contrato?.end_date ?? "",
    recargoDia: propiedad.recargo_dia ? String(propiedad.recargo_dia) : "",
    recargoPct: propiedad.recargo_pct ? String(propiedad.recargo_pct) : "",
  });

  const cambiar = (campo: keyof DatosDeLaPropiedad) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((previo) => ({ ...previo, [campo]: e.target.value }));

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-white">
      <div className="px-5 pt-14 shrink-0">
        <div className="max-w-[430px] mx-auto">
          <button onClick={onCancelar} className={`${ENLACE} min-h-[44px]`}>
            Cancelar
          </button>
          <h1 className={`${TITULO} pb-2`}>{propiedad.name}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto px-5 pb-10">
          {aviso && <p className="text-[14px] text-[#C42B21] mb-3">{aviso}</p>}

          <label className={ROTULO} htmlFor="campo-nombre">Propiedad</label>
          <input id="campo-nombre" className={CAMPO} value={datos.nombre} onChange={cambiar("nombre")} />

          <label className={`${ROTULO} mt-4`} htmlFor="campo-inquilino">Inquilino</label>
          <input id="campo-inquilino" className={CAMPO} value={datos.inquilino} onChange={cambiar("inquilino")} />

          <label className={`${ROTULO} mt-4`} htmlFor="campo-celular">Celular</label>
          <input
            id="campo-celular"
            className={CAMPO}
            inputMode="tel"
            value={datos.telefono}
            onChange={cambiar("telefono")}
          />

          <label className={`${ROTULO} mt-4`} htmlFor="campo-alquiler">Alquiler al mes</label>
          <input
            id="campo-alquiler"
            className={CAMPO}
            inputMode="decimal"
            value={datos.alquiler}
            onChange={cambiar("alquiler")}
          />

          <label className={`${ROTULO} mt-4`} htmlFor="campo-desde">Contrato desde</label>
          <input id="campo-desde" className={CAMPO} type="date" value={datos.desde} onChange={cambiar("desde")} />

          <label className={`${ROTULO} mt-4`} htmlFor="campo-hasta">Contrato hasta</label>
          <input id="campo-hasta" className={CAMPO} type="date" value={datos.hasta} onChange={cambiar("hasta")} />

          {muestraRecargo && (
            <div className="mt-4">
              <span className={ROTULO}>Recargo por atraso</span>
              <div className="flex items-center gap-2 text-[17px] text-[#1C1C1E]">
                <span className="text-[15px] text-[#6E6E73]">Si paga después del día</span>
                <input
                  aria-label="Día del recargo"
                  className={`${CAMPO} w-[72px] text-center`}
                  inputMode="numeric"
                  value={datos.recargoDia}
                  onChange={cambiar("recargoDia")}
                />
                <input
                  aria-label="Por ciento del recargo"
                  className={`${CAMPO} w-[72px] text-center`}
                  inputMode="decimal"
                  value={datos.recargoPct}
                  onChange={cambiar("recargoPct")}
                />
                <span className="text-[15px] text-[#6E6E73]">%</span>
              </div>
              <p className="text-[13px] text-[#6E6E73] mt-1.5">
                Déjalos vacíos si esta propiedad no cobra recargo.
              </p>
            </div>
          )}

          <button
            onClick={() => onGuardar(datos)}
            disabled={guardando}
            className={`${BOTON_PRINCIPAL} mt-6`}
          >
            Listo
          </button>

          {contrato && (
            <button
              onClick={onSeFue}
              disabled={guardando}
              className="w-full text-center text-[#FF3B30] text-[16px] bg-transparent border-0 py-4 mt-1 cursor-pointer"
            >
              Se fue el inquilino
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
