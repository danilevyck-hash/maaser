"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CxcMovimiento, CxcMovimientoTipo } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type Props = {
  isOpen: boolean;
  tipo: CxcMovimientoTipo;
  onClose: () => void;
  onSave: (mov: Partial<CxcMovimiento>) => void;
  onDelete?: (id: number) => void;
  editingMov: CxcMovimiento | null;
  saving?: boolean;
};

const TIPO_LABEL: Record<CxcMovimientoTipo, string> = {
  cargo: "Cargo",
  abono: "Abono",
  ajuste: "Ajuste",
};

export default function MovimientoModal({ isOpen, tipo, onClose, onSave, onDelete, editingMov, saving }: Props) {
  const { showToast } = useToast();
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (editingMov) {
      setDate(editingMov.fecha);
      setAmount(String(editingMov.monto));
      setDescripcion(editingMov.descripcion || "");
      setShowPicker(editingMov.fecha !== todayStr && editingMov.fecha !== yesterdayStr);
    } else {
      setDate(todayStr);
      setAmount("");
      setDescripcion("");
      setShowPicker(false);
    }
    setConfirmDelete(false);
  }, [editingMov, isOpen, todayStr, yesterdayStr]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0) {
      showToast("Ingresa un monto", "error");
      return;
    }
    if (!date) {
      showToast("Selecciona una fecha", "error");
      return;
    }
    const mov: Partial<CxcMovimiento> = {
      fecha: date,
      monto: n,
      descripcion: descripcion.trim() || undefined,
    };
    if (editingMov) mov.id = editingMov.id;
    onSave(mov);
  };

  const chipClass = (active: boolean) =>
    `flex-1 py-2 rounded-[14px] text-[14px] font-medium transition-colors border-0 ${
      active ? "bg-[#1C1C1E] text-white" : "bg-[#F2F2F7] text-[#1C1C1E]"
    }`;

  const hoyActive = date === todayStr && !showPicker;
  const ayerActive = date === yesterdayStr && !showPicker;
  const otraActive = showPicker;

  const tipoActual = editingMov ? editingMov.tipo : tipo;
  const title = editingMov ? `Editar ${TIPO_LABEL[tipoActual]}` : `Nuevo ${TIPO_LABEL[tipoActual]}`;

  return createPortal(
    <div
      className="fixed inset-0 bg-white z-[9999]"
      style={{ height: "100dvh" }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-[#E5E5EA] shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px]"
          >
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">{title}</h2>
          <button
            type="submit"
            disabled={saving}
            className="text-[#007AFF] text-[17px] font-medium bg-transparent border-0 cursor-pointer disabled:opacity-50 min-h-[44px]"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div>
            <label className="block text-[14px] font-medium text-[#1C1C1E] mb-1">Monto ($)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-[#E5E5EA] rounded-[14px] px-3 py-3 focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1C1C1E] mb-2">Fecha</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDate(todayStr); setShowPicker(false); }}
                className={chipClass(hoyActive)}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => { setDate(yesterdayStr); setShowPicker(false); }}
                className={chipClass(ayerActive)}
              >
                Ayer
              </button>
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className={chipClass(otraActive)}
              >
                Otra fecha
              </button>
            </div>
            {showPicker && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                autoFocus
                className="w-full mt-2 border border-[#E5E5EA] rounded-[14px] px-3 py-2.5 focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
                required
              />
            )}
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#1C1C1E] mb-1">Descripción</label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full border border-[#E5E5EA] rounded-[14px] px-3 py-3 focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="Opcional"
            />
          </div>

          {editingMov && onDelete && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3 text-[15px] text-[#FF3B30] font-medium bg-white rounded-[14px] border border-[#E5E5EA] min-h-[44px]"
              >
                Eliminar {TIPO_LABEL[tipoActual].toLowerCase()}
              </button>
            </div>
          )}
        </div>
      </form>

      {confirmDelete && editingMov && onDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          onClick={() => setConfirmDelete(false)}
        >
          <div className="bg-white rounded-[22px] w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <h3 className="text-[17px] font-semibold text-[#1C1C1E]">
                ¿Eliminar este {TIPO_LABEL[tipoActual].toLowerCase()}?
              </h3>
              <p className="text-[14px] text-[#6E6E73] mt-2">Esta acción no se puede deshacer.</p>
            </div>
            <div className="border-t border-[#E5E5EA]">
              <button
                onClick={() => { setConfirmDelete(false); onDelete(editingMov.id); }}
                className="w-full py-3 text-[17px] text-[#FF3B30] font-medium border-b border-[#E5E5EA] bg-transparent min-h-[44px]"
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
