"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  FileText,
  Plane,
  Plus,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/travel/pricing";
import type {
  BookingStatus,
  Traveler,
} from "@/lib/travel/types";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPaymentDto, TravelVoucherDto } from "@/server/travel/trips";
import { PaymentModal } from "./payment-modal";

const BOOKING_STATUSES: { value: BookingStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pendiente", color: "bg-warning-tint text-warning-text border-warning-soft" },
  { value: "confirmed", label: "Confirmada", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "emitted", label: "Emitida", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { value: "operating", label: "En Operación", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "completed", label: "Completada", color: "bg-brand-soft text-brand-text border-brand/20" },
  { value: "cancelled", label: "Cancelada", color: "bg-danger-tint text-danger-text border-danger-soft" },
];

export function TripDrawer({
  quote,
  onClose,
  onUpdated,
}: {
  quote: TravelQuoteDto;
  onClose: () => void;
  onUpdated: (updated: TravelQuoteDto) => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "amortization" | "payments" | "operations" | "passengers" | "vouchers"
  >("amortization");

  // Payments
  const [payments, setPayments] = useState<TravelPaymentDto[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Travelers
  const [travelers, setTravelers] = useState<Traveler[]>(quote.travelers ?? []);
  const [newTravelerOpen, setNewTravelerOpen] = useState(false);
  const [newTraveler, setNewTraveler] = useState<Partial<Traveler>>({
    firstName: "",
    lastName: "",
    idType: "CC",
    idNumber: "",
    type: "ADULTO",
  });

  // Voucher
  const [voucher, setVoucher] = useState<TravelVoucherDto | null>(null);
  const [savingVoucher, setSavingVoucher] = useState(false);

  // Operations
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>(
    quote.bookingStatus ?? "confirmed"
  );
  const [bookingConfirmation, setBookingConfirmation] = useState(
    quote.bookingConfirmation ?? ""
  );
  const [pnrExpiration, setPnrExpiration] = useState(quote.pnrExpiration ?? "");
  const [observations, setObservations] = useState(quote.observations ?? "");
  const [savingOps, setSavingOps] = useState(false);

  // Load Payments & Voucher
  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/travel/payments?quoteId=${quote.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { payments: TravelPaymentDto[] };
      setPayments(data.payments);
    } catch {
      // silent
    }
  }, [quote.id]);

  const loadVoucher = useCallback(async () => {
    try {
      const res = await fetch(`/api/travel/vouchers/${quote.id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { voucher: TravelVoucherDto | null };
      setVoucher(data.voucher);
    } catch {
      // silent
    }
  }, [quote.id]);

  useEffect(() => {
    void loadPayments();
    void loadVoucher();
  }, [loadPayments, loadVoucher]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceRemaining = Math.max(0, quote.totals.finalTotal - totalPaid);
  const percentagePaid =
    quote.totals.finalTotal > 0
      ? Math.min(100, Math.round((totalPaid / quote.totals.finalTotal) * 100))
      : 0;

  async function handleStatusChange(newStatus: BookingStatus) {
    setBookingStatus(newStatus);
    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookingStatus: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
      }
    } catch {
      // silent
    }
  }

  async function handleSaveOperations() {
    setSavingOps(true);
    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bookingConfirmation: bookingConfirmation.trim() || null,
          pnrExpiration: pnrExpiration || null,
          observations: observations.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
        alert("Operaciones guardadas correctamente");
      }
    } catch {
      alert("Error al guardar operaciones");
    } finally {
      setSavingOps(false);
    }
  }

  async function handleAddTraveler(e: React.FormEvent) {
    e.preventDefault();
    if (!newTraveler.firstName || !newTraveler.idNumber) return;

    const t: Traveler = {
      id: `trv_${Date.now()}`,
      firstName: newTraveler.firstName.trim(),
      lastName: newTraveler.lastName?.trim() ?? "",
      idType: newTraveler.idType ?? "CC",
      idNumber: newTraveler.idNumber.trim(),
      eps: newTraveler.eps?.trim(),
      phone: newTraveler.phone?.trim(),
      email: newTraveler.email?.trim(),
      originCity: newTraveler.originCity?.trim(),
      vaccines: newTraveler.vaccines?.trim(),
      observations: newTraveler.observations?.trim(),
      birthDate: newTraveler.birthDate,
      type: newTraveler.type ?? "ADULTO",
    };

    const updated = [...travelers, t];
    setTravelers(updated);
    setNewTravelerOpen(false);
    setNewTraveler({
      firstName: "",
      lastName: "",
      idType: "CC",
      idNumber: "",
      type: "ADULTO",
    });

    await fetch(`/api/travel/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ travelers: updated }),
    });
  }

  async function handleDeleteTraveler(id: string) {
    const updated = travelers.filter((t) => t.id !== id);
    setTravelers(updated);
    await fetch(`/api/travel/quotes/${quote.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ travelers: updated }),
    });
  }

  async function handleDeletePayment(id: string) {
    if (!window.confirm("¿Seguro que deseas anular este abono?")) return;
    try {
      const res = await fetch(`/api/travel/payments/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPayments((prev) => prev.filter((p) => p.id !== id));
        void loadPayments();
      }
    } catch {
      alert("Error al anular abono");
    }
  }

  async function handleSaveVoucher() {
    setSavingVoucher(true);
    try {
      const res = await fetch(`/api/travel/vouchers/${quote.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          travelers,
          additionalInfo: voucher?.additionalInfo ?? "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVoucher(data.voucher);
        alert("Voucher actualizado con éxito");
      }
    } catch {
      alert("Error al actualizar voucher");
    } finally {
      setSavingVoucher(false);
    }
  }

  function handleCopyVoucherText() {
    const lines = [
      `🎫 *VOUCHER TURÍSTICO OFICIAL - ${quote.destination.toUpperCase()}*`,
      `📄 Voucher: ${voucher?.voucherNumber ?? "VCH-PENDIENTE"}`,
      `🔖 Reserva: ${quote.bookingNumber ?? quote.quoteNumber}`,
      `👤 Titular: ${quote.clientName}`,
      quote.startDate ? `📅 Fechas: ${quote.startDate} al ${quote.endDate ?? ""}` : "",
      "",
      `*PASAJEROS CONFIRMADOS:*`,
    ];

    travelers.forEach((t, i) => {
      lines.push(`${i + 1}. ${t.firstName} ${t.lastName} - ${t.idType}: ${t.idNumber}`);
    });

    lines.push("");
    lines.push(`*SERVICIOS INCLUIDOS:*`);
    quote.days.forEach((d) => {
      d.items.forEach((it) => {
        lines.push(`• [${it.type}] ${it.title} ${it.provider ? `(${it.provider})` : ""}`);
      });
    });

    lines.push("");
    lines.push(`_Presente este documento ante el hotel y transportistas al momento del abordaje._`);

    void navigator.clipboard.writeText(lines.join("\n"));
    alert("Voucher copiado al portapapeles");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Expediente de Reserva"
        className="flex h-full w-full max-w-3xl flex-col border-l bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-extrabold text-foreground">
                  {quote.bookingNumber ?? quote.quoteNumber}
                </span>
                <select
                  value={bookingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as BookingStatus)}
                  className="h-6 rounded border border-input bg-card px-2 text-[11px] font-semibold text-foreground"
                >
                  {BOOKING_STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-text-3 mt-0.5">
                {quote.clientName} · {quote.destination} ({quote.passengers} adultos)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded p-1 text-text-3 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Financial Progress Bar */}
        <div className="border-b bg-card px-5 py-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div>
              <span className="text-text-3">Abonado: </span>
              <span className="font-bold text-emerald-600">
                {formatCurrency(totalPaid, quote.currency)}
              </span>
            </div>
            <div>
              <span className="text-text-3">Saldo pendiente: </span>
              <span className="font-bold text-danger-text">
                {formatCurrency(balanceRemaining, quote.currency)}
              </span>
            </div>
            <div>
              <span className="text-text-3">Total reserva: </span>
              <span className="font-bold text-foreground">
                {formatCurrency(quote.totals.finalTotal, quote.currency)}
              </span>
            </div>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-300 ${
                percentagePaid >= 100 ? "bg-emerald-500" : "bg-brand"
              }`}
              style={{ width: `${percentagePaid}%` }}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b bg-muted/10 px-5 gap-1">
          {[
            { id: "amortization", label: "Amortización", icon: Calendar },
            { id: "payments", label: `Abonos (${payments.length})`, icon: DollarSign },
            { id: "operations", label: "Operaciones", icon: Plane },
            { id: "passengers", label: `Pasajeros (${travelers.length})`, icon: Users },
            { id: "vouchers", label: "Voucher", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-semibold transition ${
                  isSelected
                    ? "border-brand text-brand"
                    : "border-transparent text-text-3 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. Amortización */}
          {activeTab === "amortization" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Cronograma de Cuotas y Vencimientos
                  </h3>
                  <p className="text-xs text-text-3">
                    Fechas límite pactadas con el cliente antes de la emisión final.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPaymentModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Registrar Abono
                </Button>
              </div>

              {quote.amortizationSchedule.length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  No se generó plan de cuotas en la cotización inicial.
                </p>
              ) : (
                <div className="space-y-2">
                  {quote.amortizationSchedule.map((inst, idx) => {
                    const isPaid = inst.status === "paid";
                    const isPartial = inst.status === "partial";
                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                          isPaid
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : isPartial
                            ? "bg-amber-500/5 border-amber-500/20"
                            : "bg-card"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground">
                            Cuota {idx + 1} {inst.code ? `· ${inst.code}` : ""}
                          </span>
                          <div className="flex items-center gap-2 text-text-3 text-[11px]">
                            <Clock className="h-3 w-3" />
                            Vence: {inst.dueDate}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-extrabold text-sm text-foreground block">
                            {formatCurrency(inst.amount, quote.currency)}
                          </span>
                          <span
                            className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              isPaid
                                ? "bg-emerald-500/20 text-emerald-600"
                                : isPartial
                                ? "bg-amber-500/20 text-amber-600"
                                : "bg-muted text-text-3"
                            }`}
                          >
                            {isPaid ? "PAGADA" : isPartial ? "ABONO PARCIAL" : "PENDIENTE"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Abonos y Comisiones */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Abonos Recibidos y Liquidación
                  </h3>
                  <p className="text-xs text-text-3">
                    Historial de pagos del cliente y balance comercial de la reserva.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPaymentModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nuevo Abono
                </Button>
              </div>

              {/* Commission & Profitability Card */}
              <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-3 block">
                  Liquidación Comercial de la Agencia
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-text-3 block">Costo Neto Proveedores:</span>
                    <span className="font-semibold">{formatCurrency(quote.totals.subtotal, quote.currency)}</span>
                  </div>
                  <div>
                    <span className="text-text-3 block">Ganancia Bruta Agencia:</span>
                    <span className="font-bold text-emerald-600">
                      +{formatCurrency(quote.totals.markupAmount, quote.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-3 block">Comisión Asesor (10%):</span>
                    <span className="font-semibold text-blue-500">
                      {formatCurrency(Math.round(quote.totals.markupAmount * 0.1), quote.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-3 block">Margen Neto Agencia:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(Math.round(quote.totals.markupAmount * 0.9), quote.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payments List */}
              {payments.length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  Sin abonos registrados aún. Haz clic en &ldquo;Nuevo Abono&rdquo; para registrar el primer pago.
                </p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 text-xs shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-brand">
                            {p.receiptNumber ?? "REC"}
                          </span>
                          <span className="font-semibold text-foreground">{p.method}</span>
                        </div>
                        <p className="text-[11px] text-text-3">
                          Fecha: {p.date} {p.reference ? `· Ref: ${p.reference}` : ""}
                        </p>
                        {p.notes && <p className="text-[11px] text-text-2 italic">{p.notes}</p>}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm text-foreground">
                          {formatCurrency(p.amount, quote.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="rounded p-1 text-danger-text hover:bg-danger-tint"
                          title="Anular abono"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. Operaciones */}
          {activeTab === "operations" && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  Control de Emisión y Códigos de Confirmación
                </h3>
                <p className="text-xs text-text-3">
                  PNRs de aerolíneas, números de reserva de hotel y bloqueos de cupo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">
                    Código de Reserva / Localizador Mayorista
                  </label>
                  <Input
                    value={bookingConfirmation}
                    onChange={(e) => setBookingConfirmation(e.target.value)}
                    placeholder="Ej. BK-77492, HOTELES-CARIBE-99"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">
                    Vencimiento de Cupo / Time-Limit (PNR)
                  </label>
                  <Input
                    type="datetime-local"
                    value={pnrExpiration}
                    onChange={(e) => setPnrExpiration(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">
                  Bitácora de Operaciones y Observaciones Internas
                </label>
                <Textarea
                  rows={4}
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Check-in realizado, tiquetes enviados por correo, traslado coordinado..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSaveOperations} disabled={savingOps}>
                  {savingOps ? "Guardando…" : "Guardar Operaciones"}
                </Button>
              </div>
            </div>
          )}

          {/* 4. Pasajeros */}
          {activeTab === "passengers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Manifiesto de Pasajeros ({travelers.length})
                  </h3>
                  <p className="text-xs text-text-3">
                    Nombres completos y documentos requeridos para emisión de tiquetes y voucher.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setNewTravelerOpen(true)}
                  variant="outline"
                >
                  <UserPlus className="mr-1 h-3.5 w-3.5" />
                  Agregar Pasajero
                </Button>
              </div>

              {travelers.length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  Sin pasajeros registrados. Haz clic en &ldquo;Agregar Pasajero&rdquo; para capturar documentos.
                </p>
              ) : (
                <div className="space-y-2">
                  {travelers.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-3 text-xs shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {idx + 1}. {t.firstName} {t.lastName}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1">
                            {t.type ?? "ADULTO"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-3">
                          {t.idType}: {t.idNumber} {t.birthDate ? `· Nac: ${t.birthDate}` : ""} {t.eps ? `· EPS: ${t.eps}` : ""}
                        </p>
                        {t.phone && <p className="text-[11px] text-text-3">Tel: {t.phone}</p>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteTraveler(t.id)}
                        className="rounded p-1 text-danger-text hover:bg-danger-tint"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {newTravelerOpen && (
                <form
                  onSubmit={handleAddTraveler}
                  className="rounded-xl border bg-muted/20 p-4 space-y-3"
                >
                  <h4 className="text-xs font-bold text-foreground">
                    Nuevo Pasajero
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Nombres"
                      value={newTraveler.firstName ?? ""}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Apellidos"
                      value={newTraveler.lastName ?? ""}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <select
                      value={newTraveler.idType ?? "CC"}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({ ...prev, idType: e.target.value }))
                      }
                      className="h-9 rounded-md border border-input bg-card px-2 text-xs"
                    >
                      <option value="CC">Cédula (CC)</option>
                      <option value="TI">Tarjeta Identidad (TI)</option>
                      <option value="PP">Pasaporte (PP)</option>
                      <option value="CE">Cédula Extranjería (CE)</option>
                      <option value="RC">Registro Civil (RC)</option>
                    </select>
                    <Input
                      placeholder="Número documento"
                      value={newTraveler.idNumber ?? ""}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({ ...prev, idNumber: e.target.value }))
                      }
                      required
                    />
                    <select
                      value={newTraveler.type ?? "ADULTO"}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({
                          ...prev,
                          type: e.target.value as "ADULTO" | "NIÑO" | "INFANTE",
                        }))
                      }
                      className="h-9 rounded-md border border-input bg-card px-2 text-xs"
                    >
                      <option value="ADULTO">ADULTO</option>
                      <option value="NIÑO">NIÑO</option>
                      <option value="INFANTE">INFANTE</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Input
                      type="date"
                      title="Fecha de nacimiento"
                      value={newTraveler.birthDate ?? ""}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({ ...prev, birthDate: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="EPS / Seguro médico"
                      value={newTraveler.eps ?? ""}
                      onChange={(e) =>
                        setNewTraveler((prev) => ({ ...prev, eps: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewTravelerOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      Guardar Pasajero
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* 5. Vouchers */}
          {activeTab === "vouchers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Voucher Turístico de Servicios
                  </h3>
                  <p className="text-xs text-text-3">
                    Documento oficial para presentar ante hoteles, traslados y tours.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyVoucherText}
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copiar para WhatsApp
                  </Button>
                  <Button size="sm" onClick={handleSaveVoucher} disabled={savingVoucher}>
                    {savingVoucher ? "Guardando…" : "Actualizar Voucher"}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-mono text-xs font-bold text-brand">
                    {voucher?.voucherNumber ?? "Voucher en borrador"}
                  </span>
                  <span className="text-xs text-text-3">
                    Destino: {quote.destination}
                  </span>
                </div>

                <div className="text-xs space-y-2">
                  <p className="font-semibold text-foreground">Servicios confirmados:</p>
                  {quote.days.map((d) => (
                    <div key={d.id} className="pl-2 border-l-2 border-brand/30 space-y-1">
                      <span className="font-bold text-brand text-[11px]">Día {d.dayNumber}:</span>
                      {d.items.map((it) => (
                        <div key={it.id} className="text-text-2">
                          • [{it.type}] <strong>{it.title}</strong> {it.description ? `- ${it.description}` : ""}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t space-y-1">
                  <label className="text-xs font-semibold text-text-2">
                    Información adicional / Instrucciones para el pasajero
                  </label>
                  <Textarea
                    rows={3}
                    value={voucher?.additionalInfo ?? ""}
                    onChange={(e) =>
                      setVoucher((prev) => (prev ? { ...prev, additionalInfo: e.target.value } : null))
                    }
                    placeholder="El chofer llevará un cartel con su nombre en la puerta 4..."
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {paymentModalOpen && (
        <PaymentModal
          quoteId={quote.id}
          suggestedAmount={balanceRemaining > 0 ? balanceRemaining : undefined}
          currency={quote.currency}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => {
            void loadPayments();
            setPaymentModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
