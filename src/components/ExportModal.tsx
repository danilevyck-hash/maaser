"use client";

import { useState, useMemo } from "react";
import { Donation } from "@/lib/supabase";
import { formatDate, formatCurrency } from "@/lib/format";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  donations: Donation[];
};

export default function ExportModal({ isOpen, onClose, donations }: Props) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    return donations.filter((d) => {
      if (dateFrom && d.date < dateFrom) return false;
      if (dateTo && d.date > dateTo) return false;
      return true;
    });
  }, [donations, dateFrom, dateTo]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Donaciones");

      sheet.columns = [
        { header: "#", key: "num", width: 6 },
        { header: "Recibo No.", key: "receipt", width: 12 },
        { header: "Fecha", key: "date", width: 14 },
        { header: "Beneficiario", key: "beneficiary", width: 28 },
        { header: "Monto", key: "amount", width: 14 },
        { header: "Estado", key: "status", width: 12 },
        { header: "Notas", key: "notes", width: 30 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A3A5C" },
      };
      headerRow.alignment = { horizontal: "center" };

      filtered.forEach((d, i) => {
        sheet.addRow({
          num: i + 1,
          receipt: d.receipt_number,
          date: formatDate(d.date),
          beneficiary: d.beneficiary,
          amount: d.amount,
          status: d.status === "valido" ? "Válido" : "Anulado",
          notes: d.notes || "",
        });
      });

      sheet.getColumn("amount").numFmt = "$#,##0.00";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `donaciones_${dateFrom || "inicio"}_${dateTo || "fin"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-navy text-white p-4 rounded-t-xl">
          <h2 className="text-lg font-bold">Exportar Donaciones</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none text-sm"
              />
            </div>
          </div>

          <div className="bg-cream/50 rounded-lg p-3 text-center">
            <p className="text-navy font-medium">
              {filtered.length} donación{filtered.length !== 1 ? "es" : ""} a exportar
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Total: {formatCurrency(filtered.filter(d => d.status === "valido").reduce((s, d) => s + d.amount, 0))}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExport}
              disabled={filtered.length === 0 || exporting}
              className="flex-1 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              {exporting ? "Exportando..." : "Exportar Excel"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
