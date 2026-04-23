"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CxcCliente } from "@/lib/supabase";
import { useToast } from "@/components/Toast";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id?: string; nombre: string; telefono: string; notas: string }) => void;
  onDelete?: () => void;
  editing?: CxcCliente | null;
  saving?: boolean;
};

export default function ClienteModal({ isOpen, onClose, onSave, onDelete, editing, saving }: Props) {
  const { showToast } = useToast();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setNombre(editing?.nombre || "");
      setTelefono(editing?.telefono || "");
      setNotas(editing?.notas || "");
      setConfirmDelete(false);
    }
  }, [isOpen, editing]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      showToast("Ingresa el nombre", "error");
      return;
    }
    onSave({
      id: editing?.id,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      notas: notas.trim(),
    });
  };

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
            {editing ? "Editar Cliente" : "Nuevo Cliente"}
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
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="Nombre del cliente"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Teléfono</label>
            <input
              type="tel"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E]"
              placeholder="50761234567"
            />
            <p className="text-[11px] text-[#8E8E93] mt-1">Con código de país, sin espacios ni signos</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1C1C1E] mb-1">Notas</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none text-[16px] bg-white text-[#1C1C1E] resize-none"
              placeholder="Notas opcionales"
            />
          </div>

          {editing && onDelete && (
            <div className="pt-4">
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full py-3 text-[15px] text-red-500 font-medium bg-white rounded-xl border border-[#C6C6C8] min-h-[44px]"
              >
                Eliminar cliente
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
              <h3 className="text-[17px] font-semibold text-[#1C1C1E]">Eliminar cliente</h3>
              <p className="text-[13px] text-[#8E8E93] mt-2">
                Se borrarán el cliente y todos sus movimientos. Esta acción no se puede deshacer.
              </p>
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
