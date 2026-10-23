"use client";

import { useState } from "react";
import { CheckCircle2, Building2, Check, X } from "lucide-react";
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

  const [selectedHotelId, setSelectedHotelId] = useState<string>(
    quote.selectedHotelId || hotelOptions[0]?.hotelId || ""
  );
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}/convert`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes,
          selectedHotelId: hasMultipleHotels ? selectedHotelId : undefined,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Confirmar Reserva"
        className={`w-full ${hasMultipleHotels ? "max-w-xl" : "max-w-md"} rounded-xl border bg-card p-5 shadow-xl space-y-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-foreground">Confirmar como Reserva</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-3 hover:text-foreground"
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

        {hasMultipleHotels && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-2 block">
              Selecciona la opción de hotel elegida por el cliente:
            </label>
            <p className="text-[11px] text-text-3">
              Esta cotización tiene {hotelOptions.length} opciones de hotel. El itinerario y el valor de la reserva conservarán los servicios compartidos y ÚNICAMENTE el hotel seleccionado.
            </p>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {hotelOptions.map((opt, idx) => {
                const isSelected = selectedHotelId === opt.hotelId;
                return (
                  <button
                    key={opt.hotelId}
                    type="button"
                    onClick={() => setSelectedHotelId(opt.hotelId)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                        : "border-border bg-card/50 hover:border-text-3/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-text-3"
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-text-3 shrink-0" />
                          <p className="font-semibold text-xs text-foreground truncate">
                            {opt.hotelTitle}
                          </p>
                        </div>
                        <p className="text-[10px] text-text-3">Opción de Alojamiento</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[9px] uppercase font-bold text-text-3">Total Opción</p>
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
          <div className="rounded-md border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-2">
            Notas de confirmación / Códigos de proveedor (opcional)
          </label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Abono de $500,000 recibido por Bancolombia. Bloqueo en hotel #HL482."
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleConvert} disabled={loading || (hasMultipleHotels && !selectedHotelId)}>
            {loading ? "Confirmando…" : "Confirmar Reserva"}
          </Button>
        </div>
      </div>
    </div>
  );
}
