"use client";

import { useState } from "react";
import {
  Hotel,
  Layers,
  Plane,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateDetailedQuoteTotals,
  formatCurrency,
  generateAutoInstallments,
} from "@/lib/travel/pricing";
import type {
  TravelCurrency,
  TravelDay,
  TravelInstallment,
  TravelItemType,
  TravelItineraryItem,
} from "@/lib/travel/types";
import { SupplierCombobox } from "@/components/travel/suppliers/supplier-combobox";
import type { TravelQuoteDto } from "@/server/travel/quotes";

const ITEM_TYPES: { type: TravelItemType; label: string; icon: typeof Plane }[] = [
  { type: "Hotel", label: "Alojamiento / Hotel", icon: Hotel },
  { type: "Flight", label: "Vuelo / Tiquete", icon: Plane },
  { type: "Activity", label: "Tour / Actividad", icon: Users },
  { type: "Transfer", label: "Traslado", icon: Truck },
  { type: "Insurance", label: "Asistencia Médica", icon: Shield },
  { type: "Other", label: "Otro Servicio", icon: Layers },
];

export function QuoteBuilder({
  initialQuote,
  contactId,
  leadId,
  clientName: initialClientName,
  clientPhone: initialClientPhone,
  onClose,
  onSaved,
}: {
  initialQuote?: TravelQuoteDto | null;
  contactId?: string | null;
  leadId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  onClose: () => void;
  onSaved: (quote: TravelQuoteDto) => void;
}) {
  const isEditing = !!initialQuote;

  // Basic Info
  const [clientName, setClientName] = useState(
    initialQuote?.clientName ?? initialClientName ?? ""
  );
  const [clientPhone, setClientPhone] = useState(
    initialQuote?.clientPhone ?? initialClientPhone ?? ""
  );
  const [clientEmail, setClientEmail] = useState(initialQuote?.clientEmail ?? "");
  const [originCity, setOriginCity] = useState(initialQuote?.originCity ?? "");
  const [destination, setDestination] = useState(initialQuote?.destination ?? "");
  const [startDate, setStartDate] = useState(initialQuote?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialQuote?.endDate ?? "");
  const [nights, setNights] = useState<number>(initialQuote?.nights ?? 4);
  const [passengers, setPassengers] = useState<number>(initialQuote?.passengers ?? 2);
  const [childPassengers, setChildPassengers] = useState<number>(
    initialQuote?.childPassengers ?? 0
  );
  const [travelReason, setTravelReason] = useState(initialQuote?.travelReason ?? "");

  // Financial Config
  const [currency, setCurrency] = useState<TravelCurrency>(
    initialQuote?.currency ?? "COP"
  );
  const [exchangeRate, setExchangeRate] = useState<number>(
    initialQuote?.exchangeRate ?? 1
  );
  const [markupPercentage, setMarkupPercentage] = useState<number>(
    initialQuote?.markupPercentage ?? 15
  );
  const [taxes, setTaxes] = useState<number>(initialQuote?.taxes ?? 0);
  const [administrativeFee, setAdministrativeFee] = useState<number>(
    initialQuote?.administrativeFee ?? 0
  );
  const [profitability, setProfitability] = useState<number>(
    initialQuote?.profitability ?? 75
  );
  const [minimumDeposit, setMinimumDeposit] = useState<number>(
    initialQuote?.minimumDeposit ?? 0
  );

  // Itinerary Days
  const [days, setDays] = useState<TravelDay[]>(
    initialQuote?.days ?? [
      {
        id: "day_1",
        dayNumber: 1,
        items: [],
      },
    ]
  );

  // Installments
  const [amortizationSchedule, setAmortizationSchedule] = useState<TravelInstallment[]>(
    initialQuote?.amortizationSchedule ?? []
  );

  // Terms
  const [inclusions, setInclusions] = useState(initialQuote?.inclusions ?? "");
  const [exclusions, setExclusions] = useState(initialQuote?.exclusions ?? "");
  const [policies, setPolicies] = useState(initialQuote?.policies ?? "");

  // UI state
  const [loadingAi, setLoadingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recalculate Totals in real-time
  const totals = calculateDetailedQuoteTotals({
    passengers,
    childPassengers,
    currency,
    markupPercentage,
    taxes,
    agencyCommission: 0,
    administrativeFee,
    profitability,
    days,
  });

  // Auto-generate installments helper
  function handleGenerateInstallments(count: number) {
    if (totals.finalTotal <= 0) return;
    const remaining = totals.finalTotal - (minimumDeposit > 0 ? minimumDeposit : 0);
    const installments = generateAutoInstallments(
      remaining > 0 ? remaining : totals.finalTotal,
      count,
      "monthly",
      startDate || undefined
    );
    setAmortizationSchedule(installments);
  }

  // Days management
  function addDay() {
    setDays((prev) => [
      ...prev,
      {
        id: `day_${prev.length + 1}_${Date.now()}`,
        dayNumber: prev.length + 1,
        items: [],
      },
    ]);
  }

  function removeDay(dayId: string) {
    setDays((prev) =>
      prev
        .filter((d) => d.id !== dayId)
        .map((d, idx) => ({ ...d, dayNumber: idx + 1 }))
    );
  }

  function addItem(dayId: string, type: TravelItemType) {
    const newItem: TravelItineraryItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title: type === "Hotel" ? "Alojamiento Hotel" : type === "Flight" ? "Vuelo Comercial" : `Servicio de ${type}`,
      description: "",
      netPrice: 0,
      markup: 0,
      totalPrice: 0,
    };

    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, items: [...d.items, newItem] } : d))
    );
  }

  function updateItem(dayId: string, itemId: string, patch: Partial<TravelItineraryItem>) {
    setDays((prev) =>
      prev.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          items: d.items.map((it) => {
            if (it.id !== itemId) return it;
            const updated = { ...it, ...patch };
            // If netPrice or markup changed, update totalPrice
            if (patch.netPrice !== undefined || patch.markup !== undefined) {
              const net = patch.netPrice !== undefined ? patch.netPrice : it.netPrice;
              const mark = patch.markup !== undefined ? patch.markup : it.markup;
              updated.totalPrice = net + mark;
            }
            return updated;
          }),
        };
      })
    );
  }

  function removeItem(dayId: string, itemId: string) {
    setDays((prev) =>
      prev.map((d) =>
        d.id === dayId ? { ...d, items: d.items.filter((it) => it.id !== itemId) } : d
      )
    );
  }

  // AI Itinerary Suggestion
  async function handleAiSuggest() {
    if (!destination.trim()) {
      setError("Indica el destino antes de solicitar sugerencias a la IA");
      return;
    }

    setLoadingAi(true);
    setError(null);

    try {
      const res = await fetch("/api/travel/quotes/ai-suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destination: destination.trim(),
          nights: Number(nights) || 4,
          passengers: Number(passengers) || 2,
          travelReason: travelReason.trim() || undefined,
          currency,
        }),
      });

      if (!res.ok) throw new Error("Error al consultar el generador de itinerarios");
      const data = await res.json();
      const suggestion = data.suggestion;

      if (suggestion.days && suggestion.days.length > 0) {
        const newDays: TravelDay[] = suggestion.days.map(
          (d: {
            dayNumber: number;
            items: {
              type: TravelItemType;
              title: string;
              description?: string;
              estimatedNetPrice?: number;
              provider?: string;
            }[];
          }) => ({
            id: `day_${d.dayNumber}_${Date.now()}`,
            dayNumber: d.dayNumber,
            items: d.items.map((it) => ({
              id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              type: it.type,
              title: it.title,
              description: it.description || "",
              netPrice: it.estimatedNetPrice || 0,
              markup: Math.round((it.estimatedNetPrice || 0) * (markupPercentage / 100)),
              totalPrice:
                (it.estimatedNetPrice || 0) +
                Math.round((it.estimatedNetPrice || 0) * (markupPercentage / 100)),
              provider: it.provider,
            })),
          })
        );

        setDays(newDays);
        if (suggestion.recommendedInclusions) setInclusions(suggestion.recommendedInclusions);
        if (suggestion.recommendedExclusions) setExclusions(suggestion.recommendedExclusions);
        if (suggestion.recommendedPolicies) setPolicies(suggestion.recommendedPolicies);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al invocar IA");
    } finally {
      setLoadingAi(false);
    }
  }

  // Submit quote
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !destination.trim()) {
      setError("El nombre del cliente y el destino son campos obligatorios");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      contactId: contactId ?? initialQuote?.contactId ?? null,
      leadId: leadId ?? initialQuote?.leadId ?? null,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim() || null,
      clientEmail: clientEmail.trim() || null,
      originCity: originCity.trim() || null,
      destination: destination.trim(),
      startDate: startDate || null,
      endDate: endDate || null,
      nights: Number(nights) || 0,
      passengers: Number(passengers) || 1,
      childPassengers: Number(childPassengers) || 0,
      travelReason: travelReason.trim() || null,
      currency,
      exchangeRate: Number(exchangeRate) || 1,
      markupPercentage: Number(markupPercentage) || 15,
      taxes: Number(taxes) || 0,
      administrativeFee: Number(administrativeFee) || 0,
      profitability: Number(profitability) || 75,
      minimumDeposit: Number(minimumDeposit) || 0,
      days,
      amortizationSchedule,
      inclusions: inclusions.trim() || null,
      exclusions: exclusions.trim() || null,
      policies: policies.trim() || null,
    };

    try {
      const url = isEditing
        ? `/api/travel/quotes/${initialQuote.id}`
        : "/api/travel/quotes";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Error al guardar cotización");
      }

      const data = (await res.json()) as { quote: TravelQuoteDto };
      onSaved(data.quote);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar la cotización");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={isEditing ? "Editar Cotización" : "Nueva Cotización"}
        className="flex max-h-[96vh] w-full max-w-5xl flex-col rounded-xl border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand p-1.5 text-brand-fg">
              <Plane className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                {isEditing ? `Editar Cotización ${initialQuote.quoteNumber}` : "Nueva Cotización Turística"}
              </h2>
              <p className="text-[11px] text-text-3 mt-1">
                Diseñador de itinerarios, costeo dinámico y amortización automática.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingAi}
              onClick={handleAiSuggest}
              className="text-xs bg-brand-soft text-brand-text border-brand/20 hover:bg-brand-soft/80"
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              {loadingAi ? "Diseñando con IA…" : "Sugerir Itinerario con IA"}
            </Button>
            <button
              onClick={onClose}
              className="rounded p-1 text-text-3 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="rounded-md border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
              {error}
            </div>
          )}

          {/* 1. Client & Destination Header */}
          <div className="rounded-xl border bg-muted/10 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-3">
              1. Datos del Cliente y Destino
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Cliente / Titular</label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre y apellidos"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Ciudad Origen</label>
                <Input
                  value={originCity}
                  onChange={(e) => setOriginCity(e.target.value)}
                  placeholder="Bogotá, Medellín..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Teléfono / WhatsApp</label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Correo electrónico</label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@correo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-text-2">Destino</label>
                <Input
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Cancún, Madrid, San Andrés..."
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Fecha Inicio</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Fecha Fin</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Noches</label>
                <Input
                  type="number"
                  min="1"
                  value={nights}
                  onChange={(e) => setNights(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Adultos</label>
                <Input
                  type="number"
                  min="1"
                  value={passengers}
                  onChange={(e) => setPassengers(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Niños</label>
                <Input
                  type="number"
                  min="0"
                  value={childPassengers}
                  onChange={(e) => setChildPassengers(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as TravelCurrency)}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm"
                >
                  <option value="COP">COP ($ Pesos)</option>
                  <option value="USD">USD ($ Dólares)</option>
                  <option value="EUR">EUR (€ Euros)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Motivo</label>
                <Input
                  value={travelReason}
                  onChange={(e) => setTravelReason(e.target.value)}
                  placeholder="Vacaciones, Luna de Miel..."
                />
              </div>
            </div>
          </div>

          {/* 2. Day-by-Day Itinerary Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-3">
                2. Servicios del Itinerario ({days.length} Días)
              </h3>
              <Button type="button" size="sm" variant="outline" onClick={addDay}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Agregar Día {days.length + 1}
              </Button>
            </div>

            <div className="space-y-4">
              {days.map((day) => (
                <div key={day.id} className="rounded-xl border bg-card p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
                        {day.dayNumber}
                      </span>
                      <span className="font-bold text-sm text-foreground">
                        Día {day.dayNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Add service buttons */}
                      <div className="flex items-center gap-1">
                        {ITEM_TYPES.map((t) => (
                          <button
                            key={t.type}
                            type="button"
                            onClick={() => addItem(day.id, t.type)}
                            className="flex items-center gap-1 rounded bg-muted/60 px-2 py-1 text-[11px] font-medium hover:bg-muted text-foreground transition"
                            title={`Agregar ${t.label}`}
                          >
                            <t.icon className="h-3 w-3" />
                            <span className="hidden sm:inline">{t.label.split(" ")[0]}</span>
                          </button>
                        ))}
                      </div>

                      {days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(day.id)}
                          className="rounded p-1 text-danger-text hover:bg-danger-tint"
                          title="Eliminar este día"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Day Items */}
                  {day.items.length === 0 ? (
                    <p className="text-center py-3 text-xs text-text-3 italic">
                      Sin servicios en este día. Haz clic arriba para agregar hotel, vuelo o tour.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {day.items.map((it) => (
                        <div
                          key={it.id}
                          className="rounded-lg border bg-muted/15 p-3 space-y-2.5"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                            <div className="sm:col-span-4">
                              <Input
                                value={it.title}
                                onChange={(e) =>
                                  updateItem(day.id, it.id, { title: e.target.value })
                                }
                                placeholder="Título del servicio"
                                className="font-medium text-xs h-8"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <SupplierCombobox
                                value={it.provider}
                                onChange={(provName) =>
                                  updateItem(day.id, it.id, { provider: provName })
                                }
                                placeholder="Proveedor aliado..."
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <div className="relative">
                                <span className="absolute left-2 top-2 text-[10px] text-text-3">Neto</span>
                                <Input
                                  type="number"
                                  value={it.netPrice || ""}
                                  onChange={(e) =>
                                    updateItem(day.id, it.id, {
                                      netPrice: Number(e.target.value),
                                    })
                                  }
                                  placeholder="0"
                                  className="text-right text-xs h-8 pl-9"
                                />
                              </div>
                            </div>
                            <div className="sm:col-span-2">
                              <div className="relative">
                                <span className="absolute left-2 top-2 text-[10px] text-brand-text font-bold">Total</span>
                                <Input
                                  type="number"
                                  value={it.totalPrice || ""}
                                  onChange={(e) =>
                                    updateItem(day.id, it.id, {
                                      totalPrice: Number(e.target.value),
                                      markup: Number(e.target.value) - it.netPrice,
                                    })
                                  }
                                  className="text-right text-xs h-8 pl-9 font-bold text-foreground"
                                />
                              </div>
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => removeItem(day.id, it.id)}
                                className="rounded p-1 text-text-3 hover:text-danger-text"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Input
                              value={it.description}
                              onChange={(e) =>
                                updateItem(day.id, it.id, { description: e.target.value })
                              }
                              placeholder="Detalles, horarios, inclusiones del servicio..."
                              className="text-xs h-7 text-text-3"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Margins, Taxes & Financial Summary */}
          <div className="rounded-xl border bg-muted/20 p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-3">
              3. Configuración Financiera y Plan de Pagos
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Margen Comercial (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={markupPercentage}
                  onChange={(e) => setMarkupPercentage(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Impuestos / IVA (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={taxes}
                  onChange={(e) => setTaxes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Fee Administrativo</label>
                <Input
                  type="number"
                  min="0"
                  value={administrativeFee}
                  onChange={(e) => setAdministrativeFee(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Abono Inicial Mínimo</label>
                <Input
                  type="number"
                  min="0"
                  value={minimumDeposit}
                  onChange={(e) => setMinimumDeposit(Number(e.target.value))}
                  placeholder="Ej. 500000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Tasa de Cambio</label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Rentabilidad (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={profitability}
                  onChange={(e) => setProfitability(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Live Totals Card */}
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
                <div>
                  <span className="text-xs text-text-3 block">Subtotal Servicios Netos:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(totals.subtotal, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-3 block">Margen de Ganancia:</span>
                  <span className="font-semibold text-emerald-600">
                    +{formatCurrency(totals.markupAmount, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-text-3 block">Total por Adulto ({passengers}):</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(totals.totalAdult, currency)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-brand-text font-bold block">TOTAL COTIZADO:</span>
                  <span className="text-xl font-extrabold text-brand">
                    {formatCurrency(totals.finalTotal, currency)}
                  </span>
                </div>
              </div>

              {/* Installments quick generator */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-text-3">
                  Generar amortización automática:
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleGenerateInstallments(2)}
                  >
                    2 Cuotas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleGenerateInstallments(3)}
                  >
                    3 Cuotas
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleGenerateInstallments(4)}
                  >
                    4 Cuotas
                  </Button>
                </div>
              </div>

              {amortizationSchedule.length > 0 && (
                <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {amortizationSchedule.map((inst, i) => (
                    <div key={inst.id} className="rounded border bg-muted/40 p-2 text-xs">
                      <span className="text-text-3 block font-medium">Cuota {i + 1} ({inst.dueDate}):</span>
                      <span className="font-bold">{formatCurrency(inst.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Inclusions & Policies */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Inclusiones</label>
              <Textarea
                rows={3}
                value={inclusions}
                onChange={(e) => setInclusions(e.target.value)}
                placeholder="• Alojamiento con desayunos&#10;• Traslados aeropuerto - hotel - aeropuerto&#10;• Asistencia médica"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Exclusiones</label>
              <Textarea
                rows={3}
                value={exclusions}
                onChange={(e) => setExclusions(e.target.value)}
                placeholder="• Tiquetes no especificados&#10;• Propinas y consumos personales"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-semibold text-text-2">Políticas y Condiciones de Reserva</label>
              <Textarea
                rows={2}
                value={policies}
                onChange={(e) => setPolicies(e.target.value)}
                placeholder="Tarifas sujetas a cambio sin previo aviso hasta emitir el depósito..."
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear Cotización"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
