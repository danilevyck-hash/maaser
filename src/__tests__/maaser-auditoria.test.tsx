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
  HISTORIAL_ORDENADO: true,
  SIMPLE: true,
  get AUDITORIA() {
    return interruptor.auditoria;
  },
}));

function montarFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => TODAS } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return { ok: true, json: async () => ({ gastos_anuales: null }) } as Response;
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
