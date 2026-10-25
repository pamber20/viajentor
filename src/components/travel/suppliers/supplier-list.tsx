"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Edit2,
  Hotel,
  Mail,
  MapPin,
  Phone,
  Plane,
  Plus,
  Search,
  Shield,
  Star,
  Trash2,
  Truck,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { TravelSupplier, TravelSupplierType } from "@/lib/travel/types";
import { SupplierModal } from "./supplier-modal";
import { ImportSuppliersModal } from "./import-suppliers-modal";

const TYPE_CONFIG: Record<
  TravelSupplierType,
  { label: string; icon: typeof Building2; color: string }
> = {
  hotel: { label: "Hotel", icon: Hotel, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  airline: { label: "Aerolínea", icon: Plane, color: "text-sky-500 bg-sky-500/10 border-sky-500/20" },
  operator: { label: "Operador", icon: Users, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  transport: { label: "Transporte", icon: Truck, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  insurance: { label: "Asistencia", icon: Shield, color: "text-violet-500 bg-violet-500/10 border-violet-500/20" },
  other: { label: "Otro", icon: Building2, color: "text-gray-500 bg-gray-500/10 border-gray-500/20" },
};

export function SupplierListClient() {
  const [suppliers, setSuppliers] = useState<TravelSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<TravelSupplierType | "all">("all");
  const [activeOnly, setActiveOnly] = useState(false);

  const [modalSupplier, setModalSupplier] = useState<TravelSupplier | null | undefined>(undefined);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selectedType !== "all") params.set("type", selectedType);
    if (activeOnly) params.set("active", "true");

    try {
      const res = await fetch(`/api/travel/suppliers?${params}`);
      if (!res.ok) throw new Error("Error al cargar proveedores");
      const data = (await res.json()) as { suppliers: TravelSupplier[] };
      setSuppliers(data.suppliers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [query, selectedType, activeOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSuppliers();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  async function handleDelete(id: string) {
    if (!window.confirm("¿Seguro que deseas eliminar este proveedor del catálogo?")) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/travel/suppliers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar el proveedor");
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  const activeCount = suppliers.filter((s) => s.active).length;

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-4 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[19px] font-bold tracking-tight">Proveedores Turísticos</h1>
            <Badge variant="outline" className="text-xs">
              {suppliers.length} {suppliers.length === 1 ? "proveedor" : "proveedores"}
            </Badge>
          </div>
          <p className="text-xs text-text-3 mt-0.5">
            Catálogo comercial de hoteles, aerolíneas, operadores receptivos y convenios de la agencia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={() => setModalSupplier(null)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuevo Proveedor
          </Button>
        </div>
      </header>

      {/* Filters and search */}
      <div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o ciudad..."
              className="pl-9 h-9"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer font-medium select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Solo activos ({activeCount})
          </label>
        </div>

        {/* Type pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedType("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedType === "all"
                ? "bg-brand text-brand-fg font-semibold shadow-xs"
                : "bg-card text-text-2 border hover:bg-accent"
            }`}
          >
            Todos ({suppliers.length})
          </button>
          {(
            [
              "hotel",
              "airline",
              "operator",
              "transport",
              "insurance",
              "other",
            ] as TravelSupplierType[]
          ).map((t) => {
            const config = TYPE_CONFIG[t];
            const Icon = config.icon;
            const count = suppliers.filter((s) => s.type === t).length;
            const isSelected = selectedType === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedType(t)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${
                  isSelected
                    ? "bg-brand text-brand-fg font-semibold shadow-xs"
                    : "bg-card text-text-2 hover:bg-accent"
                }`}
              >
                <Icon className="h-3 w-3" />
                {config.label}
                {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-xs text-text-3">
            Cargando proveedores...
          </div>
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No se encontraron proveedores"
            description="Registra hoteles, operadores o aerolíneas con las comisiones y convenios acordados."
            action={
              <Button onClick={() => setModalSupplier(null)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Crear primer proveedor
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => {
              const typeCfg = TYPE_CONFIG[s.type] ?? TYPE_CONFIG.other;
              const TypeIcon = typeCfg.icon;

              return (
                <div
                  key={s.id}
                  className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-xs transition hover:shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Top bar with Badge & Active status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border ${typeCfg.color}`}
                        >
                          <TypeIcon className="h-3 w-3" />
                          {typeCfg.label}
                        </span>
                        {s.commission !== null && s.commission !== undefined && (
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {s.commission}% com.
                          </Badge>
                        )}
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                          s.active ? "text-emerald-500" : "text-text-3"
                        }`}
                        title={s.active ? "Proveedor activo" : "Inactivo"}
                      >
                        {s.active ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5" />
                        )}
                        {s.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Name & Stars */}
                    <div>
                      <h3 className="font-bold text-[15px] text-foreground leading-snug">
                        {s.name}
                      </h3>
                      {s.rating && (
                        <div className="flex items-center gap-0.5 mt-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= s.rating!
                                  ? "fill-amber-400 text-amber-500"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Contact Details */}
                    {(s.contact?.name || s.contact?.phone || s.contact?.email) && (
                      <div className="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
                        {s.contact?.name && (
                          <p className="font-semibold text-text-2 truncate">
                            {s.contact.name}
                          </p>
                        )}
                        {s.contact?.phone && (
                          <div className="flex items-center gap-1.5 text-text-3">
                            <Phone className="h-3 w-3 shrink-0" />
                            <a
                              href={`tel:${s.contact.phone}`}
                              className="hover:underline hover:text-foreground truncate"
                            >
                              {s.contact.phone}
                            </a>
                          </div>
                        )}
                        {s.contact?.email && (
                          <div className="flex items-center gap-1.5 text-text-3">
                            <Mail className="h-3 w-3 shrink-0" />
                            <a
                              href={`mailto:${s.contact.email}`}
                              className="hover:underline hover:text-foreground truncate"
                            >
                              {s.contact.email}
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hotel details if hotel */}
                    {s.type === "hotel" && s.hotelMeta && (
                      <div className="text-[11px] text-text-3 space-y-1">
                        {s.hotelMeta.hotelAddress && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{s.hotelMeta.hotelAddress}</span>
                          </div>
                        )}
                        {(s.hotelMeta.checkInTime || s.hotelMeta.checkOutTime) && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span>
                              In: {s.hotelMeta.checkInTime ?? "15:00"} | Out:{" "}
                              {s.hotelMeta.checkOutTime ?? "12:00"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Operating cities */}
                    {s.operatingCities && s.operatingCities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.operatingCities.map((city) => (
                          <span
                            key={city}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-text-3 font-medium"
                          >
                            {city}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* SLA or notes */}
                    {s.sla && (
                      <p className="text-[11px] text-text-3 italic">
                        SLA: {s.sla}
                      </p>
                    )}
                  </div>

                  {/* Card footer actions */}
                  <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setModalSupplier(s)}
                      className="h-8 px-2 text-xs"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      className="h-8 px-2 text-xs text-danger-text hover:bg-danger-tint"
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalSupplier !== undefined && (
        <SupplierModal
          supplier={modalSupplier}
          onClose={() => setModalSupplier(undefined)}
          onSaved={(saved) => {
            setSuppliers((prev) => {
              const exists = prev.some((x) => x.id === saved.id);
              if (exists) {
                return prev.map((x) => (x.id === saved.id ? saved : x));
              }
              return [saved, ...prev];
            });
            setModalSupplier(undefined);
          }}
        />
      )}

      <ImportSuppliersModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={() => {
          void fetchSuppliers();
        }}
      />
    </div>
  );
}
