"use client";

import { useState } from "react";
import { X, Star, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  TravelSupplier,
  TravelSupplierHotelMeta,
  TravelSupplierType,
} from "@/lib/travel/types";

const SUPPLIER_TYPES: { value: TravelSupplierType; label: string }[] = [
  { value: "hotel", label: "Hotel / Alojamiento" },
  { value: "airline", label: "Aerolínea" },
  { value: "operator", label: "Operador Turístico / Receptivo" },
  { value: "transport", label: "Transporte Terrestre" },
  { value: "insurance", label: "Asistencia Médica / Seguro" },
  { value: "other", label: "Otro / Mayorista" },
];

export function SupplierModal({
  supplier,
  defaultType,
  defaultCity,
  defaultName,
  onClose,
  onSaved,
}: {
  supplier?: TravelSupplier | null;
  defaultType?: TravelSupplierType;
  defaultCity?: string;
  defaultName?: string;
  onClose: () => void;
  onSaved: (supplier: TravelSupplier) => void;
}) {
  const isEditing = !!supplier;

  const [name, setName] = useState(supplier?.name ?? defaultName ?? "");
  const [type, setType] = useState<TravelSupplierType>(
    supplier?.type ?? defaultType ?? "hotel"
  );
  const [contactName, setContactName] = useState(supplier?.contact?.name ?? "");
  const [contactEmail, setContactEmail] = useState(supplier?.contact?.email ?? "");
  const [contactPhone, setContactPhone] = useState(supplier?.contact?.phone ?? "");
  const [commission, setCommission] = useState<number | "">(
    supplier?.commission ?? ""
  );
  const [sla, setSla] = useState(supplier?.sla ?? "");
  const [rating, setRating] = useState<number>(supplier?.rating ?? 5);
  const [notes, setNotes] = useState(supplier?.notes ?? "");
  const [active, setActive] = useState(supplier?.active ?? true);
  const [citiesInput, setCitiesInput] = useState(
    supplier?.operatingCities?.join(", ") ?? defaultCity ?? ""
  );

  // Hotel Meta
  const [checkIn, setCheckIn] = useState(supplier?.hotelMeta?.checkInTime ?? "15:00");
  const [checkOut, setCheckOut] = useState(supplier?.hotelMeta?.checkOutTime ?? "12:00");
  const [address, setAddress] = useState(supplier?.hotelMeta?.hotelAddress ?? "");
  const [hotelPhone, setHotelPhone] = useState(supplier?.hotelMeta?.hotelPhone ?? "");
  const [hotelPolicies, setHotelPolicies] = useState(
    supplier?.hotelMeta?.hotelPolicies ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre del proveedor es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    const operatingCities = citiesInput
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const hotelMeta: TravelSupplierHotelMeta | null =
      type === "hotel"
        ? {
            checkInTime: checkIn || undefined,
            checkOutTime: checkOut || undefined,
            hotelAddress: address || undefined,
            hotelPhone: hotelPhone || undefined,
            hotelPolicies: hotelPolicies || undefined,
          }
        : null;

    const payload = {
      name: name.trim(),
      type,
      contact: {
        name: contactName.trim() || undefined,
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
      },
      commission: commission === "" ? null : Number(commission),
      sla: sla.trim() || null,
      rating,
      notes: notes.trim() || null,
      active,
      operatingCities: operatingCities.length > 0 ? operatingCities : null,
      hotelMeta,
    };

    try {
      const url = isEditing
        ? `/api/travel/suppliers/${supplier.id}`
        : "/api/travel/suppliers";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Error al guardar el proveedor");
      }

      const data = (await res.json()) as { supplier: TravelSupplier };
      onSaved(data.supplier);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-xl border bg-popover shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand" />
            <h3 className="font-semibold text-foreground">
              {isEditing ? "Editar Proveedor" : "Nuevo Proveedor Turístico"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-3 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="rounded-md border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-text-2">Nombre comercial</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Hotel Las Américas, Avianca, Receptivos del Caribe"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Tipo de servicio</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TravelSupplierType)}
                className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm"
              >
                {SUPPLIER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Comisión pactada (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commission}
                onChange={(e) =>
                  setCommission(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="Ej. 12"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-text-3">
              Contacto y Reservas
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-2">Nombre contacto</label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ej. Carlos Ejecutivo"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-2">Correo reservas</label>
                <Input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="reservas@proveedor.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-2">Teléfono / WhatsApp</label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+573001234567"
                />
              </div>
            </div>
          </div>

          {type === "hotel" && (
            <div className="rounded-lg border bg-muted/30 p-3.5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-text-3">
                Información Hotelera
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-2">Hora Check-in</label>
                  <Input
                    type="time"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-text-2">Hora Check-out</label>
                  <Input
                    type="time"
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-medium text-text-2">Dirección del hotel</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Calle 1 # 2-3, Zona Hotelera"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-medium text-text-2">Teléfono recepción del hotel</label>
                  <Input
                    value={hotelPhone}
                    onChange={(e) => setHotelPhone(e.target.value)}
                    placeholder="+57 605 1234567"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[11px] font-medium text-text-2">Políticas de cancelación / check-in</label>
                  <Input
                    value={hotelPolicies}
                    onChange={(e) => setHotelPolicies(e.target.value)}
                    placeholder="Check-in garantizado hasta las 20:00, no reembolsable en alta..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Ciudades operadas</label>
              <Input
                value={citiesInput}
                onChange={(e) => setCitiesInput(e.target.value)}
                placeholder="Cartagena, Santa Marta, Medellín (separadas por coma)"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">SLA de respuesta</label>
              <Input
                value={sla}
                onChange={(e) => setSla(e.target.value)}
                placeholder="Ej. 2 horas hábiles / Confirmación inmediata"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Calificación del proveedor</label>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-muted-foreground hover:text-amber-500"
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= rating
                          ? "fill-amber-400 text-amber-500"
                          : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="supplier-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="supplier-active" className="text-xs font-semibold text-text-2 cursor-pointer">
                Proveedor activo para cotizaciones
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-2">Notas internas / Convenios especiales</label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Descuento adicional 5% por pronto pago, código de agencia 884..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
