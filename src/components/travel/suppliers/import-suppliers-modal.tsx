"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TravelSupplierType } from "@/lib/travel/types";

interface ImportSuppliersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}

interface ParsedSupplierRow {
  id: string;
  name: string;
  type: TravelSupplierType;
  operatingCities: string[];
  hotelAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  commission?: number;
  isValid: boolean;
  error?: string;
}

export function ImportSuppliersModal({
  isOpen,
  onClose,
  onImported,
}: ImportSuppliersModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedRows, setParsedRows] = useState<ParsedSupplierRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setParsedRows([]);
    setFileName("");
    setIsImporting(false);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleModalClose = () => {
    if (isImporting) return;
    resetState();
    onClose();
  };

  const normalizeType = (raw: string): TravelSupplierType => {
    const val = (raw || "").toLowerCase().trim();
    if (
      val.includes("hotel") ||
      val.includes("hospedaje") ||
      val.includes("alojamiento") ||
      val.includes("resort")
    )
      return "hotel";
    if (
      val.includes("aerolinea") ||
      val.includes("airline") ||
      val.includes("vuelo") ||
      val.includes("avion")
    )
      return "airline";
    if (
      val.includes("operador") ||
      val.includes("operator") ||
      val.includes("mayorista") ||
      val.includes("tour") ||
      val.includes("agencia")
    )
      return "operator";
    if (
      val.includes("transporte") ||
      val.includes("transport") ||
      val.includes("traslado") ||
      val.includes("transfer")
    )
      return "transport";
    if (
      val.includes("asistencia") ||
      val.includes("seguro") ||
      val.includes("insurance") ||
      val.includes("medica")
    )
      return "insurance";
    return "other";
  };

  // Parser para líneas CSV respetando comillas
  const parseCSVLine = (line: string, delimiter = ","): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(cur.trim().replace(/^["']|["']$/g, ""));
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  const processFileContent = (content: string) => {
    setErrorMessage(null);
    const lines = content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0 || !lines[0]) {
      setErrorMessage("El archivo está vacío o no contiene filas.");
      return;
    }

    // Detectar delimitador (, o ; o \t)
    const firstLine = lines[0];
    let delimiter = ",";
    if (firstLine.includes("\t")) delimiter = "\t";
    else if (firstLine.includes(";")) delimiter = ";";

    const header = parseCSVLine(firstLine, delimiter).map((h) =>
      h.toLowerCase().trim()
    );

    // Identificar índices de columnas
    const nameIdx = header.findIndex(
      (h) => h.includes("nombre") || h.includes("name") || h.includes("proveedor")
    );
    const typeIdx = header.findIndex(
      (h) => h.includes("tipo") || h.includes("type") || h.includes("categoria")
    );
    const citiesIdx = header.findIndex(
      (h) =>
        h.includes("ciudad") ||
        h.includes("ciudades") ||
        h.includes("destinos") ||
        h.includes("city")
    );
    const addressIdx = header.findIndex(
      (h) => h.includes("direccion") || h.includes("address") || h.includes("ubicacion")
    );
    const emailIdx = header.findIndex(
      (h) => h.includes("email") || h.includes("correo")
    );
    const phoneIdx = header.findIndex(
      (h) => h.includes("telefono") || h.includes("phone") || h.includes("celular")
    );
    const commissionIdx = header.findIndex(
      (h) => h.includes("comision") || h.includes("commission")
    );

    if (nameIdx === -1) {
      setErrorMessage(
        "No se encontró la columna de 'Nombre' del proveedor en los encabezados."
      );
      return;
    }

    const rows: ParsedSupplierRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const cols = parseCSVLine(line, delimiter);
      const name = (cols[nameIdx] || "").trim();
      const rawType = typeIdx !== -1 ? cols[typeIdx] : "";
      const rawCities = citiesIdx !== -1 ? cols[citiesIdx] : "";
      const hotelAddress = addressIdx !== -1 ? cols[addressIdx]?.trim() : undefined;
      const contactEmail = emailIdx !== -1 ? cols[emailIdx]?.trim() : undefined;
      const contactPhone = phoneIdx !== -1 ? cols[phoneIdx]?.trim() : undefined;
      const rawCommission = commissionIdx !== -1 ? cols[commissionIdx]?.trim() : "";

      let isValid = true;
      let error = "";

      if (!name) {
        isValid = false;
        error = "Nombre requerido";
      }

      // Separar ciudades operativas por coma, pleca o guion
      const operatingCities = rawCities
        ? rawCities
            .split(/[,|;/]/)
            .map((c) => c.trim())
            .filter((c) => c.length > 0)
        : [];

      const commission = rawCommission ? Number(rawCommission.replace("%", "").trim()) : undefined;

      rows.push({
        id: `row-${i}-${Date.now()}`,
        name,
        type: normalizeType(rawType ?? ""),
        operatingCities,
        hotelAddress: hotelAddress || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        commission: commission !== undefined && !isNaN(commission) ? commission : undefined,
        isValid,
        error,
      });
    }

    if (rows.length === 0) {
      setErrorMessage("No se encontraron registros de datos válidos.");
      return;
    }

    setParsedRows(rows);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        processFileContent(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadTemplate = () => {
    const csvContent =
      "Nombre,Tipo,Ciudades Operativas,Dirección Hotel,Correo Contacto,Teléfono,Comisión %\n" +
      '"Hotel Riu Cancún","Hotel","Cancún, Riviera Maya","Blvd. Kukulcan Km 9","ventas@riu.com","+52 998 848 7150","12"\n' +
      '"Avianca","Aerolínea","Bogotá, Medellín, Cali, Cartagena","Aeropuerto El Dorado","agencias@avianca.com","+57 300 000 0000","5"\n' +
      '"Nautica Tours San Andrés","Operador Turístico","San Andrés","Avenida Providencia #4-20","reservas@nauticatours.com","+57 311 000 0000","15"\n' +
      '"Transportes del Caribe","Transporte","Cartagena, Santa Marta, Barranquilla","Muelle de La Bodeguita","contacto@transdelcaribe.com","+57 320 000 0000","10"\n' +
      '"Assist Card","Asistencia Médica","Nacional, Internacional","Carrera 11 # 82-01","corporativo@assistcard.com","+57 601 000 0000","20"';

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "plantilla_proveedores_viajentor.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setErrorMessage(null);

    const payload = {
      suppliers: validRows.map((row) => ({
        name: row.name,
        type: row.type,
        operatingCities: row.operatingCities.length > 0 ? row.operatingCities : null,
        contact: {
          email: row.contactEmail || undefined,
          phone: row.contactPhone || undefined,
        },
        commission: row.commission ?? null,
        hotelMeta:
          row.type === "hotel" && row.hotelAddress
            ? {
                hotelAddress: row.hotelAddress,
                hotelPhone: row.contactPhone || undefined,
              }
            : null,
      })),
    };

    try {
      const res = await fetch("/api/travel/suppliers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al procesar la importación");
      }

      const data = await res.json();
      onImported(data.count || validRows.length);
      handleModalClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-3xl rounded-2xl bg-card border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Importación Masiva de Proveedores
              </h3>
              <p className="text-xs text-text-3">
                Sube tu catálogo de aliados en archivo CSV, TSV o Excel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-text-3 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              {/* Zona de Drop / Carga de Archivo */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-brand/50 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all hover:bg-muted/30 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand/10 text-brand flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Haz clic para seleccionar tu archivo CSV o arrástralo aquí
                  </p>
                  <p className="text-xs text-text-3 mt-0.5">
                    Formatos soportados: .csv, .tsv o exportaciones de Excel
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                />
              </div>

              {/* Botón de Plantilla */}
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                <div className="text-xs">
                  <span className="font-semibold text-foreground block">
                    ¿No tienes el formato listo?
                  </span>
                  <span className="text-text-3">
                    Descarga nuestra plantilla de ejemplo con las columnas necesarias
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  className="gap-2 text-xs font-semibold shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Descargar Plantilla CSV
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Resumen del archivo */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand" />
                  <span className="font-bold text-foreground truncate max-w-xs">
                    {fileName}
                  </span>
                  <span className="text-text-3">({parsedRows.length} filas detectadas)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validCount} válidos
                  </span>
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 font-semibold text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {invalidCount} con errores
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetState}
                    className="text-text-3 hover:text-red-600 h-7 px-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Tabla de Previsualización */}
              <div className="border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-muted/60 text-text-2 font-bold sticky top-0 border-b">
                    <tr>
                      <th className="p-2.5">Nombre</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5">Ciudades Operativas</th>
                      <th className="p-2.5">Comisión</th>
                      <th className="p-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedRows.map((r) => (
                      <tr
                        key={r.id}
                        className={!r.isValid ? "bg-red-500/5 text-red-700 dark:text-red-300" : ""}
                      >
                        <td className="p-2.5 font-semibold">{r.name || "(Sin nombre)"}</td>
                        <td className="p-2.5 capitalize">{r.type}</td>
                        <td className="p-2.5 text-text-3">
                          {r.operatingCities.length > 0
                            ? r.operatingCities.join(", ")
                            : "Todas"}
                        </td>
                        <td className="p-2.5">{r.commission ? `${r.commission}%` : "-"}</td>
                        <td className="p-2.5 text-center">
                          {r.isValid ? (
                            <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                              ✓
                            </span>
                          ) : (
                            <span className="text-red-500 font-semibold text-[11px]" title={r.error}>
                              ✕ {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
          <Button
            type="button"
            variant="outline"
            onClick={handleModalClose}
            disabled={isImporting}
          >
            Cancelar
          </Button>

          {parsedRows.length > 0 && (
            <Button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || validCount === 0}
              className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90 font-bold"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar e Importar {validCount} Proveedores
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
