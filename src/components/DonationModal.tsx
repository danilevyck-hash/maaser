"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Donation } from "@/lib/supabase";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { hoyPanamaISO } from "@/lib/fecha-panama";
import { montosFrecuentes } from "@/lib/maaser/montos-frecuentes";
import { METODOS_PAGO, normalizarMetodo } from "@/lib/maaser/metodo-pago";
import {
  anterioresDelBeneficiario,
  textoAnteriores,
} from "@/lib/maaser/historial-beneficiario";
import { formatDateShort } from "@/lib/format";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (donation: Partial<Donation>) => void;
  onDelete?: (id: number) => void;
  editingDonation: Donation | null;
  /** Todas las donaciones: de ahí salen los botones de monto y el historial. */
  donations: Donation[];
  saving?: boolean;
  deleting?: boolean;
};

export default function DonationModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingDonation,
  donations,
  saving,
  deleting,
}: Props) {
  const [date, setDate] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [amount, setAmount] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [metodo, setMetodo] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState("");
  const [nameError, setNameError] = useState("");
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (editingDonation) {
      setDate(editingDonation.date);
      setBeneficiary(editingDonation.beneficiary || "");
      setAmount(editingDonation.amount.toString());
      setCheckNumber(editingDonation.check_number || "");
      setMetodo(normalizarMetodo(editingDonation.metodo) || "");
      setNotes(editingDonation.notes || "");
    } else {
      // La fecha de HOY es la de Panamá, no la de Londres.
      setDate(hoyPanamaISO());
      setBeneficiary("");
      setAmount("");
      setCheckNumber("");
      setMetodo("");
      setNotes("");
    }
    setAmountError("");
    setNameError("");
    setConfirmarBorrar(false);
  }, [editingDonation, isOpen]);

  // Los cinco montos salen de lo que papá dio de verdad, no de una lista escrita.
  const botonesMonto = useMemo(() => montosFrecuentes(donations), [donations]);

  const anteriores = useMemo(
    () => anterioresDelBeneficiario(donations, beneficiary, editingDonation?.id),
    [donations, beneficiary, editingDonation?.id]
  );
  const recordatorio = textoAnteriores(beneficiary, anteriores);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const guardar = (sinNombre: boolean) => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setAmountError("Escribe cuánto diste");
      return;
    }
    if (!sinNombre && !beneficiary.trim()) {
      setNameError('Escribe a quién, o toca "Guardar sin nombre"');
      return;
    }
    setAmountError("");
    setNameError("");
    const donation: Partial<Donation> = {
      date,
      beneficiary: sinNombre ? "" : beneficiary.trim(),
      amount: parsed,
      check_number: checkNumber.trim() || undefined,
      status: "valido",
      notes: notes.trim() || undefined,
      metodo: metodo || null,
    };
    if (editingDonation) donation.id = editingDonation.id;
    onSave(donation);
  };

  const inputClass =
    "w-full border border-[#C6C6C8] rounded-xl px-4 py-3 text-[17px] text-[#1C1C1E] focus:ring-2 focus:ring-[#007AFF] focus:border-[#007AFF] outline-none bg-white";
  const labelClass = "block text-[14px] font-medium text-[#6B6B70] mb-1.5";

  return createPortal(
    <div
      className="fixed inset-0 bg-[#F2F2F7] z-[9999] animate-fade-in"
      style={{ height: "100dvh" }}
      onClick={(e) => e.stopPropagation()}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); guardar(false); }}
        className="flex flex-col h-full"
      >
        <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-[#C6C6C8] shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="text-[#007AFF] text-[16px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px] px-1"
          >
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">
            {editingDonation ? "Editar donación" : "Nueva donación"}
          </h2>
          <span className="w-[72px]" />
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: "touch" }}>
          {/* ¿A quién? */}
          <div>
            <label className={labelClass}>¿A quién?</label>
            <input
              type="text"
              value={beneficiary}
              onChange={(e) => { setBeneficiary(e.target.value); setNameError(""); }}
              className={`${inputClass} ${nameError ? "!border-[#FF3B30]" : ""}`}
              placeholder="Nombre"
              autoComplete="off"
            />
            {recordatorio && (
              <p className="text-[14px] text-[#007AFF] mt-1.5 leading-snug">{recordatorio}</p>
            )}
            {nameError && (
              <p className="text-[#FF3B30] text-[14px] mt-1.5 font-medium">{nameError}</p>
            )}
          </div>

          {/* ¿Cuánto? */}
          <div>
            <label className={labelClass}>¿Cuánto?</label>
            <div className="grid grid-cols-3 gap-2">
              {botonesMonto.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setAmount(String(m)); setAmountError(""); }}
                  className={`min-h-[48px] rounded-xl text-[17px] font-bold border cursor-pointer transition-colors ${
                    parseFloat(amount) === m
                      ? "bg-[#007AFF] text-white border-[#007AFF]"
                      : "bg-white text-[#1C1C1E] border-[#C6C6C8]"
                  }`}
                >
                  ${m.toLocaleString("en-US")}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setAmountError(""); }}
              className={`w-full mt-2 border rounded-xl px-4 py-4 text-[26px] font-bold text-center text-[#1C1C1E] outline-none bg-white focus:ring-2 focus:ring-[#007AFF] ${
                amountError ? "border-[#FF3B30]" : "border-[#C6C6C8]"
              }`}
              placeholder="escribe el monto"
            />
            {amountError && (
              <p className="text-[#FF3B30] text-[14px] mt-1.5 font-medium">{amountError}</p>
            )}
          </div>

          {/* Fecha y cheque */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Fecha en que se dio</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
                required
              />
              {date === hoyPanamaISO() && (
                <p className="text-[14px] text-[#8E8E93] mt-1">hoy, {formatDateShort(date).replace(/ \d{4}$/, "")}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>N° de cheque</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={inputClass}
                placeholder="opcional"
              />
            </div>
          </div>

          {/* ¿Cómo pagó? */}
          <div>
            <label className={labelClass}>¿Cómo pagó?</label>
            <div className="grid grid-cols-3 gap-2">
              {METODOS_PAGO.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMetodo(metodo === m.id ? "" : m.id)}
                  className={`min-h-[48px] px-2 rounded-xl text-[14px] font-semibold border cursor-pointer leading-tight transition-colors ${
                    metodo === m.id
                      ? "bg-[#007AFF] text-white border-[#007AFF]"
                      : "bg-white text-[#1C1C1E] border-[#C6C6C8]"
                  }`}
                >
                  {m.etiqueta}
                </button>
              ))}
            </div>
          </div>

          {/* Nota */}
          <div>
            <label className={labelClass}>Nota</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputClass} resize-none`}
              placeholder="esposa enferma, boda, próxima vez dar menos…"
              rows={2}
            />
          </div>

          {!editingDonation && (
            <button
              type="button"
              onClick={() => guardar(true)}
              disabled={saving}
              className="text-[#007AFF] text-[16px] bg-transparent border-0 cursor-pointer min-h-[44px] px-1 disabled:opacity-50"
            >
              Guardar sin nombre
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full min-h-[52px] rounded-xl bg-[#007AFF] text-white font-bold text-[17px] border-0 cursor-pointer active:bg-[#0056b3] transition-colors disabled:opacity-50"
          >
            {saving ? "Guardando…" : editingDonation ? "Guardar" : "Agregar"}
          </button>

          {editingDonation && onDelete && (
            <div className="pt-2">
              {confirmarBorrar ? (
                <div className="bg-white rounded-xl p-4 border border-[#FF3B30]/30">
                  <p className="text-[15px] text-[#1C1C1E] mb-3">¿Borrar esta donación?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDelete(editingDonation.id)}
                      disabled={deleting}
                      className="flex-1 min-h-[48px] rounded-xl bg-[#FF3B30] text-white font-semibold text-[16px] border-0 cursor-pointer disabled:opacity-50"
                    >
                      {deleting ? "…" : "Sí, borrar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarBorrar(false)}
                      className="flex-1 min-h-[48px] rounded-xl bg-[#E5E5EA] text-[#1C1C1E] font-semibold text-[16px] border-0 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarBorrar(true)}
                  className="w-full text-[#FF3B30] text-[16px] bg-transparent border-0 cursor-pointer min-h-[44px]"
                >
                  Borrar esta donación
                </button>
              )}
            </div>
          )}
        </div>
      </form>
    </div>,
    document.body
  );
}
