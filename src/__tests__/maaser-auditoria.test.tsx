// @vitest-environment jsdom
//
// CANDADO — la PROPUESTA de la auditoría (6-oct-2026), en sus dos posiciones.
//
// Daniel usa el número de cheque para cuadrar con el banco. Hoy buscar es
// SOLO por nombre: escribir «2936» no encuentra nada.
//
// Lo que cuida:
//  1. APAGADA (como está en producción), la pantalla es la de hoy: el
//     buscador dice «Buscar un nombre» y un número no encuentra nada.
//  2. PRENDIDA, el buscador dice «Buscar un nombre o un cheque» y el número
//     encuentra la donación de ese cheque.
//  3. PRENDIDA, el gasto anual se cambia DESDE la pantalla y al guardarlo se
//     recalcula «te faltan $X» (hasta hoy solo se podía en la base).
//  4. «Yappy» y «Transferencia» son UN solo botón: guardaban lo mismo.
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

const interruptor = { auditoria: false };
vi.mock("@/lib/maaser/interruptores", () => ({
  // Los meses que no llegaron: candado aparte. Aquí queda apagado, para que
  // esta prueba siga viendo el año mes por mes.
  MESES_POR_LLEGAR: false,
  HISTORIAL_ORDENADO: true,
  SIMPLE: true,
  get AUDITORIA() {
    return interruptor.auditoria;
  },
}));

type Escritura = { url: string; metodo: string; cuerpo: Record<string, unknown> };
let escrituras: Escritura[] = [];
/** Lo que contesta /api/goal; la prueba lo cambia para simular el guardado. */
let gastoGuardado: number | null = null;

function montarFetch() {
  escrituras = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const metodo = (init?.method ?? "GET").toUpperCase();
      if (metodo !== "GET") {
        const cuerpo = JSON.parse(String(init?.body ?? "{}"));
        escrituras.push({ url, metodo, cuerpo });
        if (url.startsWith("/api/goal")) {
          gastoGuardado = Number(cuerpo.gastos_anuales);
        }
        return { ok: true, json: async () => ({ ok: true }) } as Response;
      }
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => TODAS } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return { ok: true, json: async () => ({ gastos_anuales: gastoGuardado }) } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

async function abrir(auditoria: boolean) {
  interruptor.auditoria = auditoria;
  montarFetch();
  const { default: MaaserPage } = await import("@/app/maaser/page");
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByText("Iosef Milszteln")).toBeTruthy());
  return screen.getByLabelText("Buscar por nombre") as HTMLInputElement;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  interruptor.auditoria = false;
  gastoGuardado = null;
});

describe("apagada: la pantalla de hoy", () => {
  it("el buscador es solo de nombres y un cheque no encuentra nada", async () => {
    const buscador = await abrir(false);
    expect(buscador.placeholder).toBe("Buscar un nombre");
    fireEvent.change(buscador, { target: { value: "2936" } });
    await waitFor(() => expect(screen.getByText("Ningún nombre coincide.")).toBeTruthy());
    expect(screen.queryByText("Iosef Milszteln")).toBeNull();
  });
});

describe("prendida: el cheque se busca y se ve", () => {
  it("el número de cheque encuentra su donación", async () => {
    const buscador = await abrir(true);
    expect(buscador.placeholder).toBe("Buscar un nombre o un cheque");
    fireEvent.change(buscador, { target: { value: "2936" } });
    await waitFor(() => expect(screen.getByText("Iosef Milszteln")).toBeTruthy());
    expect(screen.queryByText("Ningún nombre coincide.")).toBeNull();
    // Y el número va en negrita, no en el gris de la fecha.
    expect(screen.getByText("Cheque 2936").tagName).toBe("B");
  });

  it("un nombre sigue buscándose por nombre", async () => {
    const buscador = await abrir(true);
    fireEvent.change(buscador, { target: { value: "iosef" } });
    await waitFor(() => expect(screen.getByText("Iosef Milszteln")).toBeTruthy());
  });
});

describe("el gasto anual se cambia desde la pantalla", () => {
  it("sin el dato, la pantalla lo pide; al guardarlo, se recalcula el 10 %", async () => {
    await abrir(true);
    // Sin gasto anual no se dibujaba NADA: el 10 % era invisible.
    const pedir = screen.getByRole("button", { name: /Poner el gasto anual/ });
    fireEvent.click(pedir);
    await waitFor(() => expect(screen.getByLabelText("Gasto anual")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Gasto anual"), { target: { value: "800000" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(escrituras).toHaveLength(1));
    expect(escrituras[0].url).toBe("/api/goal");
    expect(escrituras[0].metodo).toBe("PUT");
    expect(escrituras[0].cuerpo).toMatchObject({ gastos_anuales: 800000 });
    // Y la línea del 10 % aparece sola, derivada del dato guardado.
    await waitFor(() =>
      expect(screen.getByText(/Debes dar \$80,000 este año/)).toBeTruthy(),
    );
  });

  it("apagada, la línea del 10 % no se toca", async () => {
    await abrir(false);
    expect(screen.queryByRole("button", { name: /gasto anual/i })).toBeNull();
    expect(escrituras).toHaveLength(0);
  });
});

describe("cómo pagaste: un botón por forma de pago", () => {
  it("«Yappy» y «Transferencia» son uno solo", async () => {
    await abrir(true);
    fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeTruthy());

    expect(screen.getByRole("button", { name: "Yappy o transferencia" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yappy" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Transferencia" })).toBeNull();

    // Y guarda el mismo valor de siempre: las viejas no cambian.
    fireEvent.change(screen.getByLabelText("Cuánto"), { target: { value: "101" } });
    fireEvent.click(screen.getByRole("button", { name: "Yappy o transferencia" }));
    fireEvent.click(screen.getByRole("button", { name: "Listo, anotar" }));
    await waitFor(() =>
      expect(escrituras.some((e) => e.url === "/api/donations")).toBe(true),
    );
    expect(escrituras.find((e) => e.url === "/api/donations")!.cuerpo.metodo).toBe(
      "transferencia",
    );
  });
});
