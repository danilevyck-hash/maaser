// @vitest-environment jsdom
//
// CANDADO — la bienvenida de cada módulo (24-sep-2026).
//
//  1. Sale sola la PRIMERA vez en ese teléfono, y no la segunda.
//  2. Vuelve a salir si se sube la `version`.
//  3. Sin localStorage (modo privado, almacenamiento lleno) NO se dibuja:
//     vale más no verla que trabar la pantalla.
//  4. Es un paseo: «Siguiente» hasta la última, donde dice «Empezar».
//  5. Cada página de los cinco módulos tiene dibujo, frase y segunda línea.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import Bienvenida, { claveDeBienvenida, type PaginaDeBienvenida } from "@/components/Bienvenida";
import {
  BIENVENIDA_FINANZAS,
  BIENVENIDA_INDRIVER,
  BIENVENIDA_MAASER,
  BIENVENIDA_POR_COBRAR,
  BIENVENIDA_PROPIEDADES,
} from "@/lib/bienvenidas";

const PAGINAS: PaginaDeBienvenida[] = [
  { dibujo: "p-circulo", titulo: "Toca el círculo", texto: "Queda con la fecha de hoy." },
  { dibujo: "p-rojo", titulo: "La palabra roja cobra", texto: "Abre WhatsApp escrito." },
];

let memoria: Map<string, string>;

function almacenamientoDeMentira(rompe = false) {
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => {
      if (rompe) throw new Error("sin almacenamiento");
      return memoria.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (rompe) throw new Error("sin almacenamiento");
      memoria.set(k, String(v));
    },
    removeItem: (k: string) => memoria.delete(k),
    clear: () => memoria.clear(),
    key: () => null,
    length: 0,
  });
}

describe("La bienvenida de un módulo", () => {
  beforeEach(() => {
    memoria = new Map();
    almacenamientoDeMentira();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("sale sola la primera vez, y no la segunda", async () => {
    render(<Bienvenida modulo="prueba" version={1} titulo="Prueba" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.getByText("Toca el círculo")).toBeDefined());

    // Se termina el paseo.
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
    await waitFor(() => expect(screen.queryByText("Toca el círculo")).toBeNull());
    expect(memoria.get(claveDeBienvenida("prueba", 1))).toBe("1");

    // Al volver a entrar ya no aparece.
    cleanup();
    render(<Bienvenida modulo="prueba" version={1} titulo="Prueba" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.queryByText("Toca el círculo")).toBeNull());
  });

  it("vuelve a salir si se sube la versión", async () => {
    memoria.set(claveDeBienvenida("prueba", 1), "1");

    render(<Bienvenida modulo="prueba" version={1} titulo="Prueba" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.queryByText("Toca el círculo")).toBeNull());
    cleanup();

    render(<Bienvenida modulo="prueba" version={2} titulo="Prueba" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.getByText("Toca el círculo")).toBeDefined());
  });

  it("es de cada teléfono: el de papá no apaga el de Daniel", async () => {
    // Lo que se guarda vive en el aparato, con una llave por módulo y versión.
    memoria.set(claveDeBienvenida("maaser", 1), "1");
    render(<Bienvenida modulo="propiedades" version={1} titulo="Propiedades" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.getByText("Toca el círculo")).toBeDefined());
  });

  it("sin localStorage no se dibuja y no rompe nada", async () => {
    almacenamientoDeMentira(true);
    render(<Bienvenida modulo="prueba" version={1} titulo="Prueba" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.queryByText("Toca el círculo")).toBeNull());
  });

  it("el botón dice «Siguiente» hasta la última, donde dice «Empezar»", async () => {
    render(<Bienvenida modulo="prueba" version={1} titulo="Prueba" paginas={PAGINAS} />);
    await waitFor(() => expect(screen.getByText("Toca el círculo")).toBeDefined());

    expect(screen.getByRole("button", { name: "Siguiente" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

    expect(screen.getByText("La palabra roja cobra")).toBeDefined();
    expect(screen.getByRole("button", { name: "Empezar" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Siguiente" })).toBeNull();
  });

  it("los cinco módulos tienen sus páginas completas", () => {
    const todas = [
      BIENVENIDA_PROPIEDADES,
      BIENVENIDA_MAASER,
      BIENVENIDA_POR_COBRAR,
      BIENVENIDA_FINANZAS,
      BIENVENIDA_INDRIVER,
    ];
    for (const bienvenida of todas) {
      expect(bienvenida.paginas.length, bienvenida.modulo).toBeGreaterThanOrEqual(3);
      for (const pagina of bienvenida.paginas) {
        expect(pagina.dibujo, bienvenida.modulo).toBeTruthy();
        expect(pagina.titulo.length, bienvenida.modulo).toBeGreaterThan(8);
        expect(pagina.texto.length, bienvenida.modulo).toBeGreaterThan(8);
      }
    }
    // Propiedades cuenta las nueve cosas que se pueden hacer.
    expect(BIENVENIDA_PROPIEDADES.paginas.length).toBe(9);
  });

  it("no hay ni un emoji en los textos", () => {
    const textos = [
      BIENVENIDA_PROPIEDADES,
      BIENVENIDA_MAASER,
      BIENVENIDA_POR_COBRAR,
      BIENVENIDA_FINANZAS,
      BIENVENIDA_INDRIVER,
    ].flatMap((b) => b.paginas.flatMap((p) => [p.titulo, p.texto]));
    for (const texto of textos) {
      expect(/\p{Extended_Pictographic}/u.test(texto), texto).toBe(false);
    }
  });
});
