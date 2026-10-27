"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Package,
  Search,
  MapPin,
  Calendar,
  Users,
  Plane,
  Hotel,
  Car,
  Compass,
  ShieldCheck,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelPackageDto } from "@/server/travel/packages";

interface PackageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (pkg: TravelPackageDto) => void;
}

export function PackageSelectorModal({
  isOpen,
  onClose,
  onSelect,
}: PackageSelectorModalProps) {
  const [packages, setPackages] = useState<TravelPackageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadPackages() {
      try {
        setLoading(true);
        const res = await fetch("/api/travel/packages");
        if (!res.ok) throw new Error("Error al obtener paquetes");
        const data = await res.json();
        if (isMounted) {
          setPackages(data.items ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadPackages();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (filterActiveOnly && pkg.status !== "active") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchTitle = pkg.title.toLowerCase().includes(q);
      const matchDest = pkg.destination.toLowerCase().includes(q);
      const matchOrigin = Boolean(pkg.originCity) && pkg.originCity!.toLowerCase().includes(q);
      const matchDesc = pkg.description?.toLowerCase().includes(q);
      return matchTitle || matchDest || matchOrigin || matchDesc;
    });
  }, [packages, filterActiveOnly, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Cargar desde Paquete Turístico
              </h2>
              <p className="text-xs text-muted-foreground">
                Selecciona un paquete prediseñado para heredar fechas, itinerario, hoteles y servicios a esta cotización.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-border bg-card flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título o destino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterActiveOnly}
              onChange={(e) => setFilterActiveOnly(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4"
            />
            <span>Mostrar sólo paquetes activos</span>
          </label>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Cargando paquetes turísticos disponibles...</p>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border rounded-xl">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="text-base font-semibold text-foreground">
                No se encontraron paquetes
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {search
                  ? "No hay paquetes que coincidan con la búsqueda."
                  : "Aún no tienes paquetes turísticos configurados. Puedes crearlos desde la sección 'Paquetes Turísticos'."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPackages.map((pkg) => {
                const totalAdults = pkg.passengers || 1;
                const totalChildren = pkg.childPassengers || 0;
                const totalPax = totalAdults + totalChildren;

                // Conteo de servicios
                const hasFlights = pkg.days.some((d) =>
                  d.items.some((i) => i.type === "Flight")
                );
                const hasHotels =
                  pkg.selectedHotelId ||
                  pkg.days.some((d) => d.items.some((i) => i.type === "Hotel"));
                const hasTransfers = pkg.days.some((d) =>
                  d.items.some((i) => i.type === "Transfer")
                );
                const hasActivities = pkg.days.some((d) =>
                  d.items.some((i) => i.type === "Activity")
                );
                const hasAssistance = pkg.medicalAssistance > 0;

                return (
                  <div
                    key={pkg.id}
                    className="border border-border rounded-xl p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                pkg.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : pkg.status === "draft"
                                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                                  : "bg-slate-500/10 text-slate-600 border border-slate-500/20"
                              }`}
                            >
                              {pkg.status === "active"
                                ? "Activo"
                                : pkg.status === "draft"
                                ? "Borrador"
                                : "Archivado"}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-foreground truncate mt-1 group-hover:text-primary transition-colors">
                            {pkg.title}
                          </h3>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-muted-foreground my-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate">
                            {pkg.originCity ? `${pkg.originCity} ➔ ${pkg.destination}` : pkg.destination}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            {pkg.startDate} al {pkg.endDate} ({pkg.nights} noches)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>
                            Base: {pkg.passengers} adultos
                            {pkg.childPassengers > 0 && ` + ${pkg.childPassengers} niños`}
                          </span>
                        </div>
                      </div>

                      {/* Iconos de servicios */}
                      <div className="flex flex-wrap items-center gap-1.5 py-2 border-t border-border/60">
                        {hasFlights && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-sky-500/10 text-sky-700 px-2 py-0.5 rounded font-medium">
                            <Plane className="h-3 w-3" /> Vuelos
                          </span>
                        )}
                        {hasHotels && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-purple-500/10 text-purple-700 px-2 py-0.5 rounded font-medium">
                            <Hotel className="h-3 w-3" /> Hotel
                          </span>
                        )}
                        {hasTransfers && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded font-medium">
                            <Car className="h-3 w-3" /> Traslados
                          </span>
                        )}
                        {hasActivities && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-700 px-2 py-0.5 rounded font-medium">
                            <Compass className="h-3 w-3" /> Tours
                          </span>
                        )}
                        {hasAssistance && (
                          <span className="inline-flex items-center gap-1 text-[11px] bg-rose-500/10 text-rose-700 px-2 py-0.5 rounded font-medium">
                            <ShieldCheck className="h-3 w-3" /> Asistencia
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precios y botón */}
                    <div className="pt-3 border-t border-border mt-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Precio Estimado
                        </div>
                        <div className="text-base font-black text-primary">
                          {formatCurrency(pkg.totals.finalTotal, pkg.currency)}
                        </div>
                        {totalPax > 1 && (
                          <div className="text-[10px] text-muted-foreground">
                            {formatCurrency(pkg.totals.finalTotal / totalPax, pkg.currency)} / persona
                          </div>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => onSelect(pkg)}
                        className="gap-1.5 text-xs font-semibold"
                      >
                        <Check className="h-4 w-4" />
                        Heredar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <span>
              Al heredar, los datos del cliente que ya tengas escritos se mantendrán intactos.
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
