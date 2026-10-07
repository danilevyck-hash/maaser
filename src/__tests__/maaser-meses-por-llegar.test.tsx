// @vitest-environment jsdom
//
// CANDADO — «los meses que todavía no llegaron» (7-oct-2026), en sus dos
// posiciones.
//
// Un año recién empezado son trece renglones iguales de «No diste nada este
// mes», uno por cada mes del año hebreo, incluidos los que no existen aún.
//
// Lo que cuida:
//  1. APAGADO (como está en producción), la pantalla del año es la de hoy:
//     los TRECE meses de 5787 en renglones, doce diciendo lo mismo.
//  2. PRENDIDO, los meses de la cola que no llegaron se juntan en UNA línea
//     («Jeshván a Elul · todavía no llegaron») y los que ya pasaron en cero
//     siguen renglón por renglón: ahí el cero es información.
//  3. El mes QUE CORRE nunca se esconde, ni estando en cero.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";
import { DE_5787, TODAS } from "./maaser-datos-de-prueba";

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

// El interruptor se mueve desde la prueba. Lo demás, como en producción.
const interruptor = { meses: false };
vi.mock("@/lib/maaser/interruptores", () => ({
  AUDITORIA: true,
  HISTORIAL_ORDENADO: true,
  SIMPLE: true,
  get MESES_POR_LLEGAR() {
    return interruptor.meses;
  },
}));

import MaaserPage from "@/app/maaser/page";

function montarFetch(donaciones: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      if ((init?.method ?? "GET").toUpperCase() !== "GET") {
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => donaciones } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return { ok: true, json: async () => ({ gastos_anuales: 800000 }) } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

/** Abre la pantalla del año en curso (5787) con el interruptor en `prendido`. */
async function abrirElAnio(prendido: boolean, donaciones: unknown[] = TODAS) {
  interruptor.meses = prendido;
  montarFetch(donaciones);
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByRole("button", { name: "Ver el año" })).toBeTruthy());
  fireEvent.click(screen.getByRole("button", { name: "Ver el año" }));
  await waitFor(() => expect(screen.getByRole("heading", { name: "Año 5787" })).toBeTruthy());
}

const meses = () => Array.from(document.querySelectorAll<HTMLElement>("[data-mes]"));
const laLinea = () => document.querySelector<HTMLElement>("[data-por-llegar]");

describe("Maaser · los meses que todavía no llegaron", () => {
  beforeEach(() => {
    interruptor.meses = false;
    // 7-oct-2026: 5787 corre por su PRIMER mes (Tishrei, 12 sep – 11 oct).
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-10-07T17:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("apagado: la pantalla de hoy", () => {
    it("5787 son TRECE renglones y doce repiten «No diste nada este mes»", async () => {
      await abrirElAnio(false);
      expect(meses()).toHaveLength(13);
      expect(meses().map((m) => m.dataset.mes)).toContain("Elul");
      expect(screen.getAllByText("No diste nada este mes")).toHaveLength(12);
      expect(laLinea()).toBeNull();
    });
  });

  describe("prendido: una sola línea", () => {
    it("los doce que no llegaron se juntan, y el que corre se queda", async () => {
      await abrirElAnio(true);
      // Tishrei —el mes que corre— es el único renglón que queda.
      expect(meses().map((m) => m.dataset.mes)).toEqual(["Tishrei"]);
      expect(screen.queryByText("No diste nada este mes")).toBeNull();
      const linea = laLinea();
      expect(linea?.dataset.porLlegar).toBe("12");
      expect(linea?.textContent).toBe("Jeshván a Elul · todavía no llegaron");
      // Es texto, no un botón: no hay nada que abrir.
      expect(linea?.querySelector("button")).toBeNull();
    });

    it("el mes que corre se queda aunque esté en CERO", async () => {
      // Sin las cinco donaciones de Tishrei, su cero es información: ese mes
      // ya empezó y no se dio nada.
      await abrirElAnio(true, TODAS.filter((d) => !DE_5787.includes(d)));
      expect(meses().map((m) => m.dataset.mes)).toEqual(["Tishrei"]);
      expect(screen.getAllByText("No diste nada este mes")).toHaveLength(1);
      expect(laLinea()?.dataset.porLlegar).toBe("12");
    });

    it("un año ya cerrado no cambia: 5786 sigue mes por mes", async () => {
      await abrirElAnio(true);
      fireEvent.click(screen.getByRole("button", { name: "‹ Año 5786" }));
      await waitFor(() => expect(screen.getByRole("heading", { name: "Año 5786" })).toBeTruthy());
      expect(meses()).toHaveLength(12);
      expect(laLinea()).toBeNull();
    });
  });
});
