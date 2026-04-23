"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CxcMovimientoTipo } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type Props = {
  isOpen: boolean;
  tipo: CxcMovimientoTipo;
  onClose: () => void;
  onSave: (data: { fecha: string; monto: number; descripcion: string }) => void;
  saving?: boolean;
};

const TIPO_LABEL: Record<CxcMovimientoTipo, string> = {
  cargo: "Cargo",
  abono: "Abono",
  ajuste: "Ajuste",
};

export default function MovimientoModal({ isOpen, tipo, onClose, onSave, saving }: Props) {
  const { showToast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const [fecha, setFecha] = useState(todayStr);
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setFecha(todayStr);
      setMonto("");
      setDescripcion("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(monto);
    if (!n || n <= 0) {
      showToast("Ingresa un monto mayor a cero", "error");
      return;
    }
    if (!fecha) {
      showToast("Selecciona una fecha", "error");
      return;
    }
    onSave({ fecha, monto: n, descripcion: descripcion.trim() });
  };

  const dateShortcutClass = (target: string) =>
    `text-xs px-2.5 py-1 rounded-lg transition-colors ${
      fecha === target ? "bg-[#007AFF] text-white" : "bg-[#E5E5EA] text-[#8E8E93]"
    }`;

  return createPortal(
    <div
      className="fixed inset-0 bg-[#F2F2F7] z-[9999]"
      style={{ height: "100dvh" }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-[#C6C6C8] shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">
            Nuevo {TIPO_LABEL[tipo]}
          </h2>
          <button
            type="submit"
            disabled={saving}
            className="text-[#007AFF] text-[15px] font-bold bg-transparent border-0 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div>
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Fecha</label>
            <div className="flex gap-2 mb-1.5">
              <button type="button" onClick={() => setFecha(todayStr)} className={dateShortcutClass(todayStr)}>Hoy</button>
              <button type="button" onClick={() => setFecha(yesterdayStr)} className={dateShortcutClass(yesterdayStr)}>Ayer</button>
            </div>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="Opcional"
            />
          </div>
        </div>
      </form>
    </div>,
    document.body
  );
}
