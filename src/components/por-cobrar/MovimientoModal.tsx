"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CxcMovimiento, CxcMovimientoTipo } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type Props = {
  isOpen: boolean;
  tipo: CxcMovimientoTipo;
  editing?: CxcMovimiento | null;
  onClose: () => void;
  onSave: (data: { fecha: string; monto: number; descripcion: string }) => void;
  onDelete?: () => void;
  saving?: boolean;
};

const TIPO_LABEL: Record<CxcMovimientoTipo, string> = {
  cargo: "Cargo",
  abono: "Abono",
  ajuste: "Ajuste",
};

const TIPO_LABEL_LOWER: Record<CxcMovimientoTipo, string> = {
  cargo: "cargo",
  abono: "abono",
  ajuste: "ajuste",
};

export default function MovimientoModal({ isOpen, tipo, editing, onClose, onSave, onDelete, saving }: Props) {
  const { showToast } = useToast();
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  const [fecha, setFecha] = useState(todayStr);
  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setFecha(editing.fecha);
      setMonto(String(editing.monto));
      setDescripcion(editing.descripcion || "");
    } else {
      setFecha(todayStr);
      setMonto("");
      setDescripcion("");
    }
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editing]);

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

  const titleLabel = editing ? `Editar ${TIPO_LABEL[tipo]}` : `Nuevo ${TIPO_LABEL[tipo]}`;

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
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">{titleLabel}</h2>
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

          {editing && onDelete && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3 text-[15px] text-red-500 font-medium bg-white rounded-xl border border-[#C6C6C8] min-h-[44px]"
              >
                Eliminar {TIPO_LABEL_LOWER[tipo]}
              </button>
            </div>
          )}
        </div>
      </form>

      {confirmDelete && onDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          onClick={() => setConfirmDelete(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h3 className="text-[17px] font-semibold text-[#1C1C1E]">¿Eliminar este {TIPO_LABEL_LOWER[tipo]}?</h3>
              <p className="text-[13px] text-[#8E8E93] mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="border-t border-[#C6C6C8]/30">
              <button
                onClick={() => { setConfirmDelete(false); onDelete(); }}
                className="w-full py-3 text-[17px] text-red-500 font-medium border-b border-[#C6C6C8]/30 bg-transparent min-h-[44px]"
              >
                Eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="w-full py-3 text-[17px] text-[#007AFF] font-semibold bg-transparent border-0 min-h-[44px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
