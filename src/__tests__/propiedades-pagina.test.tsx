// @vitest-environment jsdom
//
// CANDADO — la página de la propiedad (24-sep-2026).
//
//  1. Cada año son doce círculos, con el estado correcto de cada mes.
//  2. Los meses que no llegaron van punteados y no se tocan.
//  3. «Se fue el inquilino» cierra el contrato HOY y NO borra nada.
//  4. El aviso de contrato sale solo dentro de los 60 días.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { COBROS, CONTRATOS, PROPIEDADES } from "./propiedades-datos-de-prueba";
import { avisoDeContratos } from "@/lib/propiedades/contratos-por-vencer";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "prueba";
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({ id: "9" }),
  usePathname: () => "/propiedades/9",
}));

import PropiedadPage from "@/app/propiedades/[id]/page";

type Escritura = { url: string; metodo: string; cuerpo: Record<string, unknown> };
let escrituras: Escritura[] = [];

function montarFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const metodo = (init?.method ?? "GET").toUpperCase();
      if (metodo !== "GET") {
        escrituras.push({ url, metodo, cuerpo: JSON.parse(String(init?.body ?? "{}")) });
        return { ok: true, json: async () => ({ id: 999 }) } as Response;
      }
      if (url.startsWith("/api/propiedades/properties")) {
        return { ok: true, json: async () => PROPIEDADES } as Response;
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

async function dibujarPagina() {
  render(<PropiedadPage />);
  await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toBeDefined());
}

/** El círculo del mes, por su rótulo. */
function circulo(nombre: string) {
  return screen.getByRole("button", { name: nombre });
}

describe("Propiedades · la página de la propiedad", () => {
  beforeEach(() => {
    escrituras = [];
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-24T17:00:00Z"));
    montarFetch();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("dibuja doce círculos por año, con el estado de cada mes", async () => {
    await dibujarPagina();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Brisa Marbella");

    // 2026: abril pagado, agosto «no pagó», el resto sin marcar.
    expect(circulo("abril 2026").textContent).toBe("✓");
    expect(circulo("agosto 2026").textContent).toBe("✗");
    expect(circulo("mayo 2026").textContent).toBe("");
    expect(screen.getByText("debe agosto · $1,300")).toBeDefined();

    // Un año entero son doce meses.
    const de2026 = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    for (const mes of de2026) expect(circulo(`${mes} 2026`)).toBeDefined();

    // El historial llega hasta el primer año con contrato (2021).
    expect(circulo("enero 2021")).toBeDefined();
  });

  it("los meses que no llegaron no se tocan", async () => {
    await dibujarPagina();
    expect((circulo("septiembre 2026") as HTMLButtonElement).disabled).toBe(false);
    expect((circulo("octubre 2026") as HTMLButtonElement).disabled).toBe(true);
    expect((circulo("diciembre 2026") as HTMLButtonElement).disabled).toBe(true);
  });

  it("tocar un mes pregunta si pagó, y «Sí, pagó» lo marca con la fecha de hoy", async () => {
    await dibujarPagina();
    fireEvent.click(circulo("septiembre 2026"));
    expect(await screen.findByText(/¿Pagó septiembre\?/)).toBeDefined();

    fireEvent.click(screen.getByText("Sí, pagó"));
    await waitFor(() => expect(escrituras.length).toBe(1));
    expect(escrituras[0].metodo).toBe("POST");
    expect(escrituras[0].cuerpo).toMatchObject({
      property_id: 9,
      month: "2026-09",
      amount: 1300,
      status: "pagado",
      paid_date: "2026-09-24",
    });
  });

  it("«Se fue el inquilino» cierra el contrato hoy y no borra nada", async () => {
    await dibujarPagina();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.click(await screen.findByText("Se fue el inquilino"));
    fireEvent.click(await screen.findByText("Sí, se fue"));

    await waitFor(() => expect(escrituras.length).toBe(1));
    expect(escrituras[0].url).toBe("/api/propiedades/contracts");
    expect(escrituras[0].metodo).toBe("PUT");
    expect(escrituras[0].cuerpo).toEqual({ id: 6, active: false, end_date: "2026-09-24" });
    expect(escrituras.some((e) => e.metodo === "DELETE")).toBe(false);
  });

  it("el aviso de contratos sale solo dentro de los 60 días", () => {
    expect(avisoDeContratos({ contratos: CONTRATOS, hoy: "2026-09-24" })).toBeNull();
    expect(avisoDeContratos({ contratos: CONTRATOS, hoy: "2027-02-10" })).toBe(
      "El contrato de Moisés vence en marzo. También el de Ana, Janibeth, Sebastián, José y Javed.",
    );
    // Un contrato ya vencido no avisa: el aviso se va solo.
    expect(avisoDeContratos({ contratos: CONTRATOS, hoy: "2027-07-01" })).toBeNull();
  });
});
