"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Edit2,
  FileDown,
  FileText,
  Handshake,
  Loader2,
  MapPin,
  Plane,
  Plus,
  Printer,
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
  TravelDay,
  TravelInstallment,
  Traveler,
} from "@/lib/travel/types";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPaymentDto, TravelVoucherDto } from "@/server/travel/trips";
import { PaymentModal } from "./payment-modal";
import {
  downloadQuotePdf,
  downloadReceiptPdf,
  downloadVoucherPdf,
} from "@/components/travel/pdf";
import { VoucherEditModal } from "./voucher-edit-modal";
import { Edit3 } from "lucide-react";

const BOOKING_STATUSES: { value: BookingStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pendiente de Reserva", color: "bg-warning-tint text-warning-text border-warning-soft" },
  { value: "confirmed", label: "Confirmada", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { value: "emitted", label: "Emitida", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  { value: "operating", label: "En Operación", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { value: "completed", label: "Viaje Finalizado", color: "bg-brand-soft text-brand-text border-brand/20" },
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
    "amortization" | "payments" | "passengers" | "supplierPayments" | "operations" | "vouchers"
  >("amortization");

  // PDF Download States
  const [downloadingBookingPdf, setDownloadingBookingPdf] = useState(false);
  const [downloadingVoucherPdf, setDownloadingVoucherPdf] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  // Payments
  const [payments, setPayments] = useState<TravelPaymentDto[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [targetedInstallmentId, setTargetedInstallmentId] = useState<string | undefined>(undefined);
  const [suggestedPaymentAmount, setSuggestedPaymentAmount] = useState<number | undefined>(undefined);

  // Travelers
  const [travelers, setTravelers] = useState<Traveler[]>(quote.travelers ?? []);
  const [travelerModalOpen, setTravelerModalOpen] = useState(false);
  const [editingTravelerId, setEditingTravelerId] = useState<string | null>(null);
  const [travelerForm, setTravelerForm] = useState<Partial<Traveler>>({
    firstName: "",
    lastName: "",
    idType: "CC",
    idNumber: "",
    type: "ADULTO",
    eps: "",
    phone: "",
    email: "",
    originCity: quote.originCity ?? "",
    observations: "",
  });

  // Voucher
  const [voucher, setVoucher] = useState<TravelVoucherDto | null>(null);
  const [savingVoucher, setSavingVoucher] = useState(false);
  const [isEditingVoucher, setIsEditingVoucher] = useState(false);

  // Billing and Counter
  const [billingName, setBillingName] = useState(quote.billingName ?? "");
  const [billingId, setBillingId] = useState(quote.billingId ?? "");
  const [counterName, setCounterName] = useState(quote.counterName ?? "");
  const [observations, setObservations] = useState(quote.observations ?? "");
  const [savingBilling, setSavingBilling] = useState(false);

  // Operations
  const [bookingStatus, setBookingStatus] = useState<BookingStatus>(
    quote.bookingStatus ?? "confirmed"
  );
  const [bookingConfirmation, setBookingConfirmation] = useState(
    quote.bookingConfirmation ?? ""
  );
  const [pnrExpiration, setPnrExpiration] = useState(quote.pnrExpiration ?? "");
  const [savingOps, setSavingOps] = useState(false);

  // Manual & Auto Installments Modal
  const [autoPlanOpen, setAutoPlanOpen] = useState(false);
  const [autoPlanCount, setAutoPlanCount] = useState<number>(3);
  const [autoPlanFrequency, setAutoPlanFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [autoPlanFirstDate, setAutoPlanFirstDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );

  const [manualInstallmentOpen, setManualInstallmentOpen] = useState(false);
  const [manualInstallmentAmount, setManualInstallmentAmount] = useState<number | "">("");
  const [manualInstallmentDueDate, setManualInstallmentDueDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );

  // Supplier Payment Modal
  const [supplierPayModalOpen, setSupplierPayModalOpen] = useState(false);
  const [selectedSupplierItem, setSelectedSupplierItem] = useState<{
    dayId: string;
    itemId: string;
    title: string;
    provider?: string;
    netPrice: number;
  } | null>(null);
  const [supplierPayDate, setSupplierPayDate] = useState<string>(
    new Date().toISOString().split("T")[0]!
  );
  const [supplierPayMethod, setSupplierPayMethod] = useState("Transferencia Bancaria");
  const [supplierPayRef, setSupplierPayRef] = useState("");
  const [supplierPayNotes, setSupplierPayNotes] = useState("");
  const [savingSupplierPay, setSavingSupplierPay] = useState(false);

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

  const scheduledTotal = (quote.amortizationSchedule || []).reduce(
    (sum, inst) => sum + inst.amount,
    0
  );
  const remainingToSchedule = Math.max(0, quote.totals.finalTotal - scheduledTotal);

  // Itinerary items for supplier payments
  const allItineraryItems = quote.days.flatMap((d) =>
    d.items.map((it) => ({
      ...it,
      dayId: d.id,
      dayNumber: d.dayNumber,
    }))
  );

  const supplierItems = allItineraryItems.filter((it) => it.provider || it.netPrice > 0);
  const totalSupplierCost = supplierItems.reduce(
    (sum, it) => sum + (it.netPrice || it.totalPrice || 0),
    0
  );
  const totalSupplierPaid = supplierItems
    .filter((it) => it.supplierPaymentStatus === "paid")
    .reduce((sum, it) => sum + (it.netPrice || it.totalPrice || 0), 0);
  const totalSupplierPending = Math.max(0, totalSupplierCost - totalSupplierPaid);

  /* Status Change */
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

  /* Save Billing Data */
  async function handleSaveBilling() {
    setSavingBilling(true);
    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          billingName: billingName.trim() || null,
          billingId: billingId.trim() || null,
          counterName: counterName.trim() || null,
          observations: observations.trim() || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
      }
    } finally {
      setSavingBilling(false);
    }
  }

  /* Save Operations */
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
          days: quote.days,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
        alert("Operaciones guardadas correctamente");
      }
    } finally {
      setSavingOps(false);
    }
  }

  /* Update specific itinerary item (e.g. PNR) */
  async function handleUpdateItemField(dayId: string, itemId: string, patch: Record<string, unknown>) {
    const updatedDays: TravelDay[] = quote.days.map((d) => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        items: d.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      };
    });

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: updatedDays }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Automatic Payment Plan Generation */
  async function handleCreateAutoPlan() {
    if (autoPlanCount <= 0) return;

    // Preserve installments already paid or partial
    const kept = (quote.amortizationSchedule || []).filter(
      (inst) => inst.status === "paid" || inst.status === "partial"
    );
    const keptTotal = kept.reduce((sum, inst) => sum + inst.amount, 0);
    const balanceToSchedule = Math.max(0, quote.totals.finalTotal - keptTotal);

    if (balanceToSchedule <= 0) {
      alert("El saldo ya está completamente cubierto por las cuotas pagadas.");
      return;
    }

    let intervalDays = 30;
    if (autoPlanFrequency === "weekly") intervalDays = 7;
    else if (autoPlanFrequency === "fortnightly") intervalDays = 15;

    const baseAmount = Math.floor(balanceToSchedule / autoPlanCount);
    const firstDate = new Date(autoPlanFirstDate);

    const newInsts: TravelInstallment[] = [];
    let accumulated = 0;

    for (let i = 0; i < autoPlanCount; i++) {
      const d = new Date(firstDate);
      d.setDate(d.getDate() + i * intervalDays);
      const isLast = i === autoPlanCount - 1;
      const amount = isLast ? balanceToSchedule - accumulated : baseAmount;
      accumulated += amount;

      newInsts.push({
        id: Math.random().toString(36).slice(2, 9),
        code: `Cuota ${kept.length + i + 1}/${kept.length + autoPlanCount}`,
        dueDate: d.toISOString().split("T")[0]!,
        amount,
        status: "pending",
      });
    }

    const updatedSchedule = [...kept, ...newInsts];

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amortizationSchedule: updatedSchedule }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
        setAutoPlanOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Add Manual Installment */
  async function handleAddManualInstallment(e: React.FormEvent) {
    e.preventDefault();
    if (!manualInstallmentAmount || Number(manualInstallmentAmount) <= 0) return;

    const amount = Number(manualInstallmentAmount);
    const currentTotal = (quote.amortizationSchedule || []).reduce(
      (sum, i) => sum + i.amount,
      0
    );

    if (currentTotal + amount > quote.totals.finalTotal) {
      alert(
        `El monto supera el total del viaje. Máximo permitido: ${formatCurrency(
          quote.totals.finalTotal - currentTotal,
          quote.currency
        )}`
      );
      return;
    }

    const newInst: TravelInstallment = {
      id: Math.random().toString(36).slice(2, 9),
      code: `Cuota ${(quote.amortizationSchedule || []).length + 1}`,
      dueDate: manualInstallmentDueDate,
      amount,
      status: "pending",
    };

    const updatedSchedule = [...(quote.amortizationSchedule || []), newInst];

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amortizationSchedule: updatedSchedule }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
        setManualInstallmentOpen(false);
        setManualInstallmentAmount("");
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Remove Installment */
  async function handleRemoveInstallment(instId: string) {
    if (!confirm("¿Deseas eliminar esta cuota del plan?")) return;
    const updatedSchedule = (quote.amortizationSchedule || []).filter((i) => i.id !== instId);

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amortizationSchedule: updatedSchedule }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Delete Payment */
  async function handleDeletePayment(id: string) {
    if (!confirm("¿Estás seguro de anular este abono? El saldo de la reserva se recalculará.")) {
      return;
    }
    try {
      const res = await fetch(`/api/travel/payments/${id}`, { method: "DELETE" });
      if (res.ok) {
        void loadPayments();
        const qRes = await fetch(`/api/travel/quotes/${quote.id}`);
        if (qRes.ok) {
          const qData = await qRes.json();
          onUpdated(qData.quote);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* PDF Handlers */
  async function handleDownloadBookingPdf() {
    try {
      setDownloadingBookingPdf(true);
      await downloadQuotePdf(quote, undefined, payments);
    } catch (err) {
      console.error("Error al generar PDF de reserva:", err);
      alert("Hubo un error al generar el PDF de la reserva. Por favor intenta nuevamente.");
    } finally {
      setDownloadingBookingPdf(false);
    }
  }

  async function handlePrintReceipt(p: TravelPaymentDto) {
    try {
      setDownloadingReceiptId(p.id);
      await downloadReceiptPdf(p, quote);
    } catch (err) {
      console.error("Error al generar recibo de caja PDF:", err);
      alert("Hubo un error al generar el recibo de caja en PDF.");
    } finally {
      setDownloadingReceiptId(null);
    }
  }

  async function handleDownloadVoucherPdf() {
    if (!voucher) {
      alert("Aún no se ha generado el voucher");
      return;
    }
    try {
      setDownloadingVoucherPdf(true);
      const hotelItem = quote.days.flatMap((d) => d.items).find((i) => i.type === "Hotel");
      const flightItem = quote.days.flatMap((d) => d.items).find((i) => i.type === "Flight");
      await downloadVoucherPdf({
        ...voucher,
        travelers,
        hotelDetails: hotelItem?.hotelDetails
          ? {
              name: hotelItem.hotelDetails.hotelName || hotelItem.title,
              address: hotelItem.hotelDetails.address || "",
              checkIn: hotelItem.hotelDetails.checkIn || quote.startDate || "",
              checkOut: hotelItem.hotelDetails.checkOut || quote.endDate || "",
              roomType: hotelItem.hotelDetails.roomType || "Standard",
              mealPlan: hotelItem.hotelDetails.boardBasis || "No especificado",
              confirmationNumber:
                hotelItem.pnr || quote.bookingNumber || quote.quoteNumber,
              reservationHolder: quote.clientName,
            }
          : voucher.hotelDetails,
        flightDetails: flightItem?.flightDetails
          ? {
              airline: flightItem.flightDetails.airline,
              flightNumber: flightItem.flightDetails.flightNumber,
              departureCity: flightItem.flightDetails.origin,
              arrivalCity: flightItem.flightDetails.destination,
              departureDate: flightItem.flightDetails.departureDate,
              departureTime: flightItem.flightDetails.departureTime,
              pnr: flightItem.pnr || "---",
            }
          : voucher.flightDetails,
      });
    } catch (err) {
      console.error("Error al descargar voucher PDF:", err);
      alert("Hubo un error al generar el voucher en PDF.");
    } finally {
      setDownloadingVoucherPdf(false);
    }
  }

  /* Travelers Management */
  async function handleSaveTraveler(e: React.FormEvent) {
    e.preventDefault();
    if (!travelerForm.firstName?.trim() || !travelerForm.lastName?.trim()) return;

    let updated: Traveler[];
    if (editingTravelerId) {
      updated = travelers.map((t) =>
        t.id === editingTravelerId ? ({ ...t, ...travelerForm } as Traveler) : t
      );
    } else {
      const newT: Traveler = {
        id: Math.random().toString(36).slice(2, 9),
        firstName: travelerForm.firstName.trim(),
        lastName: travelerForm.lastName.trim(),
        idType: travelerForm.idType || "CC",
        idNumber: travelerForm.idNumber?.trim() || "",
        type: travelerForm.type || "ADULTO",
        birthDate: travelerForm.birthDate || "",
        eps: travelerForm.eps || "",
        phone: travelerForm.phone || "",
        email: travelerForm.email || "",
        originCity: travelerForm.originCity || quote.originCity || "",
        observations: travelerForm.observations || "",
      };
      updated = [...travelers, newT];
    }

    setTravelers(updated);
    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ travelers: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
        setTravelerModalOpen(false);
        setEditingTravelerId(null);
        setTravelerForm({
          firstName: "",
          lastName: "",
          idType: "CC",
          idNumber: "",
          type: "ADULTO",
          eps: "",
          phone: "",
          email: "",
          originCity: quote.originCity ?? "",
          observations: "",
        });
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteTraveler(id: string) {
    if (!confirm("¿Deseas remover este pasajero del manifiesto?")) return;
    const updated = travelers.filter((t) => t.id !== id);
    setTravelers(updated);
    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ travelers: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Supplier Payment Submission */
  async function handleConfirmSupplierPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplierItem) return;

    setSavingSupplierPay(true);
    const updatedDays: TravelDay[] = quote.days.map((d) => {
      if (d.id !== selectedSupplierItem.dayId) return d;
      return {
        ...d,
        items: d.items.map((it) =>
          it.id === selectedSupplierItem.itemId
            ? {
                ...it,
                supplierPaymentStatus: "paid",
                supplierPaymentDate: supplierPayDate,
                supplierPaymentMethod: supplierPayMethod,
                supplierPaymentReference: supplierPayRef.trim() || undefined,
                supplierPaymentNotes: supplierPayNotes.trim() || undefined,
              }
            : it
        ),
      };
    });

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: updatedDays }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
        setSupplierPayModalOpen(false);
        setSelectedSupplierItem(null);
        setSupplierPayRef("");
        setSupplierPayNotes("");
      }
    } finally {
      setSavingSupplierPay(false);
    }
  }

  async function handleRevertSupplierPayment(dayId: string, itemId: string) {
    if (!confirm("¿Deseas anular el registro de pago a este proveedor?")) return;

    const updatedDays: TravelDay[] = quote.days.map((d) => {
      if (d.id !== dayId) return d;
      return {
        ...d,
        items: d.items.map((it) =>
          it.id === itemId
            ? {
                ...it,
                supplierPaymentStatus: "pending",
                supplierPaymentDate: undefined,
                supplierPaymentMethod: undefined,
                supplierPaymentReference: undefined,
                supplierPaymentNotes: undefined,
              }
            : it
        ),
      };
    });

    try {
      const res = await fetch(`/api/travel/quotes/${quote.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ days: updatedDays }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.quote);
      }
    } catch (err) {
      console.error(err);
    }
  }

  /* Copy Voucher */
  function handleCopyVoucherText() {
    const lines = [
      `🎫 *VOUCHER DE SERVICIOS TURÍSTICOS*`,
      `*Reserva:* ${quote.bookingNumber ?? quote.quoteNumber}`,
      `*Titular:* ${quote.clientName}`,
      `*Destino:* ${quote.destination}`,
      `*Fechas:* ${quote.startDate ?? ""} a ${quote.endDate ?? ""}`,
      ``,
      `*Servicios confirmados:*`,
    ];

    quote.days.forEach((d) => {
      lines.push(`📅 *Día ${d.dayNumber}:*`);
      d.items.forEach((it) => {
        lines.push(`• [${it.type}] ${it.title} ${it.pnr ? `(Localizador: ${it.pnr})` : ""}`);
      });
    });

    if (travelers.length > 0) {
      lines.push(``, `👥 *Pasajeros:*`);
      travelers.forEach((t, i) => {
        lines.push(`${i + 1}. ${t.firstName} ${t.lastName} - ${t.idType}: ${t.idNumber}`);
      });
    }

    if (voucher?.additionalInfo) {
      lines.push(``, `ℹ️ *Instrucciones:*`, voucher.additionalInfo);
    }

    void navigator.clipboard.writeText(lines.join("\n"));
    alert("Voucher copiado al portapapeles para enviar por WhatsApp");
  }

  /* Save Voucher */
  async function handleSaveVoucher() {
    setSavingVoucher(true);
    try {
      await fetch(`/api/travel/vouchers/${quote.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          additionalInfo: voucher?.additionalInfo ?? null,
          checkInReminder: voucher?.checkInReminder ?? true,
        }),
      });
      alert("Voucher actualizado con éxito");
    } finally {
      setSavingVoucher(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Expediente de Reserva"
        className="flex h-full w-full max-w-4xl flex-col bg-card shadow-2xl border-l"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <header className="flex flex-col gap-3 border-b bg-muted/20 p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-brand-text">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-brand">
                    {quote.bookingNumber ?? quote.quoteNumber}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    Expediente Confirmado
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  {quote.clientName}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={downloadingBookingPdf}
                onClick={() => void handleDownloadBookingPdf()}
                className="h-8 px-2.5 text-xs text-brand border-brand/30 hover:bg-brand-soft disabled:opacity-60"
                title="Descargar Itinerario y Reserva en PDF"
              >
                {downloadingBookingPdf ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                )}
                {downloadingBookingPdf ? "Generando..." : "PDF Reserva"}
              </Button>
              <select
                value={bookingStatus}
                onChange={(e) => void handleStatusChange(e.target.value as BookingStatus)}
                className="h-8 rounded-md border border-input bg-card px-2.5 text-xs font-bold text-foreground"
              >
                {BOOKING_STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-text-3 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Info bar with destination, dates and customer info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-3 rounded-xl border text-xs">
            <div>
              <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider block">
                Destino
              </span>
              <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5 truncate">
                <MapPin className="h-3 w-3 text-brand shrink-0" />
                {quote.destination}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider block">
                Salida y Noches
              </span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {quote.startDate || "N/A"} ({quote.nights} noches)
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider block">
                Contacto Principal
              </span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">
                {quote.clientPhone || quote.clientEmail || "Sin datos"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider block">
                Pasajeros
              </span>
              <span className="font-semibold text-foreground mt-0.5 block">
                {quote.passengers} adultos {quote.childPassengers > 0 ? `+ ${quote.childPassengers} niños` : ""}
              </span>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border bg-card p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">
                  Total del Viaje
                </span>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="text-xl font-extrabold text-foreground block">
                {formatCurrency(quote.totals.finalTotal, quote.currency)}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold block">
                Inversión confirmada
              </span>
            </div>

            <div className="rounded-xl border bg-card p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">
                  Saldo Pendiente
                </span>
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
              <span className="text-xl font-extrabold text-amber-600 block">
                {formatCurrency(balanceRemaining, quote.currency)}
              </span>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{ width: `${percentagePaid}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">
                  Por Programar
                </span>
                <Clock className="h-4 w-4 text-brand" />
              </div>
              <span className="text-xl font-extrabold text-foreground block">
                {formatCurrency(remainingToSchedule, quote.currency)}
              </span>
              <span className="text-[11px] text-text-3 font-semibold block">
                {(quote.amortizationSchedule || []).length} cuotas pactadas
              </span>
            </div>
          </div>

          {/* Billing & Counter details */}
          <div className="rounded-xl border bg-card p-3 space-y-2.5">
            <div className="flex items-center justify-between border-b pb-1.5">
              <span className="text-xs font-bold text-text-2">
                Datos de Facturación & Counter Responsable
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 text-[11px]"
                onClick={handleSaveBilling}
                disabled={savingBilling}
              >
                {savingBilling ? "Guardando..." : "Guardar Facturación"}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="A quién facturamos (Razón Social / Nombre)"
                value={billingName}
                onChange={(e) => setBillingName(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="NIT / Documento Factura"
                value={billingId}
                onChange={(e) => setBillingId(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Counter Responsable"
                value={counterName}
                onChange={(e) => setCounterName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="flex border-b bg-muted/10 px-5 gap-1 overflow-x-auto">
          {[
            { id: "amortization", label: "Amortización", icon: Calendar },
            { id: "payments", label: `Abonos (${payments.length})`, icon: DollarSign },
            { id: "passengers", label: `Pasajeros (${travelers.length})`, icon: Users },
            { id: "supplierPayments", label: `Proveedores (${supplierItems.length})`, icon: Handshake },
            { id: "operations", label: "Operación", icon: Plane },
            { id: "vouchers", label: "Voucher", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-semibold transition shrink-0 ${
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. Amortización */}
          {activeTab === "amortization" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Cronograma de Amortización & Cuotas
                  </h3>
                  <p className="text-xs text-text-3">
                    Fechas y montos de pago acordados con el cliente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAutoPlanOpen(true)}
                    className="h-8 text-xs"
                  >
                    Plan Automático
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setManualInstallmentOpen(true)}
                    className="h-8 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Cuota Manual
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setTargetedInstallmentId(undefined);
                      setSuggestedPaymentAmount(balanceRemaining > 0 ? balanceRemaining : undefined);
                      setPaymentModalOpen(true);
                    }}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Registrar Abono
                  </Button>
                </div>
              </div>

              {/* Formulario Auto Plan Modal */}
              {autoPlanOpen && (
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-xs font-bold text-foreground">
                      Generar Plan de Pagos Automático
                    </h4>
                    <button
                      onClick={() => setAutoPlanOpen(false)}
                      className="text-text-3 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-text-3">
                    Se distribuirá el saldo pendiente ({formatCurrency(balanceRemaining, quote.currency)}) en cuotas periódicas, respetando los pagos que ya estén registrados.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">
                        Número de Cuotas
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={autoPlanCount}
                        onChange={(e) => setAutoPlanCount(Number(e.target.value) || 1)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">
                        Frecuencia
                      </label>
                      <select
                        value={autoPlanFrequency}
                        onChange={(e) =>
                          setAutoPlanFrequency(e.target.value as "weekly" | "fortnightly" | "monthly")
                        }
                        className="w-full h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="fortnightly">Quincenal</option>
                        <option value="monthly">Mensual</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">
                        Fecha Primera Cuota
                      </label>
                      <Input
                        type="date"
                        value={autoPlanFirstDate}
                        onChange={(e) => setAutoPlanFirstDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutoPlanOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleCreateAutoPlan}>
                      Aplicar Plan
                    </Button>
                  </div>
                </div>
              )}

              {/* Formulario Cuota Manual */}
              {manualInstallmentOpen && (
                <form
                  onSubmit={handleAddManualInstallment}
                  className="rounded-xl border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-xs font-bold text-foreground">
                      Agregar Cuota Manual
                    </h4>
                    <button
                      onClick={() => setManualInstallmentOpen(false)}
                      className="text-text-3 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">
                        Monto de la cuota ({quote.currency})
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={manualInstallmentAmount}
                        onChange={(e) =>
                          setManualInstallmentAmount(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        placeholder="Ej. 500000"
                        required
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">
                        Fecha de Vencimiento
                      </label>
                      <Input
                        type="date"
                        value={manualInstallmentDueDate}
                        onChange={(e) => setManualInstallmentDueDate(e.target.value)}
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setManualInstallmentOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      Guardar Cuota
                    </Button>
                  </div>
                </form>
              )}

              {/* Installments List */}
              {(quote.amortizationSchedule || []).length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  Sin plan de cuotas registrado. Genera un plan automático o agrega cuotas manuales.
                </p>
              ) : (
                <div className="space-y-2">
                  {(quote.amortizationSchedule || []).map((inst, idx) => {
                    const isPaid = inst.status === "paid";
                    const isPartial = inst.status === "partial";
                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between rounded-xl border p-3.5 text-xs transition ${
                          isPaid
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : isPartial
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-card"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {inst.code || `Cuota ${idx + 1}`}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
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
                          <div className="flex items-center gap-2 text-text-3 text-[11px]">
                            <Clock className="h-3 w-3" />
                            Vence: {inst.dueDate}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-extrabold text-sm text-foreground block">
                              {formatCurrency(inst.amount, quote.currency)}
                            </span>
                          </div>

                          {!isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setTargetedInstallmentId(inst.id);
                                setSuggestedPaymentAmount(inst.amount);
                                setPaymentModalOpen(true);
                              }}
                            >
                              + Abonar
                            </Button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveInstallment(inst.id)}
                            className="p-1 text-text-3 hover:text-danger-text rounded"
                            title="Eliminar cuota"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Abonos y Pagos */}
          {activeTab === "payments" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Historial de Abonos & Recibos de Caja
                  </h3>
                  <p className="text-xs text-text-3">
                    Registro contable de pagos efectuados por el cliente.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setTargetedInstallmentId(undefined);
                    setSuggestedPaymentAmount(balanceRemaining > 0 ? balanceRemaining : undefined);
                    setPaymentModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nuevo Abono
                </Button>
              </div>

              {payments.length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  Sin abonos registrados. Haz clic en &ldquo;Nuevo Abono&rdquo; para registrar el primer pago.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border bg-card p-3.5 text-xs shadow-2xs hover:border-brand/30 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-brand bg-brand-soft px-1.5 py-0.5 rounded text-[11px]">
                            {p.receiptNumber ?? "REC"}
                          </span>
                          <span className="font-bold text-foreground">{p.method}</span>
                        </div>
                        <p className="text-[11px] text-text-3">
                          Fecha: <strong>{p.date}</strong> {p.reference ? `· Ref: ${p.reference}` : ""}
                        </p>
                        {p.notes && <p className="text-[11px] text-text-2 italic">{p.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold text-sm text-foreground">
                          {formatCurrency(p.amount, quote.currency)}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={downloadingReceiptId === p.id}
                          className="h-7 text-xs flex items-center gap-1 disabled:opacity-60"
                          onClick={() => void handlePrintReceipt(p)}
                          title="Descargar / Imprimir Recibo de Caja"
                        >
                          {downloadingReceiptId === p.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Printer className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {downloadingReceiptId === p.id ? "Generando..." : "Recibo"}
                          </span>
                        </Button>

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

          {/* 3. Pasajeros */}
          {activeTab === "passengers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Manifiesto de Pasajeros ({travelers.length})
                  </h3>
                  <p className="text-xs text-text-3">
                    Cupo contratado: {quote.passengers} Adultos {quote.childPassengers > 0 ? `+ ${quote.childPassengers} Niños` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingTravelerId(null);
                    setTravelerForm({
                      firstName: "",
                      lastName: "",
                      idType: "CC",
                      idNumber: "",
                      type: "ADULTO",
                      eps: "",
                      phone: "",
                      email: "",
                      originCity: quote.originCity ?? "",
                      observations: "",
                    });
                    setTravelerModalOpen(true);
                  }}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Agregar Pasajero
                </Button>
              </div>

              {/* Formulario Modal Pasajero */}
              {travelerModalOpen && (
                <form
                  onSubmit={handleSaveTraveler}
                  className="rounded-xl border bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-xs font-bold text-foreground">
                      {editingTravelerId ? "Editar Pasajero" : "Nuevo Pasajero"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setTravelerModalOpen(false)}
                      className="text-text-3 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Nombres"
                      value={travelerForm.firstName ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      required
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Apellidos"
                      value={travelerForm.lastName ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, lastName: e.target.value }))
                      }
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <select
                      value={travelerForm.idType ?? "CC"}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, idType: e.target.value }))
                      }
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold"
                    >
                      <option value="CC">Cédula (CC)</option>
                      <option value="TI">Tarjeta Identidad (TI)</option>
                      <option value="PP">Pasaporte (PP)</option>
                      <option value="CE">Cédula Extranjería (CE)</option>
                      <option value="RC">Registro Civil (RC)</option>
                    </select>

                    <Input
                      placeholder="Número documento"
                      value={travelerForm.idNumber ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, idNumber: e.target.value }))
                      }
                      required
                      className="h-8 text-xs"
                    />

                    <select
                      value={travelerForm.type ?? "ADULTO"}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({
                          ...prev,
                          type: e.target.value as "ADULTO" | "NIÑO" | "INFANTE",
                        }))
                      }
                      className="h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold"
                    >
                      <option value="ADULTO">ADULTO</option>
                      <option value="NIÑO">NIÑO</option>
                      <option value="INFANTE">INFANTE</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <Input
                      type="date"
                      title="Fecha de nacimiento"
                      value={travelerForm.birthDate ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, birthDate: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="EPS / Seguro médico"
                      value={travelerForm.eps ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, eps: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Teléfono móvil"
                      value={travelerForm.phone ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      placeholder="Correo electrónico"
                      type="email"
                      value={travelerForm.email ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Ciudad de origen"
                      value={travelerForm.originCity ?? ""}
                      onChange={(e) =>
                        setTravelerForm((prev) => ({ ...prev, originCity: e.target.value }))
                      }
                      className="h-8 text-xs"
                    />
                  </div>

                  <Input
                    placeholder="Observaciones médicas, alergias o restricciones dietarias"
                    value={travelerForm.observations ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, observations: e.target.value }))
                    }
                    className="h-8 text-xs"
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setTravelerModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm">
                      Guardar Pasajero
                    </Button>
                  </div>
                </form>
              )}

              {/* Travelers List */}
              {travelers.length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  Sin pasajeros registrados. Haz clic en &ldquo;Agregar Pasajero&rdquo; para registrar los viajeros.
                </p>
              ) : (
                <div className="space-y-2">
                  {travelers.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border bg-card p-3.5 text-xs shadow-2xs hover:border-brand/30 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {idx + 1}. {t.firstName} {t.lastName}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1 font-bold">
                            {t.type ?? "ADULTO"}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-text-3">
                          {t.idType}: <strong>{t.idNumber}</strong> {t.birthDate ? `· Nac: ${t.birthDate}` : ""} {t.eps ? `· EPS: ${t.eps}` : ""}
                        </p>
                        <p className="text-[11px] text-text-3">
                          {t.phone ? `Tel: ${t.phone}` : ""} {t.email ? `· ${t.email}` : ""} {t.originCity ? `· Origen: ${t.originCity}` : ""}
                        </p>
                        {t.observations && (
                          <p className="text-[11px] text-amber-600 font-medium italic">
                            ⚠️ {t.observations}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTravelerId(t.id);
                            setTravelerForm(t);
                            setTravelerModalOpen(true);
                          }}
                          className="rounded p-1 text-text-3 hover:text-brand"
                          title="Editar datos del pasajero"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTraveler(t.id)}
                          className="rounded p-1 text-danger-text hover:bg-danger-tint"
                          title="Eliminar del manifiesto"
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

          {/* 4. Pagos a Proveedores (Supplier Payments) */}
          {activeTab === "supplierPayments" && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-bold text-sm text-foreground">
                  Liquidación & Control de Pagos a Proveedores
                </h3>
                <p className="text-xs text-text-3">
                  Control de costos netos por servicio del itinerario y pagos transferidos a mayoristas/operadores.
                </p>
              </div>

              {/* Métricas Proveedores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border bg-muted/20 p-3 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-3 block">
                    Costo Neto Total
                  </span>
                  <span className="text-lg font-extrabold text-foreground block">
                    {formatCurrency(totalSupplierCost, quote.currency)}
                  </span>
                </div>
                <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-3 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                    Total Pagado Proveedores
                  </span>
                  <span className="text-lg font-extrabold text-emerald-600 block">
                    {formatCurrency(totalSupplierPaid, quote.currency)}
                  </span>
                </div>
                <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-3 space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block">
                    Saldo Pendiente Pagar
                  </span>
                  <span className="text-lg font-extrabold text-amber-600 block">
                    {formatCurrency(totalSupplierPending, quote.currency)}
                  </span>
                </div>
              </div>

              {/* Modal Pago a Proveedor */}
              {supplierPayModalOpen && selectedSupplierItem && (
                <form
                  onSubmit={handleConfirmSupplierPayment}
                  className="rounded-xl border bg-card p-4 space-y-3 shadow-md border-purple-500/30"
                >
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Handshake className="h-4 w-4 text-purple-500" />
                      Registrar Liquidación de Proveedor
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSupplierPayModalOpen(false)}
                      className="text-text-3 hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="text-xs text-text-2">
                    Servicio: <strong>{selectedSupplierItem.title}</strong> · Proveedor:{" "}
                    <strong>{selectedSupplierItem.provider || "Proveedor sin asignar"}</strong> · Costo Neto:{" "}
                    <strong>{formatCurrency(selectedSupplierItem.netPrice, quote.currency)}</strong>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">Fecha de Pago</label>
                      <Input
                        type="date"
                        value={supplierPayDate}
                        onChange={(e) => setSupplierPayDate(e.target.value)}
                        required
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-text-2">Método de Transferencia</label>
                      <select
                        value={supplierPayMethod}
                        onChange={(e) => setSupplierPayMethod(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-card px-2 text-xs font-semibold"
                      >
                        <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                        <option value="Tarjeta Corporativa">Tarjeta Corporativa</option>
                        <option value="Consignación">Consignación</option>
                        <option value="Efectivo / Caja Menor">Efectivo / Caja Menor</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-text-2">
                      Comprobante / No. de Aprobación
                    </label>
                    <Input
                      placeholder="Ej. Transferencia #99482 Bancolombia"
                      value={supplierPayRef}
                      onChange={(e) => setSupplierPayRef(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-text-2">Notas internas</label>
                    <Input
                      placeholder="Pago neto con retención aplicada..."
                      value={supplierPayNotes}
                      onChange={(e) => setSupplierPayNotes(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSupplierPayModalOpen(false)}
                      disabled={savingSupplierPay}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" size="sm" disabled={savingSupplierPay}>
                      {savingSupplierPay ? "Guardando..." : "Confirmar Pago a Proveedor"}
                    </Button>
                  </div>
                </form>
              )}

              {/* Lista de Items y Liquidación */}
              {supplierItems.length === 0 ? (
                <p className="text-xs text-text-3 italic p-4 text-center border rounded-lg">
                  No hay servicios con costos asociados en el itinerario.
                </p>
              ) : (
                <div className="space-y-2">
                  {supplierItems.map((it) => {
                    const isPaid = it.supplierPaymentStatus === "paid";
                    return (
                      <div
                        key={it.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-xs transition ${
                          isPaid
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-card border-border"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              Día {it.dayNumber} · [{it.type}] {it.title}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                isPaid
                                  ? "bg-emerald-500/20 text-emerald-600"
                                  : "bg-amber-500/20 text-amber-600"
                              }`}
                            >
                              {isPaid ? "PAGADO" : "PENDIENTE DE PAGO"}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-3">
                            Proveedor: <strong>{it.provider || "Sin proveedor asignado"}</strong>
                          </p>
                          {isPaid && (
                            <p className="text-[11px] text-emerald-600">
                              Pagado el {it.supplierPaymentDate} vía {it.supplierPaymentMethod}{" "}
                              {it.supplierPaymentReference ? `(Ref: ${it.supplierPaymentReference})` : ""}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 justify-between sm:justify-end">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] uppercase font-bold text-text-3 block">
                              Costo Neto
                            </span>
                            <span className="font-extrabold text-sm text-foreground">
                              {formatCurrency(it.netPrice || it.totalPrice || 0, quote.currency)}
                            </span>
                          </div>

                          {isPaid ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-text-3 hover:text-danger-text"
                              onClick={() => handleRevertSupplierPayment(it.dayId, it.id)}
                            >
                              Anular Pago
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={() => {
                                setSelectedSupplierItem({
                                  dayId: it.dayId,
                                  itemId: it.id,
                                  title: it.title,
                                  provider: it.provider,
                                  netPrice: it.netPrice || it.totalPrice || 0,
                                });
                                setSupplierPayModalOpen(true);
                              }}
                            >
                              Pagar a Proveedor
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 5. Operación & Localizadores */}
          {activeTab === "operations" && (
            <div className="space-y-4">
              <div className="border-b pb-3">
                <h3 className="font-bold text-sm text-foreground">
                  Control de Emisión & Localizadores (PNR)
                </h3>
                <p className="text-xs text-text-3">
                  Asigna y consulta los códigos de confirmación por cada servicio del itinerario.
                </p>
              </div>

              {/* Localizadores por Ítem del Itinerario */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-text-2 block">
                  Localizadores / PNRs por Servicio:
                </span>
                {allItineraryItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border bg-muted/20 p-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-foreground">
                        Día {it.dayNumber} · [{it.type}] {it.title}
                      </span>
                      {it.provider && (
                        <span className="text-[11px] text-text-3 block">
                          Proveedor: {it.provider}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        placeholder="Código PNR / Localizador"
                        defaultValue={it.pnr || it.locator || it.confirmationNo || ""}
                        onBlur={(e) =>
                          void handleUpdateItemField(it.dayId, it.id, {
                            pnr: e.target.value.trim() || undefined,
                          })
                        }
                        className="h-7 w-44 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">
                    Código de Reserva Global / Localizador Mayorista
                  </label>
                  <Input
                    value={bookingConfirmation}
                    onChange={(e) => setBookingConfirmation(e.target.value)}
                    placeholder="Ej. BK-77492, HOTELES-CARIBE-99"
                    className="h-8 text-xs font-mono font-bold"
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
                    className="h-8 text-xs"
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

          {/* 6. Vouchers */}
          {activeTab === "vouchers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
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
                    onClick={() => setIsEditingVoucher(true)}
                    className="h-8 text-xs font-bold gap-1.5 bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Personalizar / Editar Voucher
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={downloadingVoucherPdf}
                    onClick={() => void handleDownloadVoucherPdf()}
                    className="h-8 text-xs text-brand border-brand/30 hover:bg-brand-soft disabled:opacity-60"
                  >
                    {downloadingVoucherPdf ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileDown className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {downloadingVoucherPdf ? "Generando..." : "Descargar Voucher PDF"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyVoucherText}
                    className="h-8 text-xs"
                  >
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Copiar para WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveVoucher}
                    disabled={savingVoucher}
                    className="h-8 text-xs"
                  >
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
                          • [{it.type}] <strong>{it.title}</strong>{" "}
                          {it.pnr ? `(Localizador: ${it.pnr})` : ""}{" "}
                          {it.description ? `- ${it.description}` : ""}
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
          suggestedAmount={suggestedPaymentAmount}
          currency={quote.currency}
          installments={quote.amortizationSchedule || []}
          initialInstallmentId={targetedInstallmentId}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => {
            void loadPayments();
            setPaymentModalOpen(false);
          }}
        />
      )}

      {isEditingVoucher && (
        <VoucherEditModal
          isOpen={isEditingVoucher}
          quote={quote}
          initialVoucher={voucher}
          onClose={() => setIsEditingVoucher(false)}
          onSaved={(updatedVoucher) => {
            setVoucher(updatedVoucher);
            setIsEditingVoucher(false);
          }}
        />
      )}
    </div>
  );
}
