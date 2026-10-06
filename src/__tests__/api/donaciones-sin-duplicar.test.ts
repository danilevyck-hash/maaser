// CANDADO — «al poner un gasto y poner Listo, no sé si pasó o no, se repite»
// (Daniel, 6-oct-2026).
//
// El mismo envío NO puede entrar dos veces. El freno vive en el servidor
// porque por POST /api/donations pasan los dos caminos que escriben
// donaciones: la pantalla de Anotar y el círculo de un compromiso.
//
// Lo que cuida:
//  1. El mismo envío dos veces seguidas escribe UNA sola fila, y la segunda
//     respuesta devuelve la fila que ya quedó guardada (mismo id).
//  2. Una donación DISTINTA (otro monto, otro cheque) entra igual, siempre.
//  3. La misma donación un rato después entra igual: el freno es de un minuto,
//     no para siempre.
import { describe, it, expect, beforeEach, vi } from "vitest";

type Fila = Record<string, unknown>;

const db: { filas: Fila[]; inserciones: number } = { filas: [], inserciones: 0 };
let proximoId = 1;

vi.mock("@/lib/supabase", () => {
  function consulta() {
    const filtros: ((f: Fila) => boolean)[] = [];
    const hallados = () => db.filas.filter((f) => filtros.every((p) => p(f)));
    const q = {
      eq(col: string, v: unknown) {
        filtros.push((f) => String(f[col]) === String(v));
        return q;
      },
      gte(col: string, v: unknown) {
        filtros.push((f) => String(f[col] ?? "") >= String(v));
        return q;
      },
      order() {
        return q;
      },
      limit() {
        return q;
      },
      single() {
        const filas = hallados();
        return Promise.resolve(
          filas.length
            ? { data: filas[filas.length - 1], error: null }
            : { data: null, error: { message: "no rows" } }
        );
      },
      then(ok: (r: { data: Fila[]; error: null }) => unknown) {
        return Promise.resolve({ data: hallados(), error: null }).then(ok);
      },
    };
    return q;
  }

  return {
    supabase: {
      from: () => ({
        select: () => consulta(),
        insert: (filas: Fila[]) => {
          db.inserciones += 1;
          const nueva = {
            id: proximoId++,
            created_at: new Date().toISOString(),
            ...filas[0],
          };
          db.filas.push(nueva);
          return {
            select: () => ({ single: () => Promise.resolve({ data: nueva, error: null }) }),
          };
        },
      }),
    },
  };
});

const ENVIO = {
  date: "2026-10-06",
  beneficiary: "Rab Gil",
  amount: 180,
  check_number: "2937",
  notes: "Esposa enferma",
};

async function anotar(cuerpo: Record<string, unknown>) {
  const { POST } = await import("@/app/api/donations/route");
  const pedido = new Request("http://localhost/api/donations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const res = await POST(pedido as never);
  return { estado: res.status, cuerpo: await res.json() };
}

describe("POST /api/donations — el mismo envío no entra dos veces", () => {
  beforeEach(() => {
    db.filas = [];
    db.inserciones = 0;
    proximoId = 1;
  });

  it("dos toques seguidos de «Listo» dejan UNA sola donación", async () => {
    const primera = await anotar(ENVIO);
    const segunda = await anotar(ENVIO);

    expect(primera.estado).toBe(200);
    expect(segunda.estado).toBe(200);
    expect(db.inserciones).toBe(1);
    expect(db.filas).toHaveLength(1);
    expect(segunda.cuerpo.id).toBe(primera.cuerpo.id);
  });

  it("una donación distinta entra igual", async () => {
    await anotar(ENVIO);
    await anotar({ ...ENVIO, amount: 101 });
    await anotar({ ...ENVIO, check_number: "2938" });
    await anotar({ ...ENVIO, beneficiary: "David Cohen" });

    expect(db.inserciones).toBe(4);
  });

  it("la misma donación un rato después entra igual", async () => {
    await anotar(ENVIO);
    // El teléfono no reintentó: pasó un rato y él la anotó de verdad otra vez.
    db.filas[0].created_at = new Date(Date.now() - 10 * 60_000).toISOString();

    await anotar(ENVIO);

    expect(db.inserciones).toBe(2);
  });
});
