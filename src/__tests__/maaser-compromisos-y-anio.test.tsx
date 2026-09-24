// @vitest-environment jsdom
//
// CANDADO — «los compromisos y el año en barras» (24-sep-2026).
//
// Lo que cuida:
//  1. Un compromiso al que todavía no se le dio ESTE MES hebreo sale arriba de
//     la lista, con el círculo vacío.
//  2. Si ya hay una donación de ese beneficiario en el mes, NO sale. Y no
//     queda debiendo nada: el mes que termina se lo lleva sin aviso.
//  3. Tocar el círculo escribe UNA donación, con la fecha de hoy en Panamá.
//  4. Tocar el número grande abre el año EN CURSO. Se cambia de año con «‹» y
//     «›», como los meses de Propiedades, y NUNCA hay flecha a un año futuro.
//  5. Una barra por mes hebreo (5786 tiene doce) y el mes más fuerte mide el
//     100 %.
//  6. «Ver por beneficiario» suma bien: Rab Gil, 2 veces, $2,000.
//  7. TODA fila de donación se toca y abre la misma pantalla de Anotar, con
//     sus datos y «Borrar»: la del detalle del mes y la de un beneficiario.
//     En producción esas dos eran texto muerto.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";
import { TODAS } from "./maaser-datos-de-prueba";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "prueba";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({}),
  usePathname: () => "/maaser",
}));

import MaaserPage from "@/app/maaser/page";

const COMPROMISO = {
  id: 1,
  beneficiary: "Rab Gil",
  amount: 1000,
  metodo: null,
  activo: true,
};

/** Rab Gil, dentro de Tishrei de 5787 (12 sep – 11 oct de 2026). */
const YA_LE_DIO_ESTE_MES = {
  id: 999,
  date: "2026-09-20",
  beneficiary: "Rab Gil",
  amount: 1000,
  status: "valido" as const,
};

type Escritura = { url: string; metodo: string; cuerpo: Record<string, unknown> };
let escrituras: Escritura[] = [];

function montar({ donaciones = TODAS, compromisos = [COMPROMISO], hayTabla = true } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const metodo = (init?.method ?? "GET").toUpperCase();
      if (metodo !== "GET") {
        escrituras.push({ url, metodo, cuerpo: JSON.parse(String(init?.body ?? "{}")) });
        return { ok: true, json: async () => ({ id: 1000 }) } as Response;
      }
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => donaciones } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return { ok: true, json: async () => ({ gastos_anuales: null }) } as Response;
      }
      if (url.startsWith("/api/maaser/compromisos")) {
        return { ok: true, json: async () => ({ hay_tabla: hayTabla, compromisos }) } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
}

async function abrir(opciones = {}) {
  montar(opciones);
  await waitFor(() => expect(screen.getByText("Para Soldados Usar Lulab")).toBeDefined());
}

const barras = () => Array.from(document.querySelectorAll<HTMLElement>("[data-barra]"));

describe("Maaser · los compromisos del mes", () => {
  beforeEach(() => {
    escrituras = [];
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-23T17:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uno sin donación este mes sale arriba, con el círculo vacío", async () => {
    await abrir();
    expect(screen.getByText("cada mes")).toBeDefined();
    expect(screen.getByRole("button", { name: "Anotar Rab Gil" })).toBeDefined();
    expect(screen.getAllByText("$1,000").length).toBeGreaterThan(0);
  });

  it("si ya se le dio este mes, no sale", async () => {
    await abrir({ donaciones: [...TODAS, YA_LE_DIO_ESTE_MES] });
    expect(screen.queryByText("cada mes")).toBeNull();
    expect(screen.queryByRole("button", { name: "Anotar Rab Gil" })).toBeNull();
  });

  it("sin la tabla no se dibuja ninguna línea de compromiso", async () => {
    await abrir({ hayTabla: false, compromisos: [] });
    expect(screen.queryByText("cada mes")).toBeNull();
  });

  it("tocar el círculo escribe UNA donación con la fecha de hoy", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Anotar Rab Gil" }));
    await waitFor(() => expect(escrituras).toHaveLength(1));
    expect(escrituras[0].url).toBe("/api/donations");
    expect(escrituras[0].metodo).toBe("POST");
    expect(escrituras[0].cuerpo).toMatchObject({
      date: "2026-09-23",
      beneficiary: "Rab Gil",
      amount: 1000,
    });
  });

  it("«Ya no se repite» lo apaga, no lo borra", async () => {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Rab Gil cada mes" }));
    await waitFor(() => expect(screen.getByText("Ya no se repite")).toBeDefined());
    fireEvent.click(screen.getByText("Ya no se repite"));
    await waitFor(() => expect(escrituras).toHaveLength(1));
    expect(escrituras[0].url).toBe("/api/maaser/compromisos");
    expect(escrituras[0].metodo).toBe("PUT");
    expect(escrituras[0].cuerpo).toMatchObject({ id: 1, activo: false });
  });
});

describe("Maaser · el año en barras", () => {
  beforeEach(() => {
    escrituras = [];
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-23T17:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  async function abrirElAnio() {
    await abrir();
    fireEvent.click(screen.getByRole("button", { name: "Ver el año" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "‹ 5786" })).toBeDefined());
  }

  async function abrirElAnio5786() {
    await abrirElAnio();
    fireEvent.click(screen.getByRole("button", { name: "‹ 5786" }));
    await waitFor(() => expect(barras()).toHaveLength(12));
  }

  it("abre en el año en curso y NUNCA ofrece una flecha a un año futuro", async () => {
    await abrirElAnio();
    expect(screen.getByRole("heading", { name: "5787" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "5788 ›" })).toBeNull();
  });

  it("«‹» lleva al año anterior, y desde ahí sí se puede volver", async () => {
    await abrirElAnio5786();
    expect(screen.getByRole("heading", { name: "5786" })).toBeDefined();
    expect(screen.getByRole("button", { name: "5787 ›" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "5787 ›" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "5787" })).toBeDefined());
    expect(screen.queryByRole("button", { name: "5788 ›" })).toBeNull();
  });

  it("5786 dibuja doce barras y Tévet mide el 100 %", async () => {
    await abrirElAnio5786();
    expect(barras()).toHaveLength(12);
    const cien = barras().filter((b) => b.dataset.alto === "100");
    expect(cien).toHaveLength(1);
    expect(cien[0].dataset.barra).toBe("Tévet");
    expect(screen.getByText(/Tévet fue el mes más fuerte/)).toBeDefined();
  });

  it("el mes tocado se abre abajo con sus donaciones", async () => {
    await abrirElAnio5786();
    expect(screen.getByText(/^Tévet · /)).toBeDefined();
    expect(screen.getByText("1 donación")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "ver ›" }));
    await waitFor(() => expect(screen.getByText("Rubén Elin")).toBeDefined());
  });

  it("«Ver por beneficiario» suma bien", async () => {
    await abrirElAnio5786();
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    await waitFor(() => expect(screen.getByText("Ver por beneficiario")).toBeDefined());
    fireEvent.click(screen.getByText("Ver por beneficiario"));
    await waitFor(() => expect(screen.getByText("Rab Gil")).toBeDefined());
    expect(screen.getByText("2 veces")).toBeDefined();
    expect(screen.getByText("$2,000")).toBeDefined();
    // Y el más grande queda arriba: Rubén Elin, $4,800.
    expect(screen.getByText("$4,800")).toBeDefined();
  });
  it("una fila del detalle del mes abre ESA donación en Anotar", async () => {
    await abrirElAnio5786();
    fireEvent.click(screen.getByRole("button", { name: "ver ›" }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Rubén Elin/ })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Rubén Elin/ }));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeDefined());
    expect((screen.getByLabelText("Cuánto") as HTMLInputElement).value).toBe("4800");
    expect((screen.getByLabelText("A quién") as HTMLInputElement).value).toBe("Rubén Elin");
    expect(screen.getByRole("button", { name: "Borrar" })).toBeDefined();
    // Y «Cancelar» devuelve al año, no a la lista del inicio.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "5786" })).toBeDefined());
  });

  it("una fila de la lista de un beneficiario abre ESA donación", async () => {
    await abrirElAnio5786();
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    await waitFor(() => expect(screen.getByText("Ver por beneficiario")).toBeDefined());
    fireEvent.click(screen.getByText("Ver por beneficiario"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Rab Gil/ })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Rab Gil/ }));
    const filas = await screen.findAllByRole("button", { name: /Rab Gil 25 may/ });
    fireEvent.click(filas[0]);
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeDefined());
    expect((screen.getByLabelText("Cuánto") as HTMLInputElement).value).toBe("1000");
    expect(screen.getByRole("button", { name: "25 de mayo" })).toBeDefined();
  });
});
