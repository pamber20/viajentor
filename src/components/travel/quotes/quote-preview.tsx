"use client";

import { useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle,
  Copy,
  FileText,
  MapPin,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import { formatCurrency } from "@/lib/travel/pricing";

export function QuotePreviewModal({
  quote,
  onClose,
  onConvert,
}: {
  quote: TravelQuoteDto;
  onClose: () => void;
  onConvert?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function generateWhatsAppSummary(): string {
    const lines = [
      `✈️ *PROPUESTA DE VIAJE - ${quote.destination.toUpperCase()}*`,
      `📄 Cotización: ${quote.quoteNumber}`,
      `👤 Pasajero principal: ${quote.clientName}`,
      `👥 Pasajeros: ${quote.passengers} ${quote.childPassengers ? `(+${quote.childPassengers} niños)` : ""}`,
      quote.startDate ? `📅 Fechas: ${quote.startDate} al ${quote.endDate ?? ""}` : "",
      quote.nights ? `🌙 Noches: ${quote.nights}` : "",
      "",
      `*RESUMEN DE ITINERARIO:*`,
    ];

    quote.days.forEach((d) => {
      lines.push(`*Día ${d.dayNumber}:*`);
      d.items.forEach((it) => {
        lines.push(`• [${it.type}] ${it.title}${it.description ? ` - ${it.description}` : ""}`);
      });
    });

    lines.push("");
    lines.push(`💰 *INVERSIÓN TOTAL:* ${formatCurrency(quote.totals.finalTotal, quote.currency)}`);
    lines.push(`💵 *Por persona:* ${formatCurrency(quote.totals.totalAdult, quote.currency)}`);
    if (quote.minimumDeposit > 0) {
      lines.push(`💳 *Abono inicial:* ${formatCurrency(quote.minimumDeposit, quote.currency)}`);
    }

    if (quote.inclusions) {
      lines.push("");
      lines.push(`*INCLUYE:*`);
      lines.push(quote.inclusions);
    }

    if (quote.exclusions) {
      lines.push("");
      lines.push(`*NO INCLUYE:*`);
      lines.push(quote.exclusions);
    }

    lines.push("");
    lines.push(`_Cotización sujeta a disponibilidad. Vigencia: ${quote.validityHours} horas._`);

    return lines.filter(Boolean).join("\n");
  }

  function handleCopy() {
    const text = generateWhatsAppSummary();
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Previsualización de Cotización"
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-soft p-2 text-brand">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-foreground">
                  Cotización {quote.quoteNumber}
                </h2>
                <Badge variant={quote.isBooking ? "default" : "secondary"}>
                  {quote.isBooking ? "Reserva" : quote.status}
                </Badge>
              </div>
              <p className="text-xs text-text-3">
                {quote.clientName} · Destino: {quote.destination}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copiar para WhatsApp
                </>
              )}
            </Button>
            {onConvert && !quote.isBooking && (
              <Button size="sm" onClick={onConvert}>
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Convertir a Reserva
              </Button>
            )}
            <button
              onClick={onClose}
              className="rounded p-1 text-text-3 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick info badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-text-3 block">Destino</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-4 w-4 text-brand shrink-0" />
                {quote.destination}
              </span>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-text-3 block">Duración</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-4 w-4 text-brand shrink-0" />
                {quote.nights} Noches ({quote.days.length} Días)
              </span>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <span className="text-[11px] font-medium text-text-3 block">Pasajeros</span>
              <span className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                <Users className="h-4 w-4 text-brand shrink-0" />
                {quote.passengers} Adultos {quote.childPassengers ? `+ ${quote.childPassengers} Men.` : ""}
              </span>
            </div>
            <div className="rounded-lg border bg-brand-soft/30 p-3 border-brand/20">
              <span className="text-[11px] font-medium text-brand-text block">Inversión Total</span>
              <span className="text-base font-extrabold text-brand mt-0.5 block truncate">
                {formatCurrency(quote.totals.finalTotal, quote.currency)}
              </span>
            </div>
          </div>

          {/* Itinerary Timeline */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              Itinerario Día por Día
            </h3>
            <div className="space-y-3">
              {quote.days.map((day) => (
                <div key={day.id} className="rounded-lg border bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-xs text-brand uppercase">
                      Día {day.dayNumber}
                    </span>
                    <span className="text-xs text-text-3">
                      {day.items.length} {day.items.length === 1 ? "servicio" : "servicios"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-3 text-xs rounded-md bg-muted/20 p-2.5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {item.title}
                            </span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {item.type}
                            </Badge>
                            {item.provider && (
                              <span className="text-[11px] text-text-3">
                                ({item.provider})
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-text-3">{item.description}</p>
                          )}
                          {item.flightDetails && (
                            <div className="text-[11px] text-text-2 bg-card rounded p-1.5 border mt-1">
                              ✈️ {item.flightDetails.airline} #{item.flightDetails.flightNumber} ({item.flightDetails.origin} ➔ {item.flightDetails.destination})
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-bold text-foreground">
                            {formatCurrency(item.totalPrice, quote.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
            <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">
              Resumen de Tarifas y Cuotas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-text-3 block">Subtotal Servicios:</span>
                <span className="font-semibold">{formatCurrency(quote.totals.subtotal, quote.currency)}</span>
              </div>
              {quote.totals.markupAmount > 0 && (
                <div>
                  <span className="text-text-3 block">Margen Comercial:</span>
                  <span className="font-semibold text-emerald-600">
                    +{formatCurrency(quote.totals.markupAmount, quote.currency)}
                  </span>
                </div>
              )}
              {quote.totals.taxAmount > 0 && (
                <div>
                  <span className="text-text-3 block">Impuestos / Tasas:</span>
                  <span className="font-semibold">+{formatCurrency(quote.totals.taxAmount, quote.currency)}</span>
                </div>
              )}
              <div>
                <span className="text-text-3 block">Total por Adulto:</span>
                <span className="font-bold text-foreground">
                  {formatCurrency(quote.totals.totalAdult, quote.currency)}
                </span>
              </div>
              {quote.childPassengers > 0 && (
                <div>
                  <span className="text-text-3 block">Total por Niño:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(quote.totals.totalChild, quote.currency)}
                  </span>
                </div>
              )}
              {quote.minimumDeposit > 0 && (
                <div>
                  <span className="text-text-3 block">Depósito Mínimo:</span>
                  <span className="font-bold text-brand">
                    {formatCurrency(quote.minimumDeposit, quote.currency)}
                  </span>
                </div>
              )}
            </div>

            {/* Amortization schedule */}
            {quote.amortizationSchedule && quote.amortizationSchedule.length > 0 && (
              <div className="pt-2 border-t">
                <span className="text-[11px] font-bold text-text-2 uppercase block mb-1.5">
                  Plan de Pagos / Amortización
                </span>
                <div className="space-y-1">
                  {quote.amortizationSchedule.map((inst, idx) => (
                    <div
                      key={inst.id}
                      className="flex items-center justify-between text-xs rounded bg-card px-2.5 py-1 border"
                    >
                      <span className="font-medium">
                        Cuota {idx + 1} {inst.code ? `(${inst.code})` : ""} · Vence: {inst.dueDate}
                      </span>
                      <span className="font-bold">
                        {formatCurrency(inst.amount, quote.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inclusions & Policies */}
          {(quote.inclusions || quote.exclusions || quote.policies) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {quote.inclusions && (
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <h4 className="font-bold text-emerald-600">INCLUYE</h4>
                  <p className="whitespace-pre-line text-text-2">{quote.inclusions}</p>
                </div>
              )}
              {quote.exclusions && (
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <h4 className="font-bold text-danger-text">NO INCLUYE</h4>
                  <p className="whitespace-pre-line text-text-2">{quote.exclusions}</p>
                </div>
              )}
              {quote.policies && (
                <div className="rounded-lg border bg-card p-3 space-y-1 sm:col-span-2">
                  <h4 className="font-bold text-foreground">POLÍTICAS Y CONDICIONES</h4>
                  <p className="whitespace-pre-line text-text-3">{quote.policies}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
