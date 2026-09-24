import { describe, it, expect } from "vitest";
import {
  MAX_FALLOS,
  VENTANA_MINUTOS,
  estadoTrasFallo,
  evaluarFreno,
} from "@/lib/login-freno";

const ahora = new Date("2026-09-23T15:00:00.000Z");
const minutosAntes = (n: number) =>
  new Date(ahora.getTime() - n * 60_000).toISOString();

describe("el freno de intentos del PIN", () => {
  it("sin historia, se puede probar", () => {
    const v = evaluarFreno(null, ahora);
    expect(v.bloqueado).toBe(false);
    expect(v.intentosRestantes).toBe(MAX_FALLOS);
  });

  it("con cuatro fallos todavía deja probar, y avisa cuántos quedan", () => {
    const v = evaluarFreno({ fallos: 4, primer_fallo_en: minutosAntes(2) }, ahora);
    expect(v.bloqueado).toBe(false);
    expect(v.intentosRestantes).toBe(1);
  });

  it("al quinto fallo cierra la puerta", () => {
    const v = evaluarFreno({ fallos: 5, primer_fallo_en: minutosAntes(2) }, ahora);
    expect(v.bloqueado).toBe(true);
    expect(v.minutosRestantes).toBe(VENTANA_MINUTOS - 2);
    expect(v.intentosRestantes).toBe(0);
  });

  it("pasados los 15 minutos la racha ya no cuenta", () => {
    const v = evaluarFreno({ fallos: 9, primer_fallo_en: minutosAntes(16) }, ahora);
    expect(v.bloqueado).toBe(false);
    expect(v.intentosRestantes).toBe(MAX_FALLOS);
  });

  it("los minutos que faltan nunca son cero mientras esté bloqueado", () => {
    const v = evaluarFreno(
      { fallos: 5, primer_fallo_en: minutosAntes(VENTANA_MINUTOS - 0.2) },
      ahora
    );
    expect(v.bloqueado).toBe(true);
    expect(v.minutosRestantes).toBe(1);
  });

  it("cada fallo suma, sin mover el arranque de la racha", () => {
    const primero = estadoTrasFallo(null, ahora);
    expect(primero.fallos).toBe(1);
    expect(primero.primer_fallo_en).toBe(ahora.toISOString());

    const segundo = estadoTrasFallo(primero, new Date(ahora.getTime() + 60_000));
    expect(segundo.fallos).toBe(2);
    expect(segundo.primer_fallo_en).toBe(primero.primer_fallo_en);
  });

  it("un fallo después de la ventana arranca una racha nueva", () => {
    const viejo = { fallos: 5, primer_fallo_en: minutosAntes(20) };
    const nuevo = estadoTrasFallo(viejo, ahora);
    expect(nuevo.fallos).toBe(1);
    expect(nuevo.primer_fallo_en).toBe(ahora.toISOString());
  });

  it("una fecha rota no bloquea a nadie: falla ABIERTA", () => {
    const v = evaluarFreno({ fallos: 99, primer_fallo_en: "no es una fecha" }, ahora);
    expect(v.bloqueado).toBe(false);
  });
});
