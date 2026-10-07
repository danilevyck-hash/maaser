"use client";

/**
 * El año — se llega tocando el número grande.
 *
 * El año elegido es el título, con «‹ 5786» para ir al anterior y «5788 ›»
 * solo cuando se está mirando un año pasado: NUNCA hay flecha a un año que no
 * llegó. Es el mismo idioma que los meses de Propiedades, y por eso no hay una
 * fila de chips que en diez años se corte a la derecha.
 *
 * Debajo, el año entero en barras: una por mes, la más alta es el 100 %. Se
 * toca una barra y abajo aparece ese mes con sus donaciones.
 *
 * 🔴 TODA fila de donación se toca y abre la misma pantalla de Anotar, con sus
 * datos y «Borrar»: la del mes y la de un beneficiario, igual que la del
 * inicio. En producción esas dos eran texto muerto.
 *
 * ⚠️ No siempre son doce barras: un año hebreo bisiesto tiene TRECE meses
 * (Adar I y Adar II), y 5787 es uno. Las barras salen de los meses del año.
 *
 * ⏳ Con `MESES_POR_LLEGAR` prendido, los meses del final del año que todavía
 * no llegaron se juntan en UNA línea gris: en un año recién empezado eran
 * trece renglones iguales de «No diste nada este mes». Los que ya pasaron en
 * cero siguen uno por uno — ahí el cero es información.
 */

import { useMemo, useState } from "react";
import type { Donation } from "@/lib/supabase";
import HojaAbajo from "@/components/propiedades/HojaAbajo";
import { getHebrewYearData } from "@/lib/hebrew-year";
import {
  lineaPorLlegar,
  mesesDelAnio,
  mesesPorLlegar,
  mesMasFuerte,
  porBeneficiario,
  type FilaBeneficiario,
} from "@/lib/maaser/anio-en-barras";
import { dinero } from "@/lib/maaser/dinero";
import { fechaDeLaFila, rangoEnPalabras } from "@/lib/maaser/fecha-en-palabras";
import {
  AUDITORIA,
  HISTORIAL_ORDENADO,
  MESES_POR_LLEGAR,
  SIMPLE,
} from "@/lib/maaser/interruptores";
import { lineaDeLaFila, nombreEnPantalla } from "@/lib/maaser/renglon";
import FilaNueva from "@/components/maaser/FilaDonacion";
import {
  AZUL,
  ENLACE,
  MONTO,
  MONTO_FUERTE,
  RENGLON,
  TEXTO_2,
  TEXTO_3,
  TITULO,
} from "@/lib/ui/apple";

export default function ElAnio({
  donaciones,
  anio,
  anioEnCurso,
  hoy,
  onAnio,
  onVolver,
  onExportar,
  onAbrirDonacion,
}: {
  donaciones: Donation[];
  /** El año que se está mirando. Vive afuera: volver de Anotar no lo pierde. */
  anio: number;
  anioEnCurso: number;
  hoy: string;
  onAnio: (anio: number) => void;
  onVolver: () => void;
  onExportar: (anio: number) => void;
  onAbrirDonacion: (d: Donation) => void;
}) {
  const [mesElegido, setMesElegido] = useState<string | null>(null);
  const [verDonaciones, setVerDonaciones] = useState(false);
  const [hoja, setHoja] = useState(false);
  const [porQuien, setPorQuien] = useState(false);

  const datos = useMemo(() => getHebrewYearData(anio), [anio]);
  const delAnio = useMemo(
    () => donaciones.filter((d) => d.date >= datos.startDate && d.date <= datos.endDate),
    [donaciones, datos.startDate, datos.endDate]
  );
  const total = delAnio.reduce((s, d) => s + d.amount, 0);
  const meses = useMemo(() => mesesDelAnio(delAnio, datos.months), [delAnio, datos.months]);
  const masFuerte = useMemo(() => mesMasFuerte(meses), [meses]);

  /* Los meses del final del año que todavía no llegaron: una sola línea en
     vez de trece renglones iguales de «No diste nada este mes». */
  const porLlegar = useMemo(
    () => (MESES_POR_LLEGAR ? mesesPorLlegar(meses, hoy) : []),
    [meses, hoy]
  );
  const mesesEnLista = porLlegar.length > 0 ? meses.slice(0, -porLlegar.length) : meses;

  const abierto = meses.find((m) => m.nombre === mesElegido) ?? masFuerte;
  const quienes = useMemo(() => porBeneficiario(delAnio), [delAnio]);

  const cambiarAnio = (a: number) => {
    onAnio(a);
    setMesElegido(null);
    setVerDonaciones(false);
    setPorQuien(false);
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white z-[140]">
      <div className="px-5 pt-14 shrink-0 bg-white">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          {/* Un solo camino de vuelta: dentro de «cada persona», el «‹» de
              arriba es el que devuelve al año. */}
          <button
            onClick={AUDITORIA && porQuien ? () => setPorQuien(false) : onVolver}
            className={`${ENLACE} min-h-[44px]`}
          >
            &lsaquo; {AUDITORIA && porQuien ? `Año ${anio}` : "Maaser"}
          </button>
          {/* Sin «···»: las dos cosas que escondía viven abajo, con palabras. */}
          {SIMPLE ? (
            <span />
          ) : (
            <button
              onClick={() => setHoja(true)}
              aria-label="Más"
              className="text-[#007AFF] text-[22px] leading-none min-h-[44px] min-w-[44px] bg-transparent border-0 cursor-pointer"
            >
              ···
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(40px + env(safe-area-inset-bottom))" }}
        >
          {porQuien ? (
            <PorBeneficiario
              quienes={quienes}
              anio={anio}
              hoy={hoy}
              volver={() => setPorQuien(false)}
              onAbrirDonacion={onAbrirDonacion}
            />
          ) : (
            <>
              <div className="px-5">
                <h1 className={`${TITULO} tabular-nums`}>
                  {SIMPLE ? `Año ${anio}` : anio}
                </h1>
                {SIMPLE ? (
                  <>
                    <p className={`${TEXTO_2} tabular-nums mt-0.5`}>
                      {dinero(total)} en {delAnio.length}{" "}
                      {delAnio.length === 1 ? "donación" : "donaciones"}
                    </p>
                    {masFuerte && (
                      <p className={`${TEXTO_2} mt-0.5`}>
                        El mes en que más diste fue {masFuerte.nombre}
                      </p>
                    )}
                  </>
                ) : (
                  <p className={`${TEXTO_2} tabular-nums mt-0.5`}>
                    {dinero(total)} · {delAnio.length}{" "}
                    {delAnio.length === 1 ? "donación" : "donaciones"}
                    {masFuerte ? ` · ${masFuerte.nombre} fue el mes más fuerte` : ""}
                  </p>
                )}
                {/* Hacia atrás siempre; hacia adelante SOLO hasta el año en curso. */}
                <div className="flex items-center justify-between py-2">
                  <button
                    onClick={() => cambiarAnio(anio - 1)}
                    className={`${ENLACE} min-h-[44px] tabular-nums`}
                  >
                    &lsaquo; {SIMPLE ? `Año ${anio - 1}` : anio - 1}
                  </button>
                  {anio < anioEnCurso && (
                    <button
                      onClick={() => cambiarAnio(anio + 1)}
                      className={`${ENLACE} min-h-[44px] tabular-nums`}
                    >
                      {SIMPLE ? `Año ${anio + 1}` : anio + 1} &rsaquo;
                    </button>
                  )}
                </div>
              </div>

              {/* Mes por mes, con palabras: los rótulos de las barras eran de
                  9 px y las barras no decían de qué mes eran. */}
              {SIMPLE && (
                <div className="pt-2">
                  {mesesEnLista.map((m) => {
                    const estaAbierto = mesElegido === m.nombre && verDonaciones;
                    /* Debajo del nombre, de cuándo a cuándo fue ese mes: el mes
                       hebreo no es el mes del calendario de la pared. */
                    const adentro = (
                      <>
                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-[17px] text-[#1C1C1E] ${
                              estaAbierto ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {m.nombre}
                          </span>
                          <span className={`block ${TEXTO_3}`}>
                            {rangoEnPalabras(m.desde, m.hasta)}
                          </span>
                          <span className={`block ${TEXTO_3}`}>
                            {m.cantidad === 0
                              ? "No diste nada este mes"
                              : `${m.cantidad} ${m.cantidad === 1 ? "donación" : "donaciones"}`}
                          </span>
                        </span>
                        <span
                          className={MONTO}
                          style={m.total === 0 ? { color: "#AEAEB2" } : undefined}
                        >
                          {dinero(m.total)}
                        </span>
                      </>
                    );
                    return (
                      <div
                        key={m.nombre}
                        /* El mes abierto se ve abierto: fondo gris y una barra
                           azul a la izquierda, de la cabecera y de sus filas. */
                        className={estaAbierto ? "bg-[#F2F2F7]" : undefined}
                        style={estaAbierto ? { boxShadow: `inset 3px 0 0 ${AZUL}` } : undefined}
                      >
                        {/* Un mes sin donaciones NO se toca: tocarlo no hacía
                            nada y parecía que la app se había trabado. */}
                        {m.cantidad === 0 ? (
                          <div
                            data-mes={m.nombre}
                            data-total={m.total}
                            className="w-full flex items-center gap-4 px-5 py-3.5 min-h-[56px] border-t border-[#E5E5EA]"
                          >
                            {adentro}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setMesElegido(m.nombre);
                              setVerDonaciones(!estaAbierto);
                            }}
                            aria-expanded={estaAbierto}
                            data-mes={m.nombre}
                            data-total={m.total}
                            className={RENGLON}
                          >
                            {adentro}
                            {/* La flecha gira al abrir: cerrado apunta a la
                                derecha, abierto apunta para abajo. */}
                            <span
                              className="text-[17px] text-[#AEAEB2] shrink-0 transition-transform duration-200"
                              style={{ transform: estaAbierto ? "rotate(90deg)" : "none" }}
                            >
                              &rsaquo;
                            </span>
                          </button>
                        )}
                        {estaAbierto && (
                          <div className="px-5 pb-1 animate-desplegar">
                            {m.donaciones.map((d) => (
                              <FilaDonacion
                                key={d.id}
                                donacion={d}
                                hoy={hoy}
                                onAbrir={onAbrirDonacion}
                                sangria
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* No se toca y no lleva monto: no hay nada que abrir. */}
                  {porLlegar.length > 0 && (
                    <div
                      data-por-llegar={porLlegar.length}
                      className={`px-5 py-3.5 border-t border-[#E5E5EA] ${TEXTO_3}`}
                    >
                      {lineaPorLlegar(porLlegar)}
                    </div>
                  )}

                  {/* Lo que el «···» escondía, ahora a la vista y con palabras. */}
                  <div className="mt-8">
                    <button onClick={() => setPorQuien(true)} className={RENGLON}>
                      <span className="flex-1 text-[17px] text-[#1C1C1E]">
                        Ver cuánto le diste a cada persona
                      </span>
                      <span className="text-[17px] text-[#AEAEB2] shrink-0">&rsaquo;</span>
                    </button>
                    <button onClick={() => onExportar(anio)} className={RENGLON}>
                      <span className="flex-1 text-[17px] text-[#1C1C1E]">
                        Guardar la lista para imprimir o para el contador
                      </span>
                      <span className="text-[17px] text-[#AEAEB2] shrink-0">&rsaquo;</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Las barras */}
              {!SIMPLE && (
              <>
              <div
                className="px-5 pt-4 grid gap-[5px] items-end h-[150px]"
                style={{ gridTemplateColumns: `repeat(${meses.length}, 1fr)` }}
              >
                {meses.map((m) => (
                  <button
                    key={m.nombre}
                    aria-label={`${m.nombre} ${dinero(m.total)}`}
                    onClick={() => { setMesElegido(m.nombre); setVerDonaciones(false); }}
                    className="h-full flex items-end bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <span
                      data-barra={m.nombre}
                      data-alto={m.alto}
                      className="block w-full rounded-t-[3px]"
                      style={{
                        height: `${Math.max(m.alto, m.total > 0 ? 2 : 1)}%`,
                        background: abierto?.nombre === m.nombre ? AZUL : "#1C1C1E",
                        opacity: abierto?.nombre === m.nombre ? 1 : 0.85,
                      }}
                    />
                  </button>
                ))}
              </div>
              <div
                className="px-5 pt-1.5 grid gap-[5px] text-[9px] text-[#AEAEB2] text-center"
                style={{ gridTemplateColumns: `repeat(${meses.length}, 1fr)` }}
              >
                {meses.map((m) => (
                  <span key={m.nombre}>{m.abrev}</span>
                ))}
              </div>

              {/* El mes tocado */}
              {abierto && (
                <div className="mx-5 mt-5 border-t border-[#E5E5EA]">
                  <div className="flex items-baseline justify-between py-3 border-b border-[#E5E5EA]">
                    <span className={TEXTO_2}>
                      {abierto.nombre} · {abierto.label}
                    </span>
                    <b className="text-[16px] font-medium tabular-nums">{dinero(abierto.total)}</b>
                  </div>
                  <div className="flex items-baseline justify-between py-3 border-b border-[#E5E5EA]">
                    <span className={TEXTO_2}>
                      {abierto.cantidad} {abierto.cantidad === 1 ? "donación" : "donaciones"}
                    </span>
                    {abierto.cantidad > 0 && (
                      <button
                        onClick={() => setVerDonaciones((v) => !v)}
                        className="bg-transparent border-0 p-0 cursor-pointer text-[16px] font-medium"
                        style={{ color: AZUL }}
                      >
                        {verDonaciones ? "ocultar" : "ver ›"}
                      </button>
                    )}
                  </div>
                  {verDonaciones &&
                    abierto.donaciones.map((d) => (
                      <FilaDonacion key={d.id} donacion={d} hoy={hoy} onAbrir={onAbrirDonacion} />
                    ))}
                </div>
              )}
              </>
              )}
            </>
          )}
        </div>
      </div>

      <HojaAbajo
        abierta={hoja}
        onCerrar={() => setHoja(false)}
        opciones={[
          {
            texto: "Ver por beneficiario",
            onClick: () => { setPorQuien(true); setHoja(false); },
          },
          {
            texto: "Exportar",
            onClick: () => { setHoja(false); onExportar(anio); },
          },
          { texto: "Cancelar", tono: "fuerte", onClick: () => setHoja(false) },
        ]}
      />
    </div>
  );
}

/** Una donación, donde sea que esté: se toca y se abre. */
function FilaDonacion({
  donacion,
  hoy,
  onAbrir,
  sangria = false,
}: {
  donacion: Donation;
  hoy: string;
  onAbrir: (d: Donation) => void;
  sangria?: boolean;
}) {
  /* Con la auditoría prendida, la fila es la misma que en el inicio: manda el
     monto y el nombre baja a la segunda línea, en gris. */
  if (AUDITORIA) {
    return (
      <FilaNueva donacion={donacion} hoy={hoy} onAbrir={onAbrir} sangria={sangria} />
    );
  }
  const segundaLinea = HISTORIAL_ORDENADO
    ? lineaDeLaFila(donacion, hoy, { cheque: true })
    : fechaDeLaFila(donacion.date, hoy);
  return (
    <button
      onClick={() => onAbrir(donacion)}
      className={`w-full flex items-center justify-between gap-3 py-3 text-left bg-transparent border-x-0 border-t-0 border-b border-solid border-[#E5E5EA] cursor-pointer active:bg-[#F2F2F7] transition-colors ${
        sangria ? "pl-4" : ""
      }`}
    >
      <span className="flex-1 min-w-0">
        <span className="block text-[17px] text-[#1C1C1E] truncate">
          {nombreEnPantalla(donacion)}
        </span>
        <span className={`block ${TEXTO_3} truncate`}>{segundaLinea}</span>
      </span>
      <span className={MONTO}>{dinero(donacion.amount)}</span>
    </button>
  );
}

function PorBeneficiario({
  quienes,
  anio,
  hoy,
  volver,
  onAbrirDonacion,
}: {
  quienes: FilaBeneficiario<Donation>[];
  anio: number;
  hoy: string;
  volver: () => void;
  onAbrirDonacion: (d: Donation) => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  return (
    <>
      {/* Antes había dos «‹» seguidos —«‹ Maaser» arriba y «‹ El año» aquí— y
          la pantalla no decía cómo se llamaba. */}
      <div className="px-5">
        {!AUDITORIA && (
          <button onClick={volver} className={`${ENLACE} min-h-[44px]`}>
            &lsaquo; El año {anio}
          </button>
        )}
        {AUDITORIA && (
          <h1 className={`${TITULO} pb-2`}>Cuánto le diste a cada persona</h1>
        )}
      </div>
      {quienes.length === 0 ? (
        <p className={`${TEXTO_2} px-5 py-8`}>Sin donaciones en {anio}.</p>
      ) : (
        quienes.map((q) => (
          <div key={q.clave}>
            <button
              onClick={() => setAbierto(abierto === q.clave ? null : q.clave)}
              className="w-full flex items-center gap-4 px-5 py-3 min-h-[56px] text-left bg-transparent border-x-0 border-b-0 border-t border-solid border-[#E5E5EA] cursor-pointer active:bg-[#F2F2F7] transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[17px] font-medium text-[#1C1C1E] truncate">
                  {q.nombre}
                </span>
                <span className={`block ${TEXTO_3}`}>
                  {q.veces} {q.veces === 1 ? "vez" : "veces"}
                </span>
              </span>
              <span className={AUDITORIA ? MONTO_FUERTE : MONTO}>{dinero(q.total)}</span>
              {AUDITORIA && (
                <span
                  className="text-[17px] text-[#AEAEB2] shrink-0 transition-transform duration-200"
                  style={{ transform: abierto === q.clave ? "rotate(90deg)" : "none" }}
                >
                  &rsaquo;
                </span>
              )}
            </button>
            {abierto === q.clave && (
              <div className="px-5">
                {q.donaciones.map((d) => (
                  <FilaDonacion
                    key={d.id}
                    donacion={d}
                    hoy={hoy}
                    onAbrir={onAbrirDonacion}
                    sangria
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}
