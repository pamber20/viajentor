"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Eye, MapPin, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import { QuoteBuilder } from "./quote-builder";
import { QuotePreviewModal } from "./quote-preview";
import { ConvertQuoteModal } from "./convert-modal";

export function ContactQuotesWidget({
  contactId,
  leadId,
  clientName,
  clientPhone,
}: {
  contactId: string;
  leadId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
}) {
  const [quotes, setQuotes] = useState<TravelQuoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<TravelQuoteDto | null>(null);
  const [convertQuote, setConvertQuote] = useState<TravelQuoteDto | null>(null);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/travel/quotes?contactId=${contactId}`);
      if (!res.ok) return;
      const data = (await res.json()) as { quotes: TravelQuoteDto[] };
      setQuotes(data.quotes);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="kicker">Cotizaciones y Viajes</span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[11px]"
          onClick={() => setBuilderOpen(true)}
        >
          <Plus className="mr-1 h-3 w-3" />
          Cotizar viaje
        </Button>
      </div>

      {loading ? (
        <p className="text-[11px] text-text-3">Cargando cotizaciones…</p>
      ) : quotes.length === 0 ? (
        <p className="text-[12px] text-text-3 italic">
          Sin cotizaciones registradas para este contacto.
        </p>
      ) : (
        <div className="space-y-1.5">
          {quotes.slice(0, 5).map((q) => (
            <div
              key={q.id}
              className="flex items-center justify-between rounded-lg border bg-card p-2 text-xs shadow-2xs hover:border-brand/40 transition"
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10.5px] font-bold text-brand">
                    {q.isBooking ? q.bookingNumber ?? q.quoteNumber : q.quoteNumber}
                  </span>
                  <Badge
                    variant={q.isBooking ? "default" : "outline"}
                    className="text-[9.5px] py-0 px-1"
                  >
                    {q.isBooking ? "Reserva" : q.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-text-2 mt-0.5 truncate">
                  <MapPin className="h-3 w-3 text-brand shrink-0" />
                  <span className="truncate">{q.destination}</span>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-1.5">
                <span className="font-bold text-[11px] text-foreground">
                  {formatCurrency(q.totals.finalTotal, q.currency)}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewQuote(q)}
                  className="rounded p-1 text-text-3 hover:text-foreground"
                  title="Ver detalle"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {!q.isBooking && (
                  <button
                    type="button"
                    onClick={() => setConvertQuote(q)}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-500/10"
                    title="Confirmar reserva"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {builderOpen && (
        <QuoteBuilder
          contactId={contactId}
          leadId={leadId}
          clientName={clientName}
          clientPhone={clientPhone}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            void loadQuotes();
            setBuilderOpen(false);
          }}
        />
      )}

      {previewQuote && (
        <QuotePreviewModal
          quote={previewQuote}
          onClose={() => setPreviewQuote(null)}
          onConvert={() => {
            const q = previewQuote;
            setPreviewQuote(null);
            setConvertQuote(q);
          }}
        />
      )}

      {convertQuote && (
        <ConvertQuoteModal
          quote={convertQuote}
          onClose={() => setConvertQuote(null)}
          onConverted={() => {
            void loadQuotes();
            setConvertQuote(null);
          }}
        />
      )}
    </div>
  );
}
