"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { CxcCliente, CxcClienteConBalance } from "@/lib/supabase";
import { formatCurrency, formatDateShort } from "@/lib/format";
import { useToast } from "@/components/Toast";
import ClienteModal from "@/components/por-cobrar/ClienteModal";
import Bienvenida from "@/components/Bienvenida";
import { BIENVENIDA_POR_COBRAR } from "@/lib/bienvenidas";

export default function PorCobrarPage() {
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
    <div className="fixed inset-0 flex flex-col bg-white">
      <div className="bg-white px-5 pt-14 shrink-0">
        <div className="flex items-center max-w-[430px] mx-auto">
          <Link href="/" className="text-[#007AFF] text-[17px] no-underline min-h-[44px] flex items-center">
            &larr; Inicio
          </Link>
        </div>
        <h1 className="text-[34px] font-light tracking-[-0.02em] text-[#1C1C1E] leading-[1.1] max-w-[430px] mx-auto pb-2">
          Por Cobrar
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div
          className="max-w-[430px] mx-auto"
          style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}
        >
          <div>
            <div className="px-5 pb-6">
              <p className="text-[15px] text-[#6E6E73]">Total por cobrar</p>
              <p className={`text-[44px] font-light tracking-[-0.03em] leading-none tabular-nums mt-1 ${totalPorCobrar > 0 ? "text-[#FF3B30]" : "text-[#1C1C1E]"}`}>
                {formatCurrency(totalPorCobrar)}
              </p>
              <p className="text-[15px] text-[#6E6E73] mt-2">
                {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#8E8E93] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-[#F2F2F7] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-[#6E6E73]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-[15px] text-[#6E6E73]">Sin clientes</p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="text-[15px] text-[#007AFF] font-medium mt-2 bg-transparent border-0"
                >
                  Agregar primer cliente
                </button>
              </div>
            ) : (
              <div>
                {sorted.map((c) => (
                  <Link
                    key={c.id}
                    href={`/por-cobrar/${c.id}`}
                    className="flex items-center px-5 py-3.5 min-h-[56px] no-underline border-t border-[#E5E5EA] active:bg-[#F2F2F7] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[17px] font-medium text-[#1C1C1E] truncate">{c.nombre}</p>
                      <p className="text-[14px] text-[#6E6E73]">
                        {c.ultimo_movimiento ? formatDateShort(c.ultimo_movimiento) : "Sin movimientos"}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {c.balance === 0 ? (
                        <p className="text-[15px] text-[#34C759]">Al día</p>
                      ) : (
                        <p className={`text-[17px] tabular-nums ${c.balance > 0 ? "text-[#FF3B30]" : "text-[#6E6E73]"}`}>
                          {formatCurrency(c.balance)}
                        </p>
                      )}
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

      <Bienvenida {...BIENVENIDA_POR_COBRAR} />

      <ClienteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        editingCliente={null}
        saving={saving}
      />

      <button
        onClick={() => setModalOpen(true)}
        className="fixed bottom-6 right-5 z-40 w-14 h-14 bg-[#1C1C1E] text-white rounded-full flex items-center justify-center active:scale-95 border-0"
        style={{ boxShadow: "0 6px 20px rgba(0,0,0,0.18)" }}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}
