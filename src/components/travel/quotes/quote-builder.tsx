"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  BookmarkPlus,
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
  FlightDetails,
  HotelDetails,
  TravelCurrency,
  TravelDay,
  TravelInstallment,
  TravelItemType,
  TravelItineraryItem,
  TravelSupplierType,
} from "@/lib/travel/types";
import { SupplierCombobox } from "@/components/travel/suppliers/supplier-combobox";
import { CITY_AIRPORT_MAP } from "@/hooks/useAirlines";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPackageDto } from "@/server/travel/packages";
import { PackageSelectorModal } from "@/components/travel/packages/package-selector-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

export interface AirportItem {
  city: string;
  region: string;
  airport: string;
  code: string;
}

interface TravelPayoutsItem {
  name?: string;
  city_name?: string;
  country_name?: string;
  type?: string;
  code?: string;
}

export const AIRPORT_DATA: AirportItem[] = [
  { city: "Montería", region: "Córdoba, Colombia", airport: "Los Garzones", code: "MTR" },
  { city: "Sincelejo", region: "Colombia (apto. de Montería - 118km)", airport: "Los Garzones", code: "MTR" },
  { city: "Bogotá", region: "Cundinamarca, Colombia", airport: "El Dorado", code: "BOG" },
  { city: "Medellín", region: "Antioquia, Colombia", airport: "José María Córdova", code: "MDE" },
  { city: "Cali", region: "Valle del Cauca, Colombia", airport: "Alfonso Bonilla Aragón", code: "CLO" },
  { city: "Cartagena", region: "Bolívar, Colombia", airport: "Rafael Núñez", code: "CTG" },
  { city: "Santa Marta", region: "Magdalena, Colombia", airport: "Simón Bolívar", code: "SMR" },
  { city: "San Andrés", region: "Archipiélago, Colombia", airport: "Gustavo Rojas Pinilla", code: "ADZ" },
  { city: "Pereira", region: "Risaralda, Colombia", airport: "Matecaña", code: "PEI" },
  { city: "Barranquilla", region: "Atlántico, Colombia", airport: "Ernesto Cortissoz", code: "BAQ" },
  { city: "Bucaramanga", region: "Santander, Colombia", airport: "Palonegro", code: "BGA" },
  { city: "Cúcuta", region: "Norte de Santander, Colombia", airport: "Camilo Daza", code: "CUC" },
  { city: "Armenia", region: "Quindío, Colombia", airport: "El Edén", code: "AXM" },
  { city: "Cancún", region: "Quintana Roo, México", airport: "Cancún International", code: "CUN" },
  { city: "Punta Cana", region: "Rep. Dominicana", airport: "Punta Cana International", code: "PUJ" },
  { city: "Miami", region: "Florida, EE.UU.", airport: "Miami International", code: "MIA" },
  { city: "Orlando", region: "Florida, EE.UU.", airport: "Orlando International", code: "MCO" },
  { city: "Panamá", region: "Panamá", airport: "Tocumen International", code: "PTY" },
  { city: "Madrid", region: "España", airport: "Adolfo Suárez Madrid–Barajas", code: "MAD" },
  { city: "París", region: "Francia", airport: "Charles de Gaulle", code: "CDG" },
  { city: "Nueva York", region: "Nueva York, EE.UU.", airport: "John F. Kennedy", code: "JFK" },
  { city: "Buenos Aires", region: "Argentina", airport: "Ezeiza", code: "EZE" },
  { city: "Lima", region: "Perú", airport: "Jorge Chávez", code: "LIM" },
  { city: "Ciudad de México", region: "México", airport: "Benito Juárez", code: "MEX" },
];

const PREFERENCES = [
  { id: "adultsOnly", label: "Solo Adultos" },
  { id: "allInclusive", label: "Todo Incluido" },
  { id: "beachfront", label: "Frente a Playa" },
  { id: "directFlight", label: "Vuelo Directo" },
  { id: "transportIncluded", label: "Transporte" },
  { id: "toursIncluded", label: "Tours" },
  { id: "travelInsurance", label: "Seguro" },
  { id: "baggage", label: "Equipaje" },
];

const DESTINATION_TEMPLATES = [
  { name: "Cancún", country: "México" },
  { name: "Cartagena", country: "Colombia" },
  { name: "Punta Cana", country: "Rep. Dominicana" },
  { name: "Miami", country: "USA" },
  { name: "Madrid", country: "España" },
  { name: "París", country: "Francia" },
  { name: "San Andrés", country: "Colombia" },
  { name: "Santa Marta", country: "Colombia" },
];

function mapItemTypeToSupplier(type: string): TravelSupplierType {
  switch (type) {
    case "Flight":
      return "airline";
    case "Hotel":
      return "hotel";
    case "Transfer":
      return "transport";
    case "Activity":
      return "operator";
    case "Insurance":
      return "insurance";
    default:
      return "other";
  }
}

export function QuoteBuilder({
  initialQuote,
  initialPackageId,
  contactId,
  leadId,
  clientName: initialClientName,
  clientPhone: initialClientPhone,
  layoutMode = "workspace",
  onClose,
  onSaved,
}: {
  initialQuote?: TravelQuoteDto | null;
  initialPackageId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  layoutMode?: "workspace" | "modal";
  onClose: () => void;
  onSaved: (quote: TravelQuoteDto) => void;
}) {
  const isEditing = !!initialQuote;
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  const [quoteDate, setQuoteDate] = useState(
    initialQuote?.quoteDate ?? new Date().toISOString().split("T")[0]
  );

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
  const [freelanceCommission, setFreelanceCommission] = useState<number>(
    initialQuote?.freelanceCommission ?? 0
  );
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(
    initialQuote?.selectedHotelId ?? null
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


  // Secciones colapsables estilo Viajentor: por defecto solo cliente y viaje abiertos para no abrumar
  const [showClient, setShowClient] = useState(true);
  const [showTrip, setShowTrip] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showItinerary, setShowItinerary] = useState(true);
  const [showInclusions, setShowInclusions] = useState(false);
  const [showFinancial, setShowFinancial] = useState(false);

  // Estados de diálogo de confirmación
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmAiSuggestOpen, setConfirmAiSuggestOpen] = useState(false);

  const { toast } = useToast();

  // Estados e integración con Paquetes Turísticos
  const [packageSelectorOpen, setPackageSelectorOpen] = useState(false);
  const [saveAsPackageOpen, setSaveAsPackageOpen] = useState(false);
  const [packageTitle, setPackageTitle] = useState("");
  const [packageDescription, setPackageDescription] = useState("");
  const [savingAsPackage, setSavingAsPackage] = useState(false);

  function applyPackage(pkg: TravelPackageDto) {
    if (pkg.originCity) setOriginCity(pkg.originCity);
    if (pkg.departureAirport) setDepartureAirport(pkg.departureAirport);
    if (pkg.destination) setDestination(pkg.destination);
    if (pkg.arrivalAirport) setArrivalAirport(pkg.arrivalAirport);
    if (pkg.flightType) setFlightType(pkg.flightType);
    if (pkg.startDate) setStartDate(pkg.startDate);
    if (pkg.endDate) setEndDate(pkg.endDate);
    if (pkg.nights) setNights(pkg.nights);
    if (pkg.passengers) setPassengers(pkg.passengers);
    if (pkg.childPassengers !== undefined) setChildPassengers(pkg.childPassengers);
    if (pkg.currency) setCurrency(pkg.currency);
    if (pkg.exchangeRate) setExchangeRate(pkg.exchangeRate);
    if (pkg.markupPercentage !== undefined) setMarkupPercentage(pkg.markupPercentage);
    if (pkg.taxes !== undefined) setTaxes(pkg.taxes);
    if (pkg.administrativeFee !== undefined) setAdministrativeFee(pkg.administrativeFee);
    if (pkg.profitability !== undefined) setProfitability(pkg.profitability);
    if (pkg.minimumDeposit !== undefined) setMinimumDeposit(pkg.minimumDeposit);
    if (pkg.freelanceCommission !== undefined) setFreelanceCommission(pkg.freelanceCommission);
    if (pkg.selectedHotelId) setSelectedHotelId(pkg.selectedHotelId);
    if (pkg.days && pkg.days.length > 0) setDays(pkg.days);
    if (pkg.inclusions) setInclusions(pkg.inclusions);
    if (pkg.exclusions) setExclusions(pkg.exclusions);
    if (pkg.policies) setPolicies(pkg.policies);
    toast(`Paquete "${pkg.title}" cargado con éxito`, "success");
  }

  useEffect(() => {
    if (!initialPackageId) return;
    async function loadPackage() {
      try {
        const res = await fetch(`/api/travel/packages/${initialPackageId}`);
        if (!res.ok) return;
        const pkg = (await res.json()) as TravelPackageDto;
        applyPackage(pkg);
      } catch (err) {
        console.error("Error al cargar paquete inicial", err);
      }
    }
    void loadPackage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPackageId]);

  async function handleSaveAsPackage() {
    if (!destination.trim()) {
      toast("El paquete debe tener al menos un destino", "warning");
      return;
    }
    if (!packageTitle.trim()) {
      toast("Ingresa un título para el paquete", "warning");
      return;
    }
    try {
      setSavingAsPackage(true);
      const res = await fetch("/api/travel/packages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: packageTitle.trim(),
          description: packageDescription.trim() || undefined,
          destination: destination.trim(),
          originCity: originCity.trim() || undefined,
          departureAirport: departureAirport.trim() || undefined,
          arrivalAirport: arrivalAirport.trim() || undefined,
          flightType,
          startDate: startDate || null,
          endDate: endDate || null,
          nights: Number(nights) || 0,
          passengers: Number(passengers) || 1,
          childPassengers: Number(childPassengers) || 0,
          currency,
          exchangeRate: Number(exchangeRate) || 1,
          markupPercentage: Number(markupPercentage) || 15,
          taxes: Number(taxes) || 0,
          administrativeFee: Number(administrativeFee) || 0,
          profitability: Number(profitability) || 75,
          minimumDeposit: Number(minimumDeposit) || 0,
          freelanceCommission: Number(freelanceCommission) || 0,
          selectedHotelId: selectedHotelId || null,
          days,
          inclusions: inclusions.trim() || undefined,
          exclusions: exclusions.trim() || undefined,
          policies: policies.trim() || undefined,
          status: "active",
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Error al guardar el paquete");
      }
      toast(`Paquete "${packageTitle}" guardado exitosamente`, "success");
      setSaveAsPackageOpen(false);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Error al guardar paquete", "error");
    } finally {
      setSavingAsPackage(false);
    }
  }

  const isFormDirty =
    Boolean(clientName.trim() && clientName !== (initialQuote?.clientName ?? initialClientName ?? "")) ||
    Boolean(destination.trim() && destination !== (initialQuote?.destination ?? "")) ||
    days.some((d) => d.items.length > 0);

  function requestClose() {
    if (isFormDirty) {
      setConfirmCloseOpen(true);
    } else {
      onClose();
    }
  }

  // Preferencias
  const [preferences, setPreferences] = useState<Record<string, boolean>>(
    initialQuote?.preferences ?? {}
  );
  const [flightType, setFlightType] = useState<"round-trip" | "one-way">(
    initialQuote?.flightType ?? "round-trip"
  );
  const [departureAirport, setDepartureAirport] = useState(initialQuote?.departureAirport ?? "");
  const [arrivalAirport, setArrivalAirport] = useState(initialQuote?.arrivalAirport ?? "");
  const [rooms, setRooms] = useState<number>(initialQuote?.rooms ?? 1);
  const [flexibility, setFlexibility] = useState(initialQuote?.flexibility ?? "No");
  const [advisorName, setAdvisorName] = useState(initialQuote?.advisorName ?? "");

  const [showOriginSuggs, setShowOriginSuggs] = useState(false);
  const [showDestSuggs, setShowDestSuggs] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<AirportItem[]>(
    AIRPORT_DATA.slice(0, 6)
  );
  const [destSuggestions, setDestSuggestions] = useState<AirportItem[]>(
    AIRPORT_DATA.slice(0, 6)
  );
  const [isSearchingOrigin, setIsSearchingOrigin] = useState(false);
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
        // Fallback local en caso de error de red
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
      setOriginSuggestions(
        local.length > 0 ? local.slice(0, 8) : AIRPORT_DATA.slice(0, 6)
      );
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
        // Fallback local en caso de error de red
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
      setDestSuggestions(
        local.length > 0 ? local.slice(0, 8) : AIRPORT_DATA.slice(0, 6)
      );
    }, 300);

    return () => clearTimeout(timer);
  }, [destination]);

  const allCollapsed = !showClient && !showTrip && !showPreferences && !showItinerary && !showInclusions && !showFinancial;

  function toggleCollapseAll() {
    const next = allCollapsed;
    setShowClient(next);
    setShowTrip(next);
    setShowPreferences(next);
    setShowItinerary(next);
    setShowInclusions(next);
    setShowFinancial(next);
  }

  function applyDestinationTemplate(tmplName: string) {
    setDestination(tmplName);
    const tmplMap: Record<string, { inc: string; exc: string; pol: string }> = {
      "Cancún": {
        inc: "• Vuelos ida y vuelta con equipaje\n• Hotel Todo Incluido 4-5 estrellas\n• Traslado aeropuerto - hotel - aeropuerto\n• Tarjeta de asistencia médica",
        exc: "• Excursiones opcionales\n• Gastos personales y propinas\n• Impuestos locales de saneamiento ambiental",
        pol: "Tarifa promocional sujeta a disponibilidad de cupos aéreos y hoteleros. Cancelaciones según políticas del operador."
      },
      "Cartagena": {
        inc: "• Tiquetes aéreos ida y regreso\n• Alojamiento en hotel seleccionado con desayuno\n• Traslados aeropuerto - hotel - aeropuerto\n• Asistencia médica integral",
        exc: "• Almuerzos y cenas no especificados\n• Propinas a maleteros y guías",
        pol: "Tiquetes no reembolsables. Cambios de fecha sujetos a penalidad de aerolínea y diferencia tarifaria."
      },
      "Punta Cana": {
        inc: "• Tiquetes aéreos internacionales\n• Resort Todo Incluido 24 horas\n• Traslados en destino compartidos\n• Seguro de viaje con cobertura COVID",
        exc: "• Tarjeta de turista / impuestos de entrada si aplican\n• Servicios de spa y compras personales",
        pol: "Requiere pasaporte vigente mínimo 6 meses antes de la fecha del viaje."
      },
      "San Andrés": {
        inc: "• Tiquetes aéreos\n• Alojamiento plan Full o Desayuno\n• Vuelta a la isla en chiva o van\n• Tarjeta de asistencia médica",
        exc: "• Tarjeta de turismo OCCRE de entrada a la isla\n• Deportes náuticos y tours no incluidos",
        pol: "Vuelo chárter / regular no reembolsable. Verifique pago de tarjeta OCCRE en sala de abordaje."
      }
    };
    if (tmplMap[tmplName]) {
      setInclusions(tmplMap[tmplName].inc);
      setExclusions(tmplMap[tmplName].exc);
      setPolicies(tmplMap[tmplName].pol);
    }
  }

  function togglePref(id: string) {
    setPreferences((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // UI state
  const [loadingAi, setLoadingAi] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

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
      setNights(diff > 0 ? diff : 1);
    }
  }

  function handleEndDateChange(val: string) {
    setEndDate(val);
    if (startDate && val) {
      const s = new Date(startDate);
      const e = new Date(val);
      const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
      setNights(diff > 0 ? diff : 1);
    }
  }

  function handleNightsChange(num: number) {
    setNights(num);
    if (startDate && num > 0 && flightType !== "one-way") {
      const s = new Date(startDate);
      s.setDate(s.getDate() + num);
      const yyyy = s.getFullYear();
      const mm = String(s.getMonth() + 1).padStart(2, "0");
      const dd = String(s.getDate()).padStart(2, "0");
      setEndDate(`${yyyy}-${mm}-${dd}`);
    }
  }

  function handleNightsBlur() {
    if (nights < 1) {
      handleNightsChange(1);
    }
  }

  function handlePassengersBlur() {
    if (passengers < 1) {
      setPassengers(1);
    }
  }

  // Precargar políticas y márgenes base de la agencia si es una cotización nueva
  useEffect(() => {
    if (!initialQuote) {
      fetch("/api/settings/branding")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const agency = data?.branding?.agency;
          if (agency) {
            if (agency.generalPolicies) {
              setPolicies((prev) => (prev ? prev : agency.generalPolicies));
            }
            if (agency.profitability && agency.profitability > 0) {
              setProfitability(agency.profitability);
            }
            if (agency.freelanceCommission !== undefined) {
              setFreelanceCommission(agency.freelanceCommission);
            }
          }
        })
        .catch(() => {});
    }
  }, [initialQuote]);

  // Recalcular y sincronizar reactivamente los ítems cuando cambia el número de pasajeros
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

  const allHotels = days.flatMap((d) => d.items.filter((i) => i.type === "Hotel"));

  // Auto-generate installments helper con deducción de depósito inicial y soporte para opción específica
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
  function handleAiSuggest() {
    if (!destination.trim()) {
      setError("Indica el destino antes de solicitar sugerencias a la IA");
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
      flightType,
      departureAirport: departureAirport.trim() || null,
      arrivalAirport: arrivalAirport.trim() || null,
      rooms: Number(rooms) || 1,
      flexibility: flexibility.trim() || null,
      preferences,
      advisorName: advisorName.trim() || null,
      quoteDate: quoteDate || null,
      currency,
      exchangeRate: Number(exchangeRate) || 1,
      markupPercentage: Number(markupPercentage) || 15,
      taxes: Number(taxes) || 0,
      administrativeFee: Number(administrativeFee) || 0,
      profitability: Number(profitability) || 75,
      minimumDeposit: Number(minimumDeposit) || 0,
      freelanceCommission: Number(freelanceCommission) || 0,
      selectedHotelId: selectedHotelId || null,
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
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background"
          : layoutMode === "modal"
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-1 sm:p-2.5 backdrop-blur-sm"
          : "flex h-full w-full flex-col bg-background overflow-hidden"
      }
      onClick={layoutMode === "modal" && !isFullscreen ? requestClose : undefined}
    >
      <div
        role={layoutMode === "modal" ? "dialog" : undefined}
        aria-label={isEditing ? "Editar Cotización" : "Nueva Cotización"}
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col bg-card"
            : layoutMode === "modal"
            ? "flex h-[98vh] max-h-[98vh] w-full max-w-[97vw] 2xl:max-w-[1800px] flex-col rounded-xl border bg-card shadow-2xl transition-all duration-200"
            : "flex h-full w-full flex-col bg-card overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3.5 bg-muted/20 sm:px-5">
          <div className="flex items-center gap-3">
            {layoutMode === "workspace" && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={requestClose}
                  className="gap-1.5 text-xs font-semibold text-text-2 hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Volver</span>
                </Button>
                <div className="h-6 w-px bg-border hidden sm:block" />
              </>
            )}
            <div className="rounded-lg bg-brand p-1.5 text-brand-fg">
              <Plane className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground leading-none">
                {isEditing ? `Editar Cotización ${initialQuote.quoteNumber}` : "Nueva Cotización Turística"}
              </h2>
              <p className="text-[11px] text-text-3 mt-1 hidden sm:block">
                Diseñador de itinerarios, costeo dinámico y amortización automática.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setPackageSelectorOpen(true)}
              className="text-xs bg-card hover:bg-muted text-foreground border-border gap-1.5"
              title="Cargar fechas, itinerario y servicios desde un Paquete Turístico"
            >
              <Package className="h-3.5 w-3.5 text-primary" />
              Cargar Paquete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={toggleCollapseAll}
              className="text-xs text-text-2 border-border hover:bg-muted"
            >
              {allCollapsed ? "Expandir Todo" : "Colapsar Todo"}
            </Button>
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
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-xs text-text-2 border-border hover:bg-muted"
              title={isFullscreen ? "Restaurar ventana" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 mr-1" />
              )}
              {isFullscreen ? "Restaurar" : "Pantalla Completa"}
            </Button>
            {layoutMode === "modal" && (
              <button
                type="button"
                onClick={requestClose}
                className="rounded p-1 text-text-3 hover:text-foreground"
                aria-label="Cerrar diseñador"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-6">
          {error && (
            <div className="rounded-md border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
              {error}
            </div>
          )}

          {/* Paso 1: Información del Cliente */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowClient(!showClient)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Paso 1 · Cliente</span>
                  <span className="block font-bold text-sm text-foreground">Información del Cliente y Asesor</span>
                </div>
              </div>
              <div className="rounded-full p-1 text-text-3">
                {showClient ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showClient && (
              <div className="p-4 border-t bg-muted/10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3.5">
                <div className="space-y-1 sm:col-span-2 md:col-span-1 2xl:col-span-2">
                  <label className="text-xs font-semibold text-text-2">Nombre Completo *</label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="María García López"
                    required
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
                  <label className="text-xs font-semibold text-text-2">Correo Electrónico</label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="cliente@correo.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Ciudad de Origen</label>
                  <Input
                    value={originCity}
                    onChange={(e) => {
                      const c = e.target.value;
                      setOriginCity(c);
                      const mapped = CITY_AIRPORT_MAP[c.toLowerCase().trim()];
                      if (mapped && !departureAirport) setDepartureAirport(mapped);
                    }}
                    placeholder="Bogotá, Medellín..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Motivo del Viaje</label>
                  <Input
                    value={travelReason}
                    onChange={(e) => setTravelReason(e.target.value)}
                    placeholder="Luna de miel, Familiar, Negocios..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Asesor Responsable</label>
                  <Input
                    value={advisorName}
                    onChange={(e) => setAdvisorName(e.target.value)}
                    placeholder="Nombre del asesor"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Fecha de Cotización</label>
                  <Input
                    type="date"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Paso 2: Destinos, Aeropuertos y Fechas */}
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
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Paso 2 · Destinos y Fechas</span>
                  <span className="block font-bold text-sm text-foreground">Detalles del Destino y Vuelos</span>
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
                    <label className="text-xs font-semibold text-text-2">Ciudad o Aeropuerto de Origen</label>
                    <Input
                      value={originCity}
                      onChange={(e) => {
                        setOriginCity(e.target.value);
                        setShowOriginSuggs(true);
                      }}
                      onFocus={() => setShowOriginSuggs(true)}
                      placeholder="Ej. Bogotá (BOG)"
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

                  {/* Botón Swap / Invertir Trayecto */}
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
                      placeholder="Ej. Cancún, Madrid..."
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

                {/* Fechas, Noches, Pasajeros y Habitaciones */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Fecha Ida *</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-xs font-semibold text-text-2 ${flightType === "one-way" ? "opacity-50" : ""}`}>Fecha Vuelta</label>
                    <Input
                      type="date"
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
                      onBlur={handleNightsBlur}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Flexibilidad</label>
                    <select
                      value={flexibility}
                      onChange={(e) => setFlexibility(e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                    >
                      <option value="No">Sin flexibilidad</option>
                      <option value="+/- 1 día">+/- 1 día</option>
                      <option value="+/- 3 días">+/- 3 días</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Adultos (12+ años) *</label>
                    <Input
                      type="number"
                      min="1"
                      value={passengers === 0 ? "" : passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                      onBlur={handlePassengersBlur}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Menores / Niños</label>
                    <Input
                      type="number"
                      min="0"
                      value={childPassengers}
                      onChange={(e) => setChildPassengers(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Habitaciones</label>
                    <Input
                      type="number"
                      min="1"
                      value={rooms}
                      onChange={(e) => setRooms(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-text-2">Moneda del Plan</label>
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

          {/* Paso 3: Preferencias del Viaje */}
          <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPreferences(!showPreferences)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/40 transition"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Paso 3 · Preferencias</span>
                  <span className="block font-bold text-sm text-foreground">Etiquetas y Preferencias de Viaje</span>
                </div>
              </div>
              <div className="rounded-full p-1 text-text-3">
                {showPreferences ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showPreferences && (
              <div className="p-4 border-t bg-muted/10">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PREFERENCES.map((pref) => {
                    const isChecked = !!preferences[pref.id];
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        onClick={() => togglePref(pref.id)}
                        className={`flex items-center justify-center rounded-full py-2 px-3 text-xs font-bold border transition ${
                          isChecked
                            ? "bg-foreground text-background border-foreground shadow-xs"
                            : "bg-card text-text-2 border-border hover:bg-muted"
                        }`}
                      >
                        {pref.label} {isChecked && " ✓"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Paso 4: Servicios del Itinerario */}
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
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Paso 4 · Itinerario</span>
                  <span className="block font-bold text-sm text-foreground">Planificación del Itinerario ({days.length} Días)</span>
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
                        Sin servicios agregados para este día. Usa los botones de abajo para agregar vuelo, hotel, actividad, traslado o seguro.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {day.items.map((it) => (
                            <div
                              key={it.id}
                              className="bg-muted/30 rounded-xl p-3.5 sm:p-4 border border-border/80 space-y-3 shadow-2xs hover:border-brand/40 transition-colors"
                            >
                              {/* Fila 1: Tipo de Servicio, Checkbox Por Persona, Precios y Eliminar */}
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
                                  {/* Checkbox Por Persona */}
                                  {(childPassengers > 0 || it.pricePerPerson) && (
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
                                  )}

                                  {it.pricePerPerson ? (
                                    <div className="flex flex-wrap items-center gap-2">
                                      {it.type === "Insurance" ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-text-3 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                            Valor por Pax
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
                                                netPriceAdult:
                                                  val === "" ? 0 : parseFloat(val) || 0,
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
                                                  netPriceAdult:
                                                    val === "" ? 0 : parseFloat(val) || 0,
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
                                                  it.netPriceChild === 0 ||
                                                  it.netPriceChild === undefined
                                                    ? ""
                                                    : it.netPriceChild
                                                }
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  updateItem(day.id, it.id, {
                                                    netPriceChild:
                                                      val === "" ? 0 : parseFloat(val) || 0,
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
                                onChange={(e) =>
                                  updateItem(day.id, it.id, { title: e.target.value })
                                }
                                placeholder="Nombre o título del servicio..."
                                className="w-full text-xs font-semibold h-8"
                              />

                              {/* Fila 3: Buscador de Proveedor Aliado filtrado por Tipo y Ciudad */}
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

                              {/* Fila 4: Descripción detallada */}
                              <Textarea
                                value={it.description || ""}
                                onChange={(e) =>
                                  updateItem(day.id, it.id, { description: e.target.value })
                                }
                                placeholder="Descripción detallada del servicio o notas..."
                                rows={2}
                                className="w-full text-xs resize-none"
                              />

                                {/* Campos directos de Hotel estilo Viajentor */}
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
                                              boardBasis: it.hotelDetails?.boardBasis || "Solo Habitacion",
                                              stars: it.hotelDetails?.stars || 4,
                                            },
                                          })
                                        }
                                        placeholder="Ej. Habitación Doble, Suite Presidencial"
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

                                {/* Detalles Técnicos Opcionales (PNR, Vuelos) */}
                                <details className="text-xs group mt-1">
                                  <summary className="cursor-pointer text-[11px] font-semibold text-text-3 hover:text-foreground select-none flex items-center gap-1.5 py-1">
                                    <span>⚙️ Opciones avanzadas (PNR, Vuelos...)</span>
                                  </summary>
                                  <div className="mt-2 p-3 bg-card rounded-lg border border-border/80 space-y-3">

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-semibold text-text-3">
                                          Código PNR / Confirmación
                                        </label>
                                        <Input
                                          value={it.pnr || ""}
                                          onChange={(e) =>
                                            updateItem(day.id, it.id, { pnr: e.target.value.toUpperCase() })
                                          }
                                          placeholder="Ej. ABC123"
                                          className="h-8 text-xs font-mono uppercase"
                                        />
                                      </div>
                                    </div>

                                    {/* Si es vuelo, formulario compacto de aerolínea y ruta */}
                                    {it.type === "Flight" && (
                                      <div className="pt-2 border-t border-dashed space-y-2">
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
                                            <label className="text-[10px] font-semibold text-text-3">Vuelo #</label>
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
                                                    flightNumber: e.target.value.toUpperCase(),
                                                    origin: it.flightDetails?.origin || "",
                                                    destination: it.flightDetails?.destination || "",
                                                    cabin: it.flightDetails?.cabin || "Economica",
                                                  },
                                                })
                                              }
                                              placeholder="AV 8520"
                                              className="h-8 text-xs font-mono uppercase"
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
                                              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                                            >
                                              <option value="Economica">Económica</option>
                                              <option value="Premium Economy">Premium Economy</option>
                                              <option value="Ejecutiva">Ejecutiva</option>
                                              <option value="Primera Clase">Primera Clase</option>
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </details>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Botones de acción rápida por día estilo Viajentor */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/50">
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

          {/* Paso 5: Configuración Financiera y Plan de Pagos */}
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
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Paso 5 · Finanzas</span>
                  <span className="block font-bold text-sm text-foreground">Tarifas, Márgenes y Plan de Amortización</span>
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

            {/* Live Totals Card con soporte para Multicotización Segregada */}
            {totals.byHotel && totals.byHotel.length > 1 ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3">
                  <Hotel className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-extrabold text-foreground">
                      Multicotización Activa: {totals.byHotel.length} Opciones de Alojamiento
                    </p>
                    <p className="text-text-3 leading-relaxed">
                      Cada hotel se calcula de forma independiente sumando los servicios comunes del itinerario (vuelos, traslados, seguros, actividades) más ese hotel en particular, aplicando las tarifas y márgenes correspondientes.
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

                        {/* Desglose Detallado por Opción */}
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

                          <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                              Cargos Adicionales
                            </span>
                            <div className="flex justify-between text-xs text-slate-200">
                              <span>Fee Admin ({passengers + childPassengers} pax):</span>
                              <span className="font-semibold">
                                {formatCurrency(administrativeFee * (passengers + childPassengers), currency)}
                              </span>
                            </div>
                            {taxes > 0 && (
                              <div className="flex justify-between text-xs text-slate-200">
                                <span>IVA / Impuestos ({taxes}%):</span>
                                <span className="font-semibold">
                                  +{formatCurrency(item.taxAmount, currency)}
                                </span>
                              </div>
                            )}
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
                  {freelanceCommission > 0 && (
                    <div>
                      <span className="text-xs text-text-3 block">
                        Comisión Freelance ({freelanceCommission}%):
                      </span>
                      <span className="font-semibold text-indigo-600">
                        {formatCurrency(
                          Math.max(
                            0,
                            (totals.finalTotal - totals.markupAmount - (administrativeFee * (passengers + childPassengers))) *
                              (freelanceCommission / 100)
                          ),
                          currency
                        )}
                      </span>
                    </div>
                  )}
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
                        <span className="text-text-3 block font-medium">
                          {inst.code || `Cuota ${i + 1}`} ({inst.dueDate}):
                        </span>
                        <span className="font-bold">{formatCurrency(inst.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
              </div>
            )}
          </div>

          {/* Paso 6: Inclusiones, Exclusiones y Políticas */}
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
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand">Paso 6 · Cláusulas</span>
                  <span className="block font-bold text-sm text-foreground">Inclusiones, Exclusiones y Políticas del Viaje</span>
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
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setPackageTitle(
                  destination ? `Paquete ${destination} (${nights} noches)` : "Nuevo Paquete Turístico"
                );
                setSaveAsPackageOpen(true);
              }}
              className="gap-1.5 text-xs text-text-2 border-border hover:bg-muted"
              title="Guardar este itinerario como una plantilla de Paquete Turístico"
            >
              <BookmarkPlus className="h-4 w-4 text-primary" />
              Guardar como Paquete
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={requestClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear Cotización"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Selector de Paquetes Turísticos */}
      <PackageSelectorModal
        isOpen={packageSelectorOpen}
        onClose={() => setPackageSelectorOpen(false)}
        onSelect={(pkg) => {
          applyPackage(pkg);
          setPackageSelectorOpen(false);
        }}
      />

      {/* Modal para Guardar como Paquete */}
      {saveAsPackageOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BookmarkPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Guardar como Paquete Turístico
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Guarda este itinerario y servicios para reutilizarlo en futuras cotizaciones.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSaveAsPackageOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Título del Paquete *
                </label>
                <Input
                  value={packageTitle}
                  onChange={(e) => setPackageTitle(e.target.value)}
                  placeholder="Ej: Cancún Todo Incluido 5D/4N"
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Descripción (Opcional)
                </label>
                <Textarea
                  rows={2}
                  value={packageDescription}
                  onChange={(e) => setPackageDescription(e.target.value)}
                  placeholder="Detalles clave, público objetivo o notas de la temporada..."
                />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground space-y-1 border border-border/50">
                <div className="font-medium text-foreground">
                  Información que se guardará en la plantilla:
                </div>
                {originCity && (
                  <div>• Origen: <b>{originCity}</b> {departureAirport ? `(${departureAirport})` : ""}</div>
                )}
                <div>• Destino: <b>{destination || "Sin especificar"}</b> {arrivalAirport ? `(${arrivalAirport})` : ""}</div>
                <div>• Fechas: <b>{startDate || "Sin fecha"} al {endDate || "Sin fecha"}</b> ({nights} noches)</div>
                <div>• Itinerario: <b>{days.length} días configurados</b></div>
                <div className="text-[11px] text-primary pt-1">
                  * No se guardará ningún dato personal del cliente.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSaveAsPackageOpen(false)}
                disabled={savingAsPackage}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveAsPackage}
                disabled={savingAsPackage || !packageTitle.trim()}
                className="gap-2"
              >
                {savingAsPackage ? "Guardando..." : "Guardar Paquete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo al salir con cambios sin guardar */}
      <ConfirmDialog
        isOpen={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        onConfirm={onClose}
        variant="warning"
        title="¿Descartar cambios no guardados?"
        message="Tienes información en el formulario que no ha sido guardada. Si sales ahora, se perderán los datos del itinerario."
        confirmText="Descartar y salir"
        cancelText="Continuar editando"
      />

      {/* Diálogo de sobreescritura de IA */}
      <ConfirmDialog
        isOpen={confirmAiSuggestOpen}
        onClose={() => setConfirmAiSuggestOpen(false)}
        onConfirm={() => void runAiSuggest()}
        variant="warning"
        title="¿Reemplazar itinerario actual con IA?"
        message="Ya tienes servicios cargados en el itinerario. La generación con Inteligencia Artificial reemplazará los días actuales con la nueva propuesta."
        confirmText="Sí, generar nueva propuesta"
        cancelText="Conservar lo que tengo"
      />
    </div>
  );
}
