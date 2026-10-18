"use client";

import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
        body: JSON.stringify({ notes }),
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
        className="w-full max-w-md rounded-xl border bg-card p-5 shadow-xl space-y-4"
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
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? "Confirmando…" : "Confirmar Reserva"}
          </Button>
        </div>
      </div>
    </div>
  );
}
