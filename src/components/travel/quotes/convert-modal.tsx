"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Building2, Check, X, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelQuoteDto } from "@/server/travel/quotes";

export function ConvertQuoteModal({
  quote,
  onClose,
  onConverted,
}: {
  quote: TravelQuoteDto;
  onClose: () => void;
  onConverted: (updatedQuote: TravelQuoteDto, leadMoved: boolean) => void;
}) {
  const hotelOptions = quote.totals?.byHotel || [];
  const hasMultipleHotels = hotelOptions.length > 1;

  // Detección de opciones comparativas A, B, C
  const availableOptions = useMemo(() => {
    const isComparison =
      quote.isComparisonMode ||
      (quote.activeOptionsCount ?? 1) > 1 ||
      quote.days.some((d) =>
        d.items.some((it) => it.assignedOptions?.some((opt) => opt === "B" || opt === "C"))
      );

    if (!isComparison) return [];

    const keys: ("A" | "B" | "C")[] = ["A", "B", "C"];
    const max = quote.activeOptionsCount || 3;
    const list: { id: "A" | "B" | "C"; title: string; total: number }[] = [];

    for (let i = 0; i < max; i++) {
      const k = keys[i];
      if (!k) continue;
      const title = quote.optionTitles?.[k] || `Opción ${k}`;
      const optTotal = quote.totals?.options?.[k]?.total || 0;
      const hasSpecificItems = quote.days.some((d) =>
        d.items.some((it) => it.assignedOptions?.includes(k))
      );
      if (optTotal > 0 || hasSpecificItems || i === 0) {
        list.push({
          id: k,
          title,
          total: optTotal || quote.totals?.finalTotal || 0,
        });
      }
    }
    return list;
  }, [quote]);

  const hasMultipleOptions = availableOptions.length > 1;

  const [selectedOption, setSelectedOption] = useState<"A" | "B" | "C">(
    availableOptions[0]?.id || "A"
  );
  const [selectedHotelId, setSelectedHotelId] = useState<string>(
    quote.selectedHotelId || hotelOptions[0]?.hotelId || ""
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar hoteles disponibles según la opción elegida si aplica
  const visibleHotels = useMemo(() => {
    if (!hasMultipleOptions) return hotelOptions;
    // Si la opción seleccionada tiene hoteles específicos asignados
    const hotelsForOption = quote.days
      .flatMap((d) => d.items)
      .filter((it) => {
        if (it.type !== "Hotel") return false;
        if (!it.assignedOptions || it.assignedOptions.includes("Shared")) return true;
        return it.assignedOptions.includes(selectedOption);
      });

    if (hotelsForOption.length === 0) return hotelOptions;

    const ids = new Set(hotelsForOption.map((h) => h.id));
    const matched = hotelOptions.filter((h) => ids.has(h.hotelId));
    return matched.length > 0 ? matched : hotelOptions;
  }, [quote, selectedOption, hotelOptions, hasMultipleOptions]);

  async function handleConvert() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}/convert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes,
          selectedOption: hasMultipleOptions ? selectedOption : undefined,
          selectedHotelId: selectedHotelId || undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Error al convertir a reserva");
      }

      const data = (await res.json()) as { quote: TravelQuoteDto; leadMoved: boolean };
      onConverted(data.quote, data.leadMoved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Confirmar Reserva"
        className={`w-full ${
          hasMultipleOptions || hasMultipleHotels ? "max-w-xl" : "max-w-md"
        } rounded-2xl border bg-card p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-foreground">Confirmar como Reserva</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-3 hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-text-3 leading-relaxed">
          Al confirmar la cotización <strong>{quote.quoteNumber}</strong> para{" "}
          <strong>{quote.clientName}</strong>, se emitirá su número oficial de reserva
          (RES) y el prospecto pasará automáticamente a la etapa de cierre
          (&ldquo;Ganado&rdquo;) en tu embudo de ventas.
        </p>

        {/* 1. Selector de Opción Ganadora (A, B, C) */}
        {hasMultipleOptions && (
          <div className="space-y-2 p-3 rounded-xl bg-muted/20 border">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-brand" />
              <label className="text-xs font-bold text-foreground">
                Selecciona la opción aceptada por el cliente:
              </label>
            </div>
            <p className="text-[11px] text-text-3">
              El itinerario de la reserva conservará los servicios compartidos y ÚNICAMENTE los vuelos, tours y traslados asignados a la opción elegida.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {availableOptions.map((opt) => {
                const isSelected = selectedOption === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedOption(opt.id);
                      // Sincronizar hotel si aplica
                      const hotelsInOpt = quote.days
                        .flatMap((d) => d.items)
                        .filter(
                          (it) =>
                            it.type === "Hotel" &&
                            (it.assignedOptions?.includes(opt.id) || it.assignedOptions?.includes("Shared"))
                        );
                      if (hotelsInOpt[0]) {
                        setSelectedHotelId(hotelsInOpt[0].id);
                      }
                    }}
                    className={`flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-brand bg-brand-soft ring-1 ring-brand"
                        : "border-border bg-card hover:border-brand/40"
                    }`}
                  >
                    <div>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          isSelected ? "bg-brand text-brand-foreground" : "bg-muted text-text-3"
                        }`}
                      >
                        OPCIÓN {opt.id}
                      </span>
                      <p className="font-bold text-xs text-foreground mt-1 line-clamp-1">
                        {opt.title}
                      </p>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-border/50">
                      <span className="text-[9px] uppercase text-text-3 font-semibold block">
                        Valor Venta
                      </span>
                      <span className="font-extrabold text-xs text-brand">
                        {formatCurrency(opt.total, quote.currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Selector de Hotel Ganador */}
        {visibleHotels.length > 1 && (
          <div className="space-y-2 p-3 rounded-xl bg-muted/20 border">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <label className="text-xs font-bold text-foreground">
                Selecciona la opción de hotel elegida:
              </label>
            </div>
            <p className="text-[11px] text-text-3">
              Se conservará únicamente este alojamiento en la reserva y en los vouchers de servicio.
            </p>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {visibleHotels.map((opt, idx) => {
                const isSelected = selectedHotelId === opt.hotelId;
                return (
                  <button
                    key={opt.hotelId}
                    type="button"
                    onClick={() => setSelectedHotelId(opt.hotelId)}
                    className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                        : "border-border bg-card hover:border-emerald-500/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected ? "bg-emerald-500 text-white" : "bg-muted text-text-3"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-foreground truncate">
                          {opt.hotelTitle}
                        </p>
                        <p className="text-[10px] text-text-3">Alojamiento Confirmado</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[9px] uppercase font-bold text-text-3">Total</p>
                      <p className="font-bold text-xs text-foreground">
                        {formatCurrency(opt.total, quote.currency)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-2">
            Notas de confirmación / Códigos de proveedor (opcional)
          </label>
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Abono recibido por transferencia. Bloqueo confirmado con operador."
            className="text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={loading} className="text-xs">
            Cancelar
          </Button>
          <Button
            onClick={handleConvert}
            disabled={loading || (visibleHotels.length > 1 && !selectedHotelId)}
            className="text-xs font-bold bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm"
          >
            {loading ? "Confirmando…" : "Confirmar Reserva"}
          </Button>
        </div>
      </div>
    </div>
  );
}
