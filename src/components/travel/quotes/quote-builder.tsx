"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
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
import { useAirlines, CITY_AIRPORT_MAP } from "@/hooks/useAirlines";
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
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [activeAirlineItemId, setActiveAirlineItemId] = useState<string | null>(null);

  const { searchAirlines } = useAirlines();
  const currentItemAirline = activeAirlineItemId
    ? days
        .flatMap((d) => d.items)
        .find((i) => i.id === activeAirlineItemId)
        ?.flightDetails?.airline || ""
    : "";
  const airlineSuggestions = searchAirlines(currentItemAirline);

  // Recalculate totals when passenger count changes for per-person items
  useEffect(() => {
    setDays((prevDays) =>
      prevDays.map((d) => ({
        ...d,
        items: d.items.map((item) => {
          if (item.pricePerPerson) {
            const netAdult = item.netPriceAdult || 0;
            const netChild = item.netPriceChild || 0;
            const markAdult = item.markupAdult || 0;
            const markChild = item.markupChild || 0;
            const calculatedNet = netAdult * passengers + netChild * childPassengers;
            const calculatedMarkup = markAdult * passengers + markChild * childPassengers;
            return {
              ...item,
              netPrice: calculatedNet,
              markup: calculatedMarkup,
              totalPrice: calculatedNet + calculatedMarkup,
            };
          }
          return item;
        }),
      }))
    );
  }, [passengers, childPassengers]);

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
    const isPerPersonDefault =
      ["Flight", "Hotel", "Insurance", "Activity", "Transfer"].includes(type) ||
      childPassengers > 0;

    const newItem: TravelItineraryItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      title:
        type === "Hotel"
          ? "Alojamiento Hotel"
          : type === "Flight"
          ? "Vuelo Comercial"
          : type === "Transfer"
          ? "Traslado Aeropuerto / Hotel"
          : type === "Insurance"
          ? "Asistencia Médica"
          : type === "Activity"
          ? "Tour / Actividad"
          : `Servicio de ${type}`,
      description: "",
      netPrice: 0,
      markup: 0,
      totalPrice: 0,
      pricePerPerson: isPerPersonDefault,
      netPriceAdult: 0,
      netPriceChild: 0,
      markupAdult: 0,
      markupChild: 0,
      pnr: "",
      assignedOptions: ["Shared"],
      flightDetails:
        type === "Flight"
          ? {
              airline: "",
              flightNumber: "",
              origin: originCity || "",
              destination: destination || "",
              departureDate: startDate || "",
              departureTime: "08:00",
              arrivalDate: startDate || "",
              arrivalTime: "10:30",
              cabin: "Economica",
              baggageAllowance: "1 maleta de 23kg + equipaje de mano",
            }
          : undefined,
      hotelDetails:
        type === "Hotel"
          ? {
              hotelName: "",
              address: "",
              checkIn: startDate || "",
              checkOut: endDate || "",
              roomType: "Habitación Estándar",
              boardBasis: "Desayuno",
              stars: 4,
            }
          : undefined,
      transferDetails:
        type === "Transfer"
          ? {
              pickupPoint: "Aeropuerto",
              dropoffPoint: "Hotel",
              date: startDate || "",
              time: "11:00",
              vehicleType: "Vehículo privado / Van",
              passengers: passengers + childPassengers,
            }
          : undefined,
    };

    setDays((prev) =>
      prev.map((d) => (d.id === dayId ? { ...d, items: [...d.items, newItem] } : d))
    );
    setExpandedItemId(newItem.id);
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

            const isPerPerson =
              patch.pricePerPerson !== undefined
                ? patch.pricePerPerson
                : it.pricePerPerson;

            if (isPerPerson) {
              const netAdult =
                patch.netPriceAdult !== undefined
                  ? patch.netPriceAdult
                  : it.netPriceAdult !== undefined
                  ? it.netPriceAdult
                  : it.netPrice || 0;
              const netChild =
                patch.netPriceChild !== undefined
                  ? patch.netPriceChild
                  : it.netPriceChild || 0;
              const markAdult =
                patch.markupAdult !== undefined
                  ? patch.markupAdult
                  : it.markupAdult !== undefined
                  ? it.markupAdult
                  : it.markup || 0;
              const markChild =
                patch.markupChild !== undefined
                  ? patch.markupChild
                  : it.markupChild || 0;

              const calculatedNet = netAdult * passengers + netChild * childPassengers;
              const calculatedMarkup = markAdult * passengers + markChild * childPassengers;

              updated.netPriceAdult = netAdult;
              updated.netPriceChild = netChild;
              updated.markupAdult = markAdult;
              updated.markupChild = markChild;
              updated.netPrice = calculatedNet;
              updated.markup = calculatedMarkup;
              updated.totalPrice = calculatedNet + calculatedMarkup;
            } else {
              // Group price
              const net = patch.netPrice !== undefined ? patch.netPrice : it.netPrice || 0;
              const mark = patch.markup !== undefined ? patch.markup : it.markup || 0;
              const total = patch.totalPrice !== undefined ? patch.totalPrice : net + mark;
              updated.netPrice = net;
              updated.markup = total - net;
              updated.totalPrice = total;
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
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
    }
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
                    <div className="space-y-3">
                      {day.items.map((it) => {
                        const isExpanded = expandedItemId === it.id;
                        return (
                          <div
                            key={it.id}
                            className={`rounded-xl border transition-all ${
                              isExpanded
                                ? "border-brand-primary/60 bg-card shadow-md"
                                : "border-border/70 bg-card/60 hover:bg-card"
                            } p-3.5 space-y-3`}
                          >
                            {/* Item Header / Top Row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-text font-bold text-xs">
                                  {it.type === "Flight" ? (
                                    <Plane className="h-4 w-4" />
                                  ) : it.type === "Hotel" ? (
                                    <Hotel className="h-4 w-4" />
                                  ) : it.type === "Transfer" ? (
                                    <Truck className="h-4 w-4" />
                                  ) : it.type === "Insurance" ? (
                                    <Shield className="h-4 w-4" />
                                  ) : it.type === "Activity" ? (
                                    <Users className="h-4 w-4" />
                                  ) : (
                                    <Layers className="h-4 w-4" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Input
                                    value={it.title}
                                    onChange={(e) =>
                                      updateItem(day.id, it.id, { title: e.target.value })
                                    }
                                    placeholder="Título del servicio"
                                    className="font-bold text-xs h-8"
                                  />
                                </div>
                                <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-text-3 shrink-0">
                                  {it.type}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-40 sm:w-44">
                                  <SupplierCombobox
                                    value={it.provider}
                                    onChange={(provName) =>
                                      updateItem(day.id, it.id, { provider: provName })
                                    }
                                    placeholder="Proveedor aliado..."
                                  />
                                </div>

                                <div className="text-right">
                                  <p className="text-[10px] text-text-3 font-semibold uppercase">Total Ítem</p>
                                  <p className="font-extrabold text-sm text-foreground">
                                    {formatCurrency(it.totalPrice || 0, currency)}
                                  </p>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setExpandedItemId(isExpanded ? null : it.id)
                                  }
                                  className="h-8 w-8 p-0"
                                  title={isExpanded ? "Contraer detalles" : "Expandir detalles"}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>

                                <button
                                  type="button"
                                  onClick={() => removeItem(day.id, it.id)}
                                  className="rounded p-1 text-text-3 hover:text-danger-text"
                                  title="Eliminar ítem"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Collapsed Description row */}
                            <div className="flex gap-2">
                              <Input
                                value={it.description}
                                onChange={(e) =>
                                  updateItem(day.id, it.id, { description: e.target.value })
                                }
                                placeholder="Notas o descripción rápida del servicio..."
                                className="text-xs h-7 text-text-2"
                              />
                            </div>

                            {/* Expandable Details Container */}
                            {isExpanded && (
                              <div className="pt-3 border-t space-y-4 text-xs">
                                {/* PNR & Assigned Option */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-muted/30 p-3 rounded-lg border">
                                  <div className="sm:col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-3">
                                      PNR / Localizador
                                    </label>
                                    <Input
                                      value={it.pnr || ""}
                                      onChange={(e) =>
                                        updateItem(day.id, it.id, {
                                          pnr: e.target.value.toUpperCase(),
                                        })
                                      }
                                      placeholder="Ej. ABC123"
                                      className="font-mono uppercase font-bold text-xs h-8"
                                    />
                                  </div>

                                  <div className="sm:col-span-4 space-y-1">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-text-3">
                                      Opción Multicotización
                                    </label>
                                    <select
                                      value={
                                        it.assignedOptions && it.assignedOptions[0]
                                          ? it.assignedOptions[0]
                                          : "Shared"
                                      }
                                      onChange={(e) =>
                                        updateItem(day.id, it.id, {
                                          assignedOptions: [
                                            e.target.value as "A" | "B" | "C" | "Shared",
                                          ],
                                        })
                                      }
                                      className="h-8 w-full rounded-md border border-input bg-card px-2.5 text-xs font-semibold"
                                    >
                                      <option value="Shared">Compartido (Todas las opciones)</option>
                                      <option value="A">Opción A</option>
                                      <option value="B">Opción B</option>
                                      <option value="C">Opción C</option>
                                    </select>
                                  </div>

                                  <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={!!it.pricePerPerson}
                                        onChange={(e) =>
                                          updateItem(day.id, it.id, {
                                            pricePerPerson: e.target.checked,
                                          })
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                                      />
                                      <span className="text-[11px] font-bold text-foreground">
                                        Tarifa por persona
                                      </span>
                                    </label>
                                  </div>
                                </div>

                                {/* Pricing Breakdown */}
                                <div className="bg-card p-3 rounded-lg border space-y-3">
                                  <div className="flex items-center justify-between border-b pb-2">
                                    <span className="text-[11px] font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                                      <DollarSign className="h-3.5 w-3.5 text-brand-text" />
                                      Desglose de Costos y Precios
                                    </span>
                                    <span className="text-[11px] text-text-3">
                                      {it.pricePerPerson
                                        ? `Cálculo x ${passengers} Adultos ${
                                            childPassengers > 0
                                              ? `+ ${childPassengers} Niños`
                                              : ""
                                          }`
                                        : "Costo Global del Grupo"}
                                    </span>
                                  </div>

                                  {it.pricePerPerson ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      {/* Adult breakdown */}
                                      <div className="bg-muted/20 p-2.5 rounded-lg border space-y-2">
                                        <div className="flex justify-between items-center border-b pb-1">
                                          <span className="font-bold text-xs text-foreground">
                                            Adulto
                                          </span>
                                          <span className="text-[10px] font-bold text-text-3 bg-muted px-1.5 py-0.5 rounded">
                                            {passengers} pax
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-text-3">
                                              Costo Neto Unitario
                                            </label>
                                            <Input
                                              type="number"
                                              value={it.netPriceAdult || ""}
                                              onChange={(e) =>
                                                updateItem(day.id, it.id, {
                                                  netPriceAdult: Number(e.target.value),
                                                })
                                              }
                                              placeholder="0"
                                              className="h-8 text-xs text-right"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-emerald-600">
                                              Markup / Comisión Unitario
                                            </label>
                                            <Input
                                              type="number"
                                              value={it.markupAdult || ""}
                                              onChange={(e) =>
                                                updateItem(day.id, it.id, {
                                                  markupAdult: Number(e.target.value),
                                                })
                                              }
                                              placeholder="0"
                                              className="h-8 text-xs text-right font-semibold text-emerald-600"
                                            />
                                          </div>
                                        </div>
                                        <div className="text-[10px] text-text-3 text-right pt-1 border-t">
                                          Total Adulto:{" "}
                                          <span className="font-bold text-foreground">
                                            {formatCurrency(
                                              ((it.netPriceAdult || 0) +
                                                (it.markupAdult || 0)) *
                                                passengers,
                                              currency
                                            )}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Child breakdown */}
                                      <div className="bg-muted/20 p-2.5 rounded-lg border space-y-2">
                                        <div className="flex justify-between items-center border-b pb-1">
                                          <span className="font-bold text-xs text-foreground">
                                            Niño
                                          </span>
                                          <span className="text-[10px] font-bold text-text-3 bg-muted px-1.5 py-0.5 rounded">
                                            {childPassengers} pax
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-text-3">
                                              Costo Neto Unitario
                                            </label>
                                            <Input
                                              type="number"
                                              disabled={childPassengers === 0}
                                              value={it.netPriceChild || ""}
                                              onChange={(e) =>
                                                updateItem(day.id, it.id, {
                                                  netPriceChild: Number(e.target.value),
                                                })
                                              }
                                              placeholder="0"
                                              className="h-8 text-xs text-right disabled:opacity-50"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-semibold text-emerald-600">
                                              Markup / Comisión Unitario
                                            </label>
                                            <Input
                                              type="number"
                                              disabled={childPassengers === 0}
                                              value={it.markupChild || ""}
                                              onChange={(e) =>
                                                updateItem(day.id, it.id, {
                                                  markupChild: Number(e.target.value),
                                                })
                                              }
                                              placeholder="0"
                                              className="h-8 text-xs text-right font-semibold text-emerald-600 disabled:opacity-50"
                                            />
                                          </div>
                                        </div>
                                        <div className="text-[10px] text-text-3 text-right pt-1 border-t">
                                          Total Niños:{" "}
                                          <span className="font-bold text-foreground">
                                            {formatCurrency(
                                              ((it.netPriceChild || 0) +
                                                (it.markupChild || 0)) *
                                                childPassengers,
                                              currency
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Costo Neto Total Grupo
                                        </label>
                                        <Input
                                          type="number"
                                          value={it.netPrice || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              netPrice: Number(e.target.value),
                                            })
                                          }
                                          placeholder="0"
                                          className="h-8 text-xs text-right font-semibold"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-emerald-600">
                                          Markup / Comisión Total Grupo
                                        </label>
                                        <Input
                                          type="number"
                                          value={it.markup || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              markup: Number(e.target.value),
                                            })
                                          }
                                          placeholder="0"
                                          className="h-8 text-xs text-right font-semibold text-emerald-600"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Flight Specific Form */}
                                {it.type === "Flight" && (
                                  <div className="p-3 bg-muted/20 rounded-lg border space-y-3">
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                      <Plane className="h-3.5 w-3.5 text-brand-text" />
                                      Detalles del Vuelo
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-5 relative space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Aerolínea
                                        </label>
                                        <Input
                                          value={it.flightDetails?.airline || ""}
                                          onFocus={() => setActiveAirlineItemId(it.id)}
                                          onBlur={() =>
                                            setTimeout(() => setActiveAirlineItemId(null), 250)
                                          }
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: e.target.value,
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          placeholder="Avianca, LATAM, Iberia..."
                                          className="h-8 text-xs font-semibold"
                                        />

                                        {activeAirlineItemId === it.id &&
                                          airlineSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-lg shadow-xl border z-50 overflow-hidden py-1">
                                              {airlineSuggestions.map((a) => (
                                                <button
                                                  key={a.iata + a.name}
                                                  type="button"
                                                  onClick={() => {
                                                    updateItem(day.id, it.id, {
                                                      flightDetails: {
                                                        airline: `${a.name} (${a.iata})`,
                                                        flightNumber:
                                                          it.flightDetails?.flightNumber ||
                                                          "",
                                                        origin:
                                                          it.flightDetails?.origin || "",
                                                        destination:
                                                          it.flightDetails?.destination ||
                                                          "",
                                                        departureDate:
                                                          it.flightDetails?.departureDate ||
                                                          "",
                                                        departureTime:
                                                          it.flightDetails?.departureTime ||
                                                          "",
                                                        arrivalDate:
                                                          it.flightDetails?.arrivalDate ||
                                                          "",
                                                        arrivalTime:
                                                          it.flightDetails?.arrivalTime ||
                                                          "",
                                                        cabin:
                                                          it.flightDetails?.cabin ||
                                                          "Economica",
                                                        baggageAllowance:
                                                          it.flightDetails
                                                            ?.baggageAllowance,
                                                      },
                                                    });
                                                    setActiveAirlineItemId(null);
                                                  }}
                                                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-muted text-left transition text-xs border-b last:border-0"
                                                >
                                                  <span className="font-bold text-foreground">
                                                    {a.name}
                                                  </span>
                                                  <span className="text-[10px] text-text-3 font-mono">
                                                    ({a.iata})
                                                  </span>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                      </div>

                                      <div className="sm:col-span-3 space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Vuelo #
                                        </label>
                                        <Input
                                          value={it.flightDetails?.flightNumber || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber: e.target.value.toUpperCase(),
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          placeholder="AV 8520"
                                          className="h-8 text-xs font-mono font-bold uppercase"
                                        />
                                      </div>

                                      <div className="sm:col-span-4 space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Clase de Cabina
                                        </label>
                                        <select
                                          value={it.flightDetails?.cabin || "Economica"}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin: e.target.value as
                                                  | "Economica"
                                                  | "Premium Economy"
                                                  | "Ejecutiva"
                                                  | "Primera Clase",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs"
                                        >
                                          <option value="Economica">Económica</option>
                                          <option value="Premium Economy">Premium Economy</option>
                                          <option value="Ejecutiva">Ejecutiva</option>
                                          <option value="Primera Clase">Primera Clase</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Origen (Ciudad o Aeropuerto)
                                        </label>
                                        <Input
                                          value={it.flightDetails?.origin || ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const mapped = CITY_AIRPORT_MAP[val.toLowerCase()];
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: mapped || val,
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            });
                                          }}
                                          placeholder="Medellín, BOG, Madrid..."
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Destino (Ciudad o Aeropuerto)
                                        </label>
                                        <Input
                                          value={it.flightDetails?.destination || ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const mapped = CITY_AIRPORT_MAP[val.toLowerCase()];
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination: mapped || val,
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            });
                                          }}
                                          placeholder="Cancún, Punta Cana, MIA..."
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Fecha Salida
                                        </label>
                                        <Input
                                          type="date"
                                          value={it.flightDetails?.departureDate || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate: e.target.value,
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Hora Salida
                                        </label>
                                        <Input
                                          type="time"
                                          value={it.flightDetails?.departureTime || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime: e.target.value,
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Fecha Llegada
                                        </label>
                                        <Input
                                          type="date"
                                          value={it.flightDetails?.arrivalDate || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate: e.target.value,
                                                arrivalTime:
                                                  it.flightDetails?.arrivalTime || "",
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Hora Llegada
                                        </label>
                                        <Input
                                          type="time"
                                          value={it.flightDetails?.arrivalTime || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              flightDetails: {
                                                airline: it.flightDetails?.airline || "",
                                                flightNumber:
                                                  it.flightDetails?.flightNumber || "",
                                                origin: it.flightDetails?.origin || "",
                                                destination:
                                                  it.flightDetails?.destination || "",
                                                departureDate:
                                                  it.flightDetails?.departureDate || "",
                                                departureTime:
                                                  it.flightDetails?.departureTime || "",
                                                arrivalDate:
                                                  it.flightDetails?.arrivalDate || "",
                                                arrivalTime: e.target.value,
                                                cabin:
                                                  it.flightDetails?.cabin || "Economica",
                                                baggageAllowance:
                                                  it.flightDetails?.baggageAllowance,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Hotel Specific Form */}
                                {it.type === "Hotel" && (
                                  <div className="p-3 bg-muted/20 rounded-lg border space-y-3">
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                      <Hotel className="h-3.5 w-3.5 text-brand-text" />
                                      Detalles del Hotel / Hospedaje
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                      <div className="sm:col-span-6 space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Nombre del Hotel
                                        </label>
                                        <Input
                                          value={it.hotelDetails?.hotelName || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              hotelDetails: {
                                                hotelName: e.target.value,
                                                address: it.hotelDetails?.address || "",
                                                checkIn: it.hotelDetails?.checkIn || "",
                                                checkOut: it.hotelDetails?.checkOut || "",
                                                roomType:
                                                  it.hotelDetails?.roomType ||
                                                  "Habitación Estándar",
                                                boardBasis:
                                                  it.hotelDetails?.boardBasis || "Desayuno",
                                                stars: it.hotelDetails?.stars || 4,
                                              },
                                            })
                                          }
                                          placeholder="Riu Palace, Marriott, Decameron..."
                                          className="h-8 text-xs font-semibold"
                                        />
                                      </div>

                                      <div className="sm:col-span-6 space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Régimen de Alimentación
                                        </label>
                                        <select
                                          value={it.hotelDetails?.boardBasis || "Desayuno"}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              hotelDetails: {
                                                hotelName:
                                                  it.hotelDetails?.hotelName || "",
                                                address: it.hotelDetails?.address || "",
                                                checkIn: it.hotelDetails?.checkIn || "",
                                                checkOut: it.hotelDetails?.checkOut || "",
                                                roomType:
                                                  it.hotelDetails?.roomType ||
                                                  "Habitación Estándar",
                                                boardBasis: e.target.value as
                                                  | "Solo Habitacion"
                                                  | "Desayuno"
                                                  | "Media Pension"
                                                  | "Pension Completa"
                                                  | "Todo Incluido",
                                                stars: it.hotelDetails?.stars || 4,
                                              },
                                            })
                                          }
                                          className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs font-semibold"
                                        >
                                          <option value="Solo Habitacion">Solo Habitación (EP)</option>
                                          <option value="Desayuno">Desayuno Incluido (CP)</option>
                                          <option value="Media Pension">Media Pensión (MAP)</option>
                                          <option value="Pension Completa">Pensión Completa (FAP)</option>
                                          <option value="Todo Incluido">Todo Incluido (All Inclusive)</option>
                                        </select>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Tipo de Habitación
                                        </label>
                                        <Input
                                          value={it.hotelDetails?.roomType || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              hotelDetails: {
                                                hotelName:
                                                  it.hotelDetails?.hotelName || "",
                                                address: it.hotelDetails?.address || "",
                                                checkIn: it.hotelDetails?.checkIn || "",
                                                checkOut: it.hotelDetails?.checkOut || "",
                                                roomType: e.target.value,
                                                boardBasis:
                                                  it.hotelDetails?.boardBasis || "Desayuno",
                                                stars: it.hotelDetails?.stars || 4,
                                              },
                                            })
                                          }
                                          placeholder="Doble Estándar, Suite Vista al Mar..."
                                          className="h-8 text-xs"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Fecha Check-In
                                        </label>
                                        <Input
                                          type="date"
                                          value={it.hotelDetails?.checkIn || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              hotelDetails: {
                                                hotelName:
                                                  it.hotelDetails?.hotelName || "",
                                                address: it.hotelDetails?.address || "",
                                                checkIn: e.target.value,
                                                checkOut: it.hotelDetails?.checkOut || "",
                                                roomType:
                                                  it.hotelDetails?.roomType ||
                                                  "Habitación Estándar",
                                                boardBasis:
                                                  it.hotelDetails?.boardBasis || "Desayuno",
                                                stars: it.hotelDetails?.stars || 4,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Fecha Check-Out
                                        </label>
                                        <Input
                                          type="date"
                                          value={it.hotelDetails?.checkOut || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              hotelDetails: {
                                                hotelName:
                                                  it.hotelDetails?.hotelName || "",
                                                address: it.hotelDetails?.address || "",
                                                checkIn: it.hotelDetails?.checkIn || "",
                                                checkOut: e.target.value,
                                                roomType:
                                                  it.hotelDetails?.roomType ||
                                                  "Habitación Estándar",
                                                boardBasis:
                                                  it.hotelDetails?.boardBasis || "Desayuno",
                                                stars: it.hotelDetails?.stars || 4,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Transfer Specific Form */}
                                {it.type === "Transfer" && (
                                  <div className="p-3 bg-muted/20 rounded-lg border space-y-3">
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                      <Truck className="h-3.5 w-3.5 text-brand-text" />
                                      Detalles del Traslado
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Punto de Recogida (Pickup)
                                        </label>
                                        <Input
                                          value={it.transferDetails?.pickupPoint || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              transferDetails: {
                                                pickupPoint: e.target.value,
                                                dropoffPoint:
                                                  it.transferDetails?.dropoffPoint || "",
                                                date: it.transferDetails?.date || "",
                                                time: it.transferDetails?.time || "",
                                                vehicleType:
                                                  it.transferDetails?.vehicleType || "",
                                                passengers:
                                                  it.transferDetails?.passengers ||
                                                  passengers + childPassengers,
                                              },
                                            })
                                          }
                                          placeholder="Aeropuerto Internacional..."
                                          className="h-8 text-xs"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Punto de Bajada (Dropoff)
                                        </label>
                                        <Input
                                          value={it.transferDetails?.dropoffPoint || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              transferDetails: {
                                                pickupPoint:
                                                  it.transferDetails?.pickupPoint || "",
                                                dropoffPoint: e.target.value,
                                                date: it.transferDetails?.date || "",
                                                time: it.transferDetails?.time || "",
                                                vehicleType:
                                                  it.transferDetails?.vehicleType || "",
                                                passengers:
                                                  it.transferDetails?.passengers ||
                                                  passengers + childPassengers,
                                              },
                                            })
                                          }
                                          placeholder="Hotel o dirección..."
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Fecha
                                        </label>
                                        <Input
                                          type="date"
                                          value={it.transferDetails?.date || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              transferDetails: {
                                                pickupPoint:
                                                  it.transferDetails?.pickupPoint || "",
                                                dropoffPoint:
                                                  it.transferDetails?.dropoffPoint || "",
                                                date: e.target.value,
                                                time: it.transferDetails?.time || "",
                                                vehicleType:
                                                  it.transferDetails?.vehicleType || "",
                                                passengers:
                                                  it.transferDetails?.passengers ||
                                                  passengers + childPassengers,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Hora
                                        </label>
                                        <Input
                                          type="time"
                                          value={it.transferDetails?.time || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              transferDetails: {
                                                pickupPoint:
                                                  it.transferDetails?.pickupPoint || "",
                                                dropoffPoint:
                                                  it.transferDetails?.dropoffPoint || "",
                                                date: it.transferDetails?.date || "",
                                                time: e.target.value,
                                                vehicleType:
                                                  it.transferDetails?.vehicleType || "",
                                                passengers:
                                                  it.transferDetails?.passengers ||
                                                  passengers + childPassengers,
                                              },
                                            })
                                          }
                                          className="h-8 text-xs"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Tipo de Vehículo
                                        </label>
                                        <Input
                                          value={it.transferDetails?.vehicleType || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, {
                                              transferDetails: {
                                                pickupPoint:
                                                  it.transferDetails?.pickupPoint || "",
                                                dropoffPoint:
                                                  it.transferDetails?.dropoffPoint || "",
                                                date: it.transferDetails?.date || "",
                                                time: it.transferDetails?.time || "",
                                                vehicleType: e.target.value,
                                                passengers:
                                                  it.transferDetails?.passengers ||
                                                  passengers + childPassengers,
                                              },
                                            })
                                          }
                                          placeholder="Van compartida, Sedán privado..."
                                          className="h-8 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
