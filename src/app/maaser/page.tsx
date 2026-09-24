"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Donation } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";
import {
  getCurrentHebrewYear,
  getHebrewYearData,
} from "@/lib/hebrew-year";
import { aniosHebreosConDatos } from "@/lib/maaser/anios-con-datos";
import { listaCorrida, ordenarPorFecha } from "@/lib/maaser/lista-donaciones";
import { calcularDiezmo, PORCENTAJE_MAASER } from "@/lib/maaser/diezmo";
import {
  esSinNombre,
  fechaCorta,
  nombreEnPantalla,
  subtituloRenglon,
} from "@/lib/maaser/renglon";
import DonationModal from "@/components/DonationModal";
import ExportModal from "@/components/ExportModal";
import ModuleLayout from "@/components/ModuleLayout";
import { useToast } from "@/components/Toast";

type Tab = "donaciones" | "resumen";

const tabItems = [
  {
    id: "donaciones",
    label: "Donaciones",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    id: "resumen",
    label: "Resumen",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
];

export default function MaaserPage() {
  const [tab, setTab] = useState<Tab>("donaciones");
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Donation | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportYear, setExportYear] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [gastosAnuales, setGastosAnuales] = useState<number | null>(null);
  const [hayColumnaGastos, setHayColumnaGastos] = useState(true);
  const { showToast } = useToast();

  const hebrewYear = useMemo(() => getCurrentHebrewYear(), []);
  const yearData = useMemo(() => getHebrewYearData(hebrewYear), [hebrewYear]);

  // Se traen TODAS las donaciones: la lista de inicio corre por todos los años.
  const fetchDonations = useCallback(async () => {
    try {
      const res = await fetch("/api/donations");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDonations(data);
      }
    } catch {
      showToast("Error al cargar donaciones", "error");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGoal = useCallback(async () => {
    try {
      const res = await fetch(`/api/goal?year=${hebrewYear}`);
      if (res.ok) {
        const data = await res.json();
        setGastosAnuales(data.gastos_anuales ?? null);
        setHayColumnaGastos(data.columna_gastos !== false);
      }
    } catch {
      // Sin este dato la pantalla sigue andando: solo no muestra el 10 %.
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hebrewYear]);

  useEffect(() => {
    fetchDonations();
    fetchGoal();
  }, [fetchDonations, fetchGoal]);

  const delAnioEnCurso = useMemo(
    () => donations.filter((d) => d.date >= yearData.startDate && d.date <= yearData.endDate),
    [donations, yearData.startDate, yearData.endDate]
  );
  const totalDelAnio = delAnioEnCurso.reduce((s, d) => s + d.amount, 0);

  const handleSave = async (donation: Partial<Donation>) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/donations", {
        method: donation.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donation),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "Error al guardar", "error");
        return;
      }
      setModalOpen(false);
      setEditing(null);
      showToast(donation.id ? "Donación actualizada" : "Donación guardada");
      fetchDonations();
    } catch {
      showToast("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const res = await fetch("/api/donations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "Error al eliminar", "error");
        return;
      }
      setModalOpen(false);
      setEditing(null);
      showToast("Donación eliminada");
      fetchDonations();
    } catch {
      showToast("Error al eliminar", "error");
    } finally {
      setDeleting(false);
    }
  };

  const guardarGastos = async (monto: number | null) => {
    try {
      const res = await fetch("/api/goal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: hebrewYear, gastos_anuales: monto }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        showToast(err?.error || "No se pudo guardar", "error");
        return false;
      }
      setGastosAnuales(monto);
      showToast("Guardado");
      return true;
    } catch {
      showToast("No se pudo guardar", "error");
      return false;
    }
  };

  const abrirExportar = (anio?: number) => {
    setExportYear(anio);
    setExportOpen(true);
  };

  return (
    <ModuleLayout
      title="Maaser"
      tabs={tabItems}
      activeTab={tab}
      onTabChange={(id) => setTab(id as Tab)}
    >
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="text-[#8E8E93] text-[16px]">Cargando…</div>
        </div>
      ) : (
        <>
          {tab === "donaciones" && (
            <PantallaDonaciones
              donations={donations}
              hebrewYear={hebrewYear}
              inicioDelAnio={yearData.startDate}
              totalDelAnio={totalDelAnio}
              cantidadDelAnio={delAnioEnCurso.length}
              gastosAnuales={gastosAnuales}
              hayColumnaGastos={hayColumnaGastos}
              guardarGastos={guardarGastos}
              search={search}
              setSearch={setSearch}
              abrirNueva={() => { setEditing(null); setModalOpen(true); }}
              abrirDonacion={(d) => { setEditing(d); setModalOpen(true); }}
            />
          )}
          {tab === "resumen" && (
            <PantallaResumen
              donations={donations}
              anioEnCurso={hebrewYear}
              abrirExportar={abrirExportar}
            />
          )}
        </>
      )}

      <DonationModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSave={handleSave}
        onDelete={handleDelete}
        editingDonation={editing}
        donations={donations}
        saving={saving}
        deleting={deleting}
      />
      <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        donations={donations}
        anioSeleccionado={exportYear}
      />
    </ModuleLayout>
  );
}

/* ─────────────────────────── 1 · Donaciones ─────────────────────────── */

function PantallaDonaciones({
  donations, hebrewYear, inicioDelAnio, totalDelAnio, cantidadDelAnio,
  gastosAnuales, hayColumnaGastos, guardarGastos, search, setSearch,
  abrirNueva, abrirDonacion,
}: {
  donations: Donation[];
  hebrewYear: number;
  inicioDelAnio: string;
  totalDelAnio: number;
  cantidadDelAnio: number;
  gastosAnuales: number | null;
  hayColumnaGastos: boolean;
  guardarGastos: (monto: number | null) => Promise<boolean>;
  search: string;
  setSearch: (v: string) => void;
  abrirNueva: () => void;
  abrirDonacion: (d: Donation) => void;
}) {
  const [editandoGastos, setEditandoGastos] = useState(false);
  const [gastosInput, setGastosInput] = useState("");

  const diezmo = calcularDiezmo(gastosAnuales, totalDelAnio);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return donations;
    return donations.filter((d) => nombreEnPantalla(d).toLowerCase().includes(q));
  }, [donations, search]);

  const renglones = useMemo(() => listaCorrida(filtradas), [filtradas]);

  return (
    <div className="p-4 space-y-4">
      {/* Tarjeta del año */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <p className="text-[14px] text-[#6B6B70]">
          Año {hebrewYear} · desde el {fechaCorta(inicioDelAnio)}
        </p>
        <p className="mt-1">
          <span className="text-[28px] font-bold text-[#1C1C1E]">{formatCurrency(totalDelAnio)}</span>
          <span className="text-[14px] text-[#6B6B70] font-medium ml-2">
            llevas dado · {cantidadDelAnio} {cantidadDelAnio === 1 ? "donación" : "donaciones"}
          </span>
        </p>

        {diezmo && (
          <div className="w-full bg-[#E5E5EA] rounded-full h-2.5 overflow-hidden mt-3">
            <div
              className="bg-[#007AFF] h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${diezmo.avance}%` }}
            />
          </div>
        )}

        <div className="mt-3">
          {editandoGastos ? (
            <div className="space-y-2">
              <label className="block text-[14px] text-[#6B6B70]">
                ¿Cuánto gastas en el año {hebrewYear}?
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={gastosInput}
                onChange={(e) => setGastosInput(e.target.value)}
                placeholder="por ejemplo 800000"
                className="w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[17px] outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const monto = parseFloat(gastosInput);
                    const ok = await guardarGastos(
                      Number.isFinite(monto) && monto > 0 ? monto : null
                    );
                    if (ok) setEditandoGastos(false);
                  }}
                  className="flex-1 min-h-[48px] rounded-xl bg-[#007AFF] text-white font-semibold text-[16px] border-0 cursor-pointer"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditandoGastos(false)}
                  className="flex-1 min-h-[48px] rounded-xl bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-[16px] border-0 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
              {!hayColumnaGastos && (
                <p className="text-[14px] text-[#8A5510] bg-[#FFFBEA] border border-[#F2E2A8] rounded-xl px-3 py-2">
                  Todavía no se puede guardar: falta correr la migración de la base.
                </p>
              )}
            </div>
          ) : diezmo ? (
            <p className="text-[14px] text-[#6B6B70] leading-snug">
              Debes dar <b className="text-[#1C1C1E]">{formatCurrency(diezmo.debeDar)}</b> este año
              ({Math.round(PORCENTAJE_MAASER * 100)} % de lo que gastas) ·{" "}
              {diezmo.faltan > 0 ? (
                <>faltan <b className="text-[#1C1C1E]">{formatCurrency(diezmo.faltan)}</b></>
              ) : (
                <b className="text-[#0F6B45]">ya llegaste</b>
              )}{" "}
              <button
                onClick={() => { setGastosInput(String(gastosAnuales ?? "")); setEditandoGastos(true); }}
                className="text-[#007AFF] text-[14px] bg-transparent border-0 cursor-pointer p-0 underline-offset-2"
              >
                cambiar ›
              </button>
            </p>
          ) : (
            <button
              onClick={() => { setGastosInput(""); setEditandoGastos(true); }}
              className="text-[#007AFF] text-[16px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px] p-0 text-left"
            >
              poner lo que gastas ›
            </button>
          )}
        </div>
      </div>

      {/* Nueva donación */}
      <button
        onClick={abrirNueva}
        className="w-full min-h-[56px] rounded-xl bg-[#007AFF] text-white font-bold text-[18px] border-0 cursor-pointer active:bg-[#0056b3] transition-colors"
      >
        + Nueva donación
      </button>

      {/* Buscar */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-12 min-h-[48px] border border-[#C6C6C8] rounded-xl text-[16px] focus:ring-2 focus:ring-[#007AFF] outline-none bg-white"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            aria-label="Borrar búsqueda"
            className="absolute right-1 top-1/2 -translate-y-1/2 text-[#8E8E93] h-11 w-11 flex items-center justify-center bg-transparent border-0 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Lista corrida de todos los años */}
      {renglones.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-[#8E8E93] text-[16px]">
            {search ? `Sin resultados para "${search}"` : "Todavía no hay donaciones"}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {renglones.map((r) =>
            r.tipo === "separador" ? (
              <p
                key={`sep-${r.anio}`}
                className="text-[14px] text-[#8E8E93] text-center pt-4 pb-1 tracking-wide"
              >
                ── AÑO {r.anio} · {formatCurrency(r.total).replace(/\.00$/, "")} ──
              </p>
            ) : (
              <RenglonDonacion
                key={r.donacion.id}
                donacion={r.donacion}
                onPick={() => abrirDonacion(r.donacion)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function RenglonDonacion({ donacion, onPick }: { donacion: Donation; onPick: () => void }) {
  const sinNombre = esSinNombre(donacion);
  return (
    <button
      onClick={onPick}
      className="w-full bg-white rounded-xl px-3.5 py-3 min-h-[56px] flex items-center justify-between gap-3 text-left border-0 cursor-pointer active:bg-[#F2F2F7] transition-colors"
    >
      <span className="flex-1 min-w-0">
        <span className={`block text-[16px] font-semibold truncate ${sinNombre ? "text-[#8E8E93] italic" : "text-[#1C1C1E]"}`}>
          {nombreEnPantalla(donacion)}
        </span>
        <span className="block text-[14px] text-[#6B6B70] truncate">
          {subtituloRenglon(donacion)}
        </span>
      </span>
      <span className="text-[17px] font-bold text-[#1C1C1E] whitespace-nowrap tabular-nums">
        {formatCurrency(donacion.amount).replace(/\.00$/, "")}
      </span>
    </button>
  );
}

/* ─────────────────────────── 3 · Resumen ─────────────────────────── */

function PantallaResumen({
  donations, anioEnCurso, abrirExportar,
}: {
  donations: Donation[];
  anioEnCurso: number;
  abrirExportar: (anio?: number) => void;
}) {
  const [anio, setAnio] = useState(anioEnCurso);
  const [mesAbierto, setMesAbierto] = useState<string | null>(null);
  const [verBeneficiarios, setVerBeneficiarios] = useState(false);

  const anios = useMemo(
    () => aniosHebreosConDatos(donations, anioEnCurso),
    [donations, anioEnCurso]
  );
  const yearData = useMemo(() => getHebrewYearData(anio), [anio]);

  const delAnio = useMemo(
    () => donations.filter((d) => d.date >= yearData.startDate && d.date <= yearData.endDate),
    [donations, yearData.startDate, yearData.endDate]
  );
  const totalAnio = delAnio.reduce((s, d) => s + d.amount, 0);

  const meses = useMemo(
    () =>
      yearData.months.map((m) => {
        const suyas = ordenarPorFecha(
          delAnio.filter((d) => d.date >= m.startDate && d.date <= m.endDate)
        );
        return {
          nombre: m.name,
          label: m.label,
          total: suyas.reduce((s, d) => s + d.amount, 0),
          donaciones: suyas,
        };
      }),
    [yearData, delAnio]
  );

  return (
    <div className="p-4 space-y-3">
      {/* Todos los años con datos */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {anios.map((a) => (
          <button
            key={a.anio}
            onClick={() => { setAnio(a.anio); setMesAbierto(null); setVerBeneficiarios(false); }}
            className={`shrink-0 min-h-[44px] px-4 rounded-full text-[15px] font-semibold border cursor-pointer transition-colors ${
              a.anio === anio
                ? "bg-[#007AFF] text-white border-[#007AFF]"
                : "bg-white text-[#1C1C1E] border-[#C6C6C8]"
            }`}
          >
            {a.anio} · {formatCurrency(a.total).replace(/\.00$/, "")}
          </button>
        ))}
      </div>

      {verBeneficiarios ? (
        <PorBeneficiario
          donaciones={delAnio}
          total={totalAnio}
          anio={anio}
          volver={() => setVerBeneficiarios(false)}
        />
      ) : (
        <>
          {meses.map((m) => (
            <div key={m.nombre} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setMesAbierto(mesAbierto === m.nombre ? null : m.nombre)}
                className="w-full px-4 py-3 min-h-[56px] flex items-center justify-between gap-3 text-left bg-transparent border-0 cursor-pointer active:bg-[#F2F2F7] transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className={`block text-[16px] font-semibold ${m.total > 0 ? "text-[#1C1C1E]" : "text-[#8E8E93]"}`}>
                    {m.nombre} {mesAbierto === m.nombre ? "⌄" : "›"}
                  </span>
                  <span className="block text-[14px] text-[#6B6B70] truncate">{m.label}</span>
                </span>
                <span className="text-right shrink-0">
                  <span className={`block text-[17px] font-bold tabular-nums ${m.total > 0 ? "text-[#1C1C1E]" : "text-[#8E8E93]"}`}>
                    {formatCurrency(m.total).replace(/\.00$/, "")}
                  </span>
                  <span className="block text-[14px] text-[#6B6B70]">{m.donaciones.length}</span>
                </span>
              </button>
              {mesAbierto === m.nombre && (
                <div className="border-t border-[#F2F2F7] px-3 py-2 space-y-1.5 bg-[#F2F2F7]/60">
                  {m.donaciones.length === 0 ? (
                    <p className="text-[14px] text-[#8E8E93] px-1 py-2">Sin donaciones en {m.nombre}</p>
                  ) : (
                    m.donaciones.map((d) => (
                      <div key={d.id} className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                        <span className="flex-1 min-w-0">
                          <span className={`block text-[15px] font-medium truncate ${esSinNombre(d) ? "text-[#8E8E93] italic" : "text-[#1C1C1E]"}`}>
                            {nombreEnPantalla(d)}
                          </span>
                          <span className="block text-[14px] text-[#6B6B70] truncate">{subtituloRenglon(d)}</span>
                        </span>
                        <span className="text-[16px] font-bold text-[#1C1C1E] tabular-nums whitespace-nowrap">
                          {formatCurrency(d.amount).replace(/\.00$/, "")}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="bg-[#007AFF] rounded-2xl p-4 flex items-center justify-between">
            <span>
              <span className="block text-[17px] font-bold text-white">Año {anio}</span>
              <span className="block text-[14px] text-white/80">
                {delAnio.length} {delAnio.length === 1 ? "donación" : "donaciones"}
              </span>
            </span>
            <span className="text-[19px] font-bold text-white tabular-nums">{formatCurrency(totalAnio)}</span>
          </div>

          <button
            onClick={() => setVerBeneficiarios(true)}
            className="w-full min-h-[48px] rounded-xl bg-white border border-[#C6C6C8] text-[#007AFF] text-[16px] font-semibold cursor-pointer"
          >
            Ver por beneficiario ›
          </button>
          <button
            onClick={() => abrirExportar(anio)}
            className="w-full min-h-[48px] rounded-xl bg-white border border-[#C6C6C8] text-[#007AFF] text-[16px] font-semibold cursor-pointer"
          >
            Exportar: PDF para imprimir · Excel para el contador ›
          </button>
        </>
      )}
    </div>
  );
}

function PorBeneficiario({
  donaciones, total, anio, volver,
}: {
  donaciones: Donation[];
  total: number;
  anio: number;
  volver: () => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);

  const lista = useMemo(() => {
    const mapa = new Map<string, { nombre: string; total: number; donaciones: Donation[] }>();
    for (const d of donaciones) {
      const nombre = nombreEnPantalla(d);
      const clave = nombre.toLowerCase();
      const acum = mapa.get(clave) ?? { nombre, total: 0, donaciones: [] };
      acum.total += d.amount;
      acum.donaciones.push(d);
      mapa.set(clave, acum);
    }
    return Array.from(mapa.entries())
      .map(([clave, v]) => ({
        clave,
        nombre: v.nombre,
        total: v.total,
        cantidad: v.donaciones.length,
        pct: total > 0 ? (v.total / total) * 100 : 0,
        donaciones: ordenarPorFecha(v.donaciones),
      }))
      .sort((a, b) => b.total - a.total);
  }, [donaciones, total]);

  return (
    <>
      <button
        onClick={volver}
        className="text-[#007AFF] text-[16px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px] p-0"
      >
        ‹ Los meses de {anio}
      </button>
      <p className="text-[14px] text-[#6B6B70]">
        {lista.length} beneficiario{lista.length !== 1 ? "s" : ""} · {formatCurrency(total)} en el año {anio}
      </p>
      {lista.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-[#8E8E93] text-[16px]">
          Sin donaciones en {anio}
        </div>
      ) : (
        <div className="space-y-1.5">
          {lista.map((b) => (
            <div key={b.clave} className="bg-white rounded-xl overflow-hidden">
              <button
                onClick={() => setAbierto(abierto === b.clave ? null : b.clave)}
                className="w-full px-3.5 py-3 min-h-[56px] flex items-center justify-between gap-3 text-left bg-transparent border-0 cursor-pointer active:bg-[#F2F2F7] transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-semibold text-[#1C1C1E] truncate">{b.nombre}</span>
                  <span className="block text-[14px] text-[#6B6B70]">
                    {b.cantidad} {b.cantidad === 1 ? "vez" : "veces"} · {b.pct.toFixed(1)} %
                  </span>
                </span>
                <span className="text-[17px] font-bold text-[#1C1C1E] tabular-nums whitespace-nowrap">
                  {formatCurrency(b.total).replace(/\.00$/, "")}
                </span>
              </button>
              {abierto === b.clave && (
                <div className="border-t border-[#F2F2F7] px-3 py-2 space-y-1.5 bg-[#F2F2F7]/60">
                  {b.donaciones.map((d) => (
                    <div key={d.id} className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                      <span className="text-[14px] text-[#6B6B70] truncate">{subtituloRenglon(d)}</span>
                      <span className="text-[16px] font-semibold text-[#1C1C1E] tabular-nums">
                        {formatCurrency(d.amount).replace(/\.00$/, "")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
