"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  DollarSign,
  Edit2,
  ExternalLink,
  FileDown,
  Handshake,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Minimize2,
  Pencil,
  Plane,
  Plus,
  Printer,
  Ticket,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, distributePaymentToInstallments } from "@/lib/travel/pricing";
import type {
  BookingStatus,
  TravelDay,
  TravelInstallment,
  Traveler,
} from "@/lib/travel/types";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPaymentDto, TravelVoucherDto } from "@/server/travel/trips";
import { PaymentModal } from "./payment-modal";
import { AutoPlanModal, ManualInstallmentModal } from "./installment-modals";
import {
  downloadQuotePdf,
  downloadReceiptPdf,
  downloadVoucherPdf,
} from "@/components/travel/pdf";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";

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
  layoutMode = "workspace",
  onClose,
  onUpdated,
  onEditQuote,
}: {
  quote: TravelQuoteDto;
  layoutMode?: "workspace" | "drawer";
  onClose: () => void;
  onUpdated: (updated: TravelQuoteDto) => void;
  onEditQuote?: (quote: TravelQuoteDto) => void;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);
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
  const [manualInstallmentOpen, setManualInstallmentOpen] = useState(false);

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

  // Acordeón para colapsar toda la sección superior de resumen y métricas
  const [showOverview, setShowOverview] = useState(true);

  // Colapsar datos de facturación en la cabecera para liberar espacio
  const [showBillingHeader, setShowBillingHeader] = useState(false);

  // Confirm dialogs
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    variant?: "danger" | "warning" | "primary";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const { toast } = useToast();
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

  const liveInstallments = useMemo(() => {
    const schedule = quote.amortizationSchedule || [];
    if (schedule.length === 0) return [];

    const paidMap: Record<string, number> = {};
    let unassignedAmount = 0;

    for (const p of payments) {
      if (p.installmentId && schedule.some((inst) => inst.id === p.installmentId)) {
        paidMap[p.installmentId] = (paidMap[p.installmentId] || 0) + p.amount;
      } else {
        unassignedAmount += p.amount;
      }
    }

    const { updatedInstallments } = distributePaymentToInstallments(
      schedule,
      paidMap,
      unassignedAmount
    );

    return updatedInstallments;
  }, [quote.amortizationSchedule, payments]);

  const hasExistingPayments =
    payments.length > 0 ||
    liveInstallments.some(
      (inst) => inst.status === "paid" || inst.status === "partial"
    );

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
        toast("Datos de facturación actualizados correctamente", "success");
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
        toast("Operaciones guardadas correctamente", "success");
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
  async function handleCreateAutoPlan(
    count: number,
    freq: "weekly" | "fortnightly" | "monthly",
    fDate: string
  ) {
    if (hasExistingPayments) {
      toast("No se puede generar el plan automático porque ya existen abonos registrados.", "warning");
      return;
    }
    if (count <= 0) return;

    // Preserve installments already paid or partial
    const kept = (quote.amortizationSchedule || []).filter(
      (inst) => inst.status === "paid" || inst.status === "partial"
    );
    const keptTotal = kept.reduce((sum, inst) => sum + inst.amount, 0);
    const balanceToSchedule = Math.max(0, quote.totals.finalTotal - keptTotal);

    if (balanceToSchedule <= 0) {
      toast("El saldo ya está completamente cubierto por las cuotas pagadas.", "warning");
      return;
    }

    let intervalDays = 30;
    if (freq === "weekly") intervalDays = 7;
    else if (freq === "fortnightly") intervalDays = 15;

    const baseAmount = Math.floor(balanceToSchedule / count);
    const firstDate = new Date(fDate);

    const newInsts: TravelInstallment[] = [];
    let accumulated = 0;

    for (let i = 0; i < count; i++) {
      const d = new Date(firstDate);
      d.setDate(d.getDate() + i * intervalDays);
      const isLast = i === count - 1;
      const amount = isLast ? balanceToSchedule - accumulated : baseAmount;
      accumulated += amount;

      newInsts.push({
        id: Math.random().toString(36).slice(2, 9),
        code: `Cuota ${kept.length + i + 1}/${kept.length + count}`,
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
        toast("Plan de cuotas generado con éxito", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Error al generar plan de amortización", "error");
    }
  }

  /* Add Manual Installment */
  async function handleAddManualInstallment(amount: number, dueDate: string) {
    if (!amount || amount <= 0) return;

    const currentTotal = (quote.amortizationSchedule || []).reduce(
      (sum, i) => sum + i.amount,
      0
    );

    if (currentTotal + amount > quote.totals.finalTotal) {
      toast(
        `El monto supera el total del viaje. Máximo permitido: ${formatCurrency(
          quote.totals.finalTotal - currentTotal,
          quote.currency
        )}`,
        "error"
      );
      return;
    }

    const newInst: TravelInstallment = {
      id: Math.random().toString(36).slice(2, 9),
      code: `Cuota ${(quote.amortizationSchedule || []).length + 1}`,
      dueDate,
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
        toast("Cuota añadida con éxito", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Error al agregar la cuota", "error");
    }
  }

  /* Remove Installment */
  function handleRemoveInstallment(instId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "¿Eliminar cuota?",
      message: "¿Deseas eliminar esta cuota del plan de amortización?",
      variant: "danger",
      confirmText: "Eliminar cuota",
      onConfirm: async () => {
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
            toast("Cuota eliminada", "info");
          }
        } catch (err) {
          console.error(err);
          toast("Error al eliminar cuota", "error");
        }
      },
    });
  }

  /* Delete Payment */
  function handleDeletePayment(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: "¿Anular este abono?",
      message: "¿Estás seguro de anular este abono? El saldo de la reserva se recalculará automáticamente.",
      variant: "danger",
      confirmText: "Anular abono",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/travel/payments/${id}`, { method: "DELETE" });
          if (res.ok) {
            setPayments((prev) => prev.filter((p) => p.id !== id));
            void loadPayments();
            const qRes = await fetch(`/api/travel/quotes/${quote.id}`);
            if (qRes.ok) {
              const qData = await qRes.json();
              onUpdated(qData.quote);
              toast("Abono anulado con éxito", "info");
            }
          }
        } catch (err) {
          console.error(err);
          toast("Error al anular abono", "error");
        }
      },
    });
  }

  /* PDF Handlers */
  async function handleDownloadBookingPdf() {
    try {
      setDownloadingBookingPdf(true);
      await downloadQuotePdf(quote, undefined, payments);
      toast("PDF de reserva generado", "success");
    } catch (err) {
      console.error("Error al generar PDF de reserva:", err);
      toast("Hubo un error al generar el PDF de la reserva.", "error");
    } finally {
      setDownloadingBookingPdf(false);
    }
  }

  async function handlePrintReceipt(p: TravelPaymentDto) {
    try {
      setDownloadingReceiptId(p.id);
      await downloadReceiptPdf(p, quote);
      toast("Recibo de caja descargado", "success");
    } catch (err) {
      console.error("Error al generar recibo de caja PDF:", err);
      toast("Hubo un error al generar el recibo de caja en PDF.", "error");
    } finally {
      setDownloadingReceiptId(null);
    }
  }

  async function handleDownloadVoucherPdf() {
    if (!voucher) {
      toast("Aún no se ha generado el voucher", "warning");
      return;
    }
    try {
      setDownloadingVoucherPdf(true);
      const allHotels = quote.days.flatMap((d) => d.items).filter((i) => i.type === "Hotel");
      const hotelItem =
        (quote.selectedHotelId ? allHotels.find((h) => h.id === quote.selectedHotelId) : null) ||
        allHotels[0];
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
      toast("Voucher descargado con éxito", "success");
    } catch (err) {
      console.error("Error al descargar voucher PDF:", err);
      toast("Hubo un error al generar el voucher en PDF.", "error");
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

  function handleDeleteTraveler(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: "¿Remover pasajero?",
      message: "¿Deseas remover este pasajero del manifiesto?",
      variant: "danger",
      confirmText: "Remover pasajero",
      onConfirm: async () => {
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
            toast("Pasajero removido del manifiesto", "info");
          }
        } catch (err) {
          console.error(err);
          toast("Error al remover pasajero", "error");
        }
      },
    });
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
        toast("Pago a proveedor registrado", "success");
      }
    } catch {
      toast("Error al registrar pago a proveedor", "error");
    } finally {
      setSavingSupplierPay(false);
    }
  }

  function handleRevertSupplierPayment(dayId: string, itemId: string) {
    setConfirmDialog({
      isOpen: true,
      title: "¿Anular registro de pago a proveedor?",
      message: "¿Deseas anular el registro de pago a este proveedor?",
      variant: "danger",
      confirmText: "Anular pago",
      onConfirm: async () => {
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
            toast("Pago de proveedor anulado", "info");
          }
        } catch (err) {
          console.error(err);
          toast("Error al anular pago", "error");
        }
      },
    });
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
    toast("Voucher copiado al portapapeles para WhatsApp", "success");
  }

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 flex flex-col bg-background"
          : layoutMode === "drawer"
          ? "fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs"
          : "flex h-full w-full flex-col bg-background overflow-hidden"
      }
      onClick={layoutMode === "drawer" && !isFullscreen ? onClose : undefined}
    >
      <div
        role={layoutMode === "drawer" ? "dialog" : undefined}
        aria-label="Expediente de Reserva"
        className={
          isFullscreen
            ? "flex h-screen w-screen flex-col bg-card"
            : layoutMode === "drawer"
            ? "flex h-full w-full max-w-6xl xl:max-w-7xl 2xl:max-w-[1780px] flex-col bg-card shadow-2xl border-l transition-all duration-200"
            : "flex h-full w-full flex-col bg-card overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Superior Fijo y Compacto */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-3 sm:px-5 sm:py-3.5 shrink-0 z-30">
          <div className="flex items-center gap-3">
            {layoutMode === "workspace" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onClose}
                  className="gap-1.5 text-xs font-semibold text-text-2 hover:bg-muted"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Volver</span>
                </Button>
                <div className="h-6 w-px bg-border hidden sm:block" />
              </>
            )}
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
            {onEditQuote && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditQuote(quote)}
                className="h-8 px-2.5 text-xs text-text-2 border-border hover:bg-muted"
                title="Editar Itinerario de la Reserva"
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5 text-brand" />
                Editar Itinerario
              </Button>
            )}
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowOverview(!showOverview)}
              className="h-8 px-2.5 text-xs text-text-2 border-border hover:bg-muted"
              title={showOverview ? "Ocultar resumen del viaje" : "Ver resumen del viaje"}
            >
              {showOverview ? (
                <ChevronUp className="h-3.5 w-3.5 mr-1 text-brand" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 mr-1 text-brand" />
              )}
              {showOverview ? "Ocultar Resumen" : "Ver Resumen"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 px-2.5 text-xs text-text-2 border-border hover:bg-muted"
              title={isFullscreen ? "Restaurar tamaño lateral" : "Pantalla completa"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 mr-1" />
              )}
              {isFullscreen ? "Restaurar" : "Pantalla Completa"}
            </Button>
            {layoutMode === "drawer" && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1.5 text-text-3 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        {/* Contenedor con Scroll Unificado para Resumen y Pestañas */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-muted/15">
          {/* Sección de Resumen (Expandible / Colapsable) */}
          <div className="border-b bg-muted/20 p-4 sm:p-5 space-y-3">
            {/* Barra compacta cuando la sección está colapsada */}
            {!showOverview && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-2.5 px-3.5 text-xs shadow-2xs">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-text-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-brand shrink-0" />
                    {quote.destination}
                  </span>
                  <span className="text-text-3 hidden sm:inline">•</span>
                  <span>
                    <strong className="text-foreground">Salida:</strong> {quote.startDate || "N/A"} ({quote.nights} noches)
                  </span>
                  <span className="text-text-3 hidden sm:inline">•</span>
                  <span>
                    <strong className="text-foreground">Pasajeros:</strong> {quote.passengers} adultos
                    {quote.childPassengers > 0 ? ` + ${quote.childPassengers} niños` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-3 sm:gap-5">
                  <div className="flex items-center gap-3">
                    <span className="text-text-3">
                      Inversión: <strong className="text-foreground font-extrabold">{formatCurrency(quote.totals.finalTotal, quote.currency)}</strong>
                    </span>
                    <span className="text-text-3">•</span>
                    <span className="text-text-3">
                      Saldo Pendiente: <strong className="text-amber-600 font-extrabold">{formatCurrency(balanceRemaining, quote.currency)}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowOverview(true)}
                    className="text-brand hover:underline font-semibold text-xs flex items-center gap-1"
                  >
                    <span>Expandir</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Bloque completo cuando la sección está expandida */}
            {showOverview && (
              <>
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

                {/* Billing & Counter details (Colapsable para no tapar el contenido de las pestañas) */}
                <div className="rounded-xl border bg-card p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowBillingHeader(!showBillingHeader)}
                      className="text-xs font-bold text-text-2 hover:text-foreground flex items-center gap-1.5"
                    >
                      <span>Datos de Facturación & Counter</span>
                      <span className="text-[10px] text-text-3 font-normal">
                        {showBillingHeader ? "(Ocultar)" : "(Ver/Editar)"}
                      </span>
                    </button>
                    {showBillingHeader && (
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
                    )}
                  </div>
                  {showBillingHeader && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t pt-2">
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
                  )}
                </div>
              </>
            )}
          </div>

          {/* Navigation Tabs (Sticky en el top del scroll) */}
          <div className="sticky top-0 z-30 bg-card border-b shadow-xs px-3 sm:px-6 py-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: "amortization", label: "Plan Amortización", icon: Calendar },
                { id: "payments", label: `Historial Abonos (${payments.length})`, icon: DollarSign },
                { id: "passengers", label: `Pasajeros (${travelers.length})`, icon: Users },
                { id: "supplierPayments", label: `Pagos Proveedores (${supplierItems.length})`, icon: Handshake },
                { id: "operations", label: "Operación", icon: Plane },
                { id: "vouchers", label: "Voucher", icon: Ticket },
              ].map((tab) => {
                const Icon = tab.icon;
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 sm:px-4 rounded-full text-xs font-bold uppercase tracking-wider transition shrink-0 whitespace-nowrap ${
                      isSelected
                        ? "bg-slate-800 text-white shadow-xs dark:bg-slate-200 dark:text-slate-900"
                        : "text-text-3 hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 sm:p-6 space-y-6">
          {/* 1. Amortización */}
          {activeTab === "amortization" && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-brand-soft p-2 text-brand-text">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-foreground">
                        Cronograma de Amortización & Cuotas
                      </h3>
                      {hasExistingPayments && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-semibold">
                          <AlertCircle className="h-3 w-3" />
                          Abonos activos: plan automático protegido
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-3 mt-0.5">
                      Fechas y montos de pago acordados con el cliente.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={hasExistingPayments}
                    onClick={() => setAutoPlanOpen(true)}
                    className="h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      hasExistingPayments
                        ? "Plan automático bloqueado: la reserva ya tiene abonos registrados. Realiza ajustes mediante cuota manual."
                        : "Generar cronograma automático de cuotas"
                    }
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" /> Plan Automático
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

              {/* Installments List */}
              {liveInstallments.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center text-xs text-text-3 font-medium bg-muted/10">
                  Sin plan de cuotas registrado. Genera un plan automático o agrega cuotas manuales.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {liveInstallments.map((inst, idx) => {
                    const isPaid = inst.status === "paid";
                    const isPartial = inst.status === "partial";
                    const paidForThis = payments
                      .filter((p) => p.installmentId === inst.id)
                      .reduce((s, p) => s + p.amount, 0);

                    return (
                      <div
                        key={inst.id}
                        className={`flex items-center justify-between rounded-xl border p-3.5 text-xs transition ${
                          isPaid
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : isPartial
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-card border-border/70 shadow-2xs"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {inst.code || `Cuota ${idx + 1}`}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                isPaid
                                  ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 flex items-center gap-1"
                                  : isPartial
                                  ? "bg-amber-500/20 text-amber-600 border-amber-500/30"
                                  : "bg-muted text-text-3 border-transparent"
                              }`}
                            >
                              {isPaid ? "✓ PAGADA" : isPartial ? "ABONO PARCIAL" : "PENDIENTE"}
                            </span>
                            {isPartial && paidForThis > 0 && (
                              <span className="text-[11px] text-text-3 font-medium">
                                (Abonado: {formatCurrency(paidForThis, quote.currency)})
                              </span>
                            )}
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
                            {isPartial && paidForThis > 0 && (
                              <span className="text-[10px] text-amber-600 font-bold block">
                                Restan: {formatCurrency(Math.max(0, inst.amount - paidForThis), quote.currency)}
                              </span>
                            )}
                          </div>

                          {!isPaid && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setTargetedInstallmentId(inst.id);
                                const remainingForThis = Math.max(0, inst.amount - paidForThis);
                                setSuggestedPaymentAmount(remainingForThis > 0 ? remainingForThis : inst.amount);
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
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-foreground">
                      Historial de Abonos & Recibos de Caja
                    </h3>
                    <p className="text-xs text-text-3 mt-0.5">
                      Registro contable de pagos efectuados por el cliente.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setTargetedInstallmentId(undefined);
                    setSuggestedPaymentAmount(balanceRemaining > 0 ? balanceRemaining : undefined);
                    setPaymentModalOpen(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nuevo Abono
                </Button>
              </div>

              {payments.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center text-xs text-text-3 font-medium bg-muted/10">
                  Sin abonos registrados. Haz clic en &ldquo;Nuevo Abono&rdquo; para registrar el primer pago.
                </div>
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
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
              {/* Header con icono similar a la referencia */}
              <div className="flex items-center gap-2.5 text-brand border-b pb-4">
                <Users className="h-5 w-5" />
                <h2 className="text-base font-bold text-foreground">Listado de Pasajeros</h2>
              </div>

              {/* Sub-barra: Lista de pasajeros y cotizado */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-foreground">
                  LISTA DE PASAJEROS ({travelers.length})
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold bg-muted/40 border px-3 py-1 rounded-full">
                    <span className="text-[10px] font-bold text-text-3 uppercase tracking-wider mr-1">Cotizado:</span>
                    <span className="text-foreground">{quote.passengers} Adultos</span>
                    {quote.childPassengers > 0 && (
                      <span className="text-emerald-600 font-bold ml-1">
                        {quote.childPassengers} Niño{quote.childPassengers > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
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
                    className="h-8 text-xs bg-slate-700 hover:bg-slate-800 text-white"
                  >
                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                    Agregar Pasajero
                  </Button>
                </div>
              </div>

              {/* Travelers List or Empty State */}
              {travelers.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/80 p-10 text-center text-xs text-text-3 font-medium bg-muted/10">
                  No se han registrado pasajeros en esta reserva.
                </div>
              ) : (
                <div className="space-y-2.5">
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

              {/* Tarjeta inferior para registrar nuevo pasajero tal como en la imagen */}
              <div className="rounded-2xl border border-border/80 bg-muted/15 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-2 block">
                    Registrar Nuevo Pasajero
                  </span>
                  <p className="text-xs text-text-3 mt-0.5">
                    Añade los datos de contacto y documentación de cada viajero para los vouchers y tiquetes.
                  </p>
                </div>
                <Button
                  type="button"
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
                  className="bg-slate-700 hover:bg-slate-800 text-white shrink-0"
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Agregar Pasajero
                </Button>
              </div>
            </div>
          )}

          {/* 4. Pagos a Proveedores (Supplier Payments) */}
          {activeTab === "supplierPayments" && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
              <div className="flex items-center gap-2.5 text-brand border-b pb-4">
                <Handshake className="h-5 w-5 text-purple-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    Liquidación & Control de Pagos a Proveedores
                  </h3>
                  <p className="text-xs text-text-3 mt-0.5">
                    Control de costos netos por servicio del itinerario y pagos transferidos a mayoristas/operadores.
                  </p>
                </div>
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

              {/* Lista de Items y Liquidación */}
              {supplierItems.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border/80 p-8 text-center text-xs text-text-3 font-medium bg-muted/10">
                  No hay servicios con costos asociados en el itinerario.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {supplierItems.map((it) => {
                    const isPaid = it.supplierPaymentStatus === "paid";
                    return (
                      <div
                        key={it.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-xs transition ${
                          isPaid
                            ? "bg-emerald-500/5 border-emerald-500/20"
                            : "bg-card border-border/70 shadow-2xs"
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
                            <p className="text-[11px] text-emerald-600 font-medium">
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
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
              <div className="flex items-center gap-2.5 text-brand border-b pb-4">
                <Compass className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    Control de Emisión & Localizadores (PNR)
                  </h3>
                  <p className="text-xs text-text-3 mt-0.5">
                    Asigna y consulta los códigos de confirmación por cada servicio del itinerario.
                  </p>
                </div>
              </div>

              {/* Localizadores por Ítem del Itinerario */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold text-text-2 block uppercase tracking-wider">
                  Localizadores / PNRs por Servicio:
                </span>
                {allItineraryItems.map((it) => (
                  <div
                    key={it.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border bg-muted/20 p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-foreground">
                        Día {it.dayNumber} · [{it.type}] {it.title}
                      </span>
                      {it.provider && (
                        <span className="text-[11px] text-text-3 block mt-0.5">
                          Proveedor: <strong>{it.provider}</strong>
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
                        className="h-8 w-48 text-xs font-mono font-bold"
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
                    className="h-9 text-xs font-mono font-bold"
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
                    className="h-9 text-xs"
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
                <Button onClick={handleSaveOperations} disabled={savingOps} className="bg-brand text-brand-fg">
                  {savingOps ? "Guardando…" : "Guardar Operaciones"}
                </Button>
              </div>
            </div>
          )}

          {/* 6. Vouchers (Resumen limpio y acceso directo a la sección de Vouchers) */}
          {activeTab === "vouchers" && (
            <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-md space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
                    <Ticket className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Voucher de Servicios
                    </h3>
                    <p className="mt-0.5 text-xs text-text-3">
                      Comprobante oficial de servicios turísticos confirmados para el pasajero y proveedores.
                    </p>
                  </div>
                </div>

                {voucher ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3.5 py-1 font-mono text-xs font-bold text-success-text border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {voucher.voucherNumber}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-1 text-xs font-bold text-text-3">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Pendiente de emisión
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 rounded-xl bg-muted/20 border border-border/70 p-4">
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider text-text-2">Detalle del viaje amparado</p>
                  <div className="space-y-1.5 text-text-2">
                    <p><strong>Destino:</strong> {quote.destination}</p>
                    <p><strong>Titular:</strong> {quote.clientName}</p>
                    <p><strong>Fechas:</strong> {quote.startDate ?? "Por definir"} a {quote.endDate ?? "Por definir"}</p>
                    <p><strong>Pasajeros:</strong> {travelers.length || quote.passengers} pax</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl bg-muted/20 border border-border/70 p-4">
                  <p className="font-bold text-foreground text-xs uppercase tracking-wider text-text-2">Servicios en el voucher</p>
                  <div className="space-y-1.5 text-text-2">
                    <p>
                      <strong>Alojamiento:</strong>{" "}
                      {voucher?.hotelDetails?.name || (quote.selectedHotelId ? "Hotel seleccionado" : "Por configurar")}
                    </p>
                    <p>
                      <strong>Vuelos:</strong>{" "}
                      {voucher?.flightDetails?.airline
                        ? `${voucher.flightDetails.airline} (${voucher.flightDetails.flightNumber ?? "---"})`
                        : "Por configurar"}
                    </p>
                    <p>
                      <strong>Traslados:</strong>{" "}
                      {(voucher?.transfers?.length ?? 0) > 0 ? `${voucher?.transfers.length} servicio(s)` : "Ninguno"}
                    </p>
                    <p>
                      <strong>Actividades:</strong>{" "}
                      {(voucher?.activities?.length ?? 0) > 0 ? `${voucher?.activities.length} tour(s)` : "Ninguna"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                <div className="flex flex-wrap items-center gap-2">
                  {voucher && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleDownloadVoucherPdf()}
                        disabled={downloadingVoucherPdf}
                        className="gap-1.5"
                      >
                        {downloadingVoucherPdf ? (
                          <Loader2 className="h-4 w-4 animate-spin text-brand" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        <span>Descargar PDF</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyVoucherText}
                        className="gap-1.5"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-600" />
                        <span>Copiar para WhatsApp</span>
                      </Button>
                    </>
                  )}
                </div>

                <Link
                  href={`/vouchers?quoteId=${quote.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-fg hover:opacity-90 transition-opacity"
                >
                  <span>{voucher ? "Gestionar en sección Vouchers" : "Emitir Voucher en Vouchers"}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {paymentModalOpen && (
        <PaymentModal
          quoteId={quote.id}
          suggestedAmount={suggestedPaymentAmount}
          currency={quote.currency}
          installments={liveInstallments}
          initialInstallmentId={targetedInstallmentId}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={async (savedPayment) => {
            setPayments((prev) => [
              savedPayment,
              ...prev.filter((p) => p.id !== savedPayment.id),
            ]);
            setPaymentModalOpen(false);
            toast("Abono registrado con éxito", "success");
            void loadPayments();
            try {
              const qRes = await fetch(`/api/travel/quotes/${quote.id}`);
              if (qRes.ok) {
                const qData = await qRes.json();
                if (qData.quote) {
                  onUpdated(qData.quote);
                }
              }
            } catch (err) {
              console.error("Error al actualizar cotización tras abono:", err);
            }
          }}
        />
      )}

      {autoPlanOpen && (
        <AutoPlanModal
          isOpen={autoPlanOpen}
          onClose={() => setAutoPlanOpen(false)}
          balanceRemaining={balanceRemaining}
          currency={quote.currency}
          onApplyPlan={async (count, frequency, firstDate) => {
            await handleCreateAutoPlan(count, frequency, firstDate);
          }}
        />
      )}

      {manualInstallmentOpen && (
        <ManualInstallmentModal
          isOpen={manualInstallmentOpen}
          onClose={() => setManualInstallmentOpen(false)}
          maxAllowedAmount={remainingToSchedule}
          currency={quote.currency}
          onAddInstallment={async (amount, dueDate) => {
            await handleAddManualInstallment(amount, dueDate);
          }}
        />
      )}

      {/* Modal Flotante: Agregar / Editar Pasajero */}
      {travelerModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setTravelerModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    {editingTravelerId ? "Editar Datos del Pasajero" : "Registrar Nuevo Pasajero"}
                  </h3>
                  <p className="text-xs text-text-3">
                    Información para vouchers, manifiesto de viaje y tiquetes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTravelerModalOpen(false)}
                className="rounded-lg p-1.5 text-text-3 hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTraveler} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Nombres *</label>
                  <Input
                    placeholder="Ej. Juan Andrés"
                    value={travelerForm.firstName ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Apellidos *</label>
                  <Input
                    placeholder="Ej. Pérez Gómez"
                    value={travelerForm.lastName ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, lastName: e.target.value }))
                    }
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Tipo Doc.</label>
                  <select
                    value={travelerForm.idType ?? "CC"}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({
                        ...prev,
                        idType: e.target.value as Traveler["idType"],
                      }))
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                  >
                    <option value="CC">Cédula (CC)</option>
                    <option value="TI">Tarjeta Id (TI)</option>
                    <option value="CE">Cédula Ext. (CE)</option>
                    <option value="PA">Pasaporte (PA)</option>
                    <option value="RC">Reg. Civil (RC)</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-text-2">Número de Documento</label>
                  <Input
                    placeholder="Ej. 1020304050"
                    value={travelerForm.idNumber ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, idNumber: e.target.value }))
                    }
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Categoría Pax</label>
                  <select
                    value={travelerForm.type ?? "ADULTO"}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({
                        ...prev,
                        type: e.target.value as Traveler["type"],
                      }))
                    }
                    className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                  >
                    <option value="ADULTO">Adulto</option>
                    <option value="MENOR">Menor</option>
                    <option value="INFANTE">Infante</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Fecha Nacimiento</label>
                  <Input
                    type="date"
                    value={travelerForm.birthDate ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, birthDate: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">EPS / Asistencia</label>
                  <Input
                    placeholder="Ej. Sura / Assist Card"
                    value={travelerForm.eps ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, eps: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Teléfono / WhatsApp</label>
                  <Input
                    placeholder="Ej. +57 300 123 4567"
                    value={travelerForm.phone ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Correo Electrónico</label>
                  <Input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={travelerForm.email ?? ""}
                    onChange={(e) =>
                      setTravelerForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Observaciones / Requerimientos Especiales</label>
                <Input
                  placeholder="Ej. Alergias alimentarias, silla de ruedas, asiento pasillo..."
                  value={travelerForm.observations ?? ""}
                  onChange={(e) =>
                    setTravelerForm((prev) => ({ ...prev, observations: e.target.value }))
                  }
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTravelerModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="bg-brand text-brand-fg">
                  {editingTravelerId ? "Guardar Cambios" : "Agregar Pasajero"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Flotante: Pagar a Proveedor */}
      {supplierPayModalOpen && selectedSupplierItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSupplierPayModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                  <Handshake className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-foreground">
                    Registrar Liquidación de Proveedor
                  </h3>
                  <p className="text-xs text-text-3">
                    Registra la transferencia o desembolso realizado al operador del servicio.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSupplierPayModalOpen(false)}
                className="rounded-lg p-1.5 text-text-3 hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Resumen del servicio */}
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  {selectedSupplierItem.title}
                </span>
                <span className="font-extrabold text-sm text-purple-700">
                  {formatCurrency(selectedSupplierItem.netPrice || 0, quote.currency)}
                </span>
              </div>
              <p className="text-text-3">
                Proveedor: <strong>{selectedSupplierItem.provider || "Proveedor sin asignar"}</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmSupplierPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Fecha de Pago *</label>
                  <Input
                    type="date"
                    value={supplierPayDate}
                    onChange={(e) => setSupplierPayDate(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-2">Método de Transferencia *</label>
                  <select
                    value={supplierPayMethod}
                    onChange={(e) => setSupplierPayMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                  >
                    <option value="Transferencia Bancaria">Transferencia Bancaria</option>
                    <option value="Tarjeta Corporativa">Tarjeta Corporativa</option>
                    <option value="Consignación">Consignación</option>
                    <option value="Efectivo / Caja Menor">Efectivo / Caja Menor</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">
                  Comprobante / No. de Aprobación
                </label>
                <Input
                  placeholder="Ej. Transferencia #99482 Bancolombia"
                  value={supplierPayRef}
                  onChange={(e) => setSupplierPayRef(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-2">Notas internas / Concepto</label>
                <Input
                  placeholder="Ej. Pago neto con retención aplicada..."
                  value={supplierPayNotes}
                  onChange={(e) => setSupplierPayNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSupplierPayModalOpen(false)}
                  disabled={savingSupplierPay}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingSupplierPay}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {savingSupplierPay ? "Guardando..." : "Confirmar Pago a Proveedor"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diálogo de Confirmación Reutilizable */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
      />
    </div>
  );
}
