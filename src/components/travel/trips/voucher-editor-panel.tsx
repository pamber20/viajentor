"use client";

import React, { useState } from "react";
import {
  Save,
  Plane,
  Hotel,
  Car,
  MapPin,
  Plus,
  Trash2,
  ShieldCheck,
  Loader2,
  FileDown,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ActivityDetail,
  TransferDetail,
  Traveler,
} from "@/lib/travel/types";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelVoucherDto } from "@/server/travel/trips";

interface VoucherEditorPanelProps {
  quote: TravelQuoteDto;
  initialVoucher: TravelVoucherDto | null;
  onSaved: (voucher: TravelVoucherDto) => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
  onCopyWhatsApp?: () => void;
}

export function VoucherEditorPanel({
  quote,
  initialVoucher,
  onSaved,
  onDownloadPdf,
  isDownloadingPdf = false,
  onCopyWhatsApp,
}: VoucherEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "flight" | "hotel" | "transfers" | "activities" | "checklist"
  >("flight");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicialización de estado con datos de la reserva / voucher
  const allHotels = quote.days.flatMap((d) => d.items).filter((i) => i.type === "Hotel");
  const hotelItem =
    (quote.selectedHotelId ? allHotels.find((h) => h.id === quote.selectedHotelId) : null) ||
    allHotels[0];
  const flightItem = quote.days
    .flatMap((d) => d.items)
    .find((i) => i.type === "Flight");

  // Flight State
  const [flightDetails, setFlightDetails] = useState<Record<string, string>>({
    airline:
      initialVoucher?.flightDetails?.airline ||
      flightItem?.flightDetails?.airline ||
      "",
    flightNumber:
      initialVoucher?.flightDetails?.flightNumber ||
      flightItem?.flightDetails?.flightNumber ||
      "",
    pnr:
      initialVoucher?.flightDetails?.pnr ||
      flightItem?.pnr ||
      quote.bookingNumber ||
      "",
    departureCity:
      initialVoucher?.flightDetails?.departureCity ||
      flightItem?.flightDetails?.origin ||
      quote.originCity ||
      "",
    arrivalCity:
      initialVoucher?.flightDetails?.arrivalCity ||
      flightItem?.flightDetails?.destination ||
      quote.destination ||
      "",
    departureDate:
      initialVoucher?.flightDetails?.departureDate ||
      flightItem?.flightDetails?.departureDate ||
      quote.startDate ||
      "",
    departureTime:
      initialVoucher?.flightDetails?.departureTime ||
      flightItem?.flightDetails?.departureTime ||
      "08:00",
    arrivalDate:
      initialVoucher?.flightDetails?.arrivalDate ||
      flightItem?.flightDetails?.arrivalDate ||
      quote.endDate ||
      "",
    arrivalTime:
      initialVoucher?.flightDetails?.arrivalTime ||
      flightItem?.flightDetails?.arrivalTime ||
      "12:00",
    cabin:
      initialVoucher?.flightDetails?.cabin ||
      flightItem?.flightDetails?.cabin ||
      "Económica",
  });

  // Hotel State
  const [hotelDetails, setHotelDetails] = useState<Record<string, string>>({
    name:
      initialVoucher?.hotelDetails?.name ||
      hotelItem?.hotelDetails?.hotelName ||
      hotelItem?.title ||
      "",
    confirmationNumber:
      initialVoucher?.hotelDetails?.confirmationNumber ||
      hotelItem?.pnr ||
      quote.bookingNumber ||
      "",
    address:
      initialVoucher?.hotelDetails?.address ||
      hotelItem?.hotelDetails?.address ||
      "",
    phone:
      initialVoucher?.hotelDetails?.phone ||
      hotelItem?.hotelDetails?.phone ||
      "",
    checkIn:
      initialVoucher?.hotelDetails?.checkIn ||
      hotelItem?.hotelDetails?.checkIn ||
      quote.startDate ||
      "",
    checkOut:
      initialVoucher?.hotelDetails?.checkOut ||
      hotelItem?.hotelDetails?.checkOut ||
      quote.endDate ||
      "",
    mealPlan:
      initialVoucher?.hotelDetails?.mealPlan ||
      hotelItem?.hotelDetails?.boardBasis ||
      "Todo Incluido",
    roomType:
      initialVoucher?.hotelDetails?.roomType ||
      hotelItem?.hotelDetails?.roomType ||
      "Estándar",
  });

  // Transfers State
  const itineraryTransfers: TransferDetail[] = quote.days.flatMap((d) =>
    d.items
      .filter((i) => i.type === "Transfer")
      .map((tr) => ({
        id: tr.id,
        type: "airport-hotel" as const,
        pickupLocation:
          tr.transferDetails?.pickupPoint || `Aeropuerto de ${quote.destination}`,
        dropoffLocation:
          tr.transferDetails?.dropoffPoint ||
          hotelDetails.name ||
          `Hotel en ${quote.destination}`,
        pickupDate: tr.transferDetails?.date || quote.startDate || "",
        pickupTime: tr.transferDetails?.time || "Según horario de llegada",
        vehicleType: tr.transferDetails?.vehicleType || "Automóvil / Van",
        provider: tr.provider || "Operador Receptivo Local",
        notes:
          tr.description ||
          "El chofer esperará con letrero del pasajero en la salida de llegadas",
      }))
  );

  const [transfers, setTransfers] = useState<TransferDetail[]>(
    initialVoucher?.transfers && initialVoucher.transfers.length > 0
      ? initialVoucher.transfers
      : itineraryTransfers.length > 0
      ? itineraryTransfers
      : [
          {
            id: `tr-${Date.now()}-1`,
            type: "airport-hotel",
            pickupLocation: `Aeropuerto de ${quote.destination}`,
            dropoffLocation: hotelDetails.name || `Hotel en ${quote.destination}`,
            pickupDate: quote.startDate || "",
            pickupTime: "Según llegada del vuelo",
            provider: "Operador Receptivo Local",
            notes: "El chofer esperará con letrero del pasajero en la salida de llegadas",
          },
        ]
  );
  const [transfersConfirmation, setTransfersConfirmation] = useState(
    initialVoucher?.transfersConfirmationNumber || quote.bookingNumber || ""
  );

  // Activities State
  const itineraryActivities: ActivityDetail[] = quote.days.flatMap((d) =>
    d.items
      .filter((i) => i.type === "Activity")
      .map((act) => ({
        id: act.id,
        title: act.title,
        description: act.description || "",
        date: quote.startDate || "",
        time: "09:00",
        location: hotelDetails.name || `Lobby del Hotel (${quote.destination})`,
        provider: act.provider || "Operador Local",
        notes: act.description || "",
      }))
  );

  const [activities, setActivities] = useState<ActivityDetail[]>(
    initialVoucher?.activities && initialVoucher.activities.length > 0
      ? initialVoucher.activities
      : itineraryActivities
  );

  // Checklist & General Info
  const [checkInReminder, setCheckInReminder] = useState(
    initialVoucher?.checkInReminder ?? true
  );
  const [additionalInfo, setAdditionalInfo] = useState(
    initialVoucher?.additionalInfo ||
      "Presentar documento de identidad y este voucher impreso o digital en recepción.\nPara asistencia en viaje 24/7 comunicarse a los números de emergencia de la agencia."
  );
  const [documentsChecklist, setDocumentsChecklist] = useState<
    { id: string; label: string; completed: boolean }[]
  >(
    initialVoucher?.documentsChecklist && initialVoucher.documentsChecklist.length > 0
      ? initialVoucher.documentsChecklist
      : [
          { id: "doc-1", label: "Pasaportes / DNI con vigencia mínima de 6 meses", completed: true },
          { id: "doc-2", label: "Voucher de hotel y confirmación de vuelo", completed: true },
          { id: "doc-3", label: "Asistencia médica / Seguro internacional", completed: true },
          { id: "doc-4", label: "Vacuna fiebre amarilla / Requisitos sanitarios", completed: false },
        ]
  );
  const [newChecklistLabel, setNewChecklistLabel] = useState("");

  // Handlers Transfers
  const addTransfer = () => {
    const newTr: TransferDetail = {
      id: `tr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: "hotel-airport",
      pickupLocation: hotelDetails.name || `Hotel en ${quote.destination}`,
      dropoffLocation: `Aeropuerto de ${quote.destination}`,
      pickupDate: quote.endDate || "",
      pickupTime: "3 horas antes del vuelo",
      provider: "Operador Receptivo Local",
      notes: "Estar listo en el lobby del hotel con equipaje",
    };
    setTransfers([...transfers, newTr]);
  };

  const removeTransfer = (id: string) => {
    setTransfers(transfers.filter((t) => t.id !== id));
  };

  const updateTransfer = (id: string, patch: Partial<TransferDetail>) => {
    setTransfers(transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  // Handlers Activities
  const addActivity = () => {
    const newAct: ActivityDetail = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: "Excursión / Tour en Destino",
      date: quote.startDate || "",
      time: "09:00",
      location: "Lobby del Hotel o Punto de Encuentro",
      provider: "Operador Local",
      description: "Llevar ropa cómoda, protector solar y toalla",
    };
    setActivities([...activities, newAct]);
  };

  const removeActivity = (id: string) => {
    setActivities(activities.filter((a) => a.id !== id));
  };

  const updateActivity = (id: string, patch: Partial<ActivityDetail>) => {
    setActivities(activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  // Handlers Checklist
  const addChecklistItem = () => {
    if (!newChecklistLabel.trim()) return;
    setDocumentsChecklist([
      ...documentsChecklist,
      {
        id: `chk-${Date.now()}`,
        label: newChecklistLabel.trim(),
        completed: false,
      },
    ]);
    setNewChecklistLabel("");
  };

  const toggleChecklist = (id: string) => {
    setDocumentsChecklist(
      documentsChecklist.map((c) =>
        c.id === id ? { ...c, completed: !c.completed } : c
      )
    );
  };

  const removeChecklistItem = (id: string) => {
    setDocumentsChecklist(documentsChecklist.filter((c) => c.id !== id));
  };

  // Guardar Voucher
  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    const payload = {
      flightDetails,
      hotelDetails,
      transfers,
      transfersConfirmationNumber: transfersConfirmation.trim() || null,
      activities,
      checkInReminder,
      additionalInfo: additionalInfo.trim() || null,
      documentsChecklist,
      travelers: (quote.travelers ?? []) as Traveler[],
    };

    try {
      const res = await fetch(`/api/travel/vouchers/${quote.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error al guardar el voucher");
      }

      const data = (await res.json()) as { voucher: TravelVoucherDto };
      onSaved(data.voucher);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera Integrada y Barra de Acciones */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-md">
              {initialVoucher?.voucherNumber ?? "Voucher en borrador"}
            </span>
            <span className="text-xs text-text-3">
              Destino: <strong>{quote.destination}</strong>
            </span>
          </div>
          <h3 className="font-bold text-sm text-foreground mt-0.5">
            Personalización de Servicios de Voucher
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {onDownloadPdf && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isDownloadingPdf}
              onClick={onDownloadPdf}
              className="h-8 text-xs text-brand border-brand/30 hover:bg-brand-soft disabled:opacity-60"
            >
              {isDownloadingPdf ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileDown className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isDownloadingPdf ? "Generando..." : "Descargar Voucher PDF"}
            </Button>
          )}

          {onCopyWhatsApp && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCopyWhatsApp}
              className="h-8 text-xs"
            >
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Copiar WhatsApp
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-8 text-xs font-bold gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Guardando…
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ¡Guardado!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Guardar Voucher
              </>
            )}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs rounded-xl bg-danger-tint border border-danger-soft text-danger-text">
          {errorMessage}
        </div>
      )}

      {/* Selector de Sub-pestañas */}
      <div className="flex items-center gap-1.5 border-b pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("flight")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "flight"
              ? "bg-brand text-brand-foreground shadow-xs"
              : "text-text-3 hover:text-foreground hover:bg-muted"
          }`}
        >
          <Plane className="w-3.5 h-3.5" />
          Vuelos & PNR
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hotel")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "hotel"
              ? "bg-brand text-brand-foreground shadow-xs"
              : "text-text-3 hover:text-foreground hover:bg-muted"
          }`}
        >
          <Hotel className="w-3.5 h-3.5" />
          Hotel & Hospedaje
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transfers")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "transfers"
              ? "bg-brand text-brand-foreground shadow-xs"
              : "text-text-3 hover:text-foreground hover:bg-muted"
          }`}
        >
          <Car className="w-3.5 h-3.5" />
          Traslados ({transfers.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("activities")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "activities"
              ? "bg-brand text-brand-foreground shadow-xs"
              : "text-text-3 hover:text-foreground hover:bg-muted"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Tours & Actividades ({activities.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("checklist")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
            activeTab === "checklist"
              ? "bg-brand text-brand-foreground shadow-xs"
              : "text-text-3 hover:text-foreground hover:bg-muted"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Checklist & Asistencia
        </button>
      </div>

      {/* Contenido de la Sub-Pestaña Activa */}
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        {/* 1. Vuelos */}
        {activeTab === "flight" && (
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Datos de Vuelo y Localizador (PNR)
              </h4>
              <p className="text-[11px] text-text-3">
                Información para presentación en mostradores de aerolínea y pases de abordar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Localizador / PNR de Vuelo
                </label>
                <Input
                  value={flightDetails.pnr || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, pnr: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej: HK9X2P"
                  className="font-mono font-bold tracking-wider text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Aerolínea
                </label>
                <Input
                  value={flightDetails.airline || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, airline: e.target.value })
                  }
                  placeholder="Ej: Avianca / Copa Airlines"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Número de Vuelo (Ida)
                </label>
                <Input
                  value={flightDetails.flightNumber || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, flightNumber: e.target.value })
                  }
                  placeholder="Ej: AV 9452"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Ciudad de Salida (Origen)
                </label>
                <Input
                  value={flightDetails.departureCity || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, departureCity: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Ciudad de Llegada (Destino)
                </label>
                <Input
                  value={flightDetails.arrivalCity || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, arrivalCity: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Cabina / Clase
                </label>
                <Input
                  value={flightDetails.cabin || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, cabin: e.target.value })
                  }
                  placeholder="Ej: Económica / Ejecutiva"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Fecha de Salida
                </label>
                <Input
                  type="date"
                  value={flightDetails.departureDate || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, departureDate: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Hora de Salida
                </label>
                <Input
                  type="time"
                  value={flightDetails.departureTime || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, departureTime: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Hora Estimada de Llegada
                </label>
                <Input
                  type="time"
                  value={flightDetails.arrivalTime || ""}
                  onChange={(e) =>
                    setFlightDetails({ ...flightDetails, arrivalTime: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* 2. Hotel */}
        {activeTab === "hotel" && (
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Datos de Hospedaje y Check-in
              </h4>
              <p className="text-[11px] text-text-3">
                Información para presentar en la recepción del hotel junto a documentos de identidad.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Nombre del Hotel / Resort
                </label>
                <Input
                  value={hotelDetails.name || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, name: e.target.value })
                  }
                  placeholder="Ej: Hotel Decameron Isleño"
                  className="text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Código de Confirmación Hotel
                </label>
                <Input
                  value={hotelDetails.confirmationNumber || ""}
                  onChange={(e) =>
                    setHotelDetails({
                      ...hotelDetails,
                      confirmationNumber: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ej: HTL-88231"
                  className="font-mono font-bold text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Dirección del Hotel
                </label>
                <Input
                  value={hotelDetails.address || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, address: e.target.value })
                  }
                  placeholder="Ej: Av. Colombia # 5-117, Zona Rosa"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Teléfono de Contacto
                </label>
                <Input
                  value={hotelDetails.phone || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, phone: e.target.value })
                  }
                  placeholder="Ej: +57 (8) 512 0000"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Plan de Alimentación
                </label>
                <Input
                  value={hotelDetails.mealPlan || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, mealPlan: e.target.value })
                  }
                  placeholder="Ej: Todo Incluido / Desayuno Buffet"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Tipo de Habitación
                </label>
                <Input
                  value={hotelDetails.roomType || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, roomType: e.target.value })
                  }
                  placeholder="Ej: Estándar Vista al Mar"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Fecha Check-In
                </label>
                <Input
                  type="date"
                  value={hotelDetails.checkIn || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, checkIn: e.target.value })
                  }
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-text-2 block mb-1">
                  Fecha Check-Out
                </label>
                <Input
                  type="date"
                  value={hotelDetails.checkOut || ""}
                  onChange={(e) =>
                    setHotelDetails({ ...hotelDetails, checkOut: e.target.value })
                  }
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Traslados */}
        {activeTab === "transfers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Traslados y Transporte Receptivo
                </h4>
                <p className="text-[11px] text-text-3">
                  Configura los traslados confirmados entre aeropuertos, hoteles y puntos de encuentro.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={transfersConfirmation}
                  onChange={(e) => setTransfersConfirmation(e.target.value)}
                  placeholder="Confirmación de Traslados"
                  className="h-8 text-xs max-w-[180px] font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addTransfer}
                  className="h-8 text-xs gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Traslado
                </Button>
              </div>
            </div>

            {transfers.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-text-3 text-xs">
                No hay traslados configurados para este voucher.
              </div>
            ) : (
              <div className="space-y-3">
                {transfers.map((tr, index) => (
                  <div
                    key={tr.id}
                    className="p-3 rounded-xl border bg-muted/20 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand">
                        Traslado #{index + 1}: {tr.type === "airport-hotel" ? "Aeropuerto ➔ Hotel" : tr.type === "hotel-airport" ? "Hotel ➔ Aeropuerto" : "Personalizado"}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTransfer(tr.id)}
                        className="text-text-3 hover:text-danger p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Lugar de Recogida
                        </label>
                        <Input
                          value={tr.pickupLocation}
                          onChange={(e) =>
                            updateTransfer(tr.id, { pickupLocation: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Lugar de Destino
                        </label>
                        <Input
                          value={tr.dropoffLocation}
                          onChange={(e) =>
                            updateTransfer(tr.id, { dropoffLocation: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Proveedor / Operador
                        </label>
                        <Input
                          value={tr.provider || ""}
                          onChange={(e) =>
                            updateTransfer(tr.id, { provider: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Fecha
                        </label>
                        <Input
                          type="date"
                          value={tr.pickupDate}
                          onChange={(e) =>
                            updateTransfer(tr.id, { pickupDate: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Hora / Indicación de tiempo
                        </label>
                        <Input
                          value={tr.pickupTime}
                          onChange={(e) =>
                            updateTransfer(tr.id, { pickupTime: e.target.value })
                          }
                          placeholder="Ej: 14:30 o Según vuelo"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Tipo de Vehículo
                        </label>
                        <Input
                          value={tr.vehicleType || ""}
                          onChange={(e) =>
                            updateTransfer(tr.id, { vehicleType: e.target.value })
                          }
                          placeholder="Ej: Van privada / Bus"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                        Instrucciones / Notas para el pasajero
                      </label>
                      <Input
                        value={tr.notes || ""}
                        onChange={(e) =>
                          updateTransfer(tr.id, { notes: e.target.value })
                        }
                        placeholder="Ej: El chofer tendrá letrero en puerta 4..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Actividades */}
        {activeTab === "activities" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Tours, Excursiones y Actividades
                </h4>
                <p className="text-[11px] text-text-3">
                  Puntos de encuentro, horarios y recomendaciones de los tours confirmados.
                </p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addActivity}
                className="h-8 text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar Tour
              </Button>
            </div>

            {activities.length === 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-center text-text-3 text-xs">
                No hay actividades configuradas para este voucher.
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act, index) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl border bg-muted/20 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand">
                        Actividad #{index + 1}: {act.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeActivity(act.id)}
                        className="text-text-3 hover:text-danger p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Título de la Actividad
                        </label>
                        <Input
                          value={act.title}
                          onChange={(e) =>
                            updateActivity(act.id, { title: e.target.value })
                          }
                          className="h-8 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Operador / Proveedor
                        </label>
                        <Input
                          value={act.provider || ""}
                          onChange={(e) =>
                            updateActivity(act.id, { provider: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Fecha
                        </label>
                        <Input
                          type="date"
                          value={act.date}
                          onChange={(e) =>
                            updateActivity(act.id, { date: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Hora de Inicio
                        </label>
                        <Input
                          type="time"
                          value={act.time || ""}
                          onChange={(e) =>
                            updateActivity(act.id, { time: e.target.value })
                          }
                          className="h-8 text-xs"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                          Punto de Encuentro
                        </label>
                        <Input
                          value={act.location || ""}
                          onChange={(e) =>
                            updateActivity(act.id, { location: e.target.value })
                          }
                          placeholder="Ej: Muelle turístico o lobby"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-text-3 block mb-0.5">
                        Descripción y Recomendaciones
                      </label>
                      <Input
                        value={act.description || ""}
                        onChange={(e) =>
                          updateActivity(act.id, { description: e.target.value })
                        }
                        placeholder="Ej: Incluye almuerzo típico. Llevar calzado para agua..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. Checklist & Asistencia */}
        {activeTab === "checklist" && (
          <div className="space-y-4">
            <div className="border-b pb-2">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Requisitos de Viaje, Asistencia Médica y Recomendaciones
              </h4>
              <p className="text-[11px] text-text-3">
                Checklist visible para el pasajero e instrucciones de asistencia en destino.
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground block">
                Checklist de Documentos Obligatorios
              </label>

              <div className="space-y-2">
                {documentsChecklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border bg-card text-xs"
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklist(item.id)}
                        className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                      />
                      <span className={item.completed ? "line-through text-text-3" : "text-foreground font-medium"}>
                        {item.label}
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => removeChecklistItem(item.id)}
                      className="text-text-3 hover:text-danger p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Input
                  value={newChecklistLabel}
                  onChange={(e) => setNewChecklistLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  placeholder="Agregar requisito (ej: Carta de autorización de menores)..."
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addChecklistItem}
                  className="h-8 text-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Añadir
                </Button>
              </div>

              <div className="pt-3 border-t space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={checkInReminder}
                    onChange={(e) => setCheckInReminder(e.target.checked)}
                    className="rounded border-border text-brand focus:ring-brand h-4 w-4"
                  />
                  <span className="font-semibold text-foreground">
                    Recordatorio de Web Check-in (24 a 48 horas previas al vuelo)
                  </span>
                </label>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground block">
                    Información Adicional e Instrucciones para el Pasajero
                  </label>
                  <Textarea
                    rows={3}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Instrucciones clave para el pasajero..."
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
