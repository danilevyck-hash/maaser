// @vitest-environment jsdom
//
// CANDADO — «el año, mes por mes» (24-sep-2026, al día con los arreglos del
// 6-oct-2026; los «compromisos» se fueron: la tabla estaba vacía).
//
// Lo que cuida:
//  4. Tocar el número grande abre el año EN CURSO. Se cambia de año con «‹» y
//     «›», como los meses de Propiedades, y NUNCA hay flecha a un año futuro.
//  5. Un renglón por mes hebreo (5786 tiene doce) y el mes más fuerte se
//     dice con palabras.
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

type Escritura = { url: string; metodo: string; cuerpo: Record<string, unknown> };
let escrituras: Escritura[] = [];

function montar({ donaciones = TODAS } = {}) {
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

const meses = () => Array.from(document.querySelectorAll<HTMLElement>("[data-mes]"));

describe("Maaser · el año, mes por mes", () => {
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
    await waitFor(() => expect(screen.getByRole("button", { name: "‹ Año 5786" })).toBeDefined());
  }

  async function abrirElAnio5786() {
    await abrirElAnio();
    fireEvent.click(screen.getByRole("button", { name: "‹ Año 5786" }));
    await waitFor(() => expect(meses()).toHaveLength(12));
  }

  it("abre en el año en curso y NUNCA ofrece una flecha a un año futuro", async () => {
    await abrirElAnio();
    expect(screen.getByRole("heading", { name: "Año 5787" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Año 5788 ›" })).toBeNull();
  });

  it("«‹» lleva al año anterior, y desde ahí sí se puede volver", async () => {
    await abrirElAnio5786();
    expect(screen.getByRole("heading", { name: "Año 5786" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Año 5787 ›" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Año 5787 ›" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Año 5787" })).toBeDefined());
    expect(screen.queryByRole("button", { name: "Año 5788 ›" })).toBeNull();
  });

  it("5786 son doce renglones y el más fuerte se dice con palabras", async () => {
    await abrirElAnio5786();
    expect(meses()).toHaveLength(12);
    const masFuerte = meses().reduce((a, b) =>
      Number(b.dataset.total) > Number(a.dataset.total) ? b : a,
    );
    expect(masFuerte.dataset.mes).toBe("Tévet");
    expect(screen.getByText(/El mes en que más diste fue Tévet/)).toBeDefined();
  });

  it("el mes tocado se abre con sus donaciones", async () => {
    await abrirElAnio5786();
    expect(screen.getByText("Tévet")).toBeDefined();
    expect(screen.getAllByText("1 donación").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /^Tévet/ }));
    await waitFor(() => expect(screen.getByText("Rubén Elin")).toBeDefined());
  });

  it("«Ver por beneficiario» suma bien", async () => {
    await abrirElAnio5786();
    fireEvent.click(screen.getByText("Ver cuánto le diste a cada persona"));
    await waitFor(() => expect(screen.getByText("Rab Gil")).toBeDefined());
    expect(screen.getByText("2 veces")).toBeDefined();
    expect(screen.getByText("$2,000")).toBeDefined();
    // Y el más grande queda arriba: Rubén Elin, $4,800.
    expect(screen.getByText("$4,800")).toBeDefined();
  });
  it("una fila del detalle del mes abre ESA donación en Anotar", async () => {
    await abrirElAnio5786();
    fireEvent.click(screen.getByRole("button", { name: /^Tévet/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Rubén Elin/ })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Rubén Elin/ }));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeDefined());
    expect((screen.getByLabelText("Cuánto") as HTMLInputElement).value).toBe("4800");
    expect((screen.getByLabelText("A quién") as HTMLInputElement).value).toBe("Rubén Elin");
    expect(screen.getByRole("button", { name: "Borrar esta donación" })).toBeDefined();
    // Y «Cancelar» devuelve al año, no a la lista del inicio.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Año 5786" })).toBeDefined());
  });

  it("una fila de la lista de un beneficiario abre ESA donación", async () => {
    await abrirElAnio5786();
    fireEvent.click(screen.getByText("Ver cuánto le diste a cada persona"));
    await waitFor(() => expect(screen.getByRole("button", { name: /Rab Gil/ })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Rab Gil/ }));
    // La fila dice primero cuándo y después, en gris, a quién.
    const filas = await screen.findAllByRole("button", { name: /25 may.*Rab Gil/ });
    fireEvent.click(filas[0]);
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeDefined());
    expect((screen.getByLabelText("Cuánto") as HTMLInputElement).value).toBe("1000");
    expect(screen.getByText("25 de mayo")).toBeDefined();
  });
});
