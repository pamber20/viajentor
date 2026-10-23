"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronRight,
  LayoutGrid,
  List,
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

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortField, setSortField] = useState<string>("startDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedTrips = useMemo(() => {
    return [...trips].sort((a, b) => {
      let valA: string | number;
      let valB: string | number;

      if (sortField === "total") {
        valA = a.totals.finalTotal;
        valB = b.totals.finalTotal;
      } else if (sortField === "startDate") {
        valA = a.startDate ? new Date(a.startDate).getTime() : 0;
        valB = b.startDate ? new Date(b.startDate).getTime() : 0;
      } else if (sortField === "bookingNumber") {
        valA = (a.bookingNumber || a.quoteNumber || "").toLowerCase();
        valB = (b.bookingNumber || b.quoteNumber || "").toLowerCase();
      } else if (sortField === "clientName") {
        valA = (a.clientName || "").toLowerCase();
        valB = (b.clientName || "").toLowerCase();
      } else if (sortField === "destination") {
        valA = (a.destination || "").toLowerCase();
        valB = (b.destination || "").toLowerCase();
      } else if (sortField === "nights") {
        valA = a.nights || 0;
        valB = b.nights || 0;
      } else if (sortField === "bookingStatus") {
        valA = (a.bookingStatus || "confirmed").toLowerCase();
        valB = (b.bookingStatus || "confirmed").toLowerCase();
      } else {
        valA = (a.createdAt || "").toLowerCase();
        valB = (b.createdAt || "").toLowerCase();
      }

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [trips, sortField, sortDirection]);

  const renderSortHeader = (label: string, field: string, align: "left" | "right" = "left") => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-4 py-3 cursor-pointer select-none hover:bg-muted/50 transition-colors text-xs font-bold ${
          align === "right" ? "text-right" : "text-left"
        }`}
      >
        <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : "justify-start"}`}>
          <span>{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="h-3.5 w-3.5 text-brand" />
            ) : (
              <ArrowDown className="h-3.5 w-3.5 text-brand" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-text-3 opacity-60" />
          )}
        </div>
      </th>
    );
  };

  const totalValue = trips.reduce((sum, t) => sum + t.totals.finalTotal, 0);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-bold tracking-tight text-foreground">
              Viajes y Reservas Activas
            </h1>
            <Badge variant="outline" className="text-xs">
              {trips.length} {trips.length === 1 ? "reserva" : "reservas"}
            </Badge>
          </div>
          <p className="text-xs text-text-3 mt-0.5">
            Gestión operativa, cronograma de amortización, control de abonos, manifiesto de pasajeros, liquidación a proveedores y vouchers.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-text-3 block">Cartera total en viajes</span>
          <span className="text-base font-extrabold text-foreground">
            {formatCurrency(totalValue, "COP")}
          </span>
        </div>
      </header>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b bg-muted/20 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por reserva, cliente o destino..."
              className="pl-9 h-9"
            />
          </div>

          {/* Toggle Grid / List */}
          <div className="flex items-center p-0.5 rounded-lg border bg-card shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition ${
                viewMode === "grid"
                  ? "bg-brand text-brand-fg shadow-2xs"
                  : "text-text-3 hover:text-foreground"
              }`}
              title="Vista Cuadrícula"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition ${
                viewMode === "list"
                  ? "bg-brand text-brand-fg shadow-2xs"
                  : "text-text-3 hover:text-foreground"
              }`}
              title="Vista Tabla"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {[
            { id: "all", label: "Todas" },
            { id: "pending", label: "Pendientes" },
            { id: "confirmed", label: "Confirmadas" },
            { id: "emitted", label: "Emitidas" },
            { id: "operating", label: "En Operación" },
            { id: "completed", label: "Completadas" },
            { id: "cancelled", label: "Canceladas" },
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
        ) : sortedTrips.length === 0 ? (
          <EmptyState
            icon={Plane}
            title="No hay viajes ni reservas activas"
            description="Cuando un cliente acepte una cotización y la confirmes como reserva, aparecerá aquí con su expediente completo."
          />
        ) : viewMode === "list" ? (
          /* Vista Tabla idéntica a Viajentor */
          <div className="overflow-x-auto rounded-xl border bg-card shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-text-2 font-bold uppercase tracking-wider border-b">
                <tr>
                  {renderSortHeader("Reserva", "bookingNumber")}
                  {renderSortHeader("Cliente", "clientName")}
                  {renderSortHeader("Destino", "destination")}
                  {renderSortHeader("Fecha Salida", "startDate")}
                  {renderSortHeader("Noches", "nights")}
                  {renderSortHeader("Total", "total", "right")}
                  {renderSortHeader("Estado", "bookingStatus")}
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-medium">
                {sortedTrips.map((t) => {
                  const statusCfg =
                    STATUS_CONFIG[t.bookingStatus ?? "confirmed"] ?? DEFAULT_STATUS;
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTrip(t)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-foreground">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-brand-soft text-brand-text border border-brand/20">
                          {t.bookingNumber ?? t.quoteNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">
                        {t.clientName}
                      </td>
                      <td className="px-4 py-3.5 text-text-2">
                        {t.destination}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-text-3">
                        {t.startDate || "N/A"}
                      </td>
                      <td className="px-4 py-3.5 text-text-2">
                        {t.nights} noches
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right font-extrabold text-foreground">
                        {formatCurrency(t.totals.finalTotal, t.currency)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10.5px] font-semibold border ${statusCfg.color}`}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-soft text-brand-text">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Vista Cuadrícula (Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTrips.map((t) => {
              const statusCfg =
                STATUS_CONFIG[t.bookingStatus ?? "confirmed"] ?? DEFAULT_STATUS;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTrip(t)}
                  className="group flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-md cursor-pointer hover:border-brand/40"
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
                    <ChevronRight className="h-4 w-4 transform group-hover:translate-x-0.5 transition-transform" />
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
