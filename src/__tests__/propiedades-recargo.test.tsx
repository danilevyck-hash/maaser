// @vitest-environment jsdom
//
// CANDADO — recargo por atraso (24-sep-2026).
//
//  1. Sin las dos columnas en la base, el recargo NO EXISTE: ni línea en
//     Editar, ni un centavo de más en ningún total.
//  2. Con día 5 y 10 %, agosto no pagado visto el 24-sep lleva $130; visto
//     el 3 de agosto, todavía no.
//  3. El mensaje de WhatsApp lo dice.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { COBROS, CONTRATOS, PROPIEDADES } from "./propiedades-datos-de-prueba";
import { recargoDelMes, reglaDeRecargo } from "@/lib/propiedades/recargo";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "prueba";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({ id: "9" }),
  usePathname: () => "/propiedades",
}));

import PropiedadesPage from "@/app/propiedades/page";
import PropiedadPage from "@/app/propiedades/[id]/page";

/** Las mismas siete, con las columnas ya corridas: Brisa Marbella cobra 10 % después del día 5. */
const CON_RECARGO = PROPIEDADES.map((p) => ({
  ...p,
  recargo_dia: p.id === 9 ? 5 : null,
  recargo_pct: p.id === 9 ? 10 : null,
}));

function montarFetch(propiedades: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      if ((init?.method ?? "GET").toUpperCase() !== "GET") {
        return { ok: true, json: async () => ({ id: 999 }) } as Response;
      }
      if (url.startsWith("/api/propiedades/properties")) {
        return { ok: true, json: async () => propiedades } as Response;
      }
      if (url.startsWith("/api/propiedades/contracts")) {
        return { ok: true, json: async () => CONTRATOS } as Response;
      }
      const propiedad = Number(new URLSearchParams(url.split("?")[1] ?? "").get("property_id"));
      return {
        ok: true,
        json: async () => COBROS.filter((c) => !propiedad || c.property_id === propiedad),
      } as Response;
    }),
  );
}

async function dibujarLista(propiedades: unknown[]) {
  montarFetch(propiedades);
  render(<PropiedadesPage />);
  await waitFor(() => expect(screen.getByText("Terreno Carrasquilla")).toBeDefined());
}

function enPanama(fecha: string) {
  vi.setSystemTime(new Date(`${fecha}T17:00:00Z`));
}

describe("Propiedades · recargo por atraso", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    enPanama("2026-09-24");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sin las columnas en la base, el recargo no existe", async () => {
    await dibujarLista(PROPIEDADES);
    expect(screen.getByText("te deben $1,300")).toBeDefined();
    cleanup();

    montarFetch(PROPIEDADES);
    render(<PropiedadPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(await screen.findByLabelText("Inquilino")).toBeDefined();
    expect(screen.queryByLabelText("Día del recargo")).toBeNull();
  });

  it("con las columnas, Editar pregunta el día y el por ciento", async () => {
    montarFetch(CON_RECARGO);
    render(<PropiedadPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Editar" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect((await screen.findByLabelText("Día del recargo") as HTMLInputElement).value).toBe("5");
    expect((screen.getByLabelText("Por ciento del recargo") as HTMLInputElement).value).toBe("10");
  });

  it("agosto no pagado, visto el 24 de septiembre: $130 de recargo", async () => {
    await dibujarLista(CON_RECARGO);
    expect(screen.getByText("te deben $1,430")).toBeDefined();

    fireEvent.click(screen.getByText(/debe agosto/));
    expect(await screen.findByText(/\+ \$130 de recargo/)).toBeDefined();
  });

  it("el mismo agosto, visto el 3 de agosto: todavía no hay recargo", async () => {
    enPanama("2026-08-03");
    await dibujarLista(CON_RECARGO);
    expect(screen.getByText("te deben $1,300")).toBeDefined();
    expect(screen.queryByText(/de recargo/)).toBeNull();
  });

  it("el mensaje de WhatsApp dice el recargo", async () => {
    await dibujarLista(CON_RECARGO);
    fireEvent.click(screen.getByText(/debe agosto/));
    const enlace = (await screen.findByText("Escribirle por WhatsApp")) as HTMLAnchorElement;
    expect(new URL(enlace.href).searchParams.get("text")).toBe(
      "Sebastián, me falta el alquiler de agosto ($1,300) más $130 de recargo. Gracias, Alberto",
    );
  });

  it("la regla, sin pantalla", () => {
    const regla = reglaDeRecargo({ recargo_dia: 5, recargo_pct: 10 });
    expect(regla).toEqual({ dia: 5, pct: 10 });
    expect(recargoDelMes({ mes: "2026-08", monto: 1300, regla, hoy: "2026-09-24" })).toBe(130);
    expect(recargoDelMes({ mes: "2026-08", monto: 1300, regla, hoy: "2026-08-05" })).toBe(0);
    expect(recargoDelMes({ mes: "2026-08", monto: 1300, regla, hoy: "2026-08-06" })).toBe(130);
    // Sin regla (las siete de hoy): nunca hay recargo.
    expect(reglaDeRecargo({ recargo_dia: null, recargo_pct: null })).toBeNull();
    expect(recargoDelMes({ mes: "2026-08", monto: 1300, regla: null, hoy: "2027-01-01" })).toBe(0);
  });
});
