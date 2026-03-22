"use client";

import { useState, useRef } from "react";
import { formatDate } from "@/lib/format";

type ImportRow = {
  receipt_number: number;
  date: string;
  beneficiary: string;
  amount: number;
  status: "valido" | "anulado";
  notes?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
};

export default function ImportModal({ isOpen, onClose, onImported }: Props) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: number } | null>(null);
  const [parseError, setParseError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Plantilla");

    sheet.columns = [
      { header: "Recibo No.", key: "receipt", width: 12 },
      { header: "Fecha (DD/MM/YYYY)", key: "date", width: 18 },
      { header: "Beneficiario", key: "beneficiary", width: 28 },
      { header: "Monto", key: "amount", width: 14 },
      { header: "Estado (valido/anulado)", key: "status", width: 22 },
      { header: "Notas", key: "notes", width: 30 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1A3A5C" },
    };

    sheet.addRow({ receipt: 2700, date: "15/01/2026", beneficiary: "Ejemplo", amount: 100, status: "valido", notes: "Nota ejemplo" });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_donaciones.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseDate = (val: unknown): string | null => {
    if (!val) return null;
    const str = String(val).trim();
    // DD/MM/YYYY
    const match = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Excel serial date number
    if (!isNaN(Number(val))) {
      const serial = Number(val);
      if (serial > 40000 && serial < 60000) {
        const utc = new Date(Date.UTC(1899, 11, 30 + serial));
        return utc.toISOString().split("T")[0];
      }
    }
    return null;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setResult(null);

    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        setParseError("El archivo no contiene hojas.");
        return;
      }

      const parsed: ImportRow[] = [];
      const errors: string[] = [];

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const vals = row.values as unknown[];
        // ExcelJS row.values is 1-indexed, so vals[0] is empty
        const receipt = Number(vals[1]);
        const dateVal = parseDate(vals[2]);
        const beneficiary = String(vals[3] || "").trim();
        const amount = Number(vals[4]);
        const statusRaw = String(vals[5] || "").trim().toLowerCase();
        const notes = String(vals[6] || "").trim();

        if (!receipt || !dateVal || !beneficiary || isNaN(amount)) {
          errors.push(`Fila ${rowNumber}: datos incompletos o inválidos`);
          return;
        }

        const status = statusRaw === "anulado" ? "anulado" : "valido";
        parsed.push({
          receipt_number: receipt,
          date: dateVal,
          beneficiary,
          amount,
          status,
          notes: notes || undefined,
        });
      });

      if (errors.length > 0) {
        setParseError(errors.join("\n"));
      }
      setRows(parsed);
    } catch {
      setParseError("Error al leer el archivo. Verifique que sea un archivo .xlsx válido.");
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await fetch("/api/donations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult({ success: data.success || 0, errors: data.errors || 0 });
      if (data.success > 0) {
        onImported();
      }
    } catch {
      setResult({ success: 0, errors: rows.length });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setRows([]);
    setResult(null);
    setParseError("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="bg-navy text-white p-4 rounded-t-xl flex-shrink-0">
          <h2 className="text-lg font-bold">Importar Donaciones</h2>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {!result && (
            <>
              <button
                onClick={downloadTemplate}
                className="w-full border-2 border-dashed border-gold text-gold hover:bg-gold/10 font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Descargar Plantilla Excel
              </button>

              <div>
                <label className="block text-sm font-medium text-navy mb-1">Subir archivo</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFile}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-navy file:text-white file:font-medium file:cursor-pointer hover:file:bg-navy/90"
                />
              </div>

              {parseError && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg whitespace-pre-line">
                  {parseError}
                </div>
              )}

              {rows.length > 0 && (
                <>
                  <div className="bg-cream/50 rounded-lg p-3 text-center">
                    <p className="text-navy font-medium">
                      {rows.length} fila{rows.length !== 1 ? "s" : ""} encontrada{rows.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="overflow-x-auto border rounded-lg max-h-48">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-100 sticky top-0">
                          <th className="px-2 py-1.5 text-left">Recibo</th>
                          <th className="px-2 py-1.5 text-left">Fecha</th>
                          <th className="px-2 py-1.5 text-left">Beneficiario</th>
                          <th className="px-2 py-1.5 text-right">Monto</th>
                          <th className="px-2 py-1.5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-2 py-1">{r.receipt_number}</td>
                            <td className="px-2 py-1">{formatDate(r.date)}</td>
                            <td className="px-2 py-1">{r.beneficiary}</td>
                            <td className="px-2 py-1 text-right">${r.amount.toFixed(2)}</td>
                            <td className="px-2 py-1 text-center">{r.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {result && (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">{result.errors === 0 ? "\u2705" : "\u26A0\uFE0F"}</div>
              <p className="text-navy font-bold text-lg">Importación completada</p>
              <div className="flex justify-center gap-6 text-sm">
                <span className="text-green-600 font-medium">{result.success} exitosa{result.success !== 1 ? "s" : ""}</span>
                {result.errors > 0 && (
                  <span className="text-red-500 font-medium">{result.errors} error{result.errors !== 1 ? "es" : ""}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!result && rows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex-1 bg-gold hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                {importing ? "Importando..." : "Confirmar Importación"}
              </button>
            )}
            {result && (
              <button
                onClick={reset}
                className="flex-1 bg-gold hover:bg-yellow-600 text-white font-bold py-2.5 rounded-lg transition-colors"
              >
                Importar Más
              </button>
            )}
            <button
              onClick={() => { reset(); onClose(); }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2.5 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
