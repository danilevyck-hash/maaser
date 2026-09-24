// @vitest-environment jsdom
//
// CANDADO DE FLUJO — el rediseño de piel no puede mover un solo rótulo.
//
// Se dibujan las pantallas con datos de mentira y se anota la lista EXACTA de
// rótulos de botones y enlaces de cada una. Si un cambio visual agrega, quita
// o renombra un botón, una pestaña o un enlace, esta prueba se pone roja.
//
// La única edición permitida de las listas de abajo es quitar un emoji
// decorativo de un rótulo, y hay que decirlo en el informe.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";

// El cliente de Supabase se arma al importar el módulo: sin estas dos variables
// no se puede ni dibujar la pantalla. En la prueba no se conecta a nada.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY ||= "prueba";
});

const PARAMS = { id: "1" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => PARAMS,
  usePathname: () => "/",
}));

import Inicio from "@/app/page";
import FinanzasPage from "@/app/finanzas/page";
import InDriverPage from "@/app/indriver/page";
import InDriverResumen from "@/app/indriver/resumen/page";
import PorCobrarPage from "@/app/por-cobrar/page";
import ClienteDetallePage from "@/app/por-cobrar/[id]/page";

/* ── Datos de mentira ─────────────────────────────────────────────── */

const CATEGORIAS = [
  { id: "c1", name: "Comida", icon: "🍔", color: "#EF4444", is_enabled: true },
  { id: "c2", name: "Hogar", icon: "🏠", color: "#8B5CF6", is_enabled: true },
];

const PRESUPUESTOS = [
  { id: "b1", category: "Comida", budget_amount: 500, month: "2026-09" },
];

const GASTOS_FINANZAS = [
  { id: 1, date: "2026-09-10", amount: 25, category: "Comida", notes: "Almuerzo", payment_method: "Yappy" },
  { id: 2, date: "2026-09-05", amount: 100, category: "Hogar", notes: "Internet", payment_method: "ACH" },
];

const RECURRENTES = [
  { id: "r1", amount: 100, category: "Hogar", notes: "Internet", payment_method: "ACH", day_of_month: 5, is_active: true },
];

const GASTOS_INDRIVER = [
  { id: 1, date: "2026-09-10", amount: 12.5, notes: "Gasolina" },
  { id: 2, date: "2026-09-04", amount: 8, notes: "Lavado" },
];

const CLIENTES = [
  { id: 1, nombre: "Maicol M", telefono: "60000000", notas: null, balance: 250, ultimo_movimiento: "2026-09-10" },
  { id: 2, nombre: "Rab Gil", telefono: null, notas: null, balance: 0, ultimo_movimiento: null },
];

const MOVIMIENTOS = [
  { id: 1, cliente_id: 1, fecha: "2026-09-10", tipo: "cargo", monto: 300, descripcion: "Mercancía" },
  { id: 2, cliente_id: 1, fecha: "2026-09-12", tipo: "abono", monto: 50, descripcion: null },
];

function respuestaDe(url: string) {
  if (url.startsWith("/api/finanzas/categories")) return CATEGORIAS;
  if (url.startsWith("/api/finanzas/budgets")) return PRESUPUESTOS;
  if (url.startsWith("/api/finanzas/expenses")) return GASTOS_FINANZAS;
  if (url.startsWith("/api/finanzas/recurring")) return RECURRENTES;
  if (url.startsWith("/api/finanzas/notes-suggestions")) return [];
  if (url.startsWith("/api/expenses")) return GASTOS_INDRIVER;
  if (url.startsWith("/api/por-cobrar/clientes")) {
    return url.includes("id=") ? CLIENTES[0] : CLIENTES;
  }
  if (url.startsWith("/api/por-cobrar/movimientos")) return MOVIMIENTOS;
  return [];
}

/* ── Utilidades ───────────────────────────────────────────────────── */

/** El texto de un elemento, con un espacio entre pedazo y pedazo. */
function textoDe(el: HTMLElement) {
  const pedazos: string[] = [];
  const paseo = document.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
  let nodo = paseo.nextNode();
  while (nodo) {
    const t = (nodo.textContent || "").replace(/\s+/g, " ").trim();
    if (t) pedazos.push(t);
    nodo = paseo.nextNode();
  }
  return pedazos.join(" ");
}

/** Los rótulos de lo que se puede tocar, en el orden en que aparecen. */
function rotulos() {
  const tocables = Array.from(
    document.body.querySelectorAll<HTMLElement>("button, a[href]"),
  );
  return tocables.map(textoDe).filter((t) => t.length > 0);
}

function dibujar(Pantalla: () => JSX.Element) {
  return render(
    <ToastProvider>
      <Pantalla />
    </ToastProvider>,
  );
}

async function tocar(nombre: string) {
  const boton = screen.getAllByRole("button", { name: nombre })[0];
  fireEvent.click(boton);
  await waitFor(() => expect(boton).toBeDefined());
}

/* ── Las listas esperadas ─────────────────────────────────────────── */

// 23-sep-2026: al aplicar la piel de Apple se quitaron los cinco emojis
// decorativos de las fichas de Inicio (✡ 🧾 🚗 🏠 💰). El rótulo de cada ficha
// —nombre y descripción— no cambió ni una letra.
const INICIO = [
  "Salir",
  "Maaser Registro de donaciones",
  "Por Cobrar Cuentas por cobrar",
  "InDriver Gastos mensuales",
  "Propiedades Gestión de alquileres",
  "Finanzas Finanzas personales",
];

const FINANZAS_GASTOS = [
  "← Inicio",
  "Salir",
  "🍔 Comida $25.00 $25.00 de $500.00 -- quedan $475.00",
  "🏠 Hogar $100.00",
  "Buscar",
  "Gastos",
  "Resumen",
  "Config",
];
const FINANZAS_RESUMEN = [
  "← Inicio",
  "Salir",
  "Septiembre $125.00 100%",
  "Gastos",
  "Resumen",
  "Config",
];
const FINANZAS_CONFIG = [
  "← Inicio",
  "Salir",
  "Categorias 2",
  "Presupuestos 1 de 2",
  "Gastos recurrentes",
  "🍔 Comida",
  "🛒 Supermercado",
  "🚗 Transporte",
  "🏠 Hogar",
  "💊 Salud",
  "🎮 Entretenimiento",
  "👕 Ropa",
  "📚 Educación",
  "⚡ Servicios",
  "💆 Personal",
  "🐾 Mascotas",
  "✈️ Viajes",
  "🎁 Regalos",
  "📌 Otros",
  "Alertas de presupuesto",
  "Gastos",
  "Resumen",
  "Config",
];
const INDRIVER_GASTOS = [
  "← Inicio",
  "Salir",
  "Exportar",
  "+ Nuevo Gasto",
  "Editar",
  "Eliminar",
  "Editar",
  "Eliminar",
  "Gastos",
  "Resumen",
];
const INDRIVER_RESUMEN_PESTANA = [
  "← Inicio",
  "Salir",
  "Gastos",
  "Resumen",
];
const INDRIVER_RESUMEN_PAGINA: string[] = [];
const POR_COBRAR = [
  "← Inicio",
  "Maicol M 10 sep 2026 $250.00",
  "Rab Gil Sin movimientos Al día",
];
const POR_COBRAR_CLIENTE = [
  "← Atrás",
  "Maicol M",
  "Compartir por WhatsApp",
  "10 sep Cargo Mercancía $300.00",
  "12 sep Abono - $50.00",
  "+ Cargo",
  "+ Abono",
];

/* ── Las pruebas ──────────────────────────────────────────────────── */

describe("los rótulos de las pantallas no se mueven con el rediseño de piel", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", () => {});
    const memoria = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => memoria.get(k) ?? null,
      setItem: (k: string, v: string) => { memoria.set(k, String(v)); },
      removeItem: (k: string) => { memoria.delete(k); },
      clear: () => memoria.clear(),
      key: () => null,
      length: 0,
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-23T17:00:00Z"));
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : String(input);
      return {
        ok: true,
        json: async () => respuestaDe(url),
      } as Response;
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("Inicio", async () => {
    dibujar(Inicio);
    await waitFor(() => expect(screen.getByText("Maaser")).toBeDefined());
    expect(rotulos()).toEqual(INICIO);
  });

  it("Finanzas · las tres pestañas", async () => {
    dibujar(FinanzasPage);
    await waitFor(() => expect(screen.getAllByText(/Comida/)[0]).toBeDefined());
    expect(rotulos(), "Gastos").toEqual(FINANZAS_GASTOS);

    await tocar("Resumen");
    await waitFor(() => expect(screen.getAllByText(/Resumen/)[0]).toBeDefined());
    expect(rotulos(), "Resumen").toEqual(FINANZAS_RESUMEN);

    await tocar("Config");
    await waitFor(() => expect(screen.getAllByText(/Categorías|Config/)[0]).toBeDefined());
    expect(rotulos(), "Config").toEqual(FINANZAS_CONFIG);
  });

  it("InDriver · las dos pestañas", async () => {
    dibujar(InDriverPage);
    await waitFor(() => expect(screen.getAllByText(/Gasolina/)[0]).toBeDefined());
    expect(rotulos(), "Gastos").toEqual(INDRIVER_GASTOS);

    await tocar("Resumen");
    await waitFor(() => expect(screen.getAllByText(/Enero/)[0]).toBeDefined());
    expect(rotulos(), "Resumen").toEqual(INDRIVER_RESUMEN_PESTANA);
  });

  it("InDriver · la página de Resumen", async () => {
    dibujar(InDriverResumen);
    await waitFor(() => expect(screen.getAllByText(/Enero/)[0]).toBeDefined());
    expect(rotulos()).toEqual(INDRIVER_RESUMEN_PAGINA);
  });

  it("Por Cobrar · la lista y la ficha del cliente", async () => {
    dibujar(PorCobrarPage);
    await waitFor(() => expect(screen.getAllByText(/Maicol M/)[0]).toBeDefined());
    expect(rotulos(), "lista").toEqual(POR_COBRAR);
    cleanup();

    dibujar(ClienteDetallePage);
    await waitFor(() => expect(screen.getAllByText(/Cargo/)[0]).toBeDefined());
    expect(rotulos(), "ficha").toEqual(POR_COBRAR_CLIENTE);
  });
});
