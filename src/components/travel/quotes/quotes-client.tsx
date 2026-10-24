"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Edit2,
  Eye,
  FileDown,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import { QuoteBuilder } from "./quote-builder";
import { QuotePreviewModal } from "./quote-preview";
import { ConvertQuoteModal } from "./convert-modal";
import { downloadQuotePdf } from "@/components/travel/pdf";

const DEFAULT_STATUS_CONFIG = { label: "Borrador", color: "bg-muted text-text-3 border-border" };

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  draft: DEFAULT_STATUS_CONFIG,
  sent: { label: "Enviada", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  viewed: { label: "Vista", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  accepted: { label: "Aceptada / Ganada", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  rejected: { label: "Rechazada", color: "bg-danger-tint text-danger-text border-danger-soft" },
  expired: { label: "Vencida", color: "bg-warning-tint text-warning-text border-warning-soft" },
  completed: { label: "Completada", color: "bg-brand-soft text-brand-text border-brand/20" },
};

export function QuotesClient({
  contactId,
  leadId,
}: {
  contactId?: string;
  leadId?: string;
}) {
  const [quotes, setQuotes] = useState<TravelQuoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<TravelQuoteDto | null>(null);
  const [previewingQuote, setPreviewingQuote] = useState<TravelQuoteDto | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<TravelQuoteDto | null>(null);
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);

  async function handleDownloadPdf(q: TravelQuoteDto) {
    try {
      setDownloadingQuoteId(q.id);
      await downloadQuotePdf(q);
    } catch (err) {
      console.error("Error al descargar PDF:", err);
      alert("Hubo un error al generar el PDF de la cotización.");
    } finally {
      setDownloadingQuoteId(null);
    }
  }

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ isBooking: "false" });
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (contactId) params.set("contactId", contactId);
    if (leadId) params.set("leadId", leadId);

    try {
      const res = await fetch(`/api/travel/quotes?${params}`);
      if (!res.ok) throw new Error("Error al obtener cotizaciones");
      const data = (await res.json()) as { quotes: TravelQuoteDto[] };
      setQuotes(data.quotes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, contactId, leadId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchQuotes();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchQuotes]);

  async function handleDelete(id: string) {
    if (!window.confirm("¿Seguro que deseas eliminar esta cotización?")) return;
    try {
      const res = await fetch(`/api/travel/quotes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-bold tracking-tight">Cotizaciones Turísticas</h1>
            <Badge variant="outline" className="text-xs">
              {quotes.length} {quotes.length === 1 ? "propuesta" : "propuestas"}
            </Badge>
          </div>
          <p className="text-xs text-text-3 mt-0.5">
            Generador comercial de itinerarios día a día, márgenes de ganancia y propuestas de viaje.
          </p>
        </div>

        <Button onClick={() => setBuilderOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Nueva Cotización
        </Button>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, destino o código..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "draft", label: "Borradores" },
            { id: "sent", label: "Enviadas" },
            { id: "accepted", label: "Aceptadas" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                statusFilter === st.id
                  ? "bg-brand text-brand-fg font-semibold shadow-xs"
                  : "bg-card text-text-2 border hover:bg-accent"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-text-3">
            Cargando cotizaciones...
          </div>
        ) : quotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No hay cotizaciones registradas"
            description="Crea tu primera cotización turística con cálculo de márgenes y sugerencias de IA."
            action={
              <Button onClick={() => setBuilderOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Crear primera cotización
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quotes.map((q) => {
              const statusCfg = STATUS_CONFIG[q.status] ?? DEFAULT_STATUS_CONFIG;

              return (
                <div
                  key={q.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-brand">
                          {q.quoteNumber}
                        </span>
                        <h3 className="font-bold text-sm text-foreground mt-0.5">
                          {q.clientName}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold border ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Destination and dates */}
                    <div className="rounded-lg bg-muted/30 p-2.5 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-text-2">
                        <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                        <span className="truncate">{q.destination}</span>
                      </div>
                      <div className="flex items-center gap-3 text-text-3 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {q.nights} noches ({q.days.length} días)
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 shrink-0" />
                          {q.passengers} adultos
                        </span>
                      </div>
                    </div>

                    {/* Price banner */}
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-[11px] text-text-3 font-medium">Inversión total:</span>
                      <span className="text-base font-extrabold text-foreground">
                        {formatCurrency(q.totals.finalTotal, q.currency)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-1.5 pt-3 mt-3 border-t">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setPreviewingQuote(q)}
                        className="h-8 px-2 text-xs"
                        title="Ver detalle"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingQuoteId === q.id}
                        onClick={() => void handleDownloadPdf(q)}
                        className="h-8 px-2 text-xs text-brand hover:bg-brand-soft disabled:opacity-60"
                        title="Descargar PDF"
                      >
                        {downloadingQuoteId === q.id ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <FileDown className="h-3.5 w-3.5 mr-1" />
                        )}
                        {downloadingQuoteId === q.id ? "..." : "PDF"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingQuote(q);
                          setBuilderOpen(true);
                        }}
                        className="h-8 px-2 text-xs"
                        title="Editar"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setConvertingQuote(q)}
                        className="h-8 px-2 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        title="Confirmar como reserva"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Reservar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(q.id)}
                        className="h-8 px-2 text-xs text-danger-text hover:bg-danger-tint"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {builderOpen && (
        <QuoteBuilder
          initialQuote={editingQuote}
          contactId={contactId}
          leadId={leadId}
          onClose={() => {
            setBuilderOpen(false);
            setEditingQuote(null);
          }}
          onSaved={(saved) => {
            setQuotes((prev) => {
              const exists = prev.some((x) => x.id === saved.id);
              if (exists) {
                return prev.map((x) => (x.id === saved.id ? saved : x));
              }
              return [saved, ...prev];
            });
            setBuilderOpen(false);
            setEditingQuote(null);
          }}
        />
      )}

      {previewingQuote && (
        <QuotePreviewModal
          quote={previewingQuote}
          onClose={() => setPreviewingQuote(null)}
          onConvert={() => {
            const q = previewingQuote;
            setPreviewingQuote(null);
            setConvertingQuote(q);
          }}
        />
      )}

      {convertingQuote && (
        <ConvertQuoteModal
          quote={convertingQuote}
          onClose={() => setConvertingQuote(null)}
          onConverted={(updated, leadMoved) => {
            setQuotes((prev) => prev.filter((x) => x.id !== updated.id));
            setConvertingQuote(null);
            alert(
              `¡Reserva ${updated.bookingNumber} confirmada con éxito!${
                leadMoved ? " El lead fue actualizado en el Pipeline a Ganado." : ""
              }`
            );
          }}
        />
      )}
    </div>
  );
}
