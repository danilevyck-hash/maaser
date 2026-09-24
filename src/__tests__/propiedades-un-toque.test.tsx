// @vitest-environment jsdom
//
// CANDADO — «una lista, un toque» (24-sep-2026).
//
// Lo que esta prueba cuida, con las siete propiedades reales:
//  1. El título es el mes, y el subtítulo cuadra: «2 de 7 · $3,700».
//  2. «te deben $1,300» sale SOLO por lo que papá marcó como no pagado.
//  3. Un 'mora' viejo NO es deuda: ni en rojo, ni en el total.
//  4. Tocar el círculo escribe UNA fila pagada con la fecha de Panamá.
//  5. Nunca hay flecha a un mes que no llegó.
//  6. Crillón dice «hasta enero», derivado de sus cobros pagados.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { COBROS, CONTRATOS, PROPIEDADES } from "./propiedades-datos-de-prueba";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "prueba";
});

const empujones: string[] = [];
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: (url: string) => empujones.push(url),
    replace: () => {},
    refresh: () => {},
    back: () => {},
  }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => ({ id: "9" }),
  usePathname: () => "/propiedades",
}));

import PropiedadesPage from "@/app/propiedades/page";

type Escritura = { url: string; metodo: string; cuerpo: Record<string, unknown> };
let escrituras: Escritura[] = [];

function montarFetch(cobros = COBROS) {
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
          : cobros;
      return { ok: true, json: async () => cuerpo } as Response;
    }),
  );
}

async function dibujarLista() {
  render(<PropiedadesPage />);
  await waitFor(() => expect(screen.getByText("Terreno Carrasquilla")).toBeDefined());
}

describe("Propiedades · la lista del mes", () => {
  beforeEach(() => {
    escrituras = [];
    empujones.length = 0;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Mediodía de Panamá del 24-sep-2026.
    vi.setSystemTime(new Date("2026-09-24T17:00:00Z"));
    montarFetch();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("el título es el mes y el subtítulo cuadra", async () => {
    await dibujarLista();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Septiembre");
    expect(screen.getByText(/2 de 7 · \$3,700/)).toBeDefined();
  });

  it("«te deben» sale solo de lo que papá marcó, y un 'mora' viejo no cuenta", async () => {
    await dibujarLista();

    // Brisa Marbella: él dijo «no pagó» agosto.
    expect(screen.getByText("te deben $1,300")).toBeDefined();
    expect(screen.getByText(/debe agosto/)).toBeDefined();

    // Marquis 7A tiene agosto en 'mora' desde el sistema viejo: ni una palabra roja.
    const marquis = screen.getByText("Marquis 7A").closest("div")?.parentElement;
    expect(marquis?.textContent).toContain("David Harmodio");
    expect(marquis?.textContent).not.toContain("debe");
  });

  it("tocar el círculo escribe UNA fila pagada con la fecha de Panamá", async () => {
    await dibujarLista();
    fireEvent.click(screen.getByLabelText("Marcar pagado · Marquis 7A"));
    await waitFor(() => expect(escrituras.length).toBe(1));

    expect(escrituras[0].metodo).toBe("POST");
    expect(escrituras[0].url).toBe("/api/propiedades/charges");
    expect(escrituras[0].cuerpo).toMatchObject({
      property_id: 5,
      month: "2026-09",
      amount: 800,
      status: "pagado",
      paid_date: "2026-09-24",
    });
  });

  it("no hay flecha a un mes que no llegó, y sí al volver de uno pasado", async () => {
    await dibujarLista();
    expect(screen.queryByRole("button", { name: /Octubre/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Agosto/ }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Agosto"));
    expect(screen.getByRole("button", { name: /Septiembre ›/ })).toBeDefined();
  });

  it("Crillón dice «hasta enero» y su círculo es de adelanto", async () => {
    await dibujarLista();
    expect(screen.getByText("hasta enero")).toBeDefined();
    expect(screen.getByLabelText("Pagó · Crillón")).toBeDefined();
  });

  it("tocar el nombre abre la página de la propiedad", async () => {
    await dibujarLista();
    fireEvent.click(screen.getByText("Brisa Marbella"));
    expect(empujones).toContain("/propiedades/9");
  });

  it("abrir la pantalla no escribe ni una fila", async () => {
    await dibujarLista();
    expect(escrituras).toEqual([]);
  });
});
