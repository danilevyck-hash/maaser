"use client";

/**
 * Maaser — un número y un botón.
 *
 * Al abrir se contesta la única pregunta que él se hace: «¿cuánto llevo dado
 * este año?». Debajo, el único botón que usa 1 de cada 4 días: Anotar. Y
 * después la lista, corrida hacia abajo por todos los años.
 *
 * 🔴 Sin pestañas, sin tarjetas, sin barra de progreso y sin «+» arriba.
 * 🔴 La meta del 10 % SOLO se dibuja si está escrito lo que gasta en el año
 *    (hoy `annual_goals.gastos_anuales` está en NULL: no se dibuja nada).
 * 🔴 Los compromisos mensuales cuelgan de `maaser_compromisos`. Sin esa tabla
 *    —la migración 20260924 todavía no está corrida— la pantalla es idéntica
 *    a la de hoy: no se dibuja el interruptor y nada se rompe.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Donation } from "@/lib/supabase";
import { hoyPanamaISO } from "@/lib/fecha-panama";
import { getCurrentHebrewYear, getHebrewYearData } from "@/lib/hebrew-year";
import { listaCorrida } from "@/lib/maaser/lista-donaciones";
import { filtrarPorBeneficiario } from "@/lib/maaser/busqueda";
import { dinero } from "@/lib/maaser/dinero";
import {
  lineaDeDonaciones,
  lineaDeLaMeta,
  subtituloDelAnio,
} from "@/lib/maaser/encabezado";
import { esSinNombre, lineaDeLaFila, nombreEnPantalla } from "@/lib/maaser/renglon";
import {
  compromisosPendientes,
  donacionDelCompromiso,
  type Compromiso,
} from "@/lib/maaser/compromisos";
import Anotar, { type LoQueSeGuarda } from "@/components/maaser/Anotar";
import Bienvenida from "@/components/Bienvenida";
import { BIENVENIDA_MAASER } from "@/lib/bienvenidas";
import ElAnio from "@/components/maaser/ElAnio";
import ExportModal from "@/components/ExportModal";
import HojaAbajo from "@/components/propiedades/HojaAbajo";
import Circulo from "@/components/propiedades/Circulo";
import { useToast } from "@/components/Toast";
import { BOTON_PRINCIPAL, ENLACE, MONTO, TEXTO_2, TEXTO_3, TITULO } from "@/lib/ui/apple";

type Vista =
  | { tipo: "lista" }
  | { tipo: "anotar"; donacion: Donation | null; volverA: "lista" | "anio" }
  | { tipo: "anio" };

export default function MaaserPage() {
  const [hoy] = useState(hoyPanamaISO);
  const [donaciones, setDonaciones] = useState<Donation[]>([]);
  const [compromisos, setCompromisos] = useState<Compromiso[]>([]);
  const [hayCompromisos, setHayCompromisos] = useState(false);
  const [gastosAnuales, setGastosAnuales] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [vista, setVista] = useState<Vista>({ tipo: "lista" });
  const [busqueda, setBusqueda] = useState("");
  const [seVeBuscar, setSeVeBuscar] = useState(false);
  const [marcando, setMarcando] = useState<number | null>(null);
  const [exportarAnio, setExportarAnio] = useState<number | null>(null);
  const [anioMirado, setAnioMirado] = useState<number | null>(null);
  const [compromisoTocado, setCompromisoTocado] = useState<Compromiso | null>(null);
  const { showToast } = useToast();
  const lista = useRef<HTMLDivElement>(null);

  const anio = useMemo(() => getCurrentHebrewYear(), []);
  const datos = useMemo(() => getHebrewYearData(anio), [anio]);
  const datosAnterior = useMemo(() => getHebrewYearData(anio - 1), [anio]);

  const traerDonaciones = useCallback(async () => {
    try {
      const res = await fetch("/api/donations");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDonaciones(data);
      }
    } catch {
      showToast("No se pudieron cargar las donaciones", "error");
    } finally {
      setCargando(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const traerCompromisos = useCallback(async () => {
    try {
      const res = await fetch("/api/maaser/compromisos");
      if (!res.ok) return;
      const data = await res.json();
      setHayCompromisos(data?.hay_tabla === true);
      setCompromisos(Array.isArray(data?.compromisos) ? data.compromisos : []);
    } catch {
      // Sin esta lista la pantalla es la de siempre.
    }
  }, []);

  const traerGasto = useCallback(async () => {
    try {
      const res = await fetch(`/api/goal?year=${anio}`);
      if (!res.ok) return;
      const data = await res.json();
      setGastosAnuales(data?.gastos_anuales ?? null);
    } catch {
      // Sin este dato no se dibuja la meta, y ya.
    }
  }, [anio]);

  useEffect(() => {
    traerDonaciones();
    traerCompromisos();
    traerGasto();
  }, [traerDonaciones, traerCompromisos, traerGasto]);

  /* ── Lo que dice el encabezado ─────────────────────────────────── */

  const delAnio = useMemo(
    () => donaciones.filter((d) => d.date >= datos.startDate && d.date <= datos.endDate),
    [donaciones, datos.startDate, datos.endDate]
  );
  const total = delAnio.reduce((s, d) => s + d.amount, 0);
  const totalAnterior = useMemo(
    () =>
      donaciones
        .filter((d) => d.date >= datosAnterior.startDate && d.date <= datosAnterior.endDate)
        .reduce((s, d) => s + d.amount, 0),
    [donaciones, datosAnterior.startDate, datosAnterior.endDate]
  );
  const meta = lineaDeLaMeta(gastosAnuales, total);

  /* ── Los compromisos del mes hebreo en curso ───────────────────── */

  const mesEnCurso = useMemo(
    () => datos.months.find((m) => hoy >= m.startDate && hoy <= m.endDate) ?? datos.months[0],
    [datos.months, hoy]
  );
  const pendientes = useMemo(
    () =>
      hayCompromisos && mesEnCurso
        ? compromisosPendientes({
            compromisos,
            donaciones,
            desde: mesEnCurso.startDate,
            hasta: mesEnCurso.endDate,
          })
        : [],
    [hayCompromisos, compromisos, donaciones, mesEnCurso]
  );

  /* ── La lista ──────────────────────────────────────────────────── */

  const renglones = useMemo(
    () => listaCorrida(filtrarPorBeneficiario(donaciones, busqueda)),
    [donaciones, busqueda]
  );

  /* ── Escribir ──────────────────────────────────────────────────── */

  const volverA = vista.tipo === "anotar" ? vista.volverA : "lista";

  const guardar = async ({ donacion, repetirCadaMes }: LoQueSeGuarda) => {
    if (guardando) return;
    setGuardando(true);
    try {
      const res = await fetch("/api/donations", {
        method: donacion.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donacion),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "No se pudo guardar", "error");
        return;
      }
      // El compromiso es aparte: si esto falla, la donación YA quedó guardada.
      if (repetirCadaMes && hayCompromisos) {
        await fetch("/api/maaser/compromisos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            beneficiary: donacion.beneficiary,
            amount: donacion.amount,
            metodo: donacion.metodo ?? null,
          }),
        }).catch(() => null);
        traerCompromisos();
      }
      setVista({ tipo: volverA });
      showToast(donacion.id ? "Donación guardada" : "Anotada");
      traerDonaciones();
    } catch {
      showToast("No se pudo guardar", "error");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (id: number) => {
    setBorrando(true);
    try {
      const res = await fetch("/api/donations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        showToast("No se pudo borrar", "error");
        return;
      }
      setVista({ tipo: volverA });
      showToast("Donación borrada");
      traerDonaciones();
    } catch {
      showToast("No se pudo borrar", "error");
    } finally {
      setBorrando(false);
    }
  };

  const cumplirCompromiso = async (c: Compromiso) => {
    if (marcando != null) return;
    setMarcando(c.id);
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donacionDelCompromiso(c, hoy)),
      });
      if (!res.ok) {
        showToast("No se pudo anotar", "error");
        return;
      }
      await traerDonaciones();
    } catch {
      showToast("No se pudo anotar", "error");
    } finally {
      setMarcando(null);
    }
  };

  const noSeRepiteMas = async (c: Compromiso) => {
    setCompromisoTocado(null);
    try {
      await fetch("/api/maaser/compromisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, activo: false }),
      });
      traerCompromisos();
    } catch {
      showToast("No se pudo guardar", "error");
    }
  };

  /* ── Pantallas ─────────────────────────────────────────────────── */

  if (vista.tipo === "anotar") {
    return (
      <Anotar
        donaciones={donaciones}
        editando={vista.donacion}
        hoy={hoy}
        hayCompromisos={hayCompromisos}
        guardando={guardando}
        borrando={borrando}
        onCancelar={() => setVista({ tipo: vista.volverA })}
        onGuardar={guardar}
        onBorrar={borrar}
      />
    );
  }

  if (vista.tipo === "anio") {
    return (
      <>
        <ElAnio
          donaciones={donaciones}
          anio={anioMirado ?? anio}
          anioEnCurso={anio}
          onAnio={setAnioMirado}
          hoy={hoy}
          onVolver={() => setVista({ tipo: "lista" })}
          onExportar={(a) => setExportarAnio(a)}
          onAbrirDonacion={(d) =>
            setVista({ tipo: "anotar", donacion: d, volverA: "anio" })
          }
        />
        <ExportModal
          isOpen={exportarAnio != null}
          onClose={() => setExportarAnio(null)}
          donations={donaciones}
          anioSeleccionado={exportarAnio ?? undefined}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <div className="px-5 pt-14 shrink-0 bg-white">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Link href="/" className={`${ENLACE} min-h-[44px] flex items-center pr-2`}>
            &lsaquo; Inicio
          </Link>
          <span />
        </div>
        <div className="max-w-[430px] mx-auto">
          <h1 className={TITULO}>Maaser</h1>
          <p className={`${TEXTO_2} tabular-nums mt-0.5`}>
            {subtituloDelAnio(anio, datos.startDate)}
          </p>
        </div>
        {seVeBuscar && (
          <div className="max-w-[430px] mx-auto pt-3">
            <input
              aria-label="Buscar por nombre"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar"
              className="w-full min-h-[40px] rounded-[10px] bg-[#F2F2F7] px-3 text-[17px] text-[#1C1C1E] placeholder:text-[#8E8E93] border-0 outline-none"
            />
          </div>
        )}
      </div>

      <div
        ref={lista}
        onScroll={(e) => {
          const y = (e.target as HTMLDivElement).scrollTop;
          if (y > 80) setSeVeBuscar(true);
          else if (y <= 8 && !busqueda.trim()) setSeVeBuscar(false);
        }}
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
        >
          {/* El número: la respuesta antes de tocar nada. */}
          <button
            onClick={() => setVista({ tipo: "anio" })}
            aria-label="Ver el año"
            className="w-full text-center bg-transparent border-0 cursor-pointer pt-7 pb-1 px-5"
          >
            <span className="block text-[54px] font-light tracking-[-0.03em] tabular-nums text-[#1C1C1E] leading-none">
              {dinero(total)}
            </span>
            <span className={`block ${TEXTO_2} mt-2`}>
              {lineaDeDonaciones(delAnio.length, { anio: anio - 1, total: totalAnterior })}
            </span>
            {meta && <span className={`block ${TEXTO_2} mt-1`}>{meta}</span>}
          </button>

          <div className="px-5 pt-4 pb-1">
            <button
              onClick={() => setVista({ tipo: "anotar", donacion: null, volverA: "lista" })}
              className={BOTON_PRINCIPAL}
            >
              Anotar
            </button>
          </div>

          {/* Los compromisos del mes que todavía no se dieron. */}
          {pendientes.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 px-5 py-3 min-h-[56px] border-t border-[#E5E5EA] mt-3"
            >
              <button
                onClick={() => setCompromisoTocado(c)}
                className="flex-1 min-w-0 text-left bg-transparent border-0 p-0 cursor-pointer"
              >
                <span className="block text-[17px] font-medium text-[#1C1C1E] truncate">
                  {c.beneficiary}
                </span>
                <span className={`block ${TEXTO_3}`}>cada mes</span>
              </button>
              <span className={MONTO}>{dinero(c.amount)}</span>
              <button
                onClick={() => cumplirCompromiso(c)}
                disabled={marcando != null}
                aria-label={`Anotar ${c.beneficiary}`}
                className="w-11 h-11 -mr-2 flex items-center justify-center bg-transparent border-0 cursor-pointer disabled:opacity-40"
              >
                <Circulo estado={marcando === c.id ? "pagado" : "sin_marcar"} />
              </button>
            </div>
          ))}

          {/* La lista, corrida por todos los años. */}
          {cargando ? (
            <p className={`${TEXTO_2} px-5 py-8`}>Cargando…</p>
          ) : renglones.length === 0 ? (
            <p className={`${TEXTO_2} px-5 py-8`}>
              {busqueda.trim() ? "Ningún nombre coincide." : "Todavía no has anotado nada."}
            </p>
          ) : (
            <div className="pt-3">
              {renglones.map((r) =>
                r.tipo === "separador" ? (
                  <p
                    key={`anio-${r.anio}`}
                    className="text-[13px] text-[#AEAEB2] tabular-nums px-5 pt-7 pb-2 border-t border-[#E5E5EA] mt-3"
                  >
                    {r.anio} · {dinero(r.total)}
                  </p>
                ) : (
                  <button
                    key={r.donacion.id}
                    onClick={() =>
                      setVista({ tipo: "anotar", donacion: r.donacion, volverA: "lista" })
                    }
                    className="w-full flex items-center gap-4 px-5 py-3 min-h-[56px] text-left bg-transparent border-x-0 border-b-0 border-t border-solid border-[#E5E5EA] cursor-pointer active:bg-[#F2F2F7] transition-colors"
                  >
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block text-[17px] font-medium truncate ${
                          esSinNombre(r.donacion) ? "text-[#AEAEB2] italic" : "text-[#1C1C1E]"
                        }`}
                      >
                        {nombreEnPantalla(r.donacion)}
                      </span>
                      <span className={`block ${TEXTO_3} truncate`}>
                        {lineaDeLaFila(r.donacion, hoy)}
                      </span>
                    </span>
                    <span className={MONTO}>{dinero(r.donacion.amount)}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      <HojaAbajo
        abierta={compromisoTocado != null}
        onCerrar={() => setCompromisoTocado(null)}
        encabezado={
          compromisoTocado && (
            <>
              {compromisoTocado.beneficiary} · {dinero(compromisoTocado.amount)} cada mes
            </>
          )
        }
        opciones={
          compromisoTocado
            ? [
                {
                  texto: "Ya no se repite",
                  tono: "rojo",
                  onClick: () => noSeRepiteMas(compromisoTocado),
                },
                { texto: "Listo", tono: "fuerte", onClick: () => setCompromisoTocado(null) },
              ]
            : []
        }
      />

      <Bienvenida {...BIENVENIDA_MAASER} />
    </div>
  );
}
