// @vitest-environment jsdom
//
// CANDADO — «historial ordenado y número de cheque» (6-oct-2026).
//
// Daniel: «Aquí en Maaser no veo historial. De manera ordenada quiero poder
// ver historial ordenado y número de cheque».
//
// Lo que cuida, con las cinco donaciones REALES de 5787 y las de 5786:
//  1. APAGADO el interruptor, la pantalla es la de hoy: la línea «5786 ·
//     $81,198» es texto muerto, no se ve ningún cheque y no hay «···».
//  2. PRENDIDO, la misma línea se toca y abre el año 5786 entero.
//  3. PRENDIDO, la fila dice «Cheque 2936» sin perder la fecha ni la nota.
//  4. PRENDIDO, «···» ordena por monto: la de $4,800 sube al primer lugar y
//     el separador de año desaparece.
//  5. Ni prendido ni apagado se escribe NADA en la base al abrir la pantalla.
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

// El interruptor se mueve desde la prueba: el módulo es el único lugar donde vive.
const interruptor = { prendido: false };
vi.mock("@/lib/maaser/interruptores", () => ({
  get HISTORIAL_ORDENADO() {
    return interruptor.prendido;
  },
}));

const llamadas: { url: string; metodo: string }[] = [];

function montarFetch() {
  llamadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      llamadas.push({ url, metodo: (init?.method ?? "GET").toUpperCase() });
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => TODAS } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return {
          ok: true,
          json: async () => ({ year: 5787, gastos_anuales: null, columna_gastos: true }),
        } as Response;
      }
      if (url.startsWith("/api/maaser/compromisos")) {
        return { ok: true, json: async () => ({ hay_tabla: false, compromisos: [] }) } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

async function abrir(prendido: boolean) {
  interruptor.prendido = prendido;
  montarFetch();
  const { default: MaaserPage } = await import("@/app/maaser/page");
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByText("Anotar")).toBeTruthy());
  await waitFor(() => expect(screen.getByText(/5786 ·/)).toBeTruthy());
}

/** El renglón de 5786, sea el `<p>` muerto o el botón que abre el año. */
const lineaDe5786 = () => screen.getByText(/5786 ·/);

beforeEach(() => {
  interruptor.prendido = false;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("apagado: la pantalla de hoy, intacta", () => {
  it("la línea del año es texto muerto y no hay «···»", async () => {
    await abrir(false);
    expect(lineaDe5786().tagName).toBe("P");
    expect(lineaDe5786().closest("button")).toBeNull();
    expect(screen.queryByLabelText("Ordenar")).toBeNull();
  });

  it("ningún cheque a la vista, aunque cuatro de las cinco lo tengan", async () => {
    await abrir(false);
    expect(screen.queryByText(/Cheque 2936/)).toBeNull();
    expect(screen.queryByText(/Cheque/)).toBeNull();
  });

  it("el buscador no está a la vista hasta bajar", async () => {
    await abrir(false);
    expect(screen.queryByLabelText("Buscar por nombre")).toBeNull();
  });
});

describe("prendido: historial por año, cheque y orden", () => {
  it("la línea «5786 · $81,198» se toca y abre el año 5786", async () => {
    await abrir(true);
    const linea = screen.getByLabelText("Ver el año 5786");
    expect(linea.textContent).toContain("5786");
    fireEvent.click(linea);
    // El año es el título de la pantalla nueva, y trae su «‹ 5785».
    await waitFor(() => expect(screen.getByText("5786")).toBeTruthy());
    expect(screen.getByText(/5785/)).toBeTruthy();
  });

  it("la fila dice la fecha, el cheque y la nota, en ese orden", async () => {
    await abrir(true);
    // Alberto Sedani: 14 sep, cheque 2933, «Esposa enferma».
    expect(screen.getByText("14 sep · Cheque 2933 · Esposa enferma")).toBeTruthy();
    // Iosef Milszteln lleva cheque y no lleva nota.
    expect(screen.getByText(/Cheque 2936$/)).toBeTruthy();
  });

  it("«···» ordena por monto: $4,800 primero y sin separador de año", async () => {
    await abrir(true);
    fireEvent.click(screen.getByLabelText("Ordenar"));
    fireEvent.click(screen.getByText("Por monto"));

    await waitFor(() => expect(screen.queryByText(/5786 ·/)).toBeNull());
    expect(screen.getByText("Por monto")).toBeTruthy();

    const nombres = screen
      .getAllByText(/Rubén Elin|Shaare Jesed|Para Soldados Usar Lulab/)
      .map((e) => e.textContent);
    expect(nombres[0]).toBe("Rubén Elin");

    // Y vuelve a la de siempre con un toque.
    fireEvent.click(screen.getByText("por fecha"));
    await waitFor(() => expect(screen.getByText(/5786 ·/)).toBeTruthy());
  });

  it("ordena por nombre: Alberto Sedani arriba", async () => {
    await abrir(true);
    fireEvent.click(screen.getByLabelText("Ordenar"));
    fireEvent.click(screen.getByText("Por nombre"));
    await waitFor(() => expect(screen.queryByText(/5786 ·/)).toBeNull());
    const filas = screen.getAllByText(/Alberto Sedani|Shaare Jesed/);
    expect(filas[0].textContent).toBe("Alberto Sedani");
  });

  it("el buscador está a la vista si hay muchas", async () => {
    await abrir(true);
    // Once donaciones: todavía no son «muchas» (el techo es 20).
    expect(screen.queryByLabelText("Buscar por nombre")).toBeNull();
  });
});

describe("abrir la pantalla no escribe nada", () => {
  it("ni apagado ni prendido: solo lecturas", async () => {
    for (const prendido of [false, true]) {
      await abrir(prendido);
      expect(llamadas.length).toBeGreaterThan(0);
      expect(llamadas.every((l) => l.metodo === "GET")).toBe(true);
      cleanup();
    }
  });
});
