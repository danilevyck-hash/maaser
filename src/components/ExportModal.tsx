"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Donation } from "@/lib/supabase";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { formatDate, formatDateExport, formatCurrency } from "@/lib/format";
import {
  getCurrentHebrewYear,
  getHebrewYearData,
  getCurrentHebrewMonthRange,
} from "@/lib/hebrew-year";

type FilterPreset = "current_year" | "prev_year" | "current_month" | "custom";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  donations: Donation[];
};

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export default function ExportModal({ isOpen, onClose, donations }: Props) {
  const [preset, setPreset] = useState<FilterPreset>("current_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  useBodyScrollLock(isOpen);

  const hebrewYear = getCurrentHebrewYear();
  const currentYearData = getHebrewYearData(hebrewYear);
  const prevYearData = getHebrewYearData(hebrewYear - 1);
  const currentMonth = getCurrentHebrewMonthRange();

  const { dateFrom, dateTo, rangeLabel } = useMemo(() => {
    switch (preset) {
      case "current_year":
        return { dateFrom: currentYearData.startDate, dateTo: todayISO(), rangeLabel: `${formatDate(currentYearData.startDate)} — Hoy` };
      case "prev_year":
        return { dateFrom: prevYearData.startDate, dateTo: prevYearData.endDate, rangeLabel: `${formatDate(prevYearData.startDate)} — ${formatDate(prevYearData.endDate)}` };
      case "current_month":
        return { dateFrom: currentMonth.from, dateTo: currentMonth.to, rangeLabel: `${currentMonth.name}: ${formatDate(currentMonth.from)} — ${formatDate(currentMonth.to)}` };
      case "custom":
        return { dateFrom: customFrom, dateTo: customTo, rangeLabel: customFrom || customTo ? `${customFrom ? formatDate(customFrom) : "Inicio"} — ${customTo ? formatDate(customTo) : "Fin"}` : "Seleccione fechas" };
    }
  }, [preset, customFrom, customTo, currentYearData, prevYearData, currentMonth]);

  const filtered = useMemo(() => donations.filter((d) => {
    if (dateFrom && d.date < dateFrom) return false;
    if (dateTo && d.date > dateTo) return false;
    return true;
  }), [donations, dateFrom, dateTo]);

  const totalAmount = useMemo(() => filtered.reduce((s, d) => s + d.amount, 0), [filtered]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  const presets: { key: FilterPreset; label: string }[] = [
    { key: "current_year", label: `Este ano (${hebrewYear})` },
    { key: "prev_year", label: `Anterior (${hebrewYear - 1})` },
    { key: "current_month", label: `Este mes` },
    { key: "custom", label: "Personalizado" },
  ];

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Donaciones");
      sheet.columns = [
        { header: "#", key: "num", width: 6 },
        { header: "Fecha", key: "date", width: 16 },
        { header: "Cheque", key: "check", width: 10 },
        { header: "Beneficiario", key: "beneficiary", width: 28 },
        { header: "Monto", key: "amount", width: 14 },
        { header: "Notas", key: "notes", width: 30 },
      ];
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF007AFF" } };
      headerRow.alignment = { horizontal: "center" };
      filtered.forEach((d, i) => {
        sheet.addRow({ num: i + 1, date: formatDateExport(d.date), check: d.check_number || "", beneficiary: d.beneficiary, amount: d.amount, notes: d.notes || "" });
      });
      sheet.getColumn("amount").numFmt = "$#,##0.00";
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `donaciones_${dateFrom || "inicio"}_${dateTo || "fin"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally { setExporting(false); }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.setTextColor(0, 122, 255);
      doc.text("Registro de Maaser", 105, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(rangeLabel, 105, 28, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(0, 122, 255);
      doc.text(`Total: ${formatCurrency(totalAmount)}`, 105, 36, { align: "center" });
      const tableData = filtered.map((d, i) => [i + 1, formatDateExport(d.date), d.check_number || "", d.beneficiary, formatCurrency(d.amount), d.notes || ""]);
      autoTable(doc, {
        startY: 42,
        head: [["#", "Fecha", "Cheque", "Beneficiario", "Monto", "Notas"]],
        body: tableData,
        headStyles: { fillColor: [0, 122, 255], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
        columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { halign: "center", cellWidth: 24 }, 2: { halign: "center", cellWidth: 16 }, 3: { cellWidth: 42 }, 4: { halign: "right", cellWidth: 26 }, 5: { cellWidth: 48 } },
        alternateRowStyles: { fillColor: [242, 242, 247] },
        styles: { fontSize: 8, cellPadding: 3 },
        didDrawPage: (data) => {
          if (data.pageNumber === 1) { doc.setDrawColor(0, 122, 255); doc.setLineWidth(0.5); doc.line(14, 39, 196, 39); }
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Pagina ${data.pageNumber}`, 105, doc.internal.pageSize.height - 10, { align: "center" });
        },
      });
      doc.save(`donaciones_${dateFrom || "inicio"}_${dateTo || "fin"}.pdf`);
      onClose();
    } finally { setExporting(false); }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-[#F2F2F7] z-[9999] animate-fade-in"
      style={{ height: "100dvh" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-5 pt-14 pb-3 border-b border-[#C6C6C8] shrink-0 bg-white">
          <button type="button" onClick={onClose} className="text-[#007AFF] text-[15px] font-medium bg-transparent border-0 cursor-pointer min-h-[44px]">
            Cancelar
          </button>
          <h2 className="text-[17px] font-semibold text-[#1C1C1E]">Exportar</h2>
          <div className="w-16" />
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button key={p.key} onClick={() => setPreset(p.key)}
                className={`px-3 min-h-[44px] py-2.5 rounded-xl text-[15px] font-medium transition-colors border ${
                  preset === p.key ? "border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]" : "border-[#C6C6C8] text-[#8E8E93]"
                }`}
              >{p.label}</button>
            ))}
          </div>
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Desde</label>
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none text-[15px]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Hasta</label>
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full border border-[#C6C6C8] rounded-xl px-3 py-3 focus:ring-2 focus:ring-[#007AFF] outline-none text-[15px]" />
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl p-3 text-center space-y-1">
            <p className="text-[13px] text-[#8E8E93]">{rangeLabel}</p>
            <p className="text-[15px] text-[#1C1C1E] font-medium">{filtered.length} donaci{filtered.length !== 1 ? "ones" : "ón"}</p>
            <p className="text-[13px] text-[#8E8E93]">Total: {formatCurrency(totalAmount)}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExportExcel} disabled={filtered.length === 0 || exporting}
              className="flex-1 h-12 rounded-xl bg-[#34C759] text-white font-semibold text-[15px] border-0 cursor-pointer disabled:opacity-50 transition-colors">
              {exporting ? "..." : "Excel"}
            </button>
            <button onClick={handleExportPDF} disabled={filtered.length === 0 || exporting}
              className="flex-1 h-12 rounded-xl bg-[#007AFF] text-white font-semibold text-[15px] border-0 cursor-pointer disabled:opacity-50 transition-colors">
              {exporting ? "..." : "PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
