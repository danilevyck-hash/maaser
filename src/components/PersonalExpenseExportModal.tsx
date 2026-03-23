"use client";

import { useState, useMemo } from "react";
import { PersonalExpense, CATEGORY_COLORS } from "@/lib/supabase";
import { formatDate, formatDateExport, formatCurrency, MONTH_NAMES } from "@/lib/format";

type FilterPreset = "this_month" | "last_month" | "this_year" | "custom";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  expenses: PersonalExpense[];
};

export default function PersonalExpenseExportModal({ isOpen, onClose, expenses }: Props) {
  const [preset, setPreset] = useState<FilterPreset>("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const { thisMonthFrom, thisMonthTo, lastMonthFrom, lastMonthTo, currentYear, currentMonthIdx, lastMonthIdx } = useMemo(() => {
    const n = new Date();
    const lm = new Date(n.getFullYear(), n.getMonth() - 1, 1);
    const tmLastDay = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
    const lmLastDay = new Date(lm.getFullYear(), lm.getMonth() + 1, 0).getDate();
    return {
      thisMonthFrom: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`,
      thisMonthTo: `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(tmLastDay).padStart(2, "0")}`,
      lastMonthFrom: `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}-01`,
      lastMonthTo: `${lm.getFullYear()}-${String(lm.getMonth() + 1).padStart(2, "0")}-${String(lmLastDay).padStart(2, "0")}`,
      currentYear: n.getFullYear(),
      currentMonthIdx: n.getMonth(),
      lastMonthIdx: lm.getMonth(),
    };
  }, []);

  const { dateFrom, dateTo, rangeLabel } = useMemo(() => {
    switch (preset) {
      case "this_month":
        return {
          dateFrom: thisMonthFrom,
          dateTo: thisMonthTo,
          rangeLabel: `${MONTH_NAMES[currentMonthIdx]} ${currentYear}`,
        };
      case "last_month":
        return {
          dateFrom: lastMonthFrom,
          dateTo: lastMonthTo,
          rangeLabel: `${MONTH_NAMES[lastMonthIdx]} ${currentYear}`,
        };
      case "this_year":
        return {
          dateFrom: `${currentYear}-01-01`,
          dateTo: `${currentYear}-12-31`,
          rangeLabel: `Año ${currentYear}`,
        };
      case "custom":
        return {
          dateFrom: customFrom,
          dateTo: customTo,
          rangeLabel: customFrom || customTo
            ? `${customFrom ? formatDate(customFrom) : "Inicio"} — ${customTo ? formatDate(customTo) : "Fin"}`
            : "Seleccione fechas",
        };
    }
  }, [preset, customFrom, customTo, thisMonthFrom, thisMonthTo, lastMonthFrom, lastMonthTo, currentYear, currentMonthIdx, lastMonthIdx]);

  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [expenses, dateFrom, dateTo]);

  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  if (!isOpen) return null;

  const presets: { key: FilterPreset; label: string }[] = [
    { key: "this_month", label: "Este mes" },
    { key: "last_month", label: "Mes anterior" },
    { key: "this_year", label: `Año ${currentYear}` },
    { key: "custom", label: "Personalizado" },
  ];

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Gastos");

      sheet.columns = [
        { header: "#", key: "num", width: 6 },
        { header: "Fecha", key: "date", width: 16 },
        { header: "Monto", key: "amount", width: 14 },
        { header: "Categoría", key: "category", width: 18 },
        { header: "Subcategoría", key: "subcategory", width: 20 },
        { header: "Método", key: "method", width: 18 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A3A5C" },
      };
      headerRow.alignment = { horizontal: "center" };

      filtered.forEach((e, i) => {
        sheet.addRow({
          num: i + 1,
          date: formatDateExport(e.date),
          amount: e.amount,
          category: e.category,
          subcategory: e.subcategory || "",
          method: e.payment_method,
        });
      });

      sheet.getColumn("amount").numFmt = "$#,##0.00";

      // Category summary sheet
      const summarySheet = workbook.addWorksheet("Resumen por Categoría");
      summarySheet.columns = [
        { header: "Categoría", key: "category", width: 20 },
        { header: "Total", key: "total", width: 14 },
        { header: "%", key: "pct", width: 10 },
      ];
      const summaryHeader = summarySheet.getRow(1);
      summaryHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
      summaryHeader.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1A3A5C" },
      };
      summaryHeader.alignment = { horizontal: "center" };

      const catMap: Record<string, number> = {};
      filtered.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
      Object.entries(catMap)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, total]) => {
          summarySheet.addRow({
            category: cat,
            total,
            pct: totalAmount > 0 ? `${((total / totalAmount) * 100).toFixed(1)}%` : "0%",
          });
        });
      summarySheet.getColumn("total").numFmt = "$#,##0.00";

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gastos_${dateFrom || "inicio"}_${dateTo || "fin"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.setTextColor(26, 58, 92);
      doc.text("MiFinanzas", 105, 20, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(rangeLabel, 105, 28, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(201, 168, 76);
      doc.text(`Total: ${formatCurrency(totalAmount)}`, 105, 36, { align: "center" });

      const tableData = filtered.map((e, i) => [
        i + 1,
        formatDateExport(e.date),
        formatCurrency(e.amount),
        e.category,
        e.subcategory || "",
        e.payment_method,
      ]);

      autoTable(doc, {
        startY: 42,
        head: [["#", "Fecha", "Monto", "Categoría", "Subcategoría", "Método"]],
        body: tableData,
        headStyles: {
          fillColor: [26, 58, 92],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 24 },
          2: { halign: "right", cellWidth: 22 },
          3: { cellWidth: 28 },
          4: { cellWidth: 30 },
          5: { cellWidth: 28 },
        },
        alternateRowStyles: { fillColor: [245, 240, 232] },
        styles: { fontSize: 8, cellPadding: 3 },
        didDrawPage: (data) => {
          if (data.pageNumber === 1) {
            doc.setDrawColor(201, 168, 76);
            doc.setLineWidth(0.5);
            doc.line(14, 39, 196, 39);
          }
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${data.pageNumber}`,
            105,
            doc.internal.pageSize.height - 10,
            { align: "center" }
          );
        },
      });

      // Category summary on new page
      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(26, 58, 92);
      doc.text("Resumen por Categoría", 105, 20, { align: "center" });

      const catMap2: Record<string, number> = {};
      filtered.forEach((e) => { catMap2[e.category] = (catMap2[e.category] || 0) + e.amount; });
      const catRows = Object.entries(catMap2)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, total]) => [
          cat,
          formatCurrency(total),
          totalAmount > 0 ? `${((total / totalAmount) * 100).toFixed(1)}%` : "0%",
        ]);

      autoTable(doc, {
        startY: 28,
        head: [["Categoría", "Total", "%"]],
        body: catRows,
        headStyles: {
          fillColor: [26, 58, 92],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          halign: "center",
        },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { halign: "right", cellWidth: 40 },
          2: { halign: "center", cellWidth: 30 },
        },
        alternateRowStyles: { fillColor: [245, 240, 232] },
        styles: { fontSize: 9, cellPadding: 4 },
      });

      doc.save(`gastos_${dateFrom || "inicio"}_${dateTo || "fin"}.pdf`);
      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="bg-navy text-white p-4 rounded-t-xl">
          <h2 className="text-lg font-bold">Exportar Gastos</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors border-2 ${
                  preset === p.key
                    ? "border-gold bg-gold/10 text-navy"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Desde</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy mb-1">Hasta</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-gold focus:border-gold outline-none text-sm"
                />
              </div>
            </div>
          )}

          <div className="bg-cream/50 rounded-lg p-3 text-center space-y-1">
            <p className="text-xs text-gray-500">{rangeLabel}</p>
            <p className="text-navy font-medium">
              {filtered.length} gasto{filtered.length !== 1 ? "s" : ""} a exportar
            </p>
            <p className="text-sm text-gray-500">
              Total: {formatCurrency(totalAmount)}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExportExcel}
              disabled={filtered.length === 0 || exporting}
              className="flex-1 bg-gold hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
            >
              {exporting ? "..." : "Excel"}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={filtered.length === 0 || exporting}
              className="flex-1 bg-navy hover:bg-navy/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
            >
              {exporting ? "..." : "PDF"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 rounded-lg transition-colors text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
