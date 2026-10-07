// @vitest-environment jsdom
//
// CANDADO — «más fácil de usar para un señor de 70 años» (Daniel, 6-oct-2026).
//
// Daniel: «No quiero los 3 puntitos, que sea más intuitivo, más fácil de usar
// para un señor de 70 años panameño» · «Revisá todo, cada botón, cada
// pestaña, el workflow».
//
// Lo que cuida, con las donaciones REALES de 5787 y las de 5786:
//  1. APAGADO el interruptor, la pantalla es la de hoy: el «···» sigue ahí y
//     no hay botones de orden a la vista.
//  2. PRENDIDO, NO queda ningún «···» en ninguna pantalla, y ordenar son tres
//     palabras a la vista que de verdad reordenan la lista.
//  3. PRENDIDO, el botón de guardar es UNO solo: antes eran dos pegados y
//     tocar la mitad derecha abría el calendario en vez de guardar.
//  4. PRENDIDO, el día tiene su propio renglón, con «Cambiar el día».
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

// El interruptor se mueve desde la prueba. El historial queda PRENDIDO, que es
// como está en producción desde el 6-oct-2026.
const interruptor = { simple: false };
vi.mock("@/lib/maaser/interruptores", () => ({
  // La propuesta de la auditoría nace APAGADA.
  AUDITORIA: false,
  HISTORIAL_ORDENADO: true,
  get SIMPLE() {
    return interruptor.simple;
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
      return { ok: true, json: async () => [] } as Response;
    }),
  );
}

async function abrir(simple: boolean) {
  interruptor.simple = simple;
  montarFetch();
  const { default: MaaserPage } = await import("@/app/maaser/page");
  render(
    <ToastProvider>
      <MaaserPage />
    </ToastProvider>,
  );
  await waitFor(() => expect(screen.getByText("Anotar")).toBeTruthy());
}

/** Todo texto «···» que haya quedado en la pantalla. */
const puntitos = () =>
  screen.queryAllByText((t) => t.trim() === "···" || t.trim() === "...");

beforeEach(() => {
  interruptor.simple = false;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("apagado: la pantalla de hoy, intacta", () => {
  it("el «···» sigue ahí y no hay botones de orden a la vista", async () => {
    await abrir(false);
    expect(screen.getByLabelText("Ordenar")).toBeTruthy();
    expect(puntitos().length).toBeGreaterThan(0);
    expect(screen.queryByText("Por monto")).toBeNull();
    expect(screen.queryByText("Por nombre")).toBeNull();
  });

  it("la línea del año dice «ver el año», no «Ver este año»", async () => {
    await abrir(false);
    expect(screen.getByText(/ver el año/)).toBeTruthy();
    expect(screen.queryByText(/Ver este año/)).toBeNull();
  });

  it("el botón de guardar sigue siendo dos pegados", async () => {
    await abrir(false);
    fireEvent.click(screen.getByText("Anotar"));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeTruthy());
    expect(screen.getByText("Listo ·")).toBeTruthy();
    expect(screen.queryByText("Listo, anotar")).toBeNull();
    expect(screen.queryByText("Cambiar el día")).toBeNull();
  });
});

describe("prendido: palabras en vez de íconos", () => {
  it("no queda ningún «···» en el inicio", async () => {
    await abrir(true);
    expect(screen.queryByLabelText("Ordenar")).toBeNull();
    expect(puntitos()).toHaveLength(0);
  });

  it("ordenar son tres palabras a la vista, y reordenan de verdad", async () => {
    await abrir(true);
    await waitFor(() => expect(screen.getByText("Por fecha")).toBeTruthy());
    expect(screen.getByText("Por monto")).toBeTruthy();
    expect(screen.getByText("Por nombre")).toBeTruthy();

    fireEvent.click(screen.getByText("Por monto"));
    // Por monto es una lista pareja: se va el separador de año.
    await waitFor(() => expect(screen.queryByText(/Año 5786 ·/)).toBeNull());
    const nombres = screen
      .getAllByText(/Rubén Elin|Shaare Jesed|Para Soldados Usar Lulab/)
      .map((e) => e.textContent);
    expect(nombres[0]).toBe("Rubén Elin");

    // Y vuelve a la de siempre con un toque, sin menú.
    fireEvent.click(screen.getByText("Por fecha"));
    await waitFor(() => expect(screen.getByText(/Año 5786 ·/)).toBeTruthy());
  });

  it("el año se ve mes por mes y sin «···», con las dos cosas que escondía", async () => {
    await abrir(true);
    fireEvent.click(screen.getByLabelText("Ver el año 5786"));
    await waitFor(() => expect(screen.getByText("Año 5786")).toBeTruthy());

    expect(puntitos()).toHaveLength(0);
    expect(screen.queryByLabelText("Más")).toBeNull();
    expect(screen.getByText("Ver cuánto le diste a cada persona")).toBeTruthy();
    expect(
      screen.getByText("Guardar la lista para imprimir o para el contador"),
    ).toBeTruthy();
    // Cada mes es un renglón con su nombre escrito, no una barra con un
    // rótulo de 9 px.
    expect(screen.getByText("Kislev")).toBeTruthy();
    expect(screen.getByText("Tishrei")).toBeTruthy();
  });

  // Daniel, 6-oct-2026: «debajo de cada mes, la fecha» · «más minimalista,
  // 2 feb – 5 oct». El año SOLO cuando el mes cruza de año.
  it("cada mes dice debajo de cuándo a cuándo fue, corto", async () => {
    await abrir(true);
    fireEvent.click(screen.getByLabelText("Ver el año 5786"));
    await waitFor(() => expect(screen.getByText("Año 5786")).toBeTruthy());

    // Tishrei de 5786: 23 sep – 22 oct, sin año porque no cruza.
    expect(screen.getByText("23 sep – 22 oct")).toBeTruthy();
    // Tévet sí cruza de año: lleva los dos.
    expect(screen.getByText("21 dic 2025 – 18 ene 2026")).toBeTruthy();
    // Y nada de la versión larga.
    expect(screen.queryByText(/Del 23 de septiembre/)).toBeNull();
  });

  // Daniel, 6-oct-2026: «que se sienta, desplegar, se siente todo igual un poco».
  it("el mes abierto se ve abierto, y el cerrado cerrado", async () => {
    await abrir(true);
    fireEvent.click(screen.getByLabelText("Ver el año 5786"));
    await waitFor(() => expect(screen.getByText("Año 5786")).toBeTruthy());

    const tevet = screen.getByRole("button", { name: /^Tévet/ });
    expect(tevet.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(tevet);
    await waitFor(() => expect(screen.getByText("Rubén Elin")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: /^Tévet/ }).getAttribute("aria-expanded"),
    ).toBe("true");
    // El bloque abierto tiene fondo distinto y las filas entran con animación.
    const caja = screen.getByRole("button", { name: /^Tévet/ }).parentElement!;
    expect(caja.className).toContain("bg-[#F2F2F7]");
    expect(caja.querySelector(".animate-desplegar")).toBeTruthy();

    // Y se cierra con otro toque.
    fireEvent.click(screen.getByRole("button", { name: /^Tévet/ }));
    await waitFor(() => expect(screen.queryByText("Rubén Elin")).toBeNull());
  });

  // Un mes sin donaciones NO se toca: tocarlo no hacía nada.
  it("un mes vacío no es un botón", async () => {
    await abrir(true);
    fireEvent.click(screen.getByLabelText("Ver el año 5786"));
    await waitFor(() => expect(screen.getByText("Año 5786")).toBeTruthy());
    const vacios = Array.from(document.querySelectorAll<HTMLElement>("[data-mes]")).filter(
      (m) => m.textContent?.includes("No diste nada este mes"),
    );
    expect(vacios.length).toBeGreaterThan(0);
    for (const v of vacios) expect(v.tagName).toBe("DIV");
  });

  it("guardar es UN solo botón, y el día tiene su renglón", async () => {
    await abrir(true);
    fireEvent.click(screen.getByText("Anotar"));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeTruthy());

    expect(screen.getByText("Nueva donación")).toBeTruthy();
    expect(screen.getByText("Listo, anotar")).toBeTruthy();
    expect(screen.queryByText("Listo ·")).toBeNull();
    expect(screen.getByText("Cambiar el día")).toBeTruthy();
    expect(screen.getByText("Cómo pagaste")).toBeTruthy();
    // El día se cambia de UN toque: el calendario está en el renglón mismo.
    expect(screen.getByLabelText("Día de la donación")).toBeTruthy();
  });

  // Daniel, 6-oct-2026: «el número de cheque solo aparece si la forma de pago
  // es cheque». Medido: de 266 donaciones, 123 llevan cheque.
  it("el número de cheque aparece solo con «Con cheque»", async () => {
    await abrir(true);
    fireEvent.click(screen.getByText("Anotar"));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeTruthy());

    expect(screen.queryByLabelText("Número de cheque")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Con cheque" }));
    await waitFor(() => expect(screen.getByLabelText("Número de cheque")).toBeTruthy());
  });

  // Los «compromisos mensuales» se fueron el 6-oct-2026: la tabla existía en
  // producción y estaba VACÍA, nadie creó uno solo. Daniel: «dale, quítalos
  // si están vacíos». La tabla NO se borró; la pantalla sí.
  it("no queda rastro de los compromisos", async () => {
    await abrir(true);
    expect(screen.queryByText(/Todos los meses/)).toBeNull();
    fireEvent.click(screen.getByText("Anotar"));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeTruthy());
    expect(screen.queryByText("Se repite cada mes")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
    expect(llamadas.some((l) => l.url.includes("compromisos"))).toBe(false);
  });

  it("sin monto, el aviso sale al tocar el botón y no se guarda nada", async () => {
    await abrir(true);
    fireEvent.click(screen.getByText("Anotar"));
    await waitFor(() => expect(screen.getByLabelText("Cuánto")).toBeTruthy());

    fireEvent.click(screen.getByText("Listo, anotar"));
    await waitFor(() => expect(screen.getByText("Falta poner cuánto diste")).toBeTruthy());
    expect(llamadas.every((l) => l.metodo === "GET")).toBe(true);
  });
});

describe("abrir la pantalla no escribe nada", () => {
  it("ni apagado ni prendido: solo lecturas", async () => {
    for (const simple of [false, true]) {
      await abrir(simple);
      expect(llamadas.length).toBeGreaterThan(0);
      expect(llamadas.every((l) => l.metodo === "GET")).toBe(true);
      cleanup();
    }
  });
});
