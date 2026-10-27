"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Plus,
  Search,
  MapPin,
  Calendar,
  Users,
  Copy,
  Edit,
  Trash2,
  Plane,
  Hotel,
  Car,
  Compass,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatCurrency } from "@/lib/travel/pricing";
import { PackageBuilder } from "@/components/travel/packages/package-builder";
import type { TravelPackageDto } from "@/server/travel/packages";

export function PackagesClient() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<TravelPackageDto[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft" | "archived">("all");

  // Estados del editor / builder
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<TravelPackageDto | null>(null);

  // Diálogo de confirmación para eliminar
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Duplicando
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/travel/packages");
      if (!res.ok) throw new Error("Error al obtener paquetes turísticos");
      const data = await res.json();
      setPackages(data.items ?? []);
    } catch (err) {
      console.error(err);
      toast("No se pudieron cargar los paquetes turísticos", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  // Métricas
  const metrics = useMemo(() => {
    const total = packages.length;
    const active = packages.filter((p) => p.status === "active").length;
    const drafts = packages.filter((p) => p.status === "draft").length;
    return { total, active, drafts };
  }, [packages]);

  // Filtrado
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (statusFilter !== "all" && pkg.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        pkg.title.toLowerCase().includes(q) ||
        pkg.destination.toLowerCase().includes(q) ||
        (Boolean(pkg.originCity) && pkg.originCity!.toLowerCase().includes(q)) ||
        pkg.description?.toLowerCase().includes(q)
      );
    });
  }, [packages, statusFilter, search]);

  const handleDuplicate = async (pkg: TravelPackageDto) => {
    try {
      setDuplicatingId(pkg.id);
      const res = await fetch(`/api/travel/packages/${pkg.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Error al duplicar paquete");
      const duplicated = (await res.json()) as TravelPackageDto;
      setPackages((prev) => [duplicated, ...prev]);
      toast(`Paquete "${pkg.title}" duplicado exitosamente`, "success");
    } catch (err) {
      console.error(err);
      toast("No se pudo duplicar el paquete", "error");
    } finally {
      setDuplicatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletePackageId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/travel/packages/${deletePackageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar paquete");
      setPackages((prev) => prev.filter((p) => p.id !== deletePackageId));
      toast("Paquete turístico eliminado", "success");
      setDeletePackageId(null);
    } catch (err) {
      console.error(err);
      toast("No se pudo eliminar el paquete", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleQuoteWithPackage = (pkg: TravelPackageDto) => {
    router.push(`/quotes?packageId=${pkg.id}`);
  };

  // Si el builder está abierto, lo mostramos a pantalla completa
  if (isBuilderOpen) {
    return (
      <PackageBuilder
        initialPackage={editingPackage}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingPackage(null);
        }}
        onSaved={() => {
          setIsBuilderOpen(false);
          setEditingPackage(null);
          fetchPackages();
        }}
        onQuoteWithPackage={(pkg) => {
          setIsBuilderOpen(false);
          setEditingPackage(null);
          handleQuoteWithPackage(pkg);
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Paquetes Turísticos
              </h1>
              <p className="text-sm text-muted-foreground">
                Plantillas maestras con fechas fijas, itinerarios y servicios listos para cotizar y reutilizar
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => {
              setEditingPackage(null);
              setIsBuilderOpen(true);
            }}
            className="gap-2 font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nuevo Paquete Turístico
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Paquetes
            </p>
            <h3 className="text-2xl font-black text-foreground mt-1">
              {metrics.total}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Package className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Listos para Cotizar (Activos)
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">
              {metrics.active}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              En Elaboración (Borradores)
            </p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">
              {metrics.drafts}
            </h3>
          </div>
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por título, destino, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={statusFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className="text-xs h-8"
          >
            Todos ({packages.length})
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className="text-xs h-8 text-emerald-600 font-medium"
          >
            Activos ({packages.filter((p) => p.status === "active").length})
          </Button>
          <Button
            variant={statusFilter === "draft" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("draft")}
            className="text-xs h-8 text-amber-600 font-medium"
          >
            Borradores ({packages.filter((p) => p.status === "draft").length})
          </Button>
          <Button
            variant={statusFilter === "archived" ? "default" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter("archived")}
            className="text-xs h-8 text-slate-500 font-medium"
          >
            Archivados ({packages.filter((p) => p.status === "archived").length})
          </Button>
        </div>
      </div>

      {/* Packages Grid */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Cargando paquetes turísticos...</p>
        </div>
      ) : filteredPackages.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-border rounded-2xl bg-card p-6">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">
            No se encontraron paquetes
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
            {search
              ? "No hay paquetes turísticos que coincidan con los filtros aplicados."
              : "Crea tu primer paquete turístico para predefinir itinerarios y cotizar en segundos."}
          </p>
          <Button
            onClick={() => {
              setEditingPackage(null);
              setIsBuilderOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Crear Paquete Turístico
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPackages.map((pkg) => {
            const totalAdults = pkg.passengers || 1;
            const totalChildren = pkg.childPassengers || 0;
            const totalPax = totalAdults + totalChildren;

            // Servicios incluidos
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
                className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-5">
                  {/* Status & Code */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
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

                  {/* Title & Destination */}
                  <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {pkg.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mt-1 mb-3">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">
                      {pkg.originCity ? `${pkg.originCity} ➔ ${pkg.destination}` : pkg.destination}
                    </span>
                  </div>

                  {pkg.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {pkg.description}
                    </p>
                  )}

                  {/* Fechas fijas y pasajeros */}
                  <div className="space-y-1.5 text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg mb-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-foreground shrink-0" />
                      <span className="text-foreground font-medium">
                        {pkg.startDate} al {pkg.endDate}
                      </span>
                      <span className="text-muted-foreground">
                        ({pkg.nights} noches)
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

                  {/* Badges de servicios incluidos */}
                  <div className="flex flex-wrap gap-1.5">
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

                {/* Precios y Botones */}
                <div className="p-4 bg-muted/20 border-t border-border flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Precio Paquete
                      </div>
                      <div className="text-lg font-black text-foreground">
                        {formatCurrency(pkg.totals.finalTotal, pkg.currency)}
                      </div>
                    </div>
                    {totalPax > 1 && (
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Por Persona
                        </div>
                        <div className="text-xs font-bold text-muted-foreground">
                          {formatCurrency(pkg.totals.finalTotal / totalPax, pkg.currency)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones principales */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Button
                      size="sm"
                      onClick={() => handleQuoteWithPackage(pkg)}
                      className="flex-1 gap-1.5 text-xs font-semibold shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                      Cotizar con este Paquete
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicate(pkg)}
                      disabled={duplicatingId === pkg.id}
                      title="Duplicar paquete"
                      className="h-8 w-8 p-0"
                    >
                      {duplicatingId === pkg.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingPackage(pkg);
                        setIsBuilderOpen(true);
                      }}
                      title="Editar paquete"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletePackageId(pkg.id)}
                      title="Eliminar paquete"
                      className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
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

      {/* ConfirmDialog para eliminar paquete */}
      <ConfirmDialog
        isOpen={Boolean(deletePackageId)}
        onClose={() => setDeletePackageId(null)}
        onConfirm={handleDelete}
        title="¿Eliminar paquete turístico?"
        message="Esta acción eliminará la plantilla de este paquete turístico. Las cotizaciones o viajes generados previamente a partir de este paquete no se verán afectados."
        confirmText="Eliminar Paquete"
        cancelText="Cancelar"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
