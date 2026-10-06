"use client";

/**
 * Anotar una donación — una pantalla, sin rótulos con signo de pregunta.
 *
 * El monto primero y grande: cinco chips explican el 70 % de lo que da.
 * Después el nombre (y la app le recuerda cuánto le dio la última vez), el
 * cheque (propone el siguiente; uno repetido AVISA y no frena), cómo pagó,
 * la nota y el interruptor de "se repite cada mes".
 *
 * El botón negro dice la fecha: tocar la FECHA la cambia, tocar "Listo"
 * guarda con el día de HOY en Panamá.
 */

import { useEffect, useMemo, useState } from "react";
import type { Donation } from "@/lib/supabase";
import HojaAbajo from "@/components/propiedades/HojaAbajo";
import { avisoDeChequeRepetido, siguienteCheque } from "@/lib/maaser/cheque";
import { CHIPS_METODO, chipDeLoGuardado } from "@/lib/maaser/chips-metodo";
import { fechaDelBoton } from "@/lib/maaser/fecha-en-palabras";
import { montosParaChips, NOMBRE_CARGA_INICIAL } from "@/lib/maaser/montos-frecuentes";
import { nombresSugeridos, textoUltimaDonacion } from "@/lib/maaser/sugerencias-nombre";
import { normalizarMetodo } from "@/lib/maaser/metodo-pago";
import { SIMPLE } from "@/lib/maaser/interruptores";
import {
  AZUL,
  BOTON_PRINCIPAL,
  ENLACE,
  FICHA,
  FICHA_ELEGIDA,
  RAYA,
  ROJO,
  TEXTO_2,
} from "@/lib/ui/apple";

export type LoQueSeGuarda = {
  donacion: Partial<Donation>;
  repetirCadaMes: boolean;
};

/**
 * Los rótulos eran de 12 px, en MAYÚSCULAS y en gris claro: por debajo del
 * mínimo de 14 px de la app y a muy poco contraste.
 */
const ROTULO_CAMPO = SIMPLE
  ? "block text-[14px] text-[#6E6E73] mb-1"
  : "block text-[12px] uppercase tracking-[0.08em] text-[#AEAEB2] mb-1";
const CAMPO_LIMPIO =
  "w-full bg-transparent border-0 outline-none text-[17px] text-[#1C1C1E] p-0 placeholder:text-[#AEAEB2]";
const BLOQUE_CAMPO = "mx-5 border-t border-[#E5E5EA] py-3";

export default function Anotar({
  donaciones,
  editando,
  hoy,
  hayCompromisos,
  guardando,
  borrando,
  onCancelar,
  onGuardar,
  onBorrar,
}: {
  donaciones: Donation[];
  editando: Donation | null;
  hoy: string;
  hayCompromisos: boolean;
  guardando?: boolean;
  borrando?: boolean;
  onCancelar: () => void;
  onGuardar: (lo: LoQueSeGuarda) => void;
  onBorrar?: (id: number) => void;
}) {
  const [monto, setMonto] = useState("");
  const [nombre, setNombre] = useState("");
  const [cheque, setCheque] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [repetir, setRepetir] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [hoja, setHoja] = useState<null | "fecha" | "borrar">(null);
  const [falta, setFalta] = useState("");

  useEffect(() => {
    if (editando) {
      setMonto(String(editando.amount ?? ""));
      setNombre(editando.beneficiary || "");
      setCheque(editando.check_number || "");
      setChip(chipDeLoGuardado(editando.metodo));
      setNota(editando.notes || "");
      setFecha(editando.date);
    } else {
      setMonto("");
      setNombre("");
      setCheque("");
      setChip(null);
      setNota("");
      setFecha(hoy);
    }
    setRepetir(false);
    setFalta("");
  }, [editando, hoy]);

  const chips = useMemo(() => montosParaChips(donaciones), [donaciones]);
  const proximoCheque = useMemo(() => siguienteCheque(donaciones), [donaciones]);
  const sugerencias = useMemo(
    () => nombresSugeridos(donaciones, nombre),
    [donaciones, nombre]
  );
  const loQueLeDio = useMemo(
    () => textoUltimaDonacion(donaciones, nombre, editando?.id),
    [donaciones, nombre, editando?.id]
  );
  const avisoCheque = useMemo(
    () => avisoDeChequeRepetido(donaciones, cheque, editando?.id),
    [donaciones, cheque, editando?.id]
  );

  const metodo = chip
    ? normalizarMetodo(CHIPS_METODO.find((c) => c.etiqueta === chip)?.valor)
    : null;

  const guardar = () => {
    const cuanto = parseFloat(monto);
    if (!Number.isFinite(cuanto) || cuanto <= 0) {
      setFalta(SIMPLE ? "Falta poner cuánto diste" : "Falta: cuánto diste");
      return;
    }
    setFalta("");
    const donacion: Partial<Donation> = {
      date: fecha,
      // Guardar sin nombre sigue estando permitido: queda como la carga vieja.
      beneficiary: nombre.trim() || NOMBRE_CARGA_INICIAL,
      amount: cuanto,
      check_number: cheque.trim() || undefined,
      status: "valido",
      notes: nota.trim() || undefined,
      metodo,
    };
    if (editando) donacion.id = editando.id;
    onGuardar({ donacion, repetirCadaMes: repetir && !!nombre.trim() });
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-white z-[150]">
      <div className="px-5 pt-14 shrink-0 bg-white">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <button onClick={onCancelar} className={`${ENLACE} min-h-[44px]`}>
            Cancelar
          </button>
          {/* Antes esta pantalla no decía en qué pantalla estaba. */}
          {SIMPLE && (
            <span className="text-[17px] font-medium text-[#1C1C1E]">
              {editando ? "Cambiar la donación" : "Nueva donación"}
            </span>
          )}
          <span />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div className="max-w-[430px] mx-auto pb-6">
          {/* El monto, primero y grande */}
          <div className="flex items-start justify-center gap-1 pt-4 pb-1 px-5">
            <span className="text-[26px] text-[#AEAEB2] font-light leading-[1.4]">$</span>
            <input
              aria-label="Cuánto"
              inputMode="decimal"
              value={monto}
              onChange={(e) => {
                setMonto(e.target.value.replace(/[^\d.]/g, ""));
                setFalta("");
              }}
              placeholder="0"
              autoFocus={SIMPLE && !editando}
              className="bg-transparent border-0 outline-none text-[58px] font-light tracking-[-0.03em] tabular-nums text-[#1C1C1E] leading-none p-0 placeholder:text-[#AEAEB2]"
              /* Vacío medía 1 ch: había que acertarle a una franja de 30 px
                 para empezar a escribir. */
              style={{ width: `${Math.max(monto.length, SIMPLE ? 3 : 1)}ch` }}
            />
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 px-5 pt-3 pb-1">
            {chips.map((m) => (
              <button
                key={m}
                onClick={() => { setMonto(String(m)); setFalta(""); }}
                className={`${parseFloat(monto) === m ? FICHA_ELEGIDA : FICHA} !rounded-full !px-3.5 !min-h-[44px]`}
              >
                {m.toLocaleString("en-US")}
              </button>
            ))}
          </div>

          {/* A quién */}
          <div className={BLOQUE_CAMPO} style={{ marginTop: 8 }}>
            <label className={ROTULO_CAMPO} htmlFor="maaser-nombre">A quién</label>
            <input
              id="maaser-nombre"
              autoComplete="off"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Rab Gil"
              className={CAMPO_LIMPIO}
            />
          </div>
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pb-1">
              {sugerencias.map((s) => (
                <button key={s} onClick={() => setNombre(s)} className={`${FICHA} !rounded-full !px-3.5`}>
                  {s}
                </button>
              ))}
            </div>
          )}
          {loQueLeDio && (
            <p className="px-5 pb-2 text-[14px] leading-snug" style={{ color: AZUL }}>
              {loQueLeDio}
            </p>
          )}

          {/* Cheque */}
          <div className={BLOQUE_CAMPO}>
            <label className={ROTULO_CAMPO} htmlFor="maaser-cheque">
              {SIMPLE ? "Número de cheque" : "Cheque"}
            </label>
            <input
              id="maaser-cheque"
              inputMode="numeric"
              value={cheque}
              /* El número ya NO se llena solo al tocar el campo: aparecía de la
                 nada. Ahora hay un botón que dice qué número va a poner. */
              onFocus={
                SIMPLE
                  ? undefined
                  : () => {
                      if (!cheque && !editando && proximoCheque) setCheque(proximoCheque);
                    }
              }
              onChange={(e) => setCheque(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder={SIMPLE ? "Si pagaste con cheque" : proximoCheque ?? "opcional"}
              className={CAMPO_LIMPIO}
              style={avisoCheque ? { color: ROJO } : undefined}
            />
          </div>
          {SIMPLE && !cheque && !editando && proximoCheque && (
            <div className="px-5 pb-1">
              <button
                onClick={() => setCheque(proximoCheque)}
                className={`${FICHA} !rounded-full !px-3.5`}
              >
                Poner el {proximoCheque}
              </button>
            </div>
          )}
          {avisoCheque && (
            <p className="px-5 pb-2 text-[14px] leading-snug" style={{ color: ROJO }}>
              {avisoCheque}
            </p>
          )}

          {/* Cómo pagó. Los cuatro en una fila a 390 px dejaban
              «Transferencia» en 13 px y apretado: pasan a dos y dos. */}
          {SIMPLE && (
            <p className={`${ROTULO_CAMPO} px-5 pt-4`}>Cómo pagaste</p>
          )}
          <div
            className={
              SIMPLE
                ? "grid grid-cols-2 gap-2 px-5 pb-1"
                : "flex gap-1.5 px-5 pt-2 pb-1"
            }
          >
            {CHIPS_METODO.map((c) => (
              <button
                key={c.etiqueta}
                onClick={() => setChip(chip === c.etiqueta ? null : c.etiqueta)}
                className={`${SIMPLE ? "min-h-[48px] text-[16px]" : "flex-1 text-[13px]"} rounded-[10px] border cursor-pointer transition-colors ${
                  SIMPLE ? "" : "min-h-[44px]"
                } ${
                  chip === c.etiqueta
                    ? "border-[#1C1C1E] text-[#1C1C1E] font-semibold bg-white"
                    : "border-[#E5E5EA] text-[#6E6E73] bg-white"
                }`}
              >
                {/* «Cheque» ya es el rótulo del campo de arriba. */}
                {SIMPLE && c.etiqueta === "Cheque" ? "Con cheque" : c.etiqueta}
              </button>
            ))}
          </div>

          {/* Nota */}
          <div className={BLOQUE_CAMPO}>
            <label className={ROTULO_CAMPO} htmlFor="maaser-nota">Nota</label>
            <input
              id="maaser-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Hijo enfermo, boda, quién lo recomendó…"
              className={CAMPO_LIMPIO}
            />
          </div>

          {/* El día. Antes vivía DENTRO del botón negro, pegado a «Listo»:
              tocar la mitad derecha del botón no guardaba, abría el
              calendario, y parecía que «Listo» no había hecho nada. */}
          {SIMPLE && (
            <div className="mx-5 border-t border-[#E5E5EA] py-3 flex items-center justify-between gap-3">
              <span className="min-w-0">
                <span className={ROTULO_CAMPO}>Qué día se dio</span>
                <span className="block text-[17px] text-[#1C1C1E]">
                  {fechaDelBoton(fecha, hoy)}
                </span>
              </span>
              <button
                onClick={() => setHoja("fecha")}
                className="shrink-0 min-h-[44px] rounded-[10px] border border-[#E5E5EA] bg-white text-[#007AFF] text-[16px] px-4 cursor-pointer"
              >
                Cambiar el día
              </button>
            </div>
          )}

          {/* Se repite cada mes — solo si la tabla ya existe. */}
          {hayCompromisos && !editando && (
            <div className="mx-5 border-t border-[#E5E5EA] py-3 flex items-center justify-between gap-3">
              <span className="text-[17px] text-[#1C1C1E]">Se repite cada mes</span>
              <button
                role="switch"
                aria-checked={repetir}
                aria-label="Se repite cada mes"
                onClick={() => setRepetir((v) => !v)}
                className={`w-[51px] h-[31px] rounded-full border-0 cursor-pointer transition-colors relative shrink-0 ${
                  repetir ? "bg-[#34C759]" : "bg-[#E5E5EA]"
                }`}
              >
                <span
                  className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white transition-all"
                  style={{ left: repetir ? 22 : 2, boxShadow: "0 1px 3px rgba(0,0,0,.2)" }}
                />
              </button>
            </div>
          )}
          {SIMPLE && hayCompromisos && !editando && repetir && (
            <p className={`${TEXTO_2} px-5 pb-1`}>
              Todos los meses te va a esperar arriba, lista para anotarla de un
              toque.
            </p>
          )}

          {editando && onBorrar && (
            <div className="px-5 pt-6">
              <button
                onClick={() => setHoja("borrar")}
                className="w-full min-h-[52px] bg-transparent border-0 cursor-pointer text-[17px]"
                style={{ color: ROJO }}
              >
                {SIMPLE ? "Borrar esta donación" : "Borrar"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* El botón negro: "Listo" guarda, la fecha se toca para cambiarla. */}
      <div className="shrink-0 bg-white px-5" style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom))" }}>
        {/* El aviso vive PEGADO al botón: antes se dibujaba al final del
            formulario, fuera de la pantalla, y él tocaba «Listo» sin ver nada. */}
        {falta && (
          <p
            className="max-w-[430px] mx-auto pb-2 text-[15px] text-center"
            style={{ color: ROJO }}
          >
            {falta}
          </p>
        )}
        {SIMPLE ? (
          /* Un solo botón, todo el ancho: tocarlo donde sea GUARDA. */
          <button
            onClick={guardar}
            disabled={guardando}
            className={`${BOTON_PRINCIPAL} max-w-[430px] mx-auto block`}
          >
            {guardando ? "Guardando…" : "Listo, anotar"}
          </button>
        ) : (
          <div
            className={`${BOTON_PRINCIPAL} max-w-[430px] mx-auto flex items-center justify-center gap-1.5 !py-0`}
            style={{
              opacity: guardando ? 0.4 : 1,
              // Mientras guarda, TODA la barra se apaga: ni «Listo» ni la fecha.
              pointerEvents: guardando ? "none" : undefined,
            }}
          >
            <button
              onClick={guardar}
              disabled={guardando}
              className="flex-1 text-right bg-transparent border-0 text-white text-[17px] font-semibold cursor-pointer min-h-[52px] px-1"
            >
              {guardando ? "Guardando…" : "Listo ·"}
            </button>
            <button
              onClick={() => setHoja("fecha")}
              disabled={guardando}
              className="flex-1 text-left bg-transparent border-0 text-white text-[17px] font-semibold cursor-pointer min-h-[52px] px-1"
            >
              {fechaDelBoton(fecha, hoy)}
            </button>
          </div>
        )}
      </div>

      <HojaAbajo
        abierta={hoja === "fecha"}
        onCerrar={() => setHoja(null)}
        encabezado={<>¿Qué día se dio?</>}
        opciones={[{ texto: "Listo", tono: "fuerte", onClick: () => setHoja(null) }]}
      >
        <div className="p-4" style={{ borderTop: `1px solid ${RAYA}` }}>
          <input
            aria-label="Día de la donación"
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value || hoy)}
            className="w-full rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-3 text-[17px] text-[#1C1C1E] outline-none"
          />
          <p className={`${TEXTO_2} pt-2`}>Sin tocarla, se guarda con el día de hoy.</p>
        </div>
      </HojaAbajo>

      <HojaAbajo
        abierta={hoja === "borrar"}
        onCerrar={() => setHoja(null)}
        encabezado={<>Esto no se puede deshacer.</>}
        opciones={[
          {
            texto: "Borrar esta donación",
            tono: "rojo",
            desactivada: borrando,
            onClick: () => editando && onBorrar?.(editando.id),
          },
          { texto: "Cancelar", onClick: () => setHoja(null) },
        ]}
      />
    </div>
  );
}
