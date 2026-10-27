"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Plane,
  Plus,
  Save,
  Trash2,
  X,
  Hotel,
  Car,
  Compass,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, calculateDetailedQuoteTotals } from "@/lib/travel/pricing";
import type {
  TravelCurrency,
  TravelDay,
  TravelItineraryItem,
  TravelItemType,
} from "@/lib/travel/types";
import type {
  CreatePackageInput,
  PackageStatus,
  TravelPackageDto,
} from "@/server/travel/packages";

export function PackageBuilder({
  initialPackage,
  onClose,
  onSaved,
  onQuoteWithPackage,
}: {
  initialPackage?: TravelPackageDto | null;
  onClose: () => void;
  onSaved: (pkg: TravelPackageDto) => void;
  onQuoteWithPackage?: (pkg: TravelPackageDto) => void;
}) {
  const isEditing = Boolean(initialPackage);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Información General del Paquete (Sin datos de cliente)
  const [title, setTitle] = useState(initialPackage?.title ?? "");
  const [description, setDescription] = useState(initialPackage?.description ?? "");
  const [destination, setDestination] = useState(initialPackage?.destination ?? "");
  const [originCity, _setOriginCity] = useState(initialPackage?.originCity ?? "");
  const [departureAirport, _setDepartureAirport] = useState(initialPackage?.departureAirport ?? "");
  const [arrivalAirport, _setArrivalAirport] = useState(initialPackage?.arrivalAirport ?? "");
  const [flightType, _setFlightType] = useState<"round-trip" | "one-way">(
    initialPackage?.flightType ?? "round-trip"
  );
  const [startDate, setStartDate] = useState(initialPackage?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialPackage?.endDate ?? "");
  const [nights, setNights] = useState<number>(initialPackage?.nights ?? 4);
  const [passengers, setPassengers] = useState<number>(initialPackage?.passengers ?? 2);
  const [childPassengers, setChildPassengers] = useState<number>(initialPackage?.childPassengers ?? 0);
  const [status, setStatus] = useState<PackageStatus>(initialPackage?.status ?? "active");

  // Parámetros Financieros
  const [currency, setCurrency] = useState<TravelCurrency>(initialPackage?.currency ?? "COP");
  const [exchangeRate, _setExchangeRate] = useState<number>(initialPackage?.exchangeRate ?? 1);
  const [markupPercentage, setMarkupPercentage] = useState<number>(initialPackage?.markupPercentage ?? 15);
  const [taxes, setTaxes] = useState<number>(initialPackage?.taxes ?? 0);
  const [administrativeFee, setAdministrativeFee] = useState<number>(initialPackage?.administrativeFee ?? 0);
  const [medicalAssistance, setMedicalAssistance] = useState<number>(initialPackage?.medicalAssistance ?? 0);
  const [agencyCommission, _setAgencyCommission] = useState<number>(initialPackage?.agencyCommission ?? 0);
  const [profitability, _setProfitability] = useState<number>(initialPackage?.profitability ?? 75);
  const [freelanceCommission, _setFreelanceCommission] = useState<number>(initialPackage?.freelanceCommission ?? 10);
  const [minimumDeposit, _setMinimumDeposit] = useState<number>(initialPackage?.minimumDeposit ?? 0);
  const [selectedHotelId, _setSelectedHotelId] = useState<string | null>(initialPackage?.selectedHotelId ?? null);

  // Itinerario y Servicios
  const [days, setDays] = useState<TravelDay[]>(
    initialPackage?.days ?? [
      {
        id: "day_1",
        dayNumber: 1,
        items: [],
      },
    ]
  );

  // Textos Comerciales
  const [inclusions, setInclusions] = useState(initialPackage?.inclusions ?? "");
  const [exclusions, setExclusions] = useState(initialPackage?.exclusions ?? "");
  const [policies, setPolicies] = useState(initialPackage?.policies ?? "");

  // Secciones colapsables
  const [showGeneral, setShowGeneral] = useState(true);
  const [showItinerary, setShowItinerary] = useState(true);
  const [showFinancial, setShowFinancial] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  // Autocalcular noches si cambian las fechas
  function handleStartDateChange(date: string) {
    setStartDate(date);
    if (date && endDate) {
      const start = new Date(date);
      const end = new Date(endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setNights(diffDays);
        adjustDaysCount(diffDays + 1);
      }
    }
  }

  function handleEndDateChange(date: string) {
    setEndDate(date);
    if (startDate && date) {
      const start = new Date(startDate);
      const end = new Date(date);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        setNights(diffDays);
        adjustDaysCount(diffDays + 1);
      }
    }
  }

  function adjustDaysCount(targetCount: number) {
    if (targetCount <= 0) return;
    setDays((prev) => {
      if (prev.length === targetCount) return prev;
      if (prev.length < targetCount) {
        const extra: TravelDay[] = [];
        for (let i = prev.length + 1; i <= targetCount; i++) {
          extra.push({
            id: `day_${i}_${Date.now()}`,
            dayNumber: i,
            items: [],
          });
        }
        return [...prev, ...extra];
      }
      return prev.slice(0, targetCount);
    });
  }

  // Cálculos financieros en tiempo real
  const totals = useMemo(() => {
    return calculateDetailedQuoteTotals({
      passengers,
      childPassengers,
      currency,
      days,
      markupPercentage,
      taxes,
      administrativeFee,
      agencyCommission,
      profitability,
    });
  }, [
    passengers,
    childPassengers,
    currency,
    days,
    markupPercentage,
    taxes,
    administrativeFee,
    agencyCommission,
    profitability,
  ]);

  // Manejo de Items en Días
  function handleAddItem(dayIndex: number, type: TravelItemType) {
    setDays((prev) => {
      const next = [...prev];
      const targetDay = next[dayIndex];
      if (!targetDay) return prev;

      const newItem: TravelItineraryItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        title:
          type === "Hotel"
            ? "Hotel predeterminado"
            : type === "Flight"
            ? "Vuelo programado"
            : type === "Transfer"
            ? "Traslado aeropuerto - hotel"
            : type === "Activity"
            ? "Tour o excursión guiada"
            : "Servicio turístico",
        description: "",
        netPrice: 0,
        markup: 0,
        totalPrice: 0,
      };

      if (type === "Hotel") {
        newItem.hotelDetails = {
          hotelName: "Hotel sugerido",
          address: destination,
          checkIn: startDate,
          checkOut: endDate,
          roomType: "Estándar",
          boardBasis: "Todo Incluido",
        };
      } else if (type === "Flight") {
        newItem.flightDetails = {
          airline: "Aerolínea",
          flightNumber: "",
          origin: originCity || "Origen",
          destination: destination || "Destino",
          departureDate: startDate,
          departureTime: "08:00",
          arrivalDate: startDate,
          arrivalTime: "10:30",
          cabin: "Economica",
        };
      }

      next[dayIndex] = {
        ...targetDay,
        items: [...targetDay.items, newItem],
      };
      return next;
    });
  }

  function handleUpdateItem(dayIndex: number, itemIndex: number, patch: Partial<TravelItineraryItem>) {
    setDays((prev) => {
      const next = [...prev];
      const targetDay = next[dayIndex];
      if (!targetDay) return prev;
      const currentItem = targetDay.items[itemIndex];
      if (!currentItem) return prev;
      const nextItems = [...targetDay.items];
      nextItems[itemIndex] = { ...currentItem, ...patch };
      next[dayIndex] = {
        ...targetDay,
        items: nextItems,
      };
      return next;
    });
  }

  function handleDeleteItem(dayIndex: number, itemIndex: number) {
    setDays((prev) => {
      const next = [...prev];
      const targetDay = next[dayIndex];
      if (!targetDay) return prev;
      next[dayIndex] = {
        ...targetDay,
        items: targetDay.items.filter((_, idx) => idx !== itemIndex),
      };
      return next;
    });
  }

  async function handleSavePackage(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast("El título del paquete es obligatorio", "warning");
      return;
    }
    if (!destination.trim()) {
      toast("El destino del paquete es obligatorio", "warning");
      return;
    }
    if (!startDate || !endDate) {
      toast("Las fechas específicas de ida y vuelta son obligatorias", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<CreatePackageInput> = {
        title: title.trim(),
        description: description.trim() || null,
        destination: destination.trim(),
        originCity: originCity.trim() || null,
        departureAirport: departureAirport.trim() || null,
        arrivalAirport: arrivalAirport.trim() || null,
        flightType,
        startDate,
        endDate,
        nights,
        passengers,
        childPassengers,
        currency,
        exchangeRate,
        markupPercentage,
        taxes,
        agencyCommission,
        minimumDeposit,
        administrativeFee,
        medicalAssistance,
        profitability,
        freelanceCommission,
        selectedHotelId,
        days,
        inclusions: inclusions.trim() || null,
        exclusions: exclusions.trim() || null,
        policies: policies.trim() || null,
        status,
      };

      const url = isEditing && initialPackage
        ? `/api/travel/packages/${initialPackage.id}`
        : "/api/travel/packages";
      const method = isEditing && initialPackage ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(errJson?.error?.message ?? "Error al guardar paquete");
      }

      const json = (await res.json()) as { package: TravelPackageDto };
      toast("Paquete turístico guardado exitosamente", "success");
      onSaved(json.package);
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Error al guardar el paquete", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header fijo */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
            <X className="h-4 w-4" />
            <span>Cerrar</span>
          </Button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {isEditing && initialPackage ? `Editar: ${initialPackage.title}` : "Nuevo Paquete Turístico"}
            </h2>
            <p className="text-xs text-text-3">
              Plantilla comercial prediligenciada sin información de cliente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && initialPackage && onQuoteWithPackage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuoteWithPackage(initialPackage)}
              className="gap-1.5 text-brand border-brand/30 hover:bg-brand-soft"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Cotizar con este Paquete</span>
            </Button>
          )}

          <Button
            type="submit"
            form="package-form"
            size="sm"
            disabled={saving}
            className="gap-1.5 bg-brand text-brand-fg hover:opacity-90"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Guardando…" : "Guardar Paquete"}</span>
          </Button>
        </div>
      </div>

      {/* Cuerpo scrolleable del editor */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <form
          id="package-form"
          onSubmit={handleSavePackage}
          className="mx-auto max-w-5xl space-y-6"
        >
          {/* 1. Datos Básicos del Paquete */}
          <div className="rounded-lg border bg-card p-5 shadow-xs">
            <div
              className="flex cursor-pointer items-center justify-between border-b pb-3"
              onClick={() => setShowGeneral(!showGeneral)}
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">
                  Información Comercial y Fechas Fijas
                </h3>
              </div>
              <button type="button" className="text-text-3">
                {showGeneral ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showGeneral && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">
                      Título comercial del paquete *
                    </label>
                    <Input
                      required
                      placeholder="Ej. Cancún All Inclusive 5D/4N - Temporada Verano"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Estado del paquete
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PackageStatus)}
                      className="w-full rounded-sm border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <option value="active">Activo (Visible para cotizar)</option>
                      <option value="draft">Borrador (En preparación)</option>
                      <option value="archived">Archivado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">
                      Destino principal *
                    </label>
                    <Input
                      required
                      placeholder="Ej. Cancún, México o San Andrés"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Fecha específica de Salida *
                    </label>
                    <Input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Fecha específica de Regreso *
                    </label>
                    <Input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Duración (Noches)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={nights}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setNights(val);
                        adjustDaysCount(val + 1);
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Pasajeros base (Adultos)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value) || 1)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Niños base
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={childPassengers}
                      onChange={(e) => setChildPassengers(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Moneda
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as TravelCurrency)}
                      className="w-full rounded-sm border bg-background px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <option value="COP">COP ($)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="MXN">MXN ($)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Descripción / Gancho promocional
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Breve reseña destacada de este paquete para el catálogo..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Resumen Financiero y Margen */}
          <div className="rounded-lg border bg-card p-5 shadow-xs">
            <div
              className="flex cursor-pointer items-center justify-between border-b pb-3"
              onClick={() => setShowFinancial(!showFinancial)}
            >
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-foreground">
                  Configuración de Precios y Márgenes
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-emerald-600">
                  Total paquete: {formatCurrency(totals.finalTotal, currency)}
                </span>
                <button type="button" className="text-text-3">
                  {showFinancial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showFinancial && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Margen de Ganancia (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={markupPercentage}
                      onChange={(e) => setMarkupPercentage(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Impuestos / Tasas
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={taxes}
                      onChange={(e) => setTaxes(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Fee Administrativo
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={administrativeFee}
                      onChange={(e) => setAdministrativeFee(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Asistencia Médica
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={medicalAssistance}
                      onChange={(e) => setMedicalAssistance(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Desglose rápido */}
                <div className="grid grid-cols-2 gap-3 rounded-md bg-subtle/50 p-3 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-text-3">Costo base neto:</span>
                    <p className="font-mono font-bold text-foreground">
                      {formatCurrency(totals.subtotal, currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-3">Utilidad agencia:</span>
                    <p className="font-mono font-bold text-emerald-600">
                      {formatCurrency(totals.markupAmount, currency)}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-3">Precio por persona:</span>
                    <p className="font-mono font-bold text-foreground">
                      {formatCurrency(
                        passengers + childPassengers > 0
                          ? totals.finalTotal / (passengers + childPassengers)
                          : totals.finalTotal,
                        currency
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-text-3">Precio total venta:</span>
                    <p className="font-mono font-bold text-brand">
                      {formatCurrency(totals.finalTotal, currency)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Itinerario Día a Día */}
          <div className="rounded-lg border bg-card p-5 shadow-xs">
            <div
              className="flex cursor-pointer items-center justify-between border-b pb-3"
              onClick={() => setShowItinerary(!showItinerary)}
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">
                  Itinerario y Servicios Incluidos ({days.length} días)
                </h3>
              </div>
              <button type="button" className="text-text-3">
                {showItinerary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showItinerary && (
              <div className="mt-4 space-y-6">
                {days.map((day, dayIdx) => (
                  <div
                    key={day.id}
                    className="rounded-md border border-border/80 bg-subtle/20 p-4"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand">
                        Día {day.dayNumber}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddItem(dayIdx, "Hotel")}
                          className="h-7 text-xs gap-1"
                        >
                          <Hotel className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Hotel</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddItem(dayIdx, "Flight")}
                          className="h-7 text-xs gap-1"
                        >
                          <Plane className="h-3.5 w-3.5 text-brand" />
                          <span>Vuelo</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddItem(dayIdx, "Transfer")}
                          className="h-7 text-xs gap-1"
                        >
                          <Car className="h-3.5 w-3.5 text-amber-600" />
                          <span>Traslado</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddItem(dayIdx, "Activity")}
                          className="h-7 text-xs gap-1"
                        >
                          <Compass className="h-3.5 w-3.5 text-purple-600" />
                          <span>Actividad</span>
                        </Button>
                      </div>
                    </div>

                    {/* Lista de Items del Día */}
                    <div className="mt-3 space-y-3">
                      {day.items.length === 0 ? (
                        <p className="py-2 text-center text-xs text-text-3">
                          Sin servicios en este día. Haz clic en Hotel, Vuelo, Traslado o Actividad para agregar.
                        </p>
                      ) : (
                        day.items.map((item, itemIdx) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-2 rounded border bg-card p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {item.type === "Hotel" && <Hotel className="h-4 w-4 shrink-0 text-emerald-600" />}
                              {item.type === "Flight" && <Plane className="h-4 w-4 shrink-0 text-brand" />}
                              {item.type === "Transfer" && <Car className="h-4 w-4 shrink-0 text-amber-600" />}
                              {item.type === "Activity" && <Compass className="h-4 w-4 shrink-0 text-purple-600" />}

                              <Input
                                value={item.title}
                                onChange={(e) =>
                                  handleUpdateItem(dayIdx, itemIdx, { title: e.target.value })
                                }
                                placeholder="Nombre del servicio..."
                                className="h-8 text-xs font-semibold"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-text-3">Costo:</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={item.totalPrice}
                                  onChange={(e) =>
                                    handleUpdateItem(dayIdx, itemIdx, {
                                      totalPrice: Number(e.target.value) || 0,
                                      netPrice: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="h-8 w-24 text-right font-mono text-xs"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(dayIdx, itemIdx)}
                                className="rounded p-1 text-text-3 hover:text-danger-text"
                                title="Eliminar servicio"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDays((prev) => [
                      ...prev,
                      {
                        id: `day_${prev.length + 1}_${Date.now()}`,
                        dayNumber: prev.length + 1,
                        items: [],
                      },
                    ]);
                    setNights(days.length);
                  }}
                  className="w-full gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Añadir Día al Itinerario</span>
                </Button>
              </div>
            )}
          </div>

          {/* 4. Inclusiones, Exclusiones y Políticas */}
          <div className="rounded-lg border bg-card p-5 shadow-xs">
            <div
              className="flex cursor-pointer items-center justify-between border-b pb-3"
              onClick={() => setShowTerms(!showTerms)}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand" />
                <h3 className="text-sm font-bold text-foreground">
                  Inclusiones, Exclusiones y Políticas del Paquete
                </h3>
              </div>
              <button type="button" className="text-text-3">
                {showTerms ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showTerms && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Lo que incluye
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="• Tiquetes aéreos ida y vuelta&#10;• Alojamiento plan todo incluido&#10;• Traslados aeropuerto - hotel"
                    value={inclusions}
                    onChange={(e) => setInclusions(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Lo que no incluye
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="• Gastos no especificados&#10;• Propinas voluntarias&#10;• Excursiones opcionales"
                    value={exclusions}
                    onChange={(e) => setExclusions(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Políticas de reserva y cancelación
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="• Tarifa no reembolsable&#10;• Penalidad por cambio de nombre&#10;• Depósito del 30% al confirmar"
                    value={policies}
                    onChange={(e) => setPolicies(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
