"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CxcCliente, CxcClienteConBalance } from "@/lib/supabase";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { useToast } from "@/components/Toast";
import ClienteModal from "@/components/por-cobrar/ClienteModal";

export default function PorCobrarPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [clientes, setClientes] = useState<CxcClienteConBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/por-cobrar/clientes");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setClientes(data);
      }
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const handleSave = async (cliente: Partial<CxcCliente>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/por-cobrar/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cliente),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || "Error al guardar", "error");
        return;
      }
      setModalOpen(false);
      showToast("Cliente agregado");
      fetchClientes();
    } catch {
      showToast("Error de conexión", "error");
    } finally {
      setSaving(false);
    }
  };

  const totalPorCobrar = clientes.reduce((sum, c) => (c.balance > 0 ? sum + c.balance : sum), 0);

  const sorted = [...clientes].sort((a, b) => {
    const ma = a.ultimo_movimiento || "";
    const mb = b.ultimo_movimiento || "";
    if (ma !== mb) return mb.localeCompare(ma);
    return a.nombre.localeCompare(b.nombre);
  });

  return (
    <div className="fixed inset-0 flex flex-col bg-[#F2F2F7]">
      <div className="bg-white/80 backdrop-blur-xl border-b border-[#C6C6C8] px-5 pt-14 pb-3 shrink-0">
        <div className="flex items-center justify-between max-w-[430px] mx-auto">
          <Link href="/" className="text-[#007AFF] text-[15px] font-medium no-underline">
            &larr; Inicio
          </Link>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Por Cobrar</h1>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/login");
              router.refresh();
            }}
            className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
        >
          <div className="space-y-4 px-4 pt-4">
            <div className="bg-white rounded-2xl px-5 py-5 text-center">
              <p className="text-[13px] text-[#8E8E93] uppercase">Total por cobrar</p>
              <p className={`text-[34px] font-bold leading-tight tabular-nums mt-1 ${totalPorCobrar > 0 ? "text-red-500" : "text-[#1C1C1E]"}`}>
                {formatCurrency(totalPorCobrar)}
              </p>
              <p className="text-[13px] text-[#8E8E93] mt-1">
                {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#8E8E93] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[#E5E5EA] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-[15px] text-[#8E8E93]">Sin clientes</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-[15px] text-[#007AFF] font-medium mt-2 bg-transparent border-0"
                >
                  Agregar primer cliente
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl overflow-hidden">
                {sorted.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/por-cobrar/${c.id}`}
                    className="flex items-center px-4 py-3 no-underline active:bg-[#E5E5EA]/50 transition-colors"
                    style={i > 0 ? { borderTop: "1px solid rgba(198,198,200,0.3)" } : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-semibold text-[#1C1C1E] truncate">{c.nombre}</p>
                      <p className="text-[13px] text-[#8E8E93]">
                        {c.ultimo_movimiento ? formatDateShort(c.ultimo_movimiento) : "Sin movimientos"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-[17px] font-semibold tabular-nums ${c.balance > 0 ? "text-red-500" : "text-[#8E8E93]"}`}>
                        {formatCurrency(c.balance)}
                      </p>
                    </div>
                    <svg className="h-4 w-4 text-[#C7C7CC] ml-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ClienteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingCliente={null}
        saving={saving}
      />

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-5 z-40 w-14 h-14 bg-[#007AFF] text-white rounded-full flex items-center justify-center active:scale-95 border-0"
        style={{ boxShadow: "0 4px 16px rgba(0,122,255,0.4)" }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
