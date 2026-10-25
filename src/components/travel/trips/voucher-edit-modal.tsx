"use client";

import React, { useState } from "react";
import {
  X,
  Save,
  Plane,
  Hotel,
  Car,
  MapPin,
  FileText,
  Plus,
  Trash2,
  ShieldCheck,
  Loader2,
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

interface VoucherEditModalProps {
  isOpen: boolean;
  quote: TravelQuoteDto;
  initialVoucher: TravelVoucherDto | null;
  onClose: () => void;
  onSaved: (voucher: TravelVoucherDto) => void;
}

export function VoucherEditModal({
  isOpen,
  quote,
  initialVoucher,
  onClose,
  onSaved,
}: VoucherEditModalProps) {
  const [activeTab, setActiveTab] = useState<
    "flight" | "hotel" | "transfers" | "activities" | "checklist"
  >("flight");
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Inicialización de estado con datos de la reserva / voucher
  const hotelItem = quote.days
    .flatMap((d) => d.items)
    .find((i) => i.type === "Hotel");
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
  const [transfers, setTransfers] = useState<TransferDetail[]>(
    initialVoucher?.transfers && initialVoucher.transfers.length > 0
      ? initialVoucher.transfers
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
  const [activities, setActivities] = useState<ActivityDetail[]>(
    initialVoucher?.activities || []
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

  if (!isOpen) return null;

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
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl bg-card border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base">
                Editor Fino de Voucher Turístico
              </h3>
              <p className="text-xs text-text-3">
                Reserva {quote.bookingNumber || quote.quoteNumber} • {quote.clientName} ({quote.destination})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-text-3 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de Pestañas */}
        <div className="flex items-center gap-1 px-6 border-b bg-muted/10 overflow-x-auto py-2">
          <button
            type="button"
            onClick={() => setActiveTab("flight")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "flight"
                ? "bg-brand text-brand-foreground shadow-xs"
                : "text-text-2 hover:bg-muted"
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            Vuelos & PNR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hotel")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "hotel"
                ? "bg-brand text-brand-foreground shadow-xs"
                : "text-text-2 hover:bg-muted"
            }`}
          >
            <Hotel className="w-3.5 h-3.5" />
            Hotel & Hospedaje
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("transfers")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "transfers"
                ? "bg-brand text-brand-foreground shadow-xs"
                : "text-text-2 hover:bg-muted"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            Traslados ({transfers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("activities")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "activities"
                ? "bg-brand text-brand-foreground shadow-xs"
                : "text-text-2 hover:bg-muted"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Tours & Excursiones ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "checklist"
                ? "bg-brand text-brand-foreground shadow-xs"
                : "text-text-2 hover:bg-muted"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Checklist & Asistencia
          </button>
        </div>

        {/* Contenido del formulario */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMessage && (
            <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* 1. Pestaña VUELOS */}
          {activeTab === "flight" && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider">
                Detalles del Vuelo y Localizador
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Aerolínea</label>
                  <Input
                    value={flightDetails.airline || ""}
                    onChange={(e) =>
                      setFlightDetails({ ...flightDetails, airline: e.target.value })
                    }
                    placeholder="Avianca, LATAM, Copa..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Número de Vuelo</label>
                  <Input
                    value={flightDetails.flightNumber || ""}
                    onChange={(e) =>
                      setFlightDetails({ ...flightDetails, flightNumber: e.target.value })
                    }
                    placeholder="AV 9340"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">PNR / Localizador</label>
                  <Input
                    value={flightDetails.pnr || ""}
                    onChange={(e) =>
                      setFlightDetails({ ...flightDetails, pnr: e.target.value })
                    }
                    placeholder="Ej. ABC123D"
                    className="font-mono uppercase font-bold text-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                {/* Salida */}
                <div className="space-y-3 p-3 rounded-xl border bg-muted/10">
                  <span className="text-xs font-bold text-foreground block">
                    🛫 Salida / Origen
                  </span>
                  <div className="space-y-1">
                    <label className="text-xs text-text-2">Ciudad Origen</label>
                    <Input
                      value={flightDetails.departureCity || ""}
                      onChange={(e) =>
                        setFlightDetails({ ...flightDetails, departureCity: e.target.value })
                      }
                      placeholder="Bogotá (BOG)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-text-2">Fecha Salida</label>
                      <Input
                        type="date"
                        value={flightDetails.departureDate || ""}
                        onChange={(e) =>
                          setFlightDetails({ ...flightDetails, departureDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-text-2">Hora Salida</label>
                      <Input
                        type="time"
                        value={flightDetails.departureTime || ""}
                        onChange={(e) =>
                          setFlightDetails({ ...flightDetails, departureTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Llegada */}
                <div className="space-y-3 p-3 rounded-xl border bg-muted/10">
                  <span className="text-xs font-bold text-foreground block">
                    🛬 Llegada / Destino
                  </span>
                  <div className="space-y-1">
                    <label className="text-xs text-text-2">Ciudad Destino</label>
                    <Input
                      value={flightDetails.arrivalCity || ""}
                      onChange={(e) =>
                        setFlightDetails({ ...flightDetails, arrivalCity: e.target.value })
                      }
                      placeholder="Cancún (CUN)"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-text-2">Fecha Llegada</label>
                      <Input
                        type="date"
                        value={flightDetails.arrivalDate || ""}
                        onChange={(e) =>
                          setFlightDetails({ ...flightDetails, arrivalDate: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-text-2">Hora Llegada</label>
                      <Input
                        type="time"
                        value={flightDetails.arrivalTime || ""}
                        onChange={(e) =>
                          setFlightDetails({ ...flightDetails, arrivalTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Pestaña HOTEL */}
          {activeTab === "hotel" && (
            <div className="space-y-4 animate-in fade-in">
              <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider">
                Voucher de Hotel y Alojamiento
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Nombre del Hotel / Resort</label>
                  <Input
                    value={hotelDetails.name || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, name: e.target.value })
                    }
                    placeholder="Hotel Riu Caribe Cancún"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Código de Confirmación Hotel</label>
                  <Input
                    value={hotelDetails.confirmationNumber || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, confirmationNumber: e.target.value })
                    }
                    placeholder="Ej. CONF-987654"
                    className="font-mono uppercase font-bold text-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Dirección del Hotel</label>
                  <Input
                    value={hotelDetails.address || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, address: e.target.value })
                    }
                    placeholder="Blvd. Kukulcan Km 5.5, Cancún..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Teléfono de Emergencia / Recepción</label>
                  <Input
                    value={hotelDetails.phone || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, phone: e.target.value })
                    }
                    placeholder="+52 998 848 7850"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Fecha Check-In</label>
                  <Input
                    type="date"
                    value={hotelDetails.checkIn || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, checkIn: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Fecha Check-Out</label>
                  <Input
                    type="date"
                    value={hotelDetails.checkOut || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, checkOut: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Régimen</label>
                  <Input
                    value={hotelDetails.mealPlan || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, mealPlan: e.target.value })
                    }
                    placeholder="Todo Incluido"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Tipo de Habitación</label>
                  <Input
                    value={hotelDetails.roomType || ""}
                    onChange={(e) =>
                      setHotelDetails({ ...hotelDetails, roomType: e.target.value })
                    }
                    placeholder="Junior Suite Vista al Mar"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Pestaña TRASLADOS */}
          {activeTab === "transfers" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider">
                    Traslados Terrestres
                  </h4>
                  <p className="text-xs text-text-3">
                    Configura los traslados de llegada y salida para el pasajero
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTransfer}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Traslado
                </Button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Código General de Confirmación</label>
                <Input
                  value={transfersConfirmation}
                  onChange={(e) => setTransfersConfirmation(e.target.value)}
                  placeholder="Ej. TRF-88771"
                  className="font-mono text-xs max-w-xs"
                />
              </div>

              {transfers.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-3 border rounded-xl bg-muted/10">
                  No hay traslados configurados. Haz clic en &ldquo;Agregar Traslado&rdquo; si este viaje los incluye.
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((tr, idx) => (
                    <div
                      key={tr.id}
                      className="p-4 rounded-xl border bg-card space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-xs text-foreground flex items-center gap-2">
                          <Car className="w-4 h-4 text-brand" />
                          Traslado #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTransfer(tr.id)}
                          className="text-text-3 hover:text-red-600 h-7 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Punto de Recogida</label>
                          <Input
                            value={tr.pickupLocation}
                            onChange={(e) =>
                              updateTransfer(tr.id, { pickupLocation: e.target.value })
                            }
                            placeholder="Aeropuerto..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Punto de Destino</label>
                          <Input
                            value={tr.dropoffLocation}
                            onChange={(e) =>
                              updateTransfer(tr.id, { dropoffLocation: e.target.value })
                            }
                            placeholder="Hotel..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Fecha</label>
                          <Input
                            type="date"
                            value={tr.pickupDate}
                            onChange={(e) =>
                              updateTransfer(tr.id, { pickupDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Horario / Cita</label>
                          <Input
                            value={tr.pickupTime}
                            onChange={(e) =>
                              updateTransfer(tr.id, { pickupTime: e.target.value })
                            }
                            placeholder="14:30 o según vuelo"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Operador / Contacto</label>
                          <Input
                            value={tr.provider || ""}
                            onChange={(e) =>
                              updateTransfer(tr.id, { provider: e.target.value })
                            }
                            placeholder="Transportes México"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-text-2">Instrucciones de encuentro</label>
                        <Input
                          value={tr.notes || ""}
                          onChange={(e) =>
                            updateTransfer(tr.id, { notes: e.target.value })
                          }
                          placeholder="Chofer con letrero en puerta 4..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. Pestaña ACTIVIDADES */}
          {activeTab === "activities" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider">
                    Tours y Excursiones
                  </h4>
                  <p className="text-xs text-text-3">
                    Configura los cupones y puntos de encuentro de cada actividad
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addActivity}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Tour
                </Button>
              </div>

              {activities.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-3 border rounded-xl bg-muted/10">
                  No hay actividades programadas. Haz clic en &ldquo;Agregar Tour&rdquo; si el paquete incluye excursiones.
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act, idx) => (
                    <div
                      key={act.id}
                      className="p-4 rounded-xl border bg-card space-y-3 relative"
                    >
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="font-bold text-xs text-foreground flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                          Tour #{idx + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeActivity(act.id)}
                          className="text-text-3 hover:text-red-600 h-7 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Título de la Actividad</label>
                          <Input
                            value={act.title}
                            onChange={(e) =>
                              updateActivity(act.id, { title: e.target.value })
                            }
                            placeholder="Tour Chichén Itzá..."
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Punto de Encuentro</label>
                          <Input
                            value={act.location || ""}
                            onChange={(e) =>
                              updateActivity(act.id, { location: e.target.value })
                            }
                            placeholder="Lobby del hotel o muelle..."
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Fecha</label>
                          <Input
                            type="date"
                            value={act.date}
                            onChange={(e) =>
                              updateActivity(act.id, { date: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Hora de Inicio</label>
                          <Input
                            value={act.time}
                            onChange={(e) =>
                              updateActivity(act.id, { time: e.target.value })
                            }
                            placeholder="08:30 AM"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-2">Proveedor / Guía</label>
                          <Input
                            value={act.provider || ""}
                            onChange={(e) =>
                              updateActivity(act.id, { provider: e.target.value })
                            }
                            placeholder="Cancún Adventures"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-text-2">Recomendaciones e Instrucciones</label>
                        <Input
                          value={act.description || ""}
                          onChange={(e) =>
                            updateActivity(act.id, { description: e.target.value })
                          }
                          placeholder="Incluye almuerzo buffet. Llevar traje de baño y repelente..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. Pestaña CHECKLIST & ASISTENCIA */}
          {activeTab === "checklist" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-text-3 uppercase tracking-wider">
                  Checklist de Documentos de Viaje
                </h4>
                <div className="flex gap-2">
                  <Input
                    value={newChecklistLabel}
                    onChange={(e) => setNewChecklistLabel(e.target.value)}
                    placeholder="Agregar nuevo requisito (ej: Certificado de vacunación)..."
                    className="h-9 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addChecklistItem}
                    className="shrink-0 text-xs"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                <div className="space-y-1.5 pt-2">
                  {documentsChecklist.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-card text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={c.completed}
                          onChange={() => toggleChecklist(c.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span
                          className={
                            c.completed
                              ? "line-through text-text-3"
                              : "font-semibold text-foreground"
                          }
                        >
                          {c.label}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeChecklistItem(c.id)}
                        className="text-text-3 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkInReminder}
                      onChange={(e) => setCheckInReminder(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    Incluir aviso de Web Check-In 24-48h antes del vuelo
                  </label>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">
                    Información Importante / Teléfonos de Asistencia 24/7 en Destino
                  </label>
                  <Textarea
                    rows={4}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Instrucciones clave para el pasajero..."
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90 font-bold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando cambios...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Voucher Personalizado
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
