"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TravelSupplier, TravelSupplierType } from "@/lib/travel/types";
import { SupplierModal } from "./supplier-modal";

interface SupplierComboboxProps {
  value?: string;
  type?: TravelSupplierType | "all";
  destinationCity?: string;
  onChange: (supplierName: string, supplier?: TravelSupplier) => void;
  placeholder?: string;
  className?: string;
}

export function SupplierCombobox({
  value,
  type = "all",
  destinationCity,
  onChange,
  placeholder = "Seleccionar o escribir proveedor...",
  className = "",
}: SupplierComboboxProps) {
  const [suppliers, setSuppliers] = useState<TravelSupplier[]>([]);
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState(value ?? "");

  useEffect(() => {
    setSearch(value ?? "");
  }, [value]);

  useEffect(() => {
    void (async () => {
      const params = new URLSearchParams({ active: "true" });
      if (type && type !== "all") params.set("type", type);
      const res = await fetch(`/api/travel/suppliers?${params}`).catch(() => null);
      if (!res?.ok) return;
      const data = (await res.json()) as { suppliers: TravelSupplier[] };
      setSuppliers(data.suppliers);
    })();
  }, [type]);

  const filtered = suppliers.filter((s) => {
    const nameMatch = s.name.toLowerCase().includes(search.toLowerCase());
    if (!nameMatch) return false;

    // Si es Hotel, Actividad (operator) o Traslado (transport), filtrar por ciudad donde opera si está definida
    if (
      destinationCity &&
      (type === "hotel" || type === "operator" || type === "transport") &&
      s.operatingCities &&
      s.operatingCities.length > 0
    ) {
      const destLower = destinationCity.toLowerCase().trim();
      const operatesInCity = s.operatingCities.some((c) => {
        const cLower = c.toLowerCase().trim();
        return destLower.includes(cLower) || cLower.includes(destLower);
      });
      if (!operatesInCity) return false;
    }

    return true;
  });

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={search}
          placeholder={placeholder}
          onChange={(e) => {
            const v = e.target.value;
            setSearch(v);
            const found = suppliers.find(
              (s) => s.name.toLowerCase() === v.toLowerCase().trim()
            );
            onChange(v, found);
          }}
          onFocus={() => setOpen(true)}
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="px-2 shrink-0"
          title="Crear nuevo proveedor"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
            {filtered.length === 0 ? (
              <div className="p-2 text-center text-xs text-text-3">
                No hay proveedores coincidentes
                {destinationCity ? ` para ${destinationCity}` : ""}.
                <button
                  type="button"
                  className="mt-1 block w-full text-brand hover:underline font-medium"
                  onClick={() => {
                    setOpen(false);
                    setModalOpen(true);
                  }}
                >
                  + Registrar &ldquo;{search || "nuevo"}&rdquo; como proveedor
                </button>
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSearch(s.name);
                    onChange(s.name, s);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-xs hover:bg-accent text-foreground"
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-medium truncate">{s.name}</span>
                    {s.operatingCities && s.operatingCities.length > 0 && (
                      <span className="text-[10px] text-text-3 truncate">
                        📍 {s.operatingCities.join(", ")}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-text-3 shrink-0">
                    {s.commission ? `${s.commission}% com.` : s.type}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {modalOpen && (
        <SupplierModal
          defaultType={type !== "all" ? type : undefined}
          defaultCity={destinationCity}
          defaultName={search.trim() || undefined}
          onClose={() => setModalOpen(false)}
          onSaved={(newSup) => {
            setSuppliers((prev) => [newSup, ...prev]);
            setSearch(newSup.name);
            onChange(newSup.name, newSup);
          }}
        />
      )}
    </div>
  );
}
