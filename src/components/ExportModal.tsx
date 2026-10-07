"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { Donation } from "@/lib/supabase";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { formatDateExport, formatCurrency } from "@/lib/format";
import { diaYMesCorto } from "@/lib/maaser/fecha-en-palabras";
import { dinero } from "@/lib/maaser/dinero";
import { hoyPanamaISO } from "@/lib/fecha-panama";
import {
  BOTON_BORDE_ANCHO,
  BOTON_PRINCIPAL,
  CAMPO,
  ENLACE,
  ROTULO,
  TEXTO_2,
} from "@/lib/ui/apple";
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
  /** Año hebreo elegido en el Resumen. Sin él, el año en curso. */
  anioSeleccionado?: number;
};

export default function ExportModal({ isOpen, onClose, donations, anioSeleccionado }: Props) {
  const [preset, setPreset] = useState<FilterPreset>("current_year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  useBodyScrollLock(isOpen);

  const hebrewYear = anioSeleccionado ?? getCurrentHebrewYear();
  const esAnioEnCurso = hebrewYear === getCurrentHebrewYear();
  const currentYearData = getHebrewYearData(hebrewYear);
  const prevYearData = getHebrewYearData(hebrewYear - 1);
  const currentMonth = getCurrentHebrewMonthRange();

  const { dateFrom, dateTo, rangeLabel } = useMemo(() => {
    switch (preset) {
      case "current_year":
        return {
          dateFrom: currentYearData.startDate,
          dateTo: esAnioEnCurso ? hoyPanamaISO() : currentYearData.endDate,
          rangeLabel: `${diaYMesCorto(currentYearData.startDate)} – ${esAnioEnCurso ? "hoy" : diaYMesCorto(currentYearData.endDate)}`,
        };
      case "prev_year":
        return { dateFrom: prevYearData.startDate, dateTo: prevYearData.endDate, rangeLabel: `${diaYMesCorto(prevYearData.startDate)} ${prevYearData.startDate.slice(0, 4)} – ${diaYMesCorto(prevYearData.endDate)} ${prevYearData.endDate.slice(0, 4)}` };
      case "current_month":
        return { dateFrom: currentMonth.from, dateTo: currentMonth.to, rangeLabel: `${currentMonth.name} · ${diaYMesCorto(currentMonth.from)} – ${diaYMesCorto(currentMonth.to)}` };
      case "custom":
        return { dateFrom: customFrom, dateTo: customTo, rangeLabel: customFrom || customTo ? `${customFrom ? diaYMesCorto(customFrom) : "el inicio"} – ${customTo ? diaYMesCorto(customTo) : "hoy"}` : "Falta elegir las fechas" };
    }
  }, [preset, customFrom, customTo, currentYearData, prevYearData, currentMonth, esAnioEnCurso]);

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
    { key: "current_year", label: `Año ${hebrewYear}` },
    { key: "prev_year", label: `Año ${hebrewYear - 1}` },
    { key: "current_month", label: `Este mes` },
    { key: "custom", label: "Otras fechas" },
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
    /* Hasta el 6-oct-2026 esta era la ÚNICA pantalla con la cara vieja: botón
       verde, botón azul, fondo gris, tarjetas y la fecha en números. */
    <div className="fixed inset-0 bg-white z-[9999] animate-fade-in" style={{ height: "100dvh" }}>
      <div className="flex flex-col h-full">
        <div className="px-5 pt-14 shrink-0 bg-white">
          <div className="flex items-center justify-between max-w-[430px] mx-auto">
            <button type="button" onClick={onClose} className={`${ENLACE} min-h-[44px]`}>
              Cancelar
            </button>
            <span className="text-[17px] font-medium text-[#1C1C1E]">Guardar la lista</span>
            <span className="w-[70px]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="max-w-[430px] mx-auto pb-8">
            <p className={`${ROTULO} px-5 pt-5`}>Fechas de la lista</p>
            <div className="grid grid-cols-2 gap-2 px-5">
              {presets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`min-h-[48px] text-[16px] rounded-[10px] border cursor-pointer transition-colors ${
                    preset === p.key
                      ? "border-[#1C1C1E] text-[#1C1C1E] font-semibold bg-white"
                      : "border-[#E5E5EA] text-[#6E6E73] bg-white"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-3 px-5 pt-4">
                <div>
                  <label className={ROTULO} htmlFor="exportar-desde">Desde</label>
                  <input
                    id="exportar-desde"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={CAMPO}
                  />
                </div>
                <div>
                  <label className={ROTULO} htmlFor="exportar-hasta">Hasta</label>
                  <input
                    id="exportar-hasta"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={CAMPO}
                  />
                </div>
              </div>
            )}

            <div className="mx-5 mt-6 border-t border-[#E5E5EA]">
              <div className="flex items-baseline justify-between py-3 border-b border-[#E5E5EA]">
                <span className={TEXTO_2}>{rangeLabel}</span>
                <b className="text-[17px] font-medium tabular-nums">{dinero(totalAmount)}</b>
              </div>
              <div className="py-3">
                <span className={TEXTO_2}>
                  {filtered.length} {filtered.length === 1 ? "donación" : "donaciones"}
                </span>
              </div>
            </div>

            <div className="px-5 pt-4 flex flex-col gap-2.5">
              <button
                onClick={handleExportPDF}
                disabled={filtered.length === 0 || exporting}
                className={BOTON_PRINCIPAL}
              >
                {exporting ? "Un momento…" : "PDF para imprimir"}
              </button>
              <button
                onClick={handleExportExcel}
                disabled={filtered.length === 0 || exporting}
                className={BOTON_BORDE_ANCHO}
              >
                {exporting ? "Un momento…" : "Excel para el contador"}
              </button>
              {filtered.length === 0 && (
                <p className={`${TEXTO_2} text-center pt-1`}>
                  No hay donaciones en esas fechas.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
