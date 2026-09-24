"use client";

/**
 * La página de una propiedad: el inquilino, el contrato y el historial.
 *
 * Reemplaza a las tres pestañas viejas (Propiedades · Cobros · Contratos): lo
 * que antes eran tres listas de las mismas siete filas, hoy es esta página.
 *
 * Cada año son doce círculos. Tocar un mes que ya pasó pregunta si pagó; los
 * meses que no han llegado van punteados y no se tocan.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { hoyPanamaISO } from "@/lib/fecha-panama";
import { fmtMoney } from "@/lib/propiedades-pagos";
import { aniosDeLaPropiedad } from "@/lib/propiedades/anios";
import { contratoVivo, type ContratoLeido } from "@/lib/propiedades/lista-mes";
import { MESES_CORTOS_ES, fechaCorta, nombreMes, nombreMesCap } from "@/lib/propiedades/mes-en-palabras";
import { nombreEnPantalla } from "@/lib/propiedades/nombre";
import { AVISO_FALTA_LA_BASE, marcarMes } from "@/lib/propiedades/marcar";
import { numeroWhatsapp } from "@/lib/propiedades/whatsapp";
import type { RentCharge, RentContract, RentProperty } from "@/lib/propiedades-types";
import HojaAbajo from "@/components/propiedades/HojaAbajo";
import Circulo from "@/components/propiedades/Circulo";
import FormularioPropiedad, { type DatosDeLaPropiedad } from "@/components/propiedades/FormularioPropiedad";
import { ENLACE, TEXTO_2 } from "@/lib/ui/apple";

export default function PropiedadPageEnvuelta() {
  return (
    <Suspense fallback={<p className={`${TEXTO_2} p-8`}>Cargando...</p>}>
      <PropiedadPage />
    </Suspense>
  );
}

function PropiedadPage() {
  const router = useRouter();
  const params = useParams();
  const busqueda = useSearchParams();
  const id = Number(Array.isArray(params?.id) ? params.id[0] : params?.id);

  const [hoy] = useState(hoyPanamaISO);
  const mesDeHoy = hoy.slice(0, 7);

  const [propiedad, setPropiedad] = useState<RentProperty | null>(null);
  const [contratos, setContratos] = useState<RentContract[]>([]);
  const [cobros, setCobros] = useState<RentCharge[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mesTocado, setMesTocado] = useState<string | null>(null);
  const [editando, setEditando] = useState(busqueda?.get("editar") === "1");
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  const traer = useCallback(async () => {
    try {
      const [p, c, ch] = await Promise.all([
        fetch("/api/propiedades/properties").then((r) => r.json()),
        fetch("/api/propiedades/contracts").then((r) => r.json()),
        fetch(`/api/propiedades/charges?property_id=${id}`).then((r) => r.json()),
      ]);
      const propiedades: RentProperty[] = Array.isArray(p) ? p : [];
      setPropiedad(propiedades.find((x) => x.id === id) ?? null);
      setContratos((Array.isArray(c) ? c : []).filter((x: RentContract) => x.property_id === id));
      setCobros(Array.isArray(ch) ? ch : []);
    } catch {
      setAviso("No se pudo cargar la propiedad.");
    }
    setCargando(false);
  }, [id]);

  useEffect(() => {
    traer();
  }, [traer]);

  const contrato = useMemo<ContratoLeido | null>(
    () => (propiedad ? contratoVivo(contratos, propiedad.id) : null),
    [contratos, propiedad],
  );

  const anios = useMemo(
    () =>
      propiedad
        ? aniosDeLaPropiedad({ propiedad, contratos, cobros, mesDeHoy })
        : [],
    [propiedad, contratos, cobros, mesDeHoy],
  );

  const circuloDe = (mes: string) =>
    anios.flatMap((a) => a.meses).find((m) => m.mes === mes) ?? null;

  async function marcar(mes: string, estado: "pagado" | "no_pago") {
    if (!propiedad) return;
    const circulo = circuloDe(mes);
    setGuardando(true);
    setAviso(null);
    const resultado = await marcarMes(
      {
        propiedadId: propiedad.id,
        contratoId: contrato?.id ?? null,
        inquilinoGuardado: contrato?.tenant_name ?? propiedad.name,
        mes,
        monto: circulo?.monto ?? Number(propiedad.rent_amount ?? 0),
        cobroId: circulo?.cobroId,
      },
      estado,
      hoy,
    );
    if (!resultado.ok) {
      setAviso(resultado.faltaLaBase ? AVISO_FALTA_LA_BASE : "No se pudo guardar. Intenta de nuevo.");
    } else {
      await traer();
      setMesTocado(null);
    }
    setGuardando(false);
  }

  async function guardarFicha(datos: DatosDeLaPropiedad) {
    if (!propiedad) return;
    setGuardando(true);
    setAviso(null);
    try {
      await fetch("/api/propiedades/properties", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: propiedad.id,
          name: datos.nombre,
          rent_amount: Number(datos.alquiler) || 0,
        }),
      });

      const inquilino = datos.inquilino.trim();
      if (contrato) {
        await fetch("/api/propiedades/contracts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: contrato.id,
            tenant_name: inquilino,
            tenant_phone: datos.telefono,
            rent_amount: Number(datos.alquiler) || 0,
            start_date: datos.desde || contrato.start_date,
            end_date: datos.hasta || contrato.end_date,
          }),
        });
      } else if (inquilino) {
        if (!datos.desde || !datos.hasta) {
          setAviso("Para guardar el inquilino pon las dos fechas del contrato.");
          setGuardando(false);
          return;
        }
        const res = await fetch("/api/propiedades/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            property_id: propiedad.id,
            tenant_name: inquilino,
            tenant_phone: datos.telefono,
            rent_amount: Number(datos.alquiler) || 0,
            start_date: datos.desde,
            end_date: datos.hasta,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setAviso((data as { error?: string }).error || "No se pudo guardar el inquilino.");
          setGuardando(false);
          return;
        }
      }
      await traer();
      setEditando(false);
    } catch {
      setAviso("Sin conexión.");
    }
    setGuardando(false);
  }

  /** El inquilino se fue: el contrato se cierra HOY. No se borra nada. */
  async function cerrarContrato() {
    if (!contrato) return;
    setGuardando(true);
    setAviso(null);
    try {
      await fetch("/api/propiedades/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contrato.id, active: false, end_date: hoy }),
      });
      await traer();
      setConfirmandoSalida(false);
      setEditando(false);
    } catch {
      setAviso("Sin conexión.");
    }
    setGuardando(false);
  }

  if (cargando) {
    return <p className={`${TEXTO_2} p-8`}>Cargando...</p>;
  }
  if (!propiedad) {
    return (
      <div className="p-8">
        <p className={TEXTO_2}>Esa propiedad ya no está.</p>
        <button onClick={() => router.push("/propiedades")} className={`${ENLACE} mt-4`}>
          &lsaquo; Propiedades
        </button>
      </div>
    );
  }

  const inquilino = contrato ? nombreEnPantalla(contrato.tenant_name) : null;
  const telefono = contrato?.tenant_phone ?? null;
  const numero = numeroWhatsapp(telefono);
  const circuloTocado = mesTocado ? circuloDe(mesTocado) : null;

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <div className="px-5 pt-14 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <button onClick={() => router.push("/propiedades")} className={`${ENLACE} min-h-[44px]`}>
            &lsaquo; {nombreMesCap(mesDeHoy, mesDeHoy)}
          </button>
          <button onClick={() => setEditando(true)} className={`${ENLACE} min-h-[44px]`}>
            Editar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
        >
          <div className="px-5 pt-2">
            <h1 className="text-[30px] font-semibold tracking-[-0.02em] text-[#1C1C1E] leading-[1.1]">
              {propiedad.name}
            </h1>
            <p className="text-[16px] text-[#6E6E73] mt-1.5">
              {inquilino ?? "Sin inquilino"}
              {telefono && (
                <>
                  {" · "}
                  <a href={`tel:${telefono}`} className="text-[#007AFF] no-underline">
                    {telefono}
                  </a>
                </>
              )}
              {numero && (
                <>
                  {" · "}
                  <a
                    href={`https://wa.me/${numero}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#007AFF] no-underline"
                  >
                    WhatsApp
                  </a>
                </>
              )}
            </p>
          </div>

          {aviso && <p className="px-5 pt-3 text-[14px] text-[#C42B21]">{aviso}</p>}

          <div className="mt-4">
            <div className="flex justify-between items-baseline px-5 py-3 border-t border-[#E5E5EA] text-[16px]">
              <span className="text-[#6E6E73]">Alquiler</span>
              <b className="font-medium tabular-nums">
                {fmtMoney(contrato?.rent_amount ?? propiedad.rent_amount)} al mes
              </b>
            </div>
            <div className="flex justify-between items-baseline px-5 py-3 border-t border-[#E5E5EA] text-[16px]">
              <span className="text-[#6E6E73]">Contrato</span>
              <b className="font-medium">
                {contrato ? `${fechaCorta(contrato.start_date)} – ${fechaCorta(contrato.end_date)}` : "Sin contrato"}
              </b>
            </div>
          </div>

          {anios.map((anio) => (
            <div key={anio.anio} className="px-5 pt-3.5 pb-1 border-t border-[#E5E5EA] mt-3.5">
              <div className="flex justify-between items-baseline text-[16px] mb-2.5">
                <b>{anio.anio}</b>
                {anio.deuda ? (
                  <span className="text-[#FF3B30]">
                    {anio.deuda} · {fmtMoney(anio.montoQueDebe)}
                  </span>
                ) : (
                  <span className="text-[#6E6E73]">{anio.resumen}</span>
                )}
              </div>
              <div className="grid grid-cols-6 gap-y-2.5">
                {anio.meses.map((circulo) => (
                  <div key={circulo.mes} className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => !circulo.futuro && setMesTocado(circulo.mes)}
                      disabled={circulo.futuro || guardando}
                      aria-label={`${nombreMes(circulo.mes)} ${anio.anio}`}
                      className="w-11 h-11 flex items-center justify-center bg-transparent border-0 p-0 cursor-pointer disabled:cursor-default"
                    >
                      <Circulo estado={circulo.estado} futuro={circulo.futuro} tamano={26} />
                    </button>
                    <span className="text-[11px] text-[#6E6E73] -mt-2">
                      {MESES_CORTOS_ES[Number(circulo.mes.slice(5, 7)) - 1]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <HojaAbajo
        abierta={!!mesTocado}
        onCerrar={() => setMesTocado(null)}
        encabezado={
          mesTocado ? (
            <>
              {propiedad.name}
              <br />
              ¿Pagó {nombreMes(mesTocado, mesDeHoy)}?
            </>
          ) : null
        }
        opciones={
          mesTocado
            ? [
                {
                  texto: "Sí, pagó",
                  tono: "verde",
                  desactivada: guardando,
                  onClick: () => marcar(mesTocado, "pagado"),
                },
                {
                  texto: "No pagó",
                  tono: "rojo",
                  desactivada: guardando || circuloTocado?.futuro,
                  onClick: () => marcar(mesTocado, "no_pago"),
                },
                { texto: "Listo", tono: "fuerte", onClick: () => setMesTocado(null) },
              ]
            : []
        }
      />

      <HojaAbajo
        abierta={confirmandoSalida}
        onCerrar={() => setConfirmandoSalida(false)}
        encabezado={
          <>
            {inquilino} · {propiedad.name}
            <br />
            El contrato se cierra hoy. Nada se borra.
          </>
        }
        opciones={[
          { texto: "Sí, se fue", tono: "rojo", desactivada: guardando, onClick: cerrarContrato },
          { texto: "Cancelar", tono: "fuerte", onClick: () => setConfirmandoSalida(false) },
        ]}
      />

      {editando && (
        <FormularioPropiedad
          propiedad={propiedad}
          contrato={contrato}
          guardando={guardando}
          aviso={aviso}
          onGuardar={guardarFicha}
          onSeFue={() => setConfirmandoSalida(true)}
          onCancelar={() => setEditando(false)}
        />
      )}
    </div>
  );
}
