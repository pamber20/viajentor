"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  Car,
  Check,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Hotel,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Package,
  Plane,
  Plus,
  Shield,
  ShieldCheck,
  Sparkles,
  Trash2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SupplierCombobox } from "@/components/travel/suppliers/supplier-combobox";
import {
  calculateDetailedQuoteTotals,
  formatCurrency,
  generateAutoInstallments,
} from "@/lib/travel/pricing";
import type {
  FlightDetails,
  HotelDetails,
  TravelCurrency,
  TravelDay,
  TravelInstallment,
  TravelItemType,
  TravelItineraryItem,
} from "@/lib/travel/types";
import type {
  CreatePackageInput,
  PackageStatus,
  TravelPackageDto,
} from "@/server/travel/packages";
import {
  AIRPORT_DATA,
  DESTINATION_TEMPLATES,
  mapItemTypeToSupplier,
  type AirportItem,
} from "@/components/travel/quotes/quote-builder";

interface TravelPayoutsItem {
  name?: string;
  city_name?: string;
  country_name?: string;
  type?: string;
  code?: string;
}

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

  // Paso 2: Datos Comerciales, Destinos, Fechas y Pasajeros
  const [title, setTitle] = useState(initialPackage?.title ?? "");
  const [description, setDescription] = useState(initialPackage?.description ?? "");
  const [status, setStatus] = useState<PackageStatus>(initialPackage?.status ?? "active");
  const [destination, setDestination] = useState(initialPackage?.destination ?? "");
  const [originCity, setOriginCity] = useState(initialPackage?.originCity ?? "");
  const [departureAirport, setDepartureAirport] = useState(initialPackage?.departureAirport ?? "");
  const [arrivalAirport, setArrivalAirport] = useState(initialPackage?.arrivalAirport ?? "");
  const [flightType, setFlightType] = useState<"round-trip" | "one-way">(
    initialPackage?.flightType ?? "round-trip"
  );
  const [startDate, setStartDate] = useState(initialPackage?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialPackage?.endDate ?? "");
  const [nights, setNights] = useState<number>(initialPackage?.nights ?? 4);
  const [passengers, setPassengers] = useState<number>(initialPackage?.passengers ?? 2);
  const [childPassengers, setChildPassengers] = useState<number>(initialPackage?.childPassengers ?? 0);
  const [rooms, setRooms] = useState<number>(1);
  const [flexibility, setFlexibility] = useState("No");

  // Parámetros Financieros (Paso 5)
  const [currency, setCurrency] = useState<TravelCurrency>(initialPackage?.currency ?? "COP");
  const [exchangeRate, setExchangeRate] = useState<number>(initialPackage?.exchangeRate ?? 1);
  const [markupPercentage, setMarkupPercentage] = useState<number>(initialPackage?.markupPercentage ?? 15);
  const [taxes, setTaxes] = useState<number>(initialPackage?.taxes ?? 0);
  const [administrativeFee, setAdministrativeFee] = useState<number>(initialPackage?.administrativeFee ?? 0);
  const [minimumDeposit, setMinimumDeposit] = useState<number>(initialPackage?.minimumDeposit ?? 0);
  const [profitability, setProfitability] = useState<number>(initialPackage?.profitability ?? 75);
  const [freelanceCommission, setFreelanceCommission] = useState<number>(initialPackage?.freelanceCommission ?? 10);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(initialPackage?.selectedHotelId ?? null);
  const [amortizationSchedule, setAmortizationSchedule] = useState<TravelInstallment[]>(
    initialPackage?.amortizationSchedule ?? []
  );

  // Itinerario y Servicios (Paso 4)
  const [days, setDays] = useState<TravelDay[]>(
    initialPackage?.days ?? [
      {
        id: "day_1",
        dayNumber: 1,
        items: [],
      },
    ]
  );

  // Cláusulas (Paso 6)
  const [inclusions, setInclusions] = useState(initialPackage?.inclusions ?? "");
  const [exclusions, setExclusions] = useState(initialPackage?.exclusions ?? "");
  const [policies, setPolicies] = useState(initialPackage?.policies ?? "");

  // Acordeones colapsables
  const [showTrip, setShowTrip] = useState(true);
  const [showItinerary, setShowItinerary] = useState(true);
  const [showFinancial, setShowFinancial] = useState(true);
  const [showInclusions, setShowInclusions] = useState(false);

  // Estados UI
  const [loadingAi, setLoadingAi] = useState(false);
  const [confirmAiSuggestOpen, setConfirmAiSuggestOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocompletado Origen
  const [showOriginSuggs, setShowOriginSuggs] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<AirportItem[]>(AIRPORT_DATA.slice(0, 6));
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);

  // Autocompletado Destino
  const [showDestSuggs, setShowDestSuggs] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState<AirportItem[]>(AIRPORT_DATA.slice(0, 6));
  const [isSearchingDest, setIsSearchingDest] = useState(false);

  useEffect(() => {
    if (!originCity || originCity.trim().length < 2) {
      setOriginSuggestions(AIRPORT_DATA.slice(0, 6));
      return;
    }
    const term = originCity.trim();
    const timer = setTimeout(async () => {
      setIsSearchingOrigin(true);
      try {
        const res = await fetch(
          `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(
            term
          )}&locale=es&types[]=airport&types[]=city`
        );
        if (res.ok) {
          const data = (await res.json()) as TravelPayoutsItem[];
          if (Array.isArray(data) && data.length > 0) {
            const mapped: AirportItem[] = data.map((item) => ({
              city: item.city_name || item.name || "",
              region: item.country_name || "",
              airport: item.type === "airport" ? item.name || "" : "Todos los aeropuertos",
              code: item.code || "",
            }));
            setOriginSuggestions(mapped.slice(0, 8));
            return;
          }
        }
      } catch {
        // Fallback local
      } finally {
        setIsSearchingOrigin(false);
      }
      const q = term.toLowerCase();
      const local = AIRPORT_DATA.filter(
        (a) =>
          a.city.toLowerCase().includes(q) ||
          a.airport.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q)
      );
      setOriginSuggestions(local.length > 0 ? local.slice(0, 8) : AIRPORT_DATA.slice(0, 6));
    }, 300);

    return () => clearTimeout(timer);
  }, [originCity]);

  useEffect(() => {
    if (!destination || destination.trim().length < 2) {
      setDestSuggestions(AIRPORT_DATA.slice(0, 6));
      return;
    }
    const term = destination.trim();
    const timer = setTimeout(async () => {
      setIsSearchingDest(true);
      try {
        const res = await fetch(
          `https://autocomplete.travelpayouts.com/places2?term=${encodeURIComponent(
            term
          )}&locale=es&types[]=airport&types[]=city`
        );
        if (res.ok) {
          const data = (await res.json()) as TravelPayoutsItem[];
          if (Array.isArray(data) && data.length > 0) {
            const mapped: AirportItem[] = data.map((item) => ({
              city: item.city_name || item.name || "",
              region: item.country_name || "",
              airport: item.type === "airport" ? item.name || "" : "Todos los aeropuertos",
              code: item.code || "",
            }));
            setDestSuggestions(mapped.slice(0, 8));
            return;
          }
        }
      } catch {
        // Fallback local
      } finally {
        setIsSearchingDest(false);
      }
      const q = term.toLowerCase();
      const local = AIRPORT_DATA.filter(
        (a) =>
          a.city.toLowerCase().includes(q) ||
          a.airport.toLowerCase().includes(q) ||
          a.code.toLowerCase().includes(q) ||
          a.region.toLowerCase().includes(q)
      );
      setDestSuggestions(local.length > 0 ? local.slice(0, 8) : AIRPORT_DATA.slice(0, 6));
    }, 300);

    return () => clearTimeout(timer);
  }, [destination]);

  const allCollapsed = !showTrip && !showItinerary && !showFinancial && !showInclusions;

  function toggleCollapseAll() {
    const next = allCollapsed;
    setShowTrip(next);
    setShowItinerary(next);
    setShowFinancial(next);
    setShowInclusions(next);
  }

  function applyDestinationTemplate(tmplName: string) {
    setDestination(tmplName);
    const tmplMap: Record<string, { inc: string; exc: string; pol: string }> = {
      "Cancún": {
        inc: "• Vuelos ida y vuelta con equipaje\n• Hotel Todo Incluido 4-5 estrellas\n• Traslado aeropuerto - hotel - aeropuerto\n• Tarjeta de asistencia médica",
        exc: "• Excursiones opcionales\n• Gastos personales y propinas\n• Impuestos locales de saneamiento ambiental",
        pol: "Tarifa promocional sujeta a disponibilidad de cupos aéreos y hoteleros. Cancelaciones según políticas del operador.",
      },
      "Cartagena": {
        inc: "• Tiquetes aéreos ida y regreso\n• Alojamiento en hotel seleccionado con desayuno\n• Traslados aeropuerto - hotel - aeropuerto\n• Asistencia médica integral",
        exc: "• Almuerzos y cenas no especificados\n• Propinas a maleteros y guías",
        pol: "Tiquetes no reembolsables. Cambios de fecha sujetos a penalidad de aerolínea y diferencia tarifaria.",
      },
      "Punta Cana": {
        inc: "• Tiquetes aéreos internacionales\n• Resort Todo Incluido 24 horas\n• Traslados en destino compartidos\n• Seguro de viaje con cobertura médica",
        exc: "• Tarjeta de turista / impuestos de entrada si aplican\n• Servicios de spa y compras personales",
        pol: "Requiere pasaporte vigente mínimo 6 meses antes de la fecha del viaje.",
      },
      "San Andrés": {
        inc: "• Tiquetes aéreos\n• Alojamiento plan Full o Desayuno\n• Vuelta a la isla en chiva o van\n• Tarjeta de asistencia médica",
        exc: "• Tarjeta de turismo OCCRE de entrada a la isla\n• Deportes náuticos y tours no incluidos",
        pol: "Vuelo chárter / regular no reembolsable. Verifique pago de tarjeta OCCRE en sala de abordaje.",
      },
    };
    if (tmplMap[tmplName]) {
      setInclusions(tmplMap[tmplName].inc);
      setExclusions(tmplMap[tmplName].exc);
      setPolicies(tmplMap[tmplName].pol);
    }
  }

  function handleSwapLocations() {
    const tempCity = originCity;
    const tempDest = destination;
    const tempDepAir = departureAirport;
    const tempArrAir = arrivalAirport;

    setOriginCity(tempDest);
    setDestination(tempCity);
    setDepartureAirport(tempArrAir);
    setArrivalAirport(tempDepAir);
  }

  function handleStartDateChange(val: string) {
    setStartDate(val);
    if (!val) return;
    let newEndDate = endDate;
    if (flightType !== "one-way") {
      if (!endDate || endDate < val) {
        newEndDate = val;
        setEndDate(val);
      }
      const s = new Date(val);
      const e = new Date(newEndDate);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
      const calculatedNights = diff > 0 ? diff : 1;
      setNights(calculatedNights);
      adjustDaysCount(calculatedNights + 1);
    }
  }

  function handleEndDateChange(val: string) {
    setEndDate(val);
    if (startDate && val) {
      const s = new Date(startDate);
      const e = new Date(val);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
      const calculatedNights = diff > 0 ? diff : 1;
      setNights(calculatedNights);
      adjustDaysCount(calculatedNights + 1);
    }
  }

  function handleNightsChange(num: number) {
    setNights(num);
    adjustDaysCount(num + 1);
    if (startDate && num > 0 && flightType !== "one-way") {
      const s = new Date(startDate);
      s.setDate(s.getDate() + num);
      const yyyy = s.getFullYear();
      const mm = String(s.getMonth() + 1).padStart(2, "0");
      const dd = String(s.getDate()).padStart(2, "0");
      setEndDate(`${yyyy}-${mm}-${dd}`);
    }
  }

  function adjustDaysCount(targetCount: number) {
    setDays((prev) => {
      if (prev.length === targetCount) return prev;
      if (prev.length < targetCount) {
        const toAdd = targetCount - prev.length;
        const newOnes: TravelDay[] = Array.from({ length: toAdd }).map((_, idx) => ({
          id: `day_${prev.length + idx + 1}_${Date.now()}`,
          dayNumber: prev.length + idx + 1,
          items: [],
        }));
        return [...prev, ...newOnes];
      }
      return prev.slice(0, targetCount);
    });
  }

  // Sincronizar reactivamente los ítems cuando cambian los pasajeros
  useEffect(() => {
    setDays((prevDays) => {
      let hasChanges = false;
      const updatedDays = prevDays.map((d) => {
        const updatedItems = d.items.map((item) => {
          const shouldBePerPerson =
            ["Flight", "Hotel", "Insurance", "Activity", "Transfer"].includes(item.type) ||
            childPassengers > 0
              ? true
              : item.pricePerPerson;

          if (shouldBePerPerson) {
            const netAdult =
              item.netPriceAdult !== undefined
                ? item.netPriceAdult
                : item.netPrice || item.totalPrice || 0;
            const netChild = item.netPriceChild || 0;
            const markAdult =
              item.markupAdult !== undefined
                ? item.markupAdult
                : item.markup || 0;
            const markChild = item.markupChild || 0;

            let calculatedNet = netAdult * passengers + netChild * childPassengers;
            let calculatedMarkup = markAdult * passengers + markChild * childPassengers;

            if (item.type === "Insurance") {
              calculatedNet = netAdult * (passengers + childPassengers);
              calculatedMarkup = markAdult * (passengers + childPassengers);
            }

            const calculatedTotal = calculatedNet + calculatedMarkup;

            if (
              item.totalPrice !== calculatedTotal ||
              item.netPrice !== calculatedNet ||
              item.markup !== calculatedMarkup ||
              !item.pricePerPerson ||
              item.netPriceAdult === undefined
            ) {
              hasChanges = true;
              return {
                ...item,
                pricePerPerson: true,
                netPriceAdult: netAdult,
                netPriceChild: netChild,
                markupAdult: markAdult,
                markupChild: markChild,
                netPrice: calculatedNet,
                markup: calculatedMarkup,
                totalPrice: calculatedTotal,
              };
            }
          }
          return item;
        });
        return { ...d, items: updatedItems };
      });

      return hasChanges ? updatedDays : prevDays;
    });
  }, [passengers, childPassengers]);

  // Totales financieros en tiempo real con soporte multicotización
  const totals = useMemo(() => {
    return calculateDetailedQuoteTotals({
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
  }, [
    passengers,
    childPassengers,
    currency,
    markupPercentage,
    taxes,
    administrativeFee,
    profitability,
    days,
  ]);

  const allHotels = useMemo(
    () => days.flatMap((d) => d.items.filter((i) => i.type === "Hotel")),
    [days]
  );

  // Generador de cuotas de amortización
  function handleGenerateInstallments(count: number, targetTotal?: number, hotelId?: string) {
    const totalToAmortize = targetTotal !== undefined ? targetTotal : totals.finalTotal;
    if (totalToAmortize <= 0) return;

    if (hotelId) {
      setSelectedHotelId(hotelId);
    }

    const deposit = minimumDeposit > 0 ? minimumDeposit : 0;
    const remaining = totalToAmortize - deposit;

    if (deposit > 0) {
      const todayStr = new Date().toISOString().split("T")[0]!;
      const initialInst: TravelInstallment = {
        id: Math.random().toString(36).slice(2, 9),
        code: "Depósito Inicial",
        amount: deposit,
        dueDate: todayStr,
        status: "pending",
      };

      const remainingCount = count - 1 > 0 ? count - 1 : 1;
      const nextMonthDate = new Date();
      nextMonthDate.setDate(nextMonthDate.getDate() + 30);
      const nextMonthStr = nextMonthDate.toISOString().split("T")[0]!;

      const remainingInsts = generateAutoInstallments(
        remaining > 0 ? remaining : 0,
        remainingCount,
        "monthly",
        nextMonthStr
      ).map((inst, idx) => ({
        ...inst,
        code: `Cuota ${idx + 2}/${count}`,
      }));

      setAmortizationSchedule([initialInst, ...remainingInsts]);
    } else {
      const installments = generateAutoInstallments(
        totalToAmortize,
        count,
        "monthly",
        startDate || new Date().toISOString().split("T")[0]!
      );
      setAmortizationSchedule(installments);
    }
  }

  // Gestión de Días
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

  // Gestión de Servicios
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
              boardBasis: "Todo Incluido",
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
                : it.pricePerPerson || childPassengers > 0;

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

              let calculatedNet = netAdult * passengers + netChild * childPassengers;
              let calculatedMarkup = markAdult * passengers + markChild * childPassengers;

              if (it.type === "Insurance") {
                calculatedNet = netAdult * (passengers + childPassengers);
                calculatedMarkup = markAdult * (passengers + childPassengers);
              }

              updated.pricePerPerson = true;
              updated.netPriceAdult = netAdult;
              updated.netPriceChild = netChild;
              updated.markupAdult = markAdult;
              updated.markupChild = markChild;
              updated.netPrice = calculatedNet;
              updated.markup = calculatedMarkup;
              updated.totalPrice = calculatedNet + calculatedMarkup;
            } else {
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
  }

  // Generador de Itinerario con IA
  function handleAiSuggest() {
    if (!destination.trim()) {
      setError("Indica el destino antes de solicitar sugerencias a la IA");
      toast("Indica el destino principal primero", "warning");
      return;
    }
    const hasExistingItems = days.some((d) => d.items.length > 0);
    if (hasExistingItems) {
      setConfirmAiSuggestOpen(true);
    } else {
      void runAiSuggest();
    }
  }

  async function runAiSuggest() {
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
        setShowItinerary(true);
        if (suggestion.recommendedInclusions) setInclusions(suggestion.recommendedInclusions);
        if (suggestion.recommendedExclusions) setExclusions(suggestion.recommendedExclusions);
        if (suggestion.recommendedPolicies) setPolicies(suggestion.recommendedPolicies);
        toast("Itinerario generado con éxito por la IA.", "success");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al invocar IA";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoadingAi(false);
    }
  }

  // Guardar Paquete Turístico
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
        agencyCommission: 0,
        minimumDeposit,
        administrativeFee,
        medicalAssistance: 0,
        profitability,
        freelanceCommission,
        selectedHotelId,
        days,
        amortizationSchedule,
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || "Error al guardar el paquete");
      }

      const data = await res.json();
      const savedPackage = (data.package ?? data) as TravelPackageDto;

      toast(
        isEditing
          ? "Paquete turístico actualizado con éxito"
          : "Paquete turístico creado con éxito",
        "success"
      );
      onSaved(savedPackage);
      onClose();
    } catch (err) {
      console.error(err);
      toast(err instanceof Error ? err.message : "Error al guardar paquete", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in duration-200">
      {/* Top Navbar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full"
            title="Cerrar editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded bg-brand/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand">
                <Package className="h-3 w-3" />
                Paquete Turístico
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                  status === "active"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : status === "draft"
                    ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                    : "bg-slate-500/10 text-slate-600 border border-slate-500/20"
                }`}
              >
                {status === "active" ? "Activo" : status === "draft" ? "Borrador" : "Archivado"}
              </span>
            </div>
            <h1 className="text-base font-bold text-foreground">
              {title || (isEditing ? "Editar Paquete" : "Nuevo Paquete Turístico")}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleCollapseAll}
            className="text-xs text-text-3 hover:text-foreground hidden sm:flex items-center gap-1"
          >
            {allCollapsed ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            {allCollapsed ? "Expandir todo" : "Colapsar todo"}
          </Button>

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

      {/* Main Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10">
        <form
          id="package-form"
          onSubmit={handleSavePackage}
          className="mx-auto max-w-5xl space-y-5"
        >
          {error && (
            <div className="rounded-xl border border-danger-border bg-danger-soft p-3 text-xs text-danger-text flex items-center justify-between">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-danger-text hover:opacity-80">
                ✕
              </button>
            </div>
          )}

          {/* Encabezado: Título Comercial y Estado */}
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="space-y-1 sm:col-span-3">
                <label className="text-xs font-semibold text-text-2">
                  Título Comercial del Paquete *
                </label>
                <Input
                  required
                  placeholder="Ej. Punta Cana al atardecer 5D/4N Todo Incluido"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="font-bold text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Estado del Paquete</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PackageStatus)}
                  className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-semibold"
                >
                  <option value="active">Activo (Visible)</option>
                  <option value="draft">Borrador</option>
                  <option value="archived">Archivado</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Descripción / Gancho Promocional (Opcional)
              </label>
              <Textarea
                rows={2}
                placeholder="Ej. Haz espacio para tu próximo descanso. Salida garantizada con tiquetes, traslados y hotel resort..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Paso 2: Destinos, Aeropuertos y Fechas (Copia Exacta de Cotizaciones) */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTrip(!showTrip)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                  <Plane className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">
                    Paso 2 · Destinos y Fechas
                  </span>
                  <span className="block font-bold text-sm text-foreground">
                    Detalles del Destino, Salida y Fechas
                  </span>
                </div>
              </div>
              <div className="rounded-full p-1 text-text-3">
                {showTrip ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showTrip && (
              <div className="p-4 border-t bg-muted/10 space-y-4">
                {/* Destinos Populares con Plantilla Automática */}
                <div>
                  <label className="block text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">
                    Destinos Populares (Cargar Plantilla Rápida)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DESTINATION_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.name}
                        type="button"
                        onClick={() => applyDestinationTemplate(tmpl.name)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                          destination.toLowerCase() === tmpl.name.toLowerCase()
                            ? "bg-brand text-brand-fg border-brand"
                            : "bg-card text-text-2 hover:bg-muted border-border"
                        }`}
                      >
                        {tmpl.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo de Vuelo */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFlightType("round-trip")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      flightType === "round-trip"
                        ? "bg-foreground text-background"
                        : "bg-muted text-text-2 hover:bg-muted/80"
                    }`}
                  >
                    Ida y Regreso
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFlightType("one-way");
                      setEndDate("");
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      flightType === "one-way"
                        ? "bg-foreground text-background"
                        : "bg-muted text-text-2 hover:bg-muted/80"
                    }`}
                  >
                    Solo Ida
                  </button>
                </div>

                {/* Origen y Destino con Sugerencias en Vivo y Botón de Swap */}
                <div className="flex flex-col sm:flex-row items-start gap-2">
                  {/* Origen */}
                  <div className="relative space-y-1 flex-1 w-full">
                    <label className="text-xs font-semibold text-text-2">Ciudad o Aeropuerto de Salida</label>
                    <Input
                      value={originCity}
                      onChange={(e) => {
                        setOriginCity(e.target.value);
                        setShowOriginSuggs(true);
                      }}
                      onFocus={() => setShowOriginSuggs(true)}
                      placeholder="Ej. Medellín (MDE), Bogotá (BOG)..."
                    />
                    {departureAirport && !showOriginSuggs && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-1 pt-0.5">
                        <span>🛫 Aeropuerto salida:</span>
                        <span className="font-semibold">{departureAirport}</span>
                      </div>
                    )}
                    {showOriginSuggs && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-text-3 border-b mb-1">
                          <span>{isSearchingOrigin ? "Buscando aeropuertos..." : "Aeropuertos de Origen"}</span>
                          <button
                            type="button"
                            onClick={() => setShowOriginSuggs(false)}
                            className="text-text-3 hover:text-foreground text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        {originSuggestions.map((a, idx) => (
                          <button
                            key={`${a.code}-${a.city}-${idx}-origin`}
                            type="button"
                            onClick={() => {
                              setOriginCity(a.city);
                              setDepartureAirport(`${a.airport} (${a.code})`);
                              setShowOriginSuggs(false);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/80 rounded-lg transition group"
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-bold text-foreground text-sm group-hover:text-brand transition-colors">
                                {a.city}
                              </span>
                              <span className="text-[11px] text-text-3 truncate">{a.region}</span>
                            </div>
                            <div className="flex flex-col items-end shrink-0 text-right">
                              <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                                {a.code}
                              </span>
                              <span className="text-[10px] text-text-3 truncate max-w-[130px] mt-0.5">
                                {a.airport}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Botón Swap */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleSwapLocations}
                    title="Invertir origen y destino"
                    className="h-8 w-8 rounded-full border bg-muted/40 hover:bg-muted self-center mt-3 sm:mt-5 shrink-0"
                  >
                    <ArrowLeftRight className="h-4 w-4 text-text-2" />
                  </Button>

                  {/* Destino */}
                  <div className="relative space-y-1 flex-1 w-full">
                    <label className="text-xs font-semibold text-text-2">Ciudad o Destino Turístico *</label>
                    <Input
                      value={destination}
                      onChange={(e) => {
                        setDestination(e.target.value);
                        setShowDestSuggs(true);
                      }}
                      onFocus={() => setShowDestSuggs(true)}
                      placeholder="Ej. Punta Cana, Cancún, Madrid..."
                      required
                    />
                    {arrivalAirport && !showDestSuggs && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium px-1 pt-0.5">
                        <span>✈️ Aeropuerto llegada:</span>
                        <span className="font-semibold">{arrivalAirport}</span>
                      </div>
                    )}
                    {showDestSuggs && (
                      <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-bold text-text-3 border-b mb-1">
                          <span>{isSearchingDest ? "Buscando destinos..." : "Ciudades y Aeropuertos"}</span>
                          <button
                            type="button"
                            onClick={() => setShowDestSuggs(false)}
                            className="text-text-3 hover:text-foreground text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        {destSuggestions.map((a, idx) => (
                          <button
                            key={`${a.code}-${a.city}-${idx}-dest`}
                            type="button"
                            onClick={() => {
                              setDestination(a.city);
                              setArrivalAirport(`${a.airport} (${a.code})`);
                              setShowDestSuggs(false);
                              applyDestinationTemplate(a.city);
                            }}
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/80 rounded-lg transition group"
                          >
                            <div className="flex flex-col min-w-0 pr-2">
                              <span className="font-bold text-foreground text-sm group-hover:text-brand transition-colors">
                                {a.city}
                              </span>
                              <span className="text-[11px] text-text-3 truncate">{a.region}</span>
                            </div>
                            <div className="flex flex-col items-end shrink-0 text-right">
                              <span className="font-mono text-xs font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded">
                                {a.code}
                              </span>
                              <span className="text-[10px] text-text-3 truncate max-w-[130px] mt-0.5">
                                {a.airport}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Fechas, Noches, Pasajeros y Moneda */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Fecha Ida *</label>
                    <Input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-xs font-semibold text-text-2 ${flightType === "one-way" ? "opacity-50" : ""}`}>
                      Fecha Regreso *
                    </label>
                    <Input
                      type="date"
                      required={flightType === "round-trip"}
                      value={flightType === "one-way" ? "" : endDate}
                      disabled={flightType === "one-way"}
                      min={startDate}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Noches de Estadía</label>
                    <Input
                      type="number"
                      min="1"
                      value={nights === 0 ? "" : nights}
                      onChange={(e) => handleNightsChange(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Flexibilidad</label>
                    <select
                      value={flexibility}
                      onChange={(e) => setFlexibility(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                    >
                      <option value="No">Sin flexibilidad (Fechas fijas)</option>
                      <option value="+/- 1 día">+/- 1 día</option>
                      <option value="+/- 3 días">+/- 3 días</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Pasajeros Base (Adultos) *</label>
                    <Input
                      type="number"
                      min="1"
                      value={passengers === 0 ? "" : passengers}
                      onChange={(e) => setPassengers(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Niños Base</label>
                    <Input
                      type="number"
                      min="0"
                      value={childPassengers}
                      onChange={(e) => setChildPassengers(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Habitaciones Base</label>
                    <Input
                      type="number"
                      min="1"
                      value={rooms}
                      onChange={(e) => setRooms(Number(e.target.value) || 1)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Moneda del Paquete</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as TravelCurrency)}
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                    >
                      <option value="COP">COP ($ Pesos)</option>
                      <option value="USD">USD ($ Dólares)</option>
                      <option value="EUR">EUR (€ Euros)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paso 4: Servicios del Itinerario con Multicotización y Tarifas Adulto/Niño */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between border-b bg-muted/20">
              <button
                type="button"
                onClick={() => setShowItinerary(!showItinerary)}
                className="flex items-center gap-3 text-left hover:opacity-80 transition"
              >
                <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                  <Hotel className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">
                    Paso 4 · Itinerario
                  </span>
                  <span className="block font-bold text-sm text-foreground">
                    Planificación del Itinerario ({days.length} Días)
                  </span>
                </div>
                <div className="rounded-full p-1 text-text-3 ml-2">
                  {showItinerary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loadingAi}
                  onClick={handleAiSuggest}
                  className="h-8 rounded-full text-xs font-bold bg-card border-brand/30 text-brand hover:bg-brand-soft hover:text-brand-text"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {loadingAi ? "Diseñando con IA..." : "AI Itinerario"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addDay}
                  className="h-8 rounded-full text-xs font-bold border-border hover:bg-muted text-foreground"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Día
                </Button>
              </div>
            </div>

            {showItinerary && (
              <div className="p-4 space-y-5 bg-muted/10">
                {allHotels.length > 1 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
                    <Hotel className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      <strong>Multicotización activa:</strong> Hay {allHotels.length} hoteles en el itinerario. Cada hotel generará una alternativa independiente en el Resumen Financiero del Paso 5.
                    </span>
                  </div>
                )}

                {days.map((day) => (
                  <div key={day.id} className="rounded-xl border bg-card p-4 space-y-4 shadow-xs">
                    {/* Cabecera del Día */}
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
                          {day.dayNumber}
                        </span>
                        <h3 className="font-bold text-sm text-foreground">
                          Día {day.dayNumber}
                        </h3>
                      </div>

                      {days.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDay(day.id)}
                          className="rounded p-1.5 text-danger-text hover:bg-danger-tint transition"
                          title="Eliminar este día"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Lista de Servicios del Día */}
                    {day.items.length === 0 ? (
                      <p className="text-center py-4 text-xs text-text-3 italic bg-muted/20 rounded-lg border border-dashed">
                        Sin servicios agregados para este día. Usa los botones inferiores para agregar vuelo, hotel, actividad, traslado o seguro.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {day.items.map((it) => (
                          <div
                            key={it.id}
                            className="bg-muted/30 rounded-xl p-3.5 sm:p-4 border border-border/80 space-y-3 shadow-2xs hover:border-brand/40 transition-colors"
                          >
                            {/* Fila 1: Tipo de Servicio, Por Persona, Precios y Eliminar */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Selector de Tipo */}
                              <div className="flex items-center gap-2 flex-1 w-full">
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    it.type === "Flight"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                      : it.type === "Hotel"
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : it.type === "Activity"
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : it.type === "Transfer"
                                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                      : it.type === "Insurance"
                                      ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                                  }`}
                                >
                                  {it.type === "Flight" ? (
                                    <Plane className="h-4 w-4" />
                                  ) : it.type === "Hotel" ? (
                                    <Hotel className="h-4 w-4" />
                                  ) : it.type === "Activity" ? (
                                    <MapPin className="h-4 w-4" />
                                  ) : it.type === "Transfer" ? (
                                    <Car className="h-4 w-4" />
                                  ) : it.type === "Insurance" ? (
                                    <ShieldCheck className="h-4 w-4" />
                                  ) : (
                                    <Layers className="h-4 w-4" />
                                  )}
                                </div>
                                <select
                                  value={it.type}
                                  onChange={(e) =>
                                    updateItem(day.id, it.id, {
                                      type: e.target.value as TravelItemType,
                                    })
                                  }
                                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-input bg-card text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand"
                                >
                                  <option value="Flight">Vuelo</option>
                                  <option value="Hotel">Hotel</option>
                                  <option value="Activity">Actividad</option>
                                  <option value="Transfer">Traslado</option>
                                  <option value="Insurance">Asistencia Seguro</option>
                                  <option value="Other">Otro</option>
                                </select>
                                {it.type === "Hotel" && allHotels.length > 1 && (
                                  <span className="px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                                    Opción #{allHotels.findIndex((h) => h.id === it.id) + 1}
                                  </span>
                                )}
                              </div>

                              {/* Bloque de Precios y Checkbox Por Persona */}
                              <div className="flex flex-wrap items-center gap-2.5 justify-between sm:justify-end w-full sm:w-auto">
                                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-text-3 uppercase tracking-wider shrink-0 select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!it.pricePerPerson}
                                    onChange={(e) =>
                                      updateItem(day.id, it.id, {
                                        pricePerPerson: e.target.checked,
                                      })
                                    }
                                    className="w-3.5 h-3.5 text-brand focus:ring-brand rounded cursor-pointer"
                                  />
                                  <span>Por Persona</span>
                                </label>

                                {it.pricePerPerson ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {it.type === "Insurance" ? (
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-text-3 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                          Valor x Pax
                                        </span>
                                        <Input
                                          type="number"
                                          value={
                                            it.netPriceAdult === undefined
                                              ? it.totalPrice || ""
                                              : it.netPriceAdult || ""
                                          }
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            updateItem(day.id, it.id, {
                                              netPriceAdult: val === "" ? 0 : parseFloat(val) || 0,
                                            });
                                          }}
                                          placeholder="0"
                                          className="w-24 sm:w-28 h-8 px-2 py-1 text-xs font-bold text-right"
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-text-3 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                            Adulto
                                          </span>
                                          <Input
                                            type="number"
                                            value={
                                              it.netPriceAdult === undefined
                                                ? it.totalPrice || ""
                                                : it.netPriceAdult || ""
                                            }
                                            onChange={(e) => {
                                              const val = e.target.value;
                                              updateItem(day.id, it.id, {
                                                netPriceAdult: val === "" ? 0 : parseFloat(val) || 0,
                                              });
                                            }}
                                            placeholder="0"
                                            className="w-24 sm:w-28 h-8 px-2 py-1 text-xs font-bold text-right"
                                          />
                                        </div>
                                        {childPassengers > 0 && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-text-3 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                              Niño
                                            </span>
                                            <Input
                                              type="number"
                                              value={
                                                it.netPriceChild === 0 || it.netPriceChild === undefined
                                                  ? ""
                                                  : it.netPriceChild
                                              }
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                updateItem(day.id, it.id, {
                                                  netPriceChild: val === "" ? 0 : parseFloat(val) || 0,
                                                });
                                              }}
                                              placeholder="0"
                                              className="w-24 sm:w-28 h-8 px-2 py-1 text-xs font-bold text-right"
                                            />
                                          </div>
                                        )}
                                      </>
                                    )}
                                    <span className="text-foreground text-xs font-extrabold tracking-tight bg-card px-2.5 py-1 rounded-md shrink-0 border">
                                      Total: {formatCurrency(it.totalPrice || 0, currency)}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-text-3 text-xs font-bold uppercase tracking-widest shrink-0">
                                      Precio
                                    </span>
                                    <Input
                                      type="number"
                                      value={it.totalPrice === 0 ? "" : it.totalPrice}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        updateItem(day.id, it.id, {
                                          totalPrice: val === "" ? 0 : parseFloat(val) || 0,
                                          netPrice: val === "" ? 0 : parseFloat(val) || 0,
                                          markup: 0,
                                        });
                                      }}
                                      placeholder="0"
                                      className="w-28 sm:w-32 h-8 px-2 py-1 text-xs font-bold text-right"
                                    />
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => removeItem(day.id, it.id)}
                                  className="p-1.5 text-text-3 hover:text-danger-text rounded-md transition-colors"
                                  title="Eliminar este servicio"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Fila 2: Título del servicio */}
                            <Input
                              type="text"
                              value={it.title}
                              onChange={(e) => updateItem(day.id, it.id, { title: e.target.value })}
                              placeholder="Nombre o título del servicio..."
                              className="w-full text-xs font-semibold h-8"
                            />

                            {/* Fila 3: Buscador de Proveedor Aliado */}
                            <div>
                              <SupplierCombobox
                                value={it.provider || ""}
                                type={mapItemTypeToSupplier(it.type)}
                                destinationCity={destination}
                                onChange={(provName, selectedSup) => {
                                  if (it.type === "Hotel") {
                                    updateItem(day.id, it.id, {
                                      provider: provName,
                                      ...(provName ? { title: provName } : {}),
                                      hotelDetails: {
                                        ...it.hotelDetails!,
                                        hotelName: provName || it.hotelDetails?.hotelName || "",
                                        address:
                                          selectedSup?.hotelMeta?.hotelAddress ||
                                          selectedSup?.contact?.email ||
                                          it.hotelDetails?.address ||
                                          "",
                                      },
                                    });
                                  } else {
                                    updateItem(day.id, it.id, { provider: provName });
                                  }
                                }}
                                placeholder={`Buscar ${
                                  it.type === "Hotel" ? "hotel / hospedaje" : "proveedor"
                                }...`}
                              />
                            </div>

                            {/* Fila 4: Descripción */}
                            <Textarea
                              value={it.description || ""}
                              onChange={(e) => updateItem(day.id, it.id, { description: e.target.value })}
                              placeholder="Descripción detallada del servicio o notas..."
                              rows={2}
                              className="w-full text-xs resize-none"
                            />

                            {/* Campos directos de Hotel */}
                            {it.type === "Hotel" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                <div>
                                  <label className="text-[10px] font-bold text-text-3 uppercase tracking-wider block mb-1">
                                    Acomodación
                                  </label>
                                  <Input
                                    type="text"
                                    value={it.hotelDetails?.roomType || ""}
                                    onChange={(e) =>
                                      updateItem(day.id, it.id, {
                                        hotelDetails: {
                                          hotelName: it.title || it.hotelDetails?.hotelName || "",
                                          address: it.hotelDetails?.address || "",
                                          checkIn: it.hotelDetails?.checkIn || "",
                                          checkOut: it.hotelDetails?.checkOut || "",
                                          roomType: e.target.value,
                                          boardBasis: it.hotelDetails?.boardBasis || "Todo Incluido",
                                          stars: it.hotelDetails?.stars || 4,
                                        },
                                      })
                                    }
                                    placeholder="Ej. Habitación Estándar, Solo Adultos"
                                    className="h-8 text-xs font-medium"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-text-3 uppercase tracking-wider block mb-1">
                                    Alimentación
                                  </label>
                                  <Input
                                    type="text"
                                    value={it.hotelDetails?.boardBasis || ""}
                                    onChange={(e) =>
                                      updateItem(day.id, it.id, {
                                        hotelDetails: {
                                          hotelName: it.title || it.hotelDetails?.hotelName || "",
                                          address: it.hotelDetails?.address || "",
                                          checkIn: it.hotelDetails?.checkIn || "",
                                          checkOut: it.hotelDetails?.checkOut || "",
                                          roomType: it.hotelDetails?.roomType || "",
                                          boardBasis: e.target.value as HotelDetails["boardBasis"],
                                          stars: it.hotelDetails?.stars || 4,
                                        },
                                      })
                                    }
                                    placeholder="Ej. Todo Incluido, Desayuno buffet"
                                    className="h-8 text-xs font-medium"
                                  />
                                </div>
                              </div>
                            )}

                            {/* Opciones avanzadas de Vuelo */}
                            {it.type === "Flight" && (
                              <details className="text-xs group mt-1">
                                <summary className="cursor-pointer text-[11px] font-semibold text-text-3 hover:text-foreground select-none flex items-center gap-1.5 py-1">
                                  <span>⚙️ Detalles del Vuelo (Aerolínea, Horarios...)</span>
                                </summary>
                                <div className="mt-2 p-3 bg-card rounded-lg border border-border/80 space-y-2">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold text-text-3">Aerolínea</label>
                                      <Input
                                        value={it.flightDetails?.airline || ""}
                                        onChange={(e) =>
                                          updateItem(day.id, it.id, {
                                            flightDetails: {
                                              departureDate: "",
                                              departureTime: "",
                                              arrivalDate: "",
                                              arrivalTime: "",
                                              ...it.flightDetails,
                                              airline: e.target.value,
                                              flightNumber: it.flightDetails?.flightNumber || "",
                                              origin: it.flightDetails?.origin || "",
                                              destination: it.flightDetails?.destination || "",
                                              cabin: it.flightDetails?.cabin || "Economica",
                                            },
                                          })
                                        }
                                        placeholder="Avianca, LATAM..."
                                        className="h-8 text-xs"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold text-text-3">No. Vuelo</label>
                                      <Input
                                        value={it.flightDetails?.flightNumber || ""}
                                        onChange={(e) =>
                                          updateItem(day.id, it.id, {
                                            flightDetails: {
                                              departureDate: "",
                                              departureTime: "",
                                              arrivalDate: "",
                                              arrivalTime: "",
                                              ...it.flightDetails,
                                              airline: it.flightDetails?.airline || "",
                                              flightNumber: e.target.value,
                                              origin: it.flightDetails?.origin || "",
                                              destination: it.flightDetails?.destination || "",
                                              cabin: it.flightDetails?.cabin || "Economica",
                                            },
                                          })
                                        }
                                        placeholder="AV9324"
                                        className="h-8 text-xs font-mono"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-semibold text-text-3">Cabina</label>
                                      <select
                                        value={it.flightDetails?.cabin || "Economica"}
                                        onChange={(e) =>
                                          updateItem(day.id, it.id, {
                                            flightDetails: {
                                              departureDate: "",
                                              departureTime: "",
                                              arrivalDate: "",
                                              arrivalTime: "",
                                              ...it.flightDetails,
                                              airline: it.flightDetails?.airline || "",
                                              flightNumber: it.flightDetails?.flightNumber || "",
                                              origin: it.flightDetails?.origin || "",
                                              destination: it.flightDetails?.destination || "",
                                              cabin: e.target.value as FlightDetails["cabin"],
                                            },
                                          })
                                        }
                                        className="h-8 w-full rounded border border-input bg-card px-2 text-xs"
                                      >
                                        <option value="Economica">Económica</option>
                                        <option value="Premium Economy">Premium Economy</option>
                                        <option value="Ejecutiva">Ejecutiva</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botones de añadir servicio */}
                    <div className="pt-2 flex flex-wrap gap-2 border-t border-dashed">
                      <button
                        type="button"
                        onClick={() => addItem(day.id, "Flight")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer"
                      >
                        <Plane className="w-3.5 h-3.5 text-blue-500" />
                        <span>+ Vuelo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addItem(day.id, "Hotel")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer"
                      >
                        <Hotel className="w-3.5 h-3.5 text-amber-500" />
                        <span>+ Hotel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addItem(day.id, "Activity")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span>+ Actividad</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addItem(day.id, "Transfer")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer"
                      >
                        <Car className="w-3.5 h-3.5 text-purple-500" />
                        <span>+ Traslado</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addItem(day.id, "Insurance")}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors shadow-2xs cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                        <span>+ Asistencia Seguro</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paso 5: Configuración Financiera y Plan de Pagos (Copia Exacta de Cotizaciones) */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFinancial(!showFinancial)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition border-b"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                  <DollarSign className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">
                    Paso 5 · Finanzas
                  </span>
                  <span className="block font-bold text-sm text-foreground">
                    Tarifas, Márgenes y Plan de Amortización
                  </span>
                </div>
              </div>
              <div className="rounded-full p-1 text-text-3">
                {showFinancial ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showFinancial && (
              <div className="p-4 space-y-4 bg-muted/10">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
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
                    <label className="text-xs font-semibold text-text-2">Fee Administrativo (x Pax)</label>
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
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Comisión Freelance (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={freelanceCommission}
                      onChange={(e) => setFreelanceCommission(Number(e.target.value))}
                      placeholder="Ej. 5"
                    />
                  </div>
                </div>

                {/* Multicotización Segregada (Tarjetas Oscuras idénticas a QuoteBuilder) */}
                {totals.byHotel && totals.byHotel.length > 1 ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                      <Hotel className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-extrabold text-foreground">
                          Multicotización Activa: {totals.byHotel.length} Opciones de Alojamiento
                        </p>
                        <p className="text-text-3 leading-relaxed">
                          Cada hotel se calcula de forma independiente sumando los servicios comunes del paquete (vuelos, traslados, seguros, actividades) más ese hotel en particular, aplicando las tarifas y márgenes correspondientes.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {totals.byHotel.map((item, idx) => {
                        const isSelected = selectedHotelId === item.hotelId;
                        const profitPercent =
                          item.hotelSubtotal + item.markupAmount > 0
                            ? Math.round(
                                (item.markupAmount / (item.hotelSubtotal + item.markupAmount)) * 100
                              )
                            : 0;

                        return (
                          <div
                            key={item.hotelId}
                            className={`rounded-2xl p-6 transition-all text-white shadow-xl ${
                              isSelected
                                ? "bg-slate-900 ring-2 ring-emerald-500 border border-emerald-500/50"
                                : "bg-slate-900 border border-slate-800"
                            }`}
                          >
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    Opción #{idx + 1}
                                  </span>
                                  {isSelected && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                      <Check className="h-3 w-3" /> Seleccionada
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-xl font-black tracking-tight text-white">
                                  Resumen Financiero: {item.hotelTitle || `Hotel #${idx + 1}`}
                                </h4>
                                <p className="text-slate-400 text-xs">
                                  Inversión calculada con este hotel, impuestos, comisiones y tasas incluidas.
                                </p>
                              </div>

                              <div className="text-left md:text-right">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                  Inversión Total Opción
                                </span>
                                <span className="text-3xl sm:text-4xl font-black tracking-tight text-amber-400">
                                  {formatCurrency(item.total, currency)}
                                </span>
                                <div className="text-[11px] text-slate-300 font-bold mt-1.5 space-y-0.5">
                                  <p>
                                    Total Adultos ({passengers}): {formatCurrency(item.totalAdult, currency)}{" "}
                                    <span className="text-slate-400 font-normal">
                                      ({formatCurrency(item.totalAdult / (passengers || 1), currency)} c/u)
                                    </span>
                                  </p>
                                  {childPassengers > 0 && item.totalChild > 0 && (
                                    <p>
                                      Total Niños ({childPassengers}): {formatCurrency(item.totalChild, currency)}{" "}
                                      <span className="text-slate-400 font-normal">
                                        ({formatCurrency(item.totalChild / childPassengers, currency)} c/u)
                                      </span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Desglose Detallado */}
                            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 text-xs ${freelanceCommission > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
                              <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Hotel Seleccionado
                                </span>
                                <p className="text-sm font-bold text-white truncate" title={item.hotelTitle}>
                                  {item.hotelTitle}
                                </p>
                                <p className="text-xs font-semibold text-slate-300">
                                  Neto: {formatCurrency(item.hotelSubtotal, currency)}
                                </p>
                                <p className="text-[11px] text-amber-400 font-medium">
                                  Rentabilidad ({profitPercent}%): +{formatCurrency(item.markupAmount, currency)}
                                </p>
                              </div>

                              <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                  Valor Vuelos y Otros
                                </span>
                                <div className="flex justify-between text-xs text-slate-200">
                                  <span>Vuelos:</span>
                                  <span className="font-semibold">{formatCurrency(item.flightsTotal, currency)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-200">
                                  <span>Otros Servicios:</span>
                                  <span className="font-semibold">{formatCurrency(item.otherSubtotal, currency)}</span>
                                </div>
                              </div>

                              {freelanceCommission > 0 && (
                                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                                    Comisión Freelance ({freelanceCommission}%)
                                  </span>
                                  <p className="text-sm font-bold text-indigo-300">
                                    {formatCurrency(
                                      Math.max(
                                        0,
                                        (item.total - item.markupAmount - (administrativeFee * (passengers + childPassengers)) - item.flightsTotal) *
                                          (freelanceCommission / 100)
                                      ),
                                      currency
                                    )}
                                  </p>
                                  <p className="text-[10px] text-slate-400">Base sin comisión ni tasas</p>
                                </div>
                              )}
                            </div>

                            {/* Generador de amortización para esta opción */}
                            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? "default" : "outline"}
                                className={`h-7 text-xs ${
                                  isSelected
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "border-slate-700 text-slate-300 hover:bg-white/10"
                                }`}
                                onClick={() => setSelectedHotelId(item.hotelId)}
                              >
                                {isSelected ? "✓ Opción Seleccionada" : "Seleccionar esta opción"}
                              </Button>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-400 mr-1 hidden sm:inline">
                                  Amortizar:
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-slate-700 text-slate-200 hover:bg-white/10"
                                  onClick={() => handleGenerateInstallments(2, item.total, item.hotelId)}
                                >
                                  2 Cuotas
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-slate-700 text-slate-200 hover:bg-white/10"
                                  onClick={() => handleGenerateInstallments(3, item.total, item.hotelId)}
                                >
                                  3 Cuotas
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-slate-700 text-slate-200 hover:bg-white/10"
                                  onClick={() => handleGenerateInstallments(4, item.total, item.hotelId)}
                                >
                                  4 Cuotas
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {amortizationSchedule.length > 0 && (
                      <div className="rounded-xl border bg-card p-4 space-y-2">
                        <span className="text-xs font-semibold text-text-2 block">
                          Plan de Amortización / Cuotas Registrado:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {amortizationSchedule.map((inst, i) => (
                            <div key={inst.id} className="rounded border bg-muted/40 p-2 text-xs">
                              <span className="text-text-3 block font-medium">
                                {inst.code || `Cuota ${i + 1}`} ({inst.dueDate}):
                              </span>
                              <span className="font-bold">{formatCurrency(inst.amount, currency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
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
                      {administrativeFee > 0 && (
                        <div>
                          <span className="text-xs text-text-3 block">
                            Fee Admin ({passengers + childPassengers} pax):
                          </span>
                          <span className="font-semibold text-foreground">
                            +{formatCurrency(administrativeFee * (passengers + childPassengers), currency)}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-text-3 block">Tarifa por Adulto ({passengers}):</span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(totals.totalAdult, currency)}
                        </span>
                      </div>
                      {childPassengers > 0 && totals.totalChild > 0 && (
                        <div>
                          <span className="text-xs text-text-3 block">Tarifa por Niño ({childPassengers}):</span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(totals.totalChild, currency)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-3">Plan de Amortización Rápido:</span>
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

                      <div className="text-right">
                        <span className="text-xs text-text-3 block uppercase tracking-wider font-semibold">
                          Total Paquete
                        </span>
                        <span className="text-2xl font-black text-brand tracking-tight">
                          {formatCurrency(totals.finalTotal, currency)}
                        </span>
                      </div>
                    </div>

                    {amortizationSchedule.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-xs font-semibold text-text-2 block mb-2">
                          Cuotas Registradas:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {amortizationSchedule.map((inst, i) => (
                            <div key={inst.id} className="rounded border bg-muted/40 p-2 text-xs">
                              <span className="text-text-3 block font-medium">
                                {inst.code || `Cuota ${i + 1}`} ({inst.dueDate}):
                              </span>
                              <span className="font-bold">{formatCurrency(inst.amount, currency)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Paso 6: Inclusiones, Exclusiones y Políticas (Copia Exacta de Cotizaciones) */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowInclusions(!showInclusions)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition border-b"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                  <Shield className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">
                    Paso 6 · Cláusulas
                  </span>
                  <span className="block font-bold text-sm text-foreground">
                    Inclusiones, Exclusiones y Políticas del Paquete
                  </span>
                </div>
              </div>
              <div className="rounded-full p-1 text-text-3">
                {showInclusions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showInclusions && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/10">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Inclusiones</label>
                  <Textarea
                    rows={3}
                    value={inclusions}
                    onChange={(e) => setInclusions(e.target.value)}
                    placeholder="• Tiquetes aéreos ida y regreso&#10;• Alojamiento todo incluido&#10;• Traslados aeropuerto - hotel - aeropuerto&#10;• Asistencia médica integral"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Exclusiones</label>
                  <Textarea
                    rows={3}
                    value={exclusions}
                    onChange={(e) => setExclusions(e.target.value)}
                    placeholder="• Gastos no especificados en el plan&#10;• Propinas y consumos personales"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-text-2">Políticas y Condiciones de Reserva</label>
                  <Textarea
                    rows={2}
                    value={policies}
                    onChange={(e) => setPolicies(e.target.value)}
                    placeholder="Separa con $500.000 por persona. Reserva ahora y abona mes a mes. Tiquetes y tarifas promocionales no reembolsables..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Botones al pie del formulario */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            {isEditing && onQuoteWithPackage && initialPackage && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onQuoteWithPackage(initialPackage)}
                className="gap-1.5 text-xs text-brand border-brand/30 hover:bg-brand-soft"
              >
                <Package className="h-4 w-4" />
                Cotizar a un Cliente con este Paquete
              </Button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-brand text-brand-fg hover:opacity-90">
                {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear Paquete Turístico"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmación para Sobrescribir con IA */}
      <ConfirmDialog
        isOpen={confirmAiSuggestOpen}
        onClose={() => setConfirmAiSuggestOpen(false)}
        title="¿Generar itinerario con IA?"
        message="Esta acción reemplazará los servicios actuales del itinerario con una sugerencia diseñada por Inteligencia Artificial para este destino."
        confirmText="Reemplazar y generar"
        cancelText="Conservar actuales"
        variant="primary"
        onConfirm={() => {
          setConfirmAiSuggestOpen(false);
          void runAiSuggest();
        }}
      />
    </div>
  );
}
