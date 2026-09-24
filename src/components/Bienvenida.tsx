"use client";

/**
 * «Cómo se usa» — la bienvenida de un módulo, como el paseo que iOS muestra la
 * primera vez que abres una app.
 *
 * Una página por cada cosa que se puede hacer: un dibujo de línea de esa
 * pantalla, una frase corta y una segunda línea gris. Abajo, los puntitos y un
 * botón: «Siguiente», y en la última «Empezar». También se desliza con el dedo.
 *
 * Cómo se usa (una línea en la pantalla del módulo):
 *
 *   <Bienvenida {...BIENVENIDA_PROPIEDADES} />
 *
 * Sale UNA sola vez en ese teléfono: al terminarla se guarda
 * `bienvenida:<modulo>:v<version>` en el navegador. Como vive en el aparato,
 * papá la ve en su teléfono y Daniel en el suyo, sin quitarse la vuelta.
 * Para volver a mostrarla después de un cambio grande se sube la `version`
 * (de 1 a 2) y vuelve a salir en los dos.
 *
 * 🔴 Falla ABIERTA hacia el silencio: si el navegador no deja leer ni escribir
 * (modo privado, almacenamiento lleno), NO se muestra. Vale más no verla que
 * trabarle la pantalla a papá.
 */

import { useEffect, useMemo, useState } from "react";
import { BOTON_PRINCIPAL } from "@/lib/ui/apple";
import { Dibujo, type NombreDeDibujo } from "./dibujos-bienvenida";

export type PaginaDeBienvenida = {
  dibujo: NombreDeDibujo;
  titulo: string;
  texto: string;
};

export function claveDeBienvenida(modulo: string, version: number): string {
  return `bienvenida:${modulo}:v${version}`;
}

export default function Bienvenida({
  modulo,
  version,
  titulo,
  paginas,
}: {
  modulo: string;
  version: number;
  titulo: string;
  paginas: PaginaDeBienvenida[];
}) {
  const clave = useMemo(() => claveDeBienvenida(modulo, version), [modulo, version]);
  const [abierta, setAbierta] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [dedoX, setDedoX] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(clave)) setAbierta(true);
    } catch {
      // Sin almacenamiento no se muestra sola, y la pantalla sigue igual.
    }
  }, [clave]);

  if (!abierta || paginas.length === 0) return null;

  const cerrar = () => {
    try {
      window.localStorage.setItem(clave, "1");
    } catch {
      // Si no se puede recordar, igual se cierra: no se traba la pantalla.
    }
    setAbierta(false);
  };

  const esLaUltima = pagina >= paginas.length - 1;
  const seguir = () => (esLaUltima ? cerrar() : setPagina((p) => p + 1));
  const actual = paginas[pagina];

  return (
    <div
      className="fixed inset-0 z-[300] bg-white flex flex-col"
      onTouchStart={(e) => setDedoX(e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (dedoX === null) return;
        const corrido = (e.changedTouches[0]?.clientX ?? dedoX) - dedoX;
        if (corrido < -40) setPagina((p) => Math.min(p + 1, paginas.length - 1));
        if (corrido > 40) setPagina((p) => Math.max(p - 1, 0));
        setDedoX(null);
      }}
    >
      <div className="flex items-center justify-between max-w-[430px] w-full mx-auto px-5 pt-14 shrink-0">
        <span className="text-[15px] text-[#6E6E73]">{titulo}</span>
        <button
          onClick={cerrar}
          className="text-[#007AFF] text-[17px] bg-transparent border-0 min-h-[44px] cursor-pointer"
        >
          Cerrar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[430px] w-full mx-auto px-7 flex flex-col items-center justify-center min-h-full py-6">
          <Dibujo nombre={actual.dibujo} />
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] text-[#1C1C1E] leading-[1.15] text-center mt-9">
            {actual.titulo}
          </h2>
          <p className="text-[16px] text-[#6E6E73] leading-[1.35] text-center mt-2 max-w-[300px]">
            {actual.texto}
          </p>
        </div>
      </div>

      <div
        className="max-w-[430px] w-full mx-auto px-7 shrink-0"
        style={{ paddingBottom: "calc(28px + env(safe-area-inset-bottom))" }}
      >
        <div className="flex justify-center gap-1.5 pb-5" aria-hidden="true">
          {paginas.map((p, i) => (
            <span
              key={p.titulo}
              className={`w-[7px] h-[7px] rounded-full ${i === pagina ? "bg-[#1C1C1E]" : "bg-[#E5E5EA]"}`}
            />
          ))}
        </div>
        <button onClick={seguir} className={BOTON_PRINCIPAL}>
          {esLaUltima ? "Empezar" : "Siguiente"}
        </button>
      </div>
    </div>
  );
}
