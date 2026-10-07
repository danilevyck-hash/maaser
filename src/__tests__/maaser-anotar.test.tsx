// @vitest-environment jsdom
//
// CANDADO — «Anotar: lo que ya sabe, no se pregunta» (24-sep-2026).
//
// Lo que cuida:
//  1. Los cinco chips de monto SALEN DE LA BASE, dejando afuera la carga
//     inicial del 22-mar-2026 (beneficiary = «Donación»).
//  2. El número de cheque SOLO se pregunta si se pagó con cheque, y ahí
//     propone el siguiente al mayor usado (Daniel, 6-oct-2026: «el número de
//     cheque solo aparece si la forma de pago es cheque»).
//  3. Un cheque repetido se dice en rojo, con el nombre y la fecha, y el botón
//     de guardar SIGUE ACTIVO: la chequera se usa salteada.
//  4. «Listo» guarda con el día de PANAMÁ. A las 9 de la noche de Panamá la
//     fecha es la de HOY, nunca la de mañana (el defecto medido: 12 donaciones
//     quedaron con la fecha corrida).
//  5. El día se cambia de UN SOLO TOQUE, y «Volver a hoy» deshace el error.
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
      if (url.startsWith("/api/donations")) {
        return { ok: true, json: async () => DONACIONES } as Response;
      }
      if (url.startsWith("/api/goal")) {
        return { ok: true, json: async () => ({ gastos_anuales: null, columna_gastos: true }) } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

async function abrirAnotar() {
  montarFetch();
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

  it("el número de cheque SOLO se pregunta si se pagó con cheque", async () => {
    await abrirAnotar();
    // Al abrir no hay campo de cheque: salía siempre y casi nunca iba nada.
    expect(screen.queryByLabelText("Número de cheque")).toBeNull();
    expect(screen.queryByRole("button", { name: /Poner el/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Con cheque" }));
    const cheque = (await screen.findByLabelText("Número de cheque")) as HTMLInputElement;
    expect(cheque.value).toBe("");
    // Ya no se escribe solo al tocar el campo: lo pone un botón que lo dice.
    fireEvent.click(screen.getByRole("button", { name: "Poner el 2937" }));
    await waitFor(() => expect(cheque.value).toBe("2937"));

    // Y si al final pagó por Yappy, el campo se va y el número no se guarda.
    fireEvent.click(screen.getByRole("button", { name: "Yappy o transferencia" }));
    await waitFor(() => expect(screen.queryByLabelText("Número de cheque")).toBeNull());
    escribir("Cuánto", "72");
    fireEvent.click(screen.getByRole("button", { name: "Listo, anotar" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.check_number).toBeUndefined();
    expect(donacionesEscritas()[0].cuerpo.metodo).toBe("transferencia");
  });

  it("un cheque repetido se avisa en rojo y NO frena", async () => {
    await abrirAnotar();
    escribir("Cuánto", "101");
    fireEvent.click(screen.getByRole("button", { name: "Con cheque" }));
    await screen.findByLabelText("Número de cheque");
    escribir("Número de cheque", "2936");
    await waitFor(() =>
      expect(screen.getByText("Ya lo usaste con Iosef Milszteln el 22 sep")).toBeDefined(),
    );
    const listo = screen.getByRole("button", { name: "Listo, anotar" }) as HTMLButtonElement;
    expect(listo.disabled).toBe(false);
    fireEvent.click(listo);
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.check_number).toBe("2936");
  });

  it("«Listo» guarda con el día de Panamá, no con el de mañana", async () => {
    await abrirAnotar();
    expect(screen.getByText("hoy 23 de septiembre")).toBeDefined();
    escribir("Cuánto", "180");
    escribir("A quién", "Rab Gil");
    fireEvent.click(screen.getByRole("button", { name: "Listo, anotar" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    const cuerpo = donacionesEscritas()[0].cuerpo;
    expect(cuerpo.date).toBe("2026-09-23");
    expect(cuerpo.beneficiary).toBe("Rab Gil");
    expect(cuerpo.amount).toBe(180);
  });

  it("sin nombre se guarda igual, como «Donación»", async () => {
    await abrirAnotar();
    escribir("Cuánto", "36");
    fireEvent.click(screen.getByRole("button", { name: "Listo, anotar" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.beneficiary).toBe("Donación");
  });

  it("el día se cambia de UN SOLO TOQUE, sin hojas de por medio", async () => {
    await abrirAnotar();
    escribir("Cuánto", "500");
    // El calendario está en el renglón mismo: no hay que abrir ninguna hoja
    // ni confirmar con «Listo» (antes eran tres toques).
    expect(screen.getByLabelText("Día de la donación")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Listo" })).toBeNull();
    escribir("Día de la donación", "2026-04-02");
    await waitFor(() => expect(screen.getByText("2 de abril")).toBeDefined());
    // Y si se tocó por error, «Volver a hoy» lo deshace de un toque.
    expect(screen.getByRole("button", { name: "Volver a hoy" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Listo, anotar" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.date).toBe("2026-04-02");
  });

  it("al CAMBIAR una donación vieja no se ofrece «Volver a hoy»", async () => {
    montarFetch();
    render(
      <ToastProvider>
        <MaaserPage />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Iosef Milszteln")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: /Iosef Milszteln/ }));
    await waitFor(() => expect(screen.getByText("Cambiar la donación")).toBeDefined());
    // Es del 22 de septiembre: «hoy» mandaría la donación a otro mes.
    expect(screen.getByText("22 de septiembre")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Volver a hoy" })).toBeNull();
  });

  it("«Volver a hoy» deshace un día tocado por error", async () => {
    await abrirAnotar();
    escribir("Cuánto", "500");
    escribir("Día de la donación", "2026-04-02");
    await waitFor(() => expect(screen.getByText("2 de abril")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Volver a hoy" }));
    await waitFor(() => expect(screen.getByText("hoy 23 de septiembre")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Listo, anotar" }));
    await waitFor(() => expect(donacionesEscritas()).toHaveLength(1));
    expect(donacionesEscritas()[0].cuerpo.date).toBe("2026-09-23");
  });

});
