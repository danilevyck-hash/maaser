// @vitest-environment jsdom
//
// CANDADO — «Anotar: lo que ya sabe, no se pregunta» (24-sep-2026).
//
// Lo que cuida:
//  1. Los cinco chips de monto SALEN DE LA BASE, dejando afuera la carga
//     inicial del 22-mar-2026 (beneficiary = «Donación»).
//  2. El cheque propone el siguiente al mayor usado.
//  3. Un cheque repetido se dice en rojo, con el nombre y la fecha, y el botón
//     de guardar SIGUE ACTIVO: la chequera se usa salteada.
//  4. «Listo» guarda con el día de PANAMÁ. A las 9 de la noche de Panamá la
//     fecha es la de HOY, nunca la de mañana (el defecto medido: 12 donaciones
//     quedaron con la fecha corrida).
//  5. Tocar la FECHA del botón permite guardar con otro día.
//  6. El interruptor «Se repite cada mes» crea el compromiso; sin la tabla no
//     se dibuja y guardar la donación funciona igual.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";

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

/* ── Datos de mentira ─────────────────────────────────────────────── */

type Fila = {
  id: number;
  date: string;
  beneficiary: string;
  amount: number;
  check_number?: string | null;
  status: "valido";
};

let siguienteId = 1;
function muchas(monto: number, veces: number, nombre: string): Fila[] {
  return Array.from({ length: veces }, () => ({
    id: siguienteId++,
    date: "2026-06-10",
    beneficiary: nombre,
    amount: monto,
    status: "valido" as const,
  }));
}

// Uso corriente: 500 ×6 · 72 ×5 · 54 ×4 · 36 ×3 · 18 ×2 → esos son los chips.
// Carga inicial («Donación»): 101 ×9 y 180 ×8. Si NO se excluyera, los chips
// dirían 101 y 180 y esta prueba se pondría roja.
const DONACIONES: Fila[] = [
  ...muchas(500, 6, "Rab Wajnon"),
  ...muchas(72, 5, "Matan Baseter"),
  ...muchas(54, 4, "Jaim Sued"),
  ...muchas(36, 3, "Sadia Bittan"),
  ...muchas(18, 2, "Meir Levy"),
  ...muchas(101, 9, "Donación"),
  ...muchas(180, 8, "Donación"),
  {
    id: 900,
    date: "2026-09-22",
    beneficiary: "Iosef Milszteln",
    amount: 101,
    check_number: "2936",
    status: "valido",
  },
];

type Escritura = { url: string; metodo: string; cuerpo: Record<string, unknown> };
let escrituras: Escritura[] = [];

function montarFetch(hayTabla: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : String(input);
      const metodo = (init?.method ?? "GET").toUpperCase();
      if (metodo !== "GET") {
        escrituras.push({ url, metodo, cuerpo: JSON.parse(String(init?.body ?? "{}")) });
        return { ok: true, json: async () => ({ id: 999 }) } as Response;
      }
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => DONACIONES } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return { ok: true, json: async () => ({ gastos_anuales: null, columna_gastos: true }) } as Response;
      }
      if (url.startsWith("/api/maaser/compromisos")) {
        return {
          ok: true,
          json: async () => ({ hay_tabla: hayTabla, compromisos: [] }),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

async function abrirAnotar(hayTabla = true) {
  montarFetch(hayTabla);
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByText("Iosef Milszteln")).toBeDefined());
  fireEvent.click(screen.getByRole("button", { name: "Anotar" }));
  await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeDefined());
}

function escribir(rotulo: string, valor: string) {
  fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } });
}

const donacionesEscritas = () =>
  escrituras.filter((e) => e.url.startsWith("/api/donations"));

describe("Maaser · anotar una donación", () => {
  beforeEach(() => {
    escrituras = [];
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // 9 de la noche de PANAMÁ del 23-sep-2026 = 02:00 UTC del 24.
    vi.setSystemTime(new Date("2026-09-24T02:00:00Z"));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("los cinco chips salen de la base, sin la carga inicial", async () => {
    await abrirAnotar();
    for (const m of ["500", "72", "54", "36", "18"]) {
      expect(screen.getByRole("button", { name: m }), m).toBeDefined();
    }
    expect(screen.queryByRole("button", { name: "101" })).toBeNull();
    expect(screen.queryByRole("button", { name: "180" })).toBeNull();
  });

  it("tocar un chip pone el monto", async () => {
    await abrirAnotar();
    fireEvent.click(screen.getByRole("button", { name: "54" }));
    expect((screen.getByLabelText("Cuánto") as HTMLInputElement).value).toBe("54");
  });

  it("el cheque propone el siguiente al mayor usado", async () => {
    await abrirAnotar();
    const cheque = screen.getByLabelText("Cheque") as HTMLInputElement;
    expect(cheque.placeholder).toBe("2937");
    fireEvent.focus(cheque);
    await waitFor(() => expect(cheque.value).toBe("2937"));
  });

  it("un cheque repetido se avisa en rojo y NO frena", async () => {
    await abrirAnotar();
    escribir("Cuánto", "101");
    escribir("Cheque", "2936");
    await waitFor(() =>
      expect(screen.getByText("Ya lo usaste con Iosef Milszteln el 22 sep")).toBeDefined(),
    );
    const listo = screen.getByRole("button", { name: "Listo ·" }) as HTMLButtonElement;
    expect(listo.disabled).toBe(false);
    fireEvent.click(listo);
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.check_number).toBe("2936");
  });

  it("«Listo» guarda con el día de Panamá, no con el de mañana", async () => {
    await abrirAnotar();
    expect(screen.getByRole("button", { name: "hoy 23 de septiembre" })).toBeDefined();
    escribir("Cuánto", "180");
    escribir("A quién", "Rab Gil");
    fireEvent.click(screen.getByRole("button", { name: "Listo ·" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    const cuerpo = donacionesEscritas()[0].cuerpo;
    expect(cuerpo.date).toBe("2026-09-23");
    expect(cuerpo.beneficiary).toBe("Rab Gil");
    expect(cuerpo.amount).toBe(180);
  });

  it("sin nombre se guarda igual, como «Donación»", async () => {
    await abrirAnotar();
    escribir("Cuánto", "36");
    fireEvent.click(screen.getByRole("button", { name: "Listo ·" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.beneficiary).toBe("Donación");
  });

  it("tocar la fecha del botón permite guardar con otro día", async () => {
    await abrirAnotar();
    escribir("Cuánto", "500");
    fireEvent.click(screen.getByRole("button", { name: "hoy 23 de septiembre" }));
    await waitFor(() => expect(screen.getByLabelText("Día de la donación")).toBeDefined());
    escribir("Día de la donación", "2026-04-02");
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "2 de abril" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Listo ·" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.date).toBe("2026-04-02");
  });

  it("«Se repite cada mes» crea el compromiso", async () => {
    await abrirAnotar(true);
    escribir("Cuánto", "500");
    escribir("A quién", "Rab Gil");
    fireEvent.click(screen.getByRole("switch", { name: "Se repite cada mes" }));
    fireEvent.click(screen.getByRole("button", { name: "Listo ·" }));
    await waitFor(() =>
      expect(escrituras.some((e) => e.url.startsWith("/api/maaser/compromisos"))).toBe(true),
    );
    const compromiso = escrituras.find((e) => e.url.startsWith("/api/maaser/compromisos"))!;
    expect(compromiso.metodo).toBe("POST");
    expect(compromiso.cuerpo).toMatchObject({ beneficiary: "Rab Gil", amount: 500 });
    expect(donacionesEscritas()).toHaveLength(1);
  });

  it("sin la tabla, el interruptor no se dibuja y la donación se guarda igual", async () => {
    await abrirAnotar(false);
    expect(screen.queryByRole("switch")).toBeNull();
    escribir("Cuánto", "72");
    fireEvent.click(screen.getByRole("button", { name: "Listo ·" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(escrituras.some((e) => e.url.startsWith("/api/maaser/compromisos"))).toBe(false);
  });
});
