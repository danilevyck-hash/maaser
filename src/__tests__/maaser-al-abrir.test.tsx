// @vitest-environment jsdom
//
// CANDADO — «un número y un botón» (24-sep-2026).
//
// Lo que cuida, con las cinco donaciones REALES de 5787:
//  1. El número grande es $678 y el subtítulo dice el año hebreo con la fecha
//     en español: «5787 · desde el 12 de septiembre».
//  2. Debajo, en gris, cuántas van y cuánto fue el año pasado.
//  3. Sin `gastos_anuales` escrito NO aparece la palabra «Meta». Con 100.000
//     escrito aparece «Meta 10 %: $10,000 · te faltan $9,322».
//  4. No hay «+» arriba ni pestañas: el único botón es «Anotar».
//  5. El separador de año aparece UNA sola vez al pasar de 5787 a 5786.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";
import { DE_5786, TODAS, TOTAL_5786 } from "./maaser-datos-de-prueba";

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

function montarFetch(gastosAnuales: number | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => TODAS } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return {
          ok: true,
          json: async () => ({ year: 5787, goal_amount: 0, gastos_anuales: gastosAnuales, columna_gastos: true }),
        } as Response;
      }
      if (url.startsWith("/api/maaser/compromisos")) {
        return { ok: true, json: async () => ({ hay_tabla: false, compromisos: [] }) } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

async function abrir(gastosAnuales: number | null = null) {
  montarFetch(gastosAnuales);
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByText("Para Soldados Usar Lulab")).toBeDefined());
}

describe("Maaser · al abrir", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Mediodía de Panamá del 23-sep-2026.
    vi.setSystemTime(new Date("2026-09-23T17:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("el número grande es lo dado en el año hebreo en curso", async () => {
    await abrir();
    expect(screen.getByText("$678")).toBeDefined();
  });

  it("el subtítulo dice el año hebreo con la fecha en español", async () => {
    await abrir();
    expect(screen.getByText("5787 · desde el 12 de septiembre")).toBeDefined();
  });

  it("debajo, en gris, cuántas van y cuánto fue el año pasado", async () => {
    await abrir();
    expect(
      screen.getByText(`5 donaciones · el año pasado $${TOTAL_5786.toLocaleString("en-US")}`),
    ).toBeDefined();
  });

  it("sin lo que gasta escrito, la palabra «Meta» no existe", async () => {
    await abrir(null);
    expect(screen.queryByText(/Meta/)).toBeNull();
  });

  it("con lo que gasta escrito, dice cuánto le toca y cuánto falta", async () => {
    await abrir(100_000);
    expect(screen.getByText("Meta 10 %: $10,000 · te faltan $9,322")).toBeDefined();
  });

  it("no hay «+» arriba ni pestañas: el único botón grande es «Anotar»", async () => {
    await abrir();
    expect(screen.getByRole("button", { name: "Anotar" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "+" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Nueva propiedad" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Donaciones" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Resumen" })).toBeNull();
    expect(screen.queryByText("+ Nueva donación")).toBeNull();
  });

  it("la fila dice hoy, ayer o el día, y la nota cuando la hay", async () => {
    await abrir();
    expect(screen.getByText("hoy")).toBeDefined();
    expect(screen.getByText("ayer")).toBeDefined();
    expect(screen.getByText("15 sep")).toBeDefined();
    expect(screen.getByText("14 sep · Esposa enferma")).toBeDefined();
  });

  it("el separador del año aparece UNA sola vez", async () => {
    await abrir();
    const separadores = screen.getAllByText(/^5786 · \$/);
    expect(separadores).toHaveLength(1);
    expect(separadores[0].textContent).toBe(`5786 · $${TOTAL_5786.toLocaleString("en-US")}`);
    // Y la lista sigue: las de 5786 están dibujadas, sin selector de año.
    for (const d of DE_5786) {
      expect(screen.getAllByText(d.beneficiary).length).toBeGreaterThan(0);
    }
  });
});
