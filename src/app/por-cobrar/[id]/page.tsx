"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { CxcCliente, CxcMovimiento, CxcMovimientoTipo } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";
import { useToast } from "@/components/Toast";
import {
  calcBalance,
  buildEstadoCuenta,
  buildWhatsappUrl,
  cleanPhone,
  groupMovimientosPorMes,
} from "@/lib/por-cobrar";
import ClienteModal from "@/components/por-cobrar/ClienteModal";
import MovimientoModal from "@/components/por-cobrar/MovimientoModal";

export default function ClienteDetallePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const clienteId = (Array.isArray(rawId) ? rawId[0] : rawId) || "";
  const { showToast } = useToast();

  const [cliente, setCliente] = useState<CxcCliente | null>(null);
  const [movimientos, setMovimientos] = useState<CxcMovimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [savingCliente, setSavingCliente] = useState(false);
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<CxcMovimientoTipo>("cargo");
  const [savingMov, setSavingMov] = useState(false);

  const fetchData = useCallback(async () => {
    const url = `/api/por-cobrar/clientes/${clienteId}`;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const text = await res.text();
      console.log("[por-cobrar detalle] fetch", { url, status: res.status, body: text });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text);
          if (j?.error) msg = j.error;
        } catch {}
        showToast(`No se pudo cargar el cliente: ${msg}`, "error");
        return;
      }
      const data = JSON.parse(text);
      setCliente(data.cliente);
      setMovimientos(Array.isArray(data.movimientos) ? data.movimientos : []);
    } catch (e) {
      console.error("[por-cobrar detalle] fetch error", e);
      showToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }, [clienteId, showToast]);

  useEffect(() => {
    if (!clienteId) {
      router.replace("/por-cobrar");
      return;
    }
    fetchData();
  }, [clienteId, fetchData, router]);

  const balance = useMemo(() => calcBalance(movimientos), [movimientos]);
  const grupos = useMemo(() => groupMovimientosPorMes(movimientos), [movimientos]);

  const openMovModal = (tipo: CxcMovimientoTipo) => {
    setMovTipo(tipo);
    setMovOpen(true);
  };

  const handleSaveCliente = async (data: { id?: string; nombre: string; telefono: string; notas: string }) => {
    setSavingCliente(true);
    try {
      const res = await fetch("/api/por-cobrar/clientes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clienteId, ...data }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Error al guardar", "error");
        return;
      }
      const updated = await res.json();
      setCliente(updated);
      setEditOpen(false);
      showToast("Cliente actualizado");
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSavingCliente(false);
    }
  };

  const handleDeleteCliente = async () => {
    try {
      const res = await fetch("/api/por-cobrar/clientes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clienteId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Error al eliminar", "error");
        return;
      }
      showToast("Cliente eliminado");
      router.push("/por-cobrar");
    } catch {
      showToast("Error de conexión", "error");
    }
  };

  const handleSaveMov = async (data: { fecha: string; monto: number; descripcion: string }) => {
    setSavingMov(true);
    try {
      const res = await fetch("/api/por-cobrar/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          tipo: movTipo,
          fecha: data.fecha,
          monto: data.monto,
          descripcion: data.descripcion,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Error al guardar", "error");
        return;
      }
      setMovOpen(false);
      showToast("Movimiento agregado");
      fetchData();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSavingMov(false);
    }
  };

  const handleShareWhatsapp = () => {
    if (!cliente) return;
    const phone = cleanPhone(cliente.telefono);
    if (!phone) {
      showToast("Agrega el teléfono del cliente primero", "error");
      setEditOpen(true);
      return;
    }
    const texto = buildEstadoCuenta(cliente.nombre, movimientos);
    const url = buildWhatsappUrl(phone, texto);
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7]">
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto gap-2">
          <Link href="/por-cobrar" className="text-[#007AFF] text-[15px] font-medium no-underline shrink-0">
            &larr; Atrás
          </Link>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E] truncate flex-1 text-center">
            {cliente?.nombre || ""}
          </h1>
          <button
            onClick={() => setEditOpen(true)}
            disabled={!cliente}
            className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px] shrink-0 disabled:opacity-40"
            aria-label="Editar"
          >
            Editar
          </button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          className="max-w-[430px] mx-auto p-4 space-y-4"
          style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom))" }}
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-[#8E8E93] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !cliente ? (
            <p className="text-center text-[15px] text-[#8E8E93] py-12">Cliente no encontrado</p>
          ) : (
            <>
              <div className="bg-white rounded-2xl px-5 py-5 text-center">
                <p className="text-[13px] text-[#8E8E93] uppercase">Balance actual</p>
                <p className={`text-[34px] font-bold leading-tight tabular-nums mt-1 ${balance > 0 ? "text-red-500" : balance < 0 ? "text-green-500" : "text-[#1C1C1E]"}`}>
                  {formatCurrency(balance)}
                </p>
                {cliente.telefono && (
                  <p className="text-[13px] text-[#8E8E93] mt-1">{cliente.telefono}</p>
                )}
                <button
                  onClick={handleShareWhatsapp}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366] text-white text-[14px] font-medium border-0 active:opacity-80 min-h-[44px]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
                  </svg>
                  Compartir por WhatsApp
                </button>
              </div>

              {cliente.notas && (
                <div className="bg-white rounded-2xl px-4 py-3">
                  <p className="text-[11px] text-[#8E8E93] uppercase mb-1">Notas</p>
                  <p className="text-[15px] text-[#1C1C1E] whitespace-pre-wrap">{cliente.notas}</p>
                </div>
              )}

              {movimientos.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[15px] text-[#8E8E93]">Sin movimientos</p>
                  <p className="text-[13px] text-[#8E8E93] mt-1">Agrega un cargo, abono o ajuste abajo</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {grupos.map((g) => (
                    <div key={g.key}>
                      <p className="text-[13px] font-medium text-[#8E8E93] uppercase px-1 mb-1.5">
                        {g.label}
                      </p>
                      <div className="bg-white rounded-2xl overflow-hidden">
                        {g.movs.map((m, i) => {
                          const day = parseInt(m.fecha.split("-")[2], 10);
                          const esCargo = m.tipo === "cargo";
                          const esAbono = m.tipo === "abono";
                          const signo = esCargo ? "" : "-";
                          const color = esCargo
                            ? "text-[#1C1C1E]"
                            : esAbono
                              ? "text-green-500"
                              : "text-[#007AFF]";
                          const tipoLabel = esCargo ? "Cargo" : esAbono ? "Abono" : "Ajuste";
                          return (
                            <div
                              key={m.id}
                              className="flex items-center py-3 px-4"
                              style={i > 0 ? { borderTop: "1px solid rgba(198,198,200,0.3)" } : undefined}
                            >
                              <div className="w-10 shrink-0 text-center">
                                <p className="text-[17px] font-semibold tabular-nums text-[#1C1C1E]">{String(day).padStart(2, "0")}</p>
                              </div>
                              <div className="flex-1 min-w-0 ml-2">
                                <p className="text-[15px] text-[#1C1C1E]">{tipoLabel}</p>
                                {m.descripcion && (
                                  <p className="text-[13px] text-[#8E8E93] truncate">{m.descripcion}</p>
                                )}
                              </div>
                              <p className={`text-[15px] font-semibold tabular-nums ${color} ml-3`}>
                                {signo}{formatCurrency(Number(m.monto))}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {cliente && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/90 backdrop-blur-xl border-t border-[#C6C6C8] px-3 pt-2 z-40"
          style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
        >
          <div className="flex gap-2">
            <button
              onClick={() => openMovModal("cargo")}
              className="flex-1 py-3 rounded-xl bg-[#1C1C1E] text-white text-[15px] font-semibold border-0 active:opacity-80 min-h-[44px]"
            >
              + Cargo
            </button>
            <button
              onClick={() => openMovModal("abono")}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white text-[15px] font-semibold border-0 active:opacity-80 min-h-[44px]"
            >
              + Abono
            </button>
            <button
              onClick={() => openMovModal("ajuste")}
              className="flex-1 py-3 rounded-xl bg-[#007AFF] text-white text-[15px] font-semibold border-0 active:opacity-80 min-h-[44px]"
            >
              + Ajuste
            </button>
          </div>
        </div>
      )}

      <ClienteModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSaveCliente}
        onDelete={handleDeleteCliente}
        editing={cliente}
        saving={savingCliente}
      />

      <MovimientoModal
        isOpen={movOpen}
        tipo={movTipo}
        onClose={() => setMovOpen(false)}
        onSave={handleSaveMov}
        saving={savingMov}
      />
    </div>
  );
}
