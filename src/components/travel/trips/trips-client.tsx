"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  MapPin,
  Plane,
  Search,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import { TripDrawer } from "./trip-drawer";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: { label: "Pendiente", color: "bg-warning-tint text-warning-text border-warning-soft" },
  confirmed: { label: "Confirmada", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  emitted: { label: "Emitida", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  operating: { label: "En Operación", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  completed: { label: "Completada", color: "bg-brand-soft text-brand-text border-brand/20" },
  cancelled: { label: "Cancelada", color: "bg-danger-tint text-danger-text border-danger-soft" },
};

const DEFAULT_STATUS = { label: "Confirmada", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" };

export function TripsClient({
  contactId,
  leadId,
}: {
  contactId?: string;
  leadId?: string;
}) {
  const [trips, setTrips] = useState<TravelQuoteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTrip, setSelectedTrip] = useState<TravelQuoteDto | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ isBooking: "true" });
    if (query.trim()) params.set("q", query.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (contactId) params.set("contactId", contactId);
    if (leadId) params.set("leadId", leadId);

    try {
      const res = await fetch(`/api/travel/quotes?${params}`);
      if (!res.ok) throw new Error("Error al obtener reservas");
      const data = (await res.json()) as { quotes: TravelQuoteDto[] };
      setTrips(data.quotes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, contactId, leadId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTrips();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTrips]);

  const totalValue = trips.reduce((sum, t) => sum + t.totals.finalTotal, 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-bold tracking-tight">Viajes y Reservas Activas</h1>
            <Badge variant="outline" className="text-xs">
              {trips.length} {trips.length === 1 ? "reserva" : "reservas"}
            </Badge>
          </div>
          <p className="text-xs text-text-3 mt-0.5">
            Gestión operativa, cronograma de amortización, control de abonos, manifiesto de pasajeros y vouchers.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-text-3 block">Cartera total en viajes</span>
          <span className="text-base font-extrabold text-foreground">
            {formatCurrency(totalValue, "COP")}
          </span>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-6">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por reserva, cliente o destino..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "confirmed", label: "Confirmadas" },
            { id: "emitted", label: "Emitidas" },
            { id: "operating", label: "En Operación" },
            { id: "completed", label: "Completadas" },
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

      {/* Content */}
      <div className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-text-3">
            Cargando reservas turísticas...
          </div>
        ) : trips.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No hay viajes ni reservas activas"
            description="Cuando un cliente acepte una cotización y la confirmes como reserva, aparecerá aquí con su expediente completo."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((t) => {
              const statusCfg =
                STATUS_CONFIG[t.bookingStatus ?? "confirmed"] ?? DEFAULT_STATUS;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrip(t)}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-md cursor-pointer hover:border-brand/40"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-extrabold text-brand">
                          {t.bookingNumber ?? t.quoteNumber}
                        </span>
                        <h3 className="font-bold text-sm text-foreground mt-0.5">
                          {t.clientName}
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
                        <span className="truncate">{t.destination}</span>
                      </div>
                      <div className="flex items-center gap-3 text-text-3 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {t.nights} noches ({t.days.length} días)
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3 shrink-0" />
                          {t.passengers} adultos
                        </span>
                      </div>
                    </div>

                    {/* Financial summary */}
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-[11px] text-text-3 font-medium">Inversión:</span>
                      <span className="text-base font-extrabold text-foreground">
                        {formatCurrency(t.totals.finalTotal, t.currency)}
                      </span>
                    </div>

                    {t.bookingConfirmation && (
                      <p className="text-[11px] text-text-3 font-mono">
                        Localizador: <strong>{t.bookingConfirmation}</strong>
                      </p>
                    )}
                  </div>

                  <div className="pt-3 mt-3 border-t flex items-center justify-between text-xs text-brand font-semibold">
                    <span>Abrir expediente</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedTrip && (
        <TripDrawer
          quote={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onUpdated={(updated) => {
            setTrips((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
            setSelectedTrip(updated);
          }}
        />
      )}
    </div>
  );
}
