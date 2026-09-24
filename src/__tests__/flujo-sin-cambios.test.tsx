// @vitest-environment jsdom
//
// CANDADO DE FLUJO — el rediseño de piel no puede mover un solo rótulo.
//
// Se dibujan las tres pantallas (Inicio · Maaser · Propiedades) con datos de
// mentira y se anota la lista EXACTA de rótulos de botones y enlaces de cada
// una. Si un cambio visual agrega, quita o renombra un botón, una pestaña o un
// enlace, esta prueba se pone roja.
//
// La única edición permitida de las listas de abajo es quitar un emoji
// decorativo de un rótulo, y hay que decirlo en el informe.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { ToastProvider } from "@/components/Toast";

const PARAMS = { id: "1" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, back: () => {} }),
  useSearchParams: () => new URLSearchParams(""),
  useParams: () => PARAMS,
  usePathname: () => "/",
}));

import Inicio from "@/app/page";
import MaaserPage from "@/app/maaser/page";
import PropiedadesPage from "@/app/propiedades/page";
import NuevaPropiedad from "@/app/propiedades/nueva/page";
import EditarPropiedad from "@/app/propiedades/editar/[id]/page";
import RegistrarPagoPropiedad from "@/app/propiedades/pagar/[id]/page";
import PagarCobro from "@/app/propiedades/cobros/[id]/pagar/page";
import NuevoContratoPage from "@/app/propiedades/contratos/nuevo/page";
import EditarContrato from "@/app/propiedades/contratos/editar/[id]/page";

/* ── Datos de mentira ─────────────────────────────────────────────── */

const DONACIONES = [
  { id: 1, date: "2026-09-20", beneficiary: "Rab Gil", amount: 180, status: "valido", check_number: "2937", notes: null, metodo: "cheque" },
  { id: 2, date: "2026-09-18", beneficiary: "", amount: 101, status: "valido", check_number: null, notes: null, metodo: null },
];

const PROPIEDADES = [
  { id: 1, name: "Casa Albrook", location: "Albrook", type: "residencial", icon: "🏠", rent_amount: 650 },
  { id: 2, name: "Local Vía España", location: "Vía España", type: "comercial", icon: "🏪", rent_amount: 1200 },
];

const CONTRATOS = [
  {
    id: 11, property_id: 1, tenant_name: "Juan Pérez", tenant_phone: null, tenant_email: null,
    start_date: "2026-01-01", end_date: "2026-12-31", rent_amount: 650, active: true,
    property: { id: 1, name: "Casa Albrook" },
  },
];

const COBROS = [
  {
    id: 1, property_id: 1, contract_id: 11, tenant_name: "Juan Pérez", month: "2026-09",
    amount: 650, paid_amount: 650, status: "pagado", due_date: "2026-09-01", paid_date: "2026-09-05",
    property: { id: 1, name: "Casa Albrook" },
  },
];

const RESPUESTAS: Array<[string, unknown]> = [
  ["/api/donations", DONACIONES],
  ["/api/goal", { gastos_anuales: 800000, columna_gastos: true }],
  ["/api/propiedades/properties", PROPIEDADES],
  ["/api/propiedades/contracts", CONTRATOS],
  ["/api/propiedades/charges", COBROS],
];

function respuestaDe(url: string) {
  const par = RESPUESTAS.find(([ruta]) => url.startsWith(ruta));
  return par ? par[1] : [];
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

const INICIO = [
  "Salir",
  "\u2721 Maaser Registro de donaciones",
  "\ud83e\uddfe Por Cobrar Cuentas por cobrar",
  "\ud83d\ude97 InDriver Gastos mensuales",
  "\ud83c\udfe0 Propiedades Gesti\u00f3n de alquileres",
  "\ud83d\udcb0 Finanzas Finanzas personales",
];

const MAASER_DONACIONES = [
  "\u2190 Inicio",
  "Salir",
  "cambiar \u203a",
  "+ Nueva donaci\u00f3n",
  "Rab Gil 20 sep \u00b7 cheque 2937 $180",
  "Sin nombre 18 sep $101",
  "Donaciones",
  "Resumen",
];

const MAASER_RESUMEN = [
  "← Inicio",
  "Salir",
  "5787 · $281",
  "Tishrei › 12 sep – 11 oct $281 2",
  "Jeshván › 12 oct – 10 nov $0 0",
  "Kislev › 11 nov – 10 dic $0 0",
  "Tévet › 11 dic – 8 ene $0 0",
  "Shvat › 9 ene – 7 feb $0 0",
  "Adar I › 8 feb – 9 mar $0 0",
  "Adar II › 10 mar – 7 abr $0 0",
  "Nisán › 8 abr – 7 may $0 0",
  "Iyar › 8 may – 5 jun $0 0",
  "Siván › 6 jun – 5 jul $0 0",
  "Tamuz › 6 jul – 3 ago $0 0",
  "Av › 4 ago – 2 sep $0 0",
  "Elul › 3 sep – 1 oct $0 0",
  "Ver por beneficiario ›",
  "Exportar: PDF para imprimir · Excel para el contador ›",
  "Donaciones",
  "Resumen",
];

const PROPIEDADES_TAB = [
  "\u2190 Inicio",
  "Salir",
  "1 propiedad sin contrato vigente No se le genera cobro. Toca aqu\u00ed para renovar el contrato.",
  "+ Agregar",
  "Registrar pago",
  "Contrato",
  "Registrar pago",
  "Editar",
  "Propiedades",
  "Cobros",
  "Contratos",
];

const COBROS_TAB = [
  "← Inicio",
  "Salir",
  "‹",
  "›",
  "Desmarcar",
  "Propiedades",
  "Cobros",
  "Contratos",
];
const NUEVA_DONACION = [
  "← Inicio",
  "Salir",
  "cambiar ›",
  "+ Nueva donación",
  "Rab Gil 20 sep · cheque 2937 $180",
  "Sin nombre 18 sep $101",
  "Donaciones",
  "Resumen",
  "Cancelar",
  "$ 101",
  "$ 180",
  "Cheque",
  "Transferencia / Yappy",
  "Tarjeta",
  "Guardar sin nombre",
  "Agregar",
];
const ADENTRO_DE_PROPIEDADES: Record<string, string[]> = {
  "Nueva propiedad": [
    "← Volver",
    "🏠",
    "🏢",
    "🏪",
    "🏘️",
    "🏗️",
    "Guardar propiedad",
  ],
  "Editar propiedad": [
    "← Volver",
    "Eliminar",
    "🏠",
    "🏢",
    "🏪",
    "🏘️",
    "🏗️",
    "Guardar cambios",
  ],
  "Registrar pago de la propiedad": [
    "← Volver",
    "Me pagó hasta un mes Ejemplo: me pagó todo el resto del año",
    "Me dio un monto Se reparte mes por mes. Lo que sobra queda a favor.",
    "Confirmar pago",
  ],
  "Registrar pago del cobro": [
    "← Volver",
    "Confirmar pago",
  ],
  "Nuevo contrato": [
    "← Volver",
    "Crear contrato",
  ],
  "Editar contrato": [
    "← Volver",
    "Eliminar",
    "Guardar cambios",
  ],
};

const CONTRATOS_TAB = [
  "← Inicio",
  "Salir",
  "+ Nuevo",
  "Propiedades",
  "Cobros",
  "Contratos",
];

/* ── Las pruebas ──────────────────────────────────────────────────── */

describe("los rótulos de las tres pantallas no se mueven con el rediseño de piel", () => {
  beforeEach(() => {
    vi.stubGlobal("scrollTo", () => {});
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

  it("Maaser · Donaciones y Resumen", async () => {
    dibujar(MaaserPage);
    await waitFor(() => expect(screen.getByText("Rab Gil")).toBeDefined());
    expect(rotulos()).toEqual(MAASER_DONACIONES);

    await tocar("Resumen");
    await waitFor(() => expect(screen.getAllByRole("button", { name: /beneficiario/i })[0]).toBeDefined());
    expect(rotulos()).toEqual(MAASER_RESUMEN);
  });

  it("Propiedades · las tres pestañas", async () => {
    dibujar(PropiedadesPage);
    await waitFor(() => expect(screen.getByText("Casa Albrook")).toBeDefined());
    expect(rotulos()).toEqual(PROPIEDADES_TAB);

    await tocar("Cobros");
    await waitFor(() => expect(screen.getAllByText(/Juan Pérez/)[0]).toBeDefined());
    expect(rotulos()).toEqual(COBROS_TAB);

    await tocar("Contratos");
    await waitFor(() => expect(screen.getAllByText(/alquiladas/)[0]).toBeDefined());
    expect(rotulos()).toEqual(CONTRATOS_TAB);
  });

  it("Maaser · la hoja de Nueva donación", async () => {
    dibujar(MaaserPage);
    await waitFor(() => expect(screen.getByText("Rab Gil")).toBeDefined());
    await tocar("+ Nueva donación");
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Cancelar" })[0]).toBeDefined());
    expect(rotulos()).toEqual(NUEVA_DONACION);
  });

  it("Propiedades · las pantallas de adentro", async () => {
    const pantallas: Array<[string, () => JSX.Element, string]> = [
      ["Nueva propiedad", NuevaPropiedad, "Nueva propiedad"],
      ["Editar propiedad", EditarPropiedad, "Editar propiedad"],
      ["Registrar pago de la propiedad", RegistrarPagoPropiedad, "Registrar pago"],
      ["Registrar pago del cobro", PagarCobro, "Registrar pago"],
      ["Nuevo contrato", NuevoContratoPage, "Nuevo contrato"],
      ["Editar contrato", EditarContrato, "Editar contrato"],
    ];
    const visto: Record<string, string[]> = {};
    for (const [nombre, Pantalla, titulo] of pantallas) {
      dibujar(Pantalla);
      await waitFor(() => expect(screen.getAllByText(titulo)[0]).toBeDefined());
      visto[nombre] = rotulos();
      cleanup();
    }
    expect(visto).toEqual(ADENTRO_DE_PROPIEDADES);
  });
});
