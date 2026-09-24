"use client";

/**
 * Propiedades — una lista, un toque.
 *
 * El mes arriba, una fila por propiedad con inquilino, y un círculo a la
 * derecha: vacío es «todavía no», verde con ✓ es «pagó». Nada más.
 *
 * 🔴 Abrir esta pantalla NO escribe en la base. Los cobros de un mes se crean
 * SOLO cuando él los marca.
 * 🔴 Un mes sin marcar NUNCA es deuda. La deuda nace únicamente de que él diga
 * «no ha pagado» (Daniel, 24-sep-2026: «el usuario debe llevar la cuenta»).
 *
 * Las pantallas viejas (/propiedades/pagar/[id], /propiedades/cobros/[id]/pagar,
 * /propiedades/contratos/*, /propiedades/editar/[id], /propiedades/nueva) siguen
 * abriendo por dirección hasta el 24-oct-2026, pero ya no se enlazan desde aquí.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hoyPanamaISO } from "@/lib/fecha-panama";
import { addMonths, fmtMoney } from "@/lib/propiedades-pagos";
import { avisoDeContratos } from "@/lib/propiedades/contratos-por-vencer";
import { filasDelMes, resumenDelMes, type FilaDelMes } from "@/lib/propiedades/lista-mes";
import { diaEnPalabras, listaDeMeses, nombreMes, nombreMesCap } from "@/lib/propiedades/mes-en-palabras";
import { mesesParaElegir, pasosDelAdelanto } from "@/lib/propiedades/adelanto";
import { AVISO_FALTA_LA_BASE, marcarMes, marcarVariosMeses } from "@/lib/propiedades/marcar";
import { enlaceWhatsapp } from "@/lib/propiedades/whatsapp";
import type { RentCharge, RentContract, RentProperty } from "@/lib/propiedades-types";
import HojaAbajo from "@/components/propiedades/HojaAbajo";
import Circulo from "@/components/propiedades/Circulo";
import { CAMPO, ENLACE, FICHA, MONTO, TEXTO_2, TITULO } from "@/lib/ui/apple";

type Hoja =
  | { tipo: "pagado"; fila: FilaDelMes }
  | { tipo: "adelanto"; fila: FilaDelMes }
  | { tipo: "deuda"; fila: FilaDelMes }
  | { tipo: "nueva" }
  | null;

export default function PropiedadesPage() {
  const router = useRouter();
  const [hoy] = useState(hoyPanamaISO);
  const mesDeHoy = hoy.slice(0, 7);
  const [mes, setMes] = useState(mesDeHoy);

  const [propiedades, setPropiedades] = useState<RentProperty[]>([]);
  const [contratos, setContratos] = useState<RentContract[]>([]);
  const [cobros, setCobros] = useState<RentCharge[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [hoja, setHoja] = useState<Hoja>(null);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const traer = useCallback(async () => {
    try {
      const [p, c, ch] = await Promise.all([
        fetch("/api/propiedades/properties").then((r) => r.json()),
        fetch("/api/propiedades/contracts").then((r) => r.json()),
        fetch("/api/propiedades/charges").then((r) => r.json()),
      ]);
      setPropiedades(Array.isArray(p) ? p : []);
      setContratos(Array.isArray(c) ? c : []);
      setCobros(Array.isArray(ch) ? ch : []);
    } catch {
      setAviso("No se pudieron cargar las propiedades.");
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    traer();
  }, [traer]);

  const filas = useMemo(
    () => filasDelMes({ mes, propiedades, contratos, cobros, hoy }),
    [mes, propiedades, contratos, cobros, hoy],
  );
  const resumen = useMemo(() => resumenDelMes(filas), [filas]);
  const avisoContratos = useMemo(
    () => avisoDeContratos({ contratos, hoy }),
    [contratos, hoy],
  );

  const cobrosDe = useCallback(
    (propiedadId: number) => cobros.filter((c) => c.property_id === propiedadId),
    [cobros],
  );

  async function conGuardado(accion: () => Promise<{ ok: boolean; faltaLaBase?: boolean }>) {
    setGuardando(true);
    setAviso(null);
    const resultado = await accion();
    if (!resultado.ok) {
      setAviso(resultado.faltaLaBase ? AVISO_FALTA_LA_BASE : "No se pudo guardar. Intenta de nuevo.");
    } else {
      await traer();
      setHoja(null);
    }
    setGuardando(false);
  }

  function marcaDe(fila: FilaDelMes, mesMarcado: string, cobroId?: number) {
    return {
      propiedadId: fila.propiedadId,
      contratoId: fila.contratoId,
      inquilinoGuardado: fila.inquilinoGuardado,
      mes: mesMarcado,
      monto: fila.monto,
      cobroId,
    };
  }

  const tocarCirculo = (fila: FilaDelMes) => {
    if (fila.estado === "pagado") {
      setHoja({ tipo: "pagado", fila });
      return;
    }
    conGuardado(() => marcarMes(marcaDe(fila, mes, fila.cobroId), "pagado", hoy));
  };

  const adelantarHasta = (fila: FilaDelMes, hasta: string) => {
    const pasos = pasosDelAdelanto({
      desde: mes,
      hasta,
      cobros: cobrosDe(fila.propiedadId),
      montoDeMes: () => fila.monto,
    });
    const marcas = pasos.map((paso) => marcaDe(fila, paso.mes, paso.cobroId));
    return conGuardado(() => marcarVariosMeses(marcas, "pagado", hoy));
  };

  const crearPropiedad = async () => {
    const nombre = nombreNuevo.trim();
    if (!nombre) return;
    setGuardando(true);
    setAviso(null);
    try {
      const res = await fetch("/api/propiedades/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nombre }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAviso(data.error || "No se pudo crear la propiedad.");
      } else {
        setNombreNuevo("");
        setHoja(null);
        router.push(`/propiedades/${data.id}?editar=1`);
      }
    } catch {
      setAviso("Sin conexión.");
    }
    setGuardando(false);
  };

  const mesAnterior = addMonths(mes, -1);
  const mesSiguiente = addMonths(mes, 1);

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <div className="px-5 pt-14 shrink-0 bg-white">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Link href="/" className={`${ENLACE} min-h-[44px] flex items-center pr-2`}>
            &larr; Inicio
          </Link>
          <button
            onClick={() => setHoja({ tipo: "nueva" })}
            aria-label="Nueva propiedad"
            className="text-[#007AFF] text-[30px] font-light leading-none min-h-[44px] min-w-[44px] bg-transparent border-0 cursor-pointer"
          >
            +
          </button>
        </div>
        <div className="max-w-[430px] mx-auto">
          <h1 className={TITULO}>{nombreMesCap(mes, mesDeHoy)}</h1>
          <p className={`${TEXTO_2} tabular-nums mt-0.5`}>
            {resumen.texto}
            {resumen.textoDeuda && (
              <>
                {" · "}
                <span className="text-[#FF3B30]">{resumen.textoDeuda}</span>
              </>
            )}
          </p>
          <div className="flex items-center justify-between py-2">
            <button
              onClick={() => setMes(mesAnterior)}
              className={`${ENLACE} min-h-[44px]`}
            >
              &lsaquo; {nombreMesCap(mesAnterior, mesDeHoy)}
            </button>
            {mes < mesDeHoy && (
              <button
                onClick={() => setMes(mesSiguiente)}
                className={`${ENLACE} min-h-[44px]`}
              >
                {nombreMesCap(mesSiguiente, mesDeHoy)} &rsaquo;
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
        >
          {aviso && (
            <p className="mx-5 mb-2 text-[14px] text-[#C42B21]">{aviso}</p>
          )}
          {avisoContratos && (
            <p className="mx-5 mb-2 text-[14px] text-[#6E6E73] border border-[#E5E5EA] rounded-[12px] px-3 py-2.5">
              {avisoContratos}
            </p>
          )}

          {cargando ? (
            <p className={`${TEXTO_2} px-5 py-8`}>Cargando...</p>
          ) : filas.length === 0 ? (
            <p className={`${TEXTO_2} px-5 py-8`}>
              Todavía no hay propiedades con inquilino. Toca + para agregar una.
            </p>
          ) : (
            filas.map((fila) => (
              <div
                key={fila.propiedadId}
                className="flex items-center gap-3 px-5 py-3 min-h-[60px] border-t border-[#E5E5EA]"
              >
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => router.push(`/propiedades/${fila.propiedadId}`)}
                    className="block text-[17px] font-semibold text-[#1C1C1E] tracking-[-0.01em] bg-transparent border-0 p-0 text-left truncate max-w-full cursor-pointer"
                  >
                    {fila.nombre}
                  </button>
                  <p className="text-[14px] text-[#6E6E73] truncate">
                    {fila.inquilino}
                    {fila.mesesQueDebe.length > 0 && (
                      <>
                        {" · "}
                        <button
                          onClick={() => setHoja({ tipo: "deuda", fila })}
                          className="text-[#FF3B30] font-medium text-[14px] bg-transparent border-0 p-0 cursor-pointer"
                        >
                          {`debe ${mesesEnPalabras(fila, mes)} \u203A`}
                        </button>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={MONTO}>{fmtMoney(fila.monto)}</p>
                  {fila.pagadoHasta && (
                    <span className="block text-[11px] text-[#6E6E73] font-medium">
                      {`hasta ${nombreMes(fila.pagadoHasta)}`}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => tocarCirculo(fila)}
                  disabled={guardando}
                  aria-label={
                    fila.estado === "pagado"
                      ? `Pagó · ${fila.nombre}`
                      : `Marcar pagado · ${fila.nombre}`
                  }
                  className="w-11 h-11 -mr-2 flex items-center justify-center bg-transparent border-0 cursor-pointer disabled:opacity-40"
                >
                  <Circulo estado={fila.estado} adelantado={!!fila.pagadoHasta} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tocar un ✓: qué día pagó, adelanto, o deshacer. */}
      <HojaAbajo
        abierta={hoja?.tipo === "pagado"}
        onCerrar={() => setHoja(null)}
        encabezado={
          hoja?.tipo === "pagado" && (
            <>
              {hoja.fila.inquilino} · {hoja.fila.nombre}
              <br />
              Pagó {nombreMes(mes, mesDeHoy)}
              {hoja.fila.pagadoEl ? ` el ${diaEnPalabras(hoja.fila.pagadoEl)}` : ""}
            </>
          )
        }
        opciones={
          hoja?.tipo === "pagado"
            ? [
                {
                  texto: "Pagó varios meses por adelantado",
                  onClick: () => setHoja({ tipo: "adelanto", fila: hoja.fila }),
                },
                {
                  texto: "No ha pagado",
                  tono: "rojo",
                  desactivada: guardando,
                  onClick: () =>
                    conGuardado(() =>
                      marcarMes(marcaDe(hoja.fila, mes, hoja.fila.cobroId), "no_pago", hoy),
                    ),
                },
                { texto: "Listo", tono: "fuerte", onClick: () => setHoja(null) },
              ]
            : []
        }
      />

      {/* Un solo dato: hasta qué mes. */}
      <HojaAbajo
        abierta={hoja?.tipo === "adelanto"}
        onCerrar={() => setHoja(null)}
        encabezado={hoja?.tipo === "adelanto" ? <>¿Hasta qué mes pagó?</> : null}
      >
        {hoja?.tipo === "adelanto" && (
          <div className="grid grid-cols-3 gap-2 p-4">
            {mesesParaElegir(mes).map((m) => (
              <button
                key={m}
                disabled={guardando}
                onClick={() => adelantarHasta(hoja.fila, m)}
                className={`${FICHA} py-2.5`}
              >
                {nombreMesCap(m, mes)}
              </button>
            ))}
          </div>
        )}
      </HojaAbajo>

      {/* La palabra roja: cobrar por WhatsApp o marcar que ya pagó. */}
      <HojaAbajo
        abierta={hoja?.tipo === "deuda"}
        onCerrar={() => setHoja(null)}
        encabezado={
          hoja?.tipo === "deuda" && (
            <>
              {hoja.fila.inquilino} · {hoja.fila.nombre}
              <br />
              {`Debe ${mesesEnPalabras(hoja.fila, mes)} · ${fmtMoney(hoja.fila.montoQueDebe)}`}
              {hoja.fila.recargo > 0 && ` + ${fmtMoney(hoja.fila.recargo)} de recargo`}
            </>
          )
        }
        opciones={
          hoja?.tipo === "deuda"
            ? [
                ...(enlaceDeCobro(hoja.fila, mes)
                  ? [
                      {
                        texto: "Escribirle por WhatsApp",
                        href: enlaceDeCobro(hoja.fila, mes) as string,
                      },
                    ]
                  : []),
                {
                  texto: `Ya me pagó ${mesesEnPalabras(hoja.fila, mes)}`,
                  tono: "verde" as const,
                  desactivada: guardando,
                  onClick: () => {
                    const pendientes = hoja.fila.mesesQueDebe;
                    const marcas = pendientes.map((m) =>
                      marcaDe(hoja.fila, m, cobroIdDe(cobrosDe(hoja.fila.propiedadId), m)),
                    );
                    return conGuardado(() => marcarVariosMeses(marcas, "pagado", hoy));
                  },
                },
                { texto: "Listo", tono: "fuerte" as const, onClick: () => setHoja(null) },
              ]
            : []
        }
      />

      {/* Propiedad nueva: solo el nombre. */}
      <HojaAbajo
        abierta={hoja?.tipo === "nueva"}
        onCerrar={() => setHoja(null)}
        encabezado={<>¿Cómo se llama la propiedad?</>}
        opciones={[
          { texto: "Listo", tono: "fuerte", desactivada: guardando, onClick: crearPropiedad },
          { texto: "Cancelar", onClick: () => setHoja(null) },
        ]}
      >
        <div className="p-4">
          <input
            aria-label="Nombre de la propiedad"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Brisa Marina"
            className={CAMPO}
          />
        </div>
      </HojaAbajo>
    </div>
  );
}

function mesesEnPalabras(fila: FilaDelMes, mes: string): string {
  return listaDeMeses(fila.mesesQueDebe, mes);
}

function enlaceDeCobro(fila: FilaDelMes, mes: string): string | null {
  return enlaceWhatsapp({
    telefono: fila.telefono,
    inquilino: fila.inquilino,
    meses: fila.mesesQueDebe,
    monto: fila.montoQueDebe,
    recargo: fila.recargo,
    anioDeReferencia: mes,
  });
}

function cobroIdDe(cobros: RentCharge[], mes: string): number | undefined {
  return cobros.find((c) => c.month === mes)?.id;
}
