// @vitest-environment jsdom
//
// CANDADO — el adelanto y el cobro (24-sep-2026).
//
//  1. «Pagó varios meses por adelantado» escribe EXACTAMENTE los meses que
//     faltan: nunca vuelve a escribir un mes ya pagado.
//  2. «No ha pagado» deja el mes en 'no_pago' (y nada más es deuda).
//  3. El mensaje de WhatsApp es exacto y el número va sin espacios ni guiones.
//  4. «Ya me pagó agosto» marca agosto y nada más.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { COBROS, CONTRATOS, PROPIEDADES } from "./propiedades-datos-de-prueba";
import { mensajeDeCobro, numeroWhatsapp } from "@/lib/propiedades/whatsapp";
import { pasosDelAdelanto } from "@/lib/propiedades/adelanto";

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
      const cuerpo = url.startsWith("/api/propiedades/properties")
        ? PROPIEDADES
        : url.startsWith("/api/propiedades/contracts")
          ? CONTRATOS
          : COBROS;
      return { ok: true, json: async () => cuerpo } as Response;
    }),
  );
}

async function dibujarLista() {
  render(<PropiedadesPage />);
  await waitFor(() => expect(screen.getByText("Terreno Carrasquilla")).toBeDefined());
}

describe("Propiedades · adelanto y deuda", () => {
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

  it("el adelanto escribe solo los meses que faltan", async () => {
    await dibujarLista();

    // Crillón ya está pagado hasta enero 2027: tocar su ✓ abre la hoja.
    fireEvent.click(screen.getByLabelText("Pagó · Crillón"));
    fireEvent.click(await screen.findByText("Pagó varios meses por adelantado"));
    fireEvent.click(await screen.findByRole("button", { name: "Marzo 2027" }));

    await waitFor(() => expect(escrituras.length).toBe(2));
    expect(escrituras.map((e) => e.cuerpo.month)).toEqual(["2027-02", "2027-03"]);
    for (const escritura of escrituras) {
      expect(escritura.metodo).toBe("POST");
      expect(escritura.cuerpo).toMatchObject({ property_id: 10, amount: 2200, status: "pagado", paid_date: "2026-09-24" });
    }
  });

  it("nunca duplica un mes ya pagado (la regla, sin pantalla)", () => {
    const pasos = pasosDelAdelanto({
      desde: "2026-09",
      hasta: "2027-03",
      cobros: COBROS.filter((c) => c.property_id === 10),
      montoDeMes: () => 2200,
    });
    expect(pasos.map((p) => p.mes)).toEqual(["2027-02", "2027-03"]);
  });

  it("«No ha pagado» deja el mes en no_pago", async () => {
    await dibujarLista();
    fireEvent.click(screen.getByLabelText("Pagó · Brisa Marina"));
    fireEvent.click(await screen.findByText("No ha pagado"));

    await waitFor(() => expect(escrituras.length).toBe(1));
    expect(escrituras[0].metodo).toBe("PUT");
    expect(escrituras[0].cuerpo).toEqual({ id: 101, status: "no_pago", paid_date: null });
  });

  it("el mensaje de WhatsApp es exacto y el número va limpio", async () => {
    await dibujarLista();
    fireEvent.click(screen.getByText(/debe agosto/));

    const enlace = (await screen.findByText("Escribirle por WhatsApp")) as HTMLAnchorElement;
    const url = new URL(enlace.href);
    expect(url.host).toBe("wa.me");
    expect(url.pathname).toBe("/50769174827");
    expect(url.searchParams.get("text")).toBe(
      "Sebastián, me falta el alquiler de agosto ($1,300). Gracias, Alberto",
    );
  });

  it("con varios meses el mensaje habla de los alquileres", () => {
    expect(
      mensajeDeCobro({
        inquilino: "Sebastián",
        meses: ["2026-07", "2026-08"],
        monto: 2600,
        anioDeReferencia: "2026-09",
      }),
    ).toBe("Sebastián, me faltan los alquileres de julio y agosto ($2,600). Gracias, Alberto");
    expect(numeroWhatsapp("68867153")).toBe("50768867153");
    expect(numeroWhatsapp("+507 6917-4827")).toBe("50769174827");
    expect(numeroWhatsapp("")).toBeNull();
  });

  it("«Ya me pagó agosto» marca agosto y nada más", async () => {
    await dibujarLista();
    fireEvent.click(screen.getByText(/debe agosto/));
    fireEvent.click(await screen.findByText("Ya me pagó agosto"));

    await waitFor(() => expect(escrituras.length).toBe(1));
    expect(escrituras[0].metodo).toBe("PUT");
    expect(escrituras[0].cuerpo).toEqual({ id: 110, status: "pagado", paid_date: "2026-09-24" });
  });
});
