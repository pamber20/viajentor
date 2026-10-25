"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  FileDown,
  Loader2,
  MapPin,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelPaymentDto } from "@/server/travel/trips";
import { PaymentModal } from "@/components/travel/trips/payment-modal";
import { downloadReceiptPdf } from "@/components/travel/pdf";

function getQuoteTotal(quote: TravelQuoteDto): number {
  return (
    quote.totals?.finalTotal ||
    quote.amortizationSchedule?.reduce((sum, i) => sum + i.amount, 0) ||
    0
  );
}

export function PaymentsClient() {
  const [activeTab, setActiveTab] = useState<"abonos" | "comisiones">("abonos");
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState<TravelQuoteDto[]>([]);
  const [payments, setPayments] = useState<TravelPaymentDto[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  // Modal de pago
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [targetedInstallmentId, setTargetedInstallmentId] = useState<string | undefined>(undefined);
  const [suggestedPaymentAmount, setSuggestedPaymentAmount] = useState<number | undefined>(undefined);

  // Estados de PDF y borrado
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  // Carga inicial
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [quotesRes, paymentsRes] = await Promise.all([
        fetch("/api/travel/quotes"),
        fetch("/api/travel/payments"),
      ]);

      if (quotesRes.ok) {
        const qData = await quotesRes.json();
        const loadedQuotes: TravelQuoteDto[] = qData.quotes ?? [];
        setQuotes(loadedQuotes);
        if (loadedQuotes.length > 0 && !selectedQuoteId) {
          // Seleccionar por defecto la primera reserva o cotización activa
          const firstBooking = loadedQuotes.find((q) => q.isBooking) ?? loadedQuotes[0];
          setSelectedQuoteId(firstBooking?.id ?? null);
        }
      }

      if (paymentsRes.ok) {
        const pData = await paymentsRes.json();
        setPayments(pData.payments ?? []);
      }
    } catch (err) {
      console.error("Error al cargar datos financieros:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedQuoteId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Mapa de pagos por quoteId
  const paymentsByQuote = useMemo(() => {
    const map = new Map<string, TravelPaymentDto[]>();
    for (const p of payments) {
      const list = map.get(p.quoteId) || [];
      list.push(p);
      map.set(p.quoteId, list);
    }
    return map;
  }, [payments]);

  // Cotización seleccionada
  const selectedQuote = useMemo(() => {
    if (!selectedQuoteId) return null;
    return quotes.find((q) => q.id === selectedQuoteId) ?? null;
  }, [quotes, selectedQuoteId]);

  const selectedQuotePayments = useMemo(() => {
    if (!selectedQuoteId) return [];
    return paymentsByQuote.get(selectedQuoteId) || [];
  }, [paymentsByQuote, selectedQuoteId]);

  // Cotizaciones filtradas para el buscador
  const filteredQuotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return quotes;
    return quotes.filter(
      (item) =>
        item.clientName?.toLowerCase().includes(q) ||
        item.quoteNumber?.toLowerCase().includes(q) ||
        item.bookingNumber?.toLowerCase().includes(q) ||
        item.destination?.toLowerCase().includes(q)
    );
  }, [quotes, searchQuery]);

  // Cálculos globales de cartera y métricas
  const metrics = useMemo(() => {
    let totalCollected = 0;
    let totalPendingReceivable = 0;
    let tripsCloseWithDebt = 0;
    let confirmedSalesTotal = 0;
    let totalCommissions = 0;

    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;

    for (const quote of quotes) {
      const qPayments = paymentsByQuote.get(quote.id) || [];
      const paid = qPayments.reduce((acc, p) => acc + p.amount, 0);
      const total = getQuoteTotal(quote);
      const balance = Math.max(0, total - paid);

      totalCollected += paid;

      // Solo consideramos cartera de cotizaciones ganadas o reservas
      if (quote.isBooking || quote.status === "accepted" || quote.status === "completed") {
        totalPendingReceivable += balance;
        confirmedSalesTotal += total;

        // Comisiones estimadas
        const commissionPct = quote.agencyCommission ?? 10;
        const commAmount = (total * commissionPct) / 100;
        totalCommissions += commAmount;

        // Alerta de viaje cercano
        if (quote.startDate) {
          const tripTime = new Date(quote.startDate).getTime();
          if (tripTime - now > 0 && tripTime - now < fifteenDaysMs && balance > 0) {
            tripsCloseWithDebt++;
          }
        }
      }
    }

    return {
      totalCollected,
      totalPendingReceivable,
      tripsCloseWithDebt,
      confirmedSalesTotal,
      totalCommissions,
    };
  }, [quotes, paymentsByQuote]);

  // Cálculo individual para la cotización seleccionada
  const selectedQuoteFinancials = useMemo(() => {
    if (!selectedQuote) return null;
    const paid = selectedQuotePayments.reduce((acc, p) => acc + p.amount, 0);
    const total = getQuoteTotal(selectedQuote);
    const balance = Math.max(0, total - paid);
    const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

    // Alerta de viaje en menos de 15 días
    let isUrgentDeparture = false;
    let daysUntilTrip: number | null = null;
    if (selectedQuote.startDate) {
      const diffTime = new Date(selectedQuote.startDate).getTime() - Date.now();
      daysUntilTrip = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysUntilTrip >= 0 && daysUntilTrip <= 15 && balance > 0) {
        isUrgentDeparture = true;
      }
    }

    return {
      total,
      paid,
      balance,
      progress,
      isUrgentDeparture,
      daysUntilTrip,
    };
  }, [selectedQuote, selectedQuotePayments]);

  // Descarga de recibo de caja PDF
  async function handleDownloadReceipt(payment: TravelPaymentDto) {
    if (!selectedQuote) return;
    try {
      setDownloadingReceiptId(payment.id);
      await downloadReceiptPdf(payment, selectedQuote);
    } catch (err) {
      console.error("Error al generar recibo PDF:", err);
      alert("Hubo un error al generar el recibo de caja en PDF.");
    } finally {
      setDownloadingReceiptId(null);
    }
  }

  // Eliminar un abono
  async function handleDeletePayment(paymentId: string) {
    if (!confirm("¿Estás seguro de eliminar este abono? Se recalcularán las cuotas del viaje.")) {
      return;
    }
    try {
      setDeletingPaymentId(paymentId);
      const res = await fetch(`/api/travel/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al eliminar abono");
      }
      await loadData();
    } catch (err) {
      console.error("Error al eliminar abono:", err);
      alert(err instanceof Error ? err.message : "Error al eliminar el abono.");
    } finally {
      setDeletingPaymentId(null);
    }
  }

  // Reporte de comisiones
  const commissionsReport = useMemo(() => {
    return quotes
      .filter((q) => q.isBooking || q.status === "accepted" || q.status === "completed")
      .map((q) => {
        const total = getQuoteTotal(q);
        const commissionPercent = q.agencyCommission ?? 10;
        const commissionAmount = (total * commissionPercent) / 100;
        const qPayments = paymentsByQuote.get(q.id) || [];
        const paid = qPayments.reduce((sum, p) => sum + p.amount, 0);
        const balance = Math.max(0, total - paid);
        const isFullyPaid = balance <= 0;

        return {
          id: q.id,
          code: q.bookingNumber || q.quoteNumber || "S/N",
          clientName: q.clientName,
          destination: q.destination,
          startDate: q.startDate,
          total,
          currency: q.currency,
          commissionPercent,
          commissionAmount,
          advisor: q.advisorName || "Agencia",
          paid,
          balance,
          isFullyPaid,
        };
      });
  }, [quotes, paymentsByQuote]);

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm font-semibold text-text-3">Cargando módulo de pagos y cartera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Cabecera Principal */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                Abonos, Cartera & Finanzas
              </h1>
              <p className="text-xs text-text-3 md:text-sm">
                Control de abonos de clientes, recibos de caja, alertas de viaje y liquidación de comisiones.
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Pestaña */}
        <div className="flex items-center rounded-xl border bg-muted/50 p-1">
          <button
            onClick={() => setActiveTab("abonos")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "abonos"
                ? "bg-card text-brand shadow-sm"
                : "text-text-3 hover:text-foreground"
            }`}
          >
            Control de Abonos y Cartera
          </button>
          <button
            onClick={() => setActiveTab("comisiones")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "comisiones"
                ? "bg-card text-brand shadow-sm"
                : "text-text-3 hover:text-foreground"
            }`}
          >
            Reporte de Comisiones
          </button>
        </div>
      </div>

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-3 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Total Recaudado</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-extrabold text-foreground md:text-2xl">
            {formatCurrency(metrics.totalCollected)}
          </p>
          <span className="text-[11px] text-text-3">En todas las reservas</span>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-3 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Cartera por Cobrar</span>
            <CreditCard className="h-4 w-4 text-brand" />
          </div>
          <p className="text-xl font-extrabold text-foreground md:text-2xl">
            {formatCurrency(metrics.totalPendingReceivable)}
          </p>
          <span className="text-[11px] text-text-3">Saldos pendientes</span>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-3 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Salidas &lt;15 Días</span>
            <AlertCircle className={`h-4 w-4 ${metrics.tripsCloseWithDebt > 0 ? "text-danger" : "text-text-3"}`} />
          </div>
          <p className="text-xl font-extrabold text-foreground md:text-2xl">
            {metrics.tripsCloseWithDebt}
          </p>
          <span className={`text-[11px] font-semibold ${metrics.tripsCloseWithDebt > 0 ? "text-danger" : "text-text-3"}`}>
            {metrics.tripsCloseWithDebt > 0 ? "Viajes con saldo pendiente" : "Sin alertas urgentes"}
          </span>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-text-3 mb-1.5">
            <span className="text-xs font-medium uppercase tracking-wider">Comisiones Ganadas</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-xl font-extrabold text-foreground md:text-2xl">
            {formatCurrency(metrics.totalCommissions)}
          </p>
          <span className="text-[11px] text-text-3">Ingresos estimados</span>
        </div>
      </div>

      {/* PESTAÑA 1: CONTROL DE ABONOS Y CARTERA */}
      {activeTab === "abonos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Buscador y Lista de Viajes */}
          <div className="lg:col-span-5 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente, destino o código..."
                className="pl-9 h-10 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
              {filteredQuotes.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-text-3 text-xs">
                  No se encontraron cotizaciones o viajes con esa búsqueda.
                </div>
              ) : (
                filteredQuotes.map((quote) => {
                  const isSelected = quote.id === selectedQuoteId;
                  const qPayments = paymentsByQuote.get(quote.id) || [];
                  const paid = qPayments.reduce((sum, p) => sum + p.amount, 0);
                  const total = getQuoteTotal(quote);
                  const balance = Math.max(0, total - paid);
                  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                  // Alerta viaje en <15 días
                  let closeAlert = false;
                  if (quote.startDate) {
                    const diff = new Date(quote.startDate).getTime() - Date.now();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    if (days >= 0 && days <= 15 && balance > 0) {
                      closeAlert = true;
                    }
                  }

                  return (
                    <div
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(quote.id)}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all duration-150 ${
                        isSelected
                          ? "bg-card border-brand shadow-sm ring-1 ring-brand"
                          : "bg-card/60 hover:bg-card border-border hover:border-brand/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-brand">
                          {quote.bookingNumber || quote.quoteNumber || "VIAJE"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {closeAlert && (
                            <Badge variant="outline" className="text-[10px] bg-danger-tint text-danger-text border-danger-soft">
                              Salida próxima
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {quote.isBooking ? "Reserva" : "Cotización"}
                          </Badge>
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-foreground line-clamp-1">
                        {quote.clientName}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-text-3 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {quote.destination}
                        </span>
                        {quote.startDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {quote.startDate}
                          </span>
                        )}
                      </div>

                      {/* Progreso de Abonos */}
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-3 font-medium">Abonado: {pct}%</span>
                          <span className="font-bold text-foreground">
                            {formatCurrency(paid, quote.currency)} / {formatCurrency(total, quote.currency)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-brand" : "bg-muted-foreground/30"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] pt-0.5">
                          <span className="text-text-3">Saldo:</span>
                          <span className={`font-bold ${balance > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"}`}>
                            {balance > 0 ? formatCurrency(balance, quote.currency) : "¡Paz y Salvo!"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna Derecha: Detalle Financiero del Viaje */}
          <div className="lg:col-span-7">
            {selectedQuote && selectedQuoteFinancials ? (
              <div className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-6">
                {/* Cabecera del Viaje */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-md">
                        {selectedQuote.bookingNumber || selectedQuote.quoteNumber}
                      </span>
                      {selectedQuoteFinancials.isUrgentDeparture && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger bg-danger-tint px-2 py-0.5 rounded-md">
                          <AlertCircle className="h-3 w-3" />
                          Viaje en {selectedQuoteFinancials.daysUntilTrip} días · Saldo pendiente
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-foreground">
                      {selectedQuote.clientName}
                    </h2>
                    <p className="text-xs text-text-3">
                      Destino: <strong>{selectedQuote.destination}</strong> · Fechas: {selectedQuote.startDate} al {selectedQuote.endDate}
                    </p>
                  </div>

                  <Button
                    onClick={() => {
                      setTargetedInstallmentId(undefined);
                      setSuggestedPaymentAmount(
                        selectedQuoteFinancials.balance > 0 ? selectedQuoteFinancials.balance : undefined
                      );
                      setPaymentModalOpen(true);
                    }}
                    className="h-9 gap-1.5 text-xs font-bold bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Registrar Abono
                  </Button>
                </div>

                {/* Resumen Financiero en Mini Tarjetas */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border bg-muted/30 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">Total del Viaje</span>
                    <p className="text-base font-extrabold text-foreground mt-0.5">
                      {formatCurrency(selectedQuoteFinancials.total, selectedQuote.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-emerald-500/10 border-emerald-500/20 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Abonado</span>
                    <p className="text-base font-extrabold text-emerald-600 mt-0.5">
                      {formatCurrency(selectedQuoteFinancials.paid, selectedQuote.currency)}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-amber-500/10 border-amber-500/20 p-3 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Saldo Pendiente</span>
                    <p className="text-base font-extrabold text-amber-600 mt-0.5">
                      {formatCurrency(selectedQuoteFinancials.balance, selectedQuote.currency)}
                    </p>
                  </div>
                </div>

                {/* Cronograma de Cuotas (Amortización) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Plan de Pagos y Cuotas Acordadas
                    </h3>
                    <span className="text-xs text-text-3">
                      {selectedQuote.amortizationSchedule?.length || 0} cuotas pactadas
                    </span>
                  </div>

                  <div className="space-y-2">
                    {(!selectedQuote.amortizationSchedule || selectedQuote.amortizationSchedule.length === 0) ? (
                      <p className="text-xs text-text-3 italic">
                        No hay cronograma de amortización definido para esta cotización.
                      </p>
                    ) : (
                      selectedQuote.amortizationSchedule.map((inst, index) => {
                        const paidInst = selectedQuotePayments
                          .filter((p) => p.installmentId === inst.id)
                          .reduce((sum, p) => sum + p.amount, 0);
                        const instBalance = Math.max(0, inst.amount - paidInst);
                        const isDone = inst.status === "paid" || instBalance === 0;

                        return (
                          <div
                            key={inst.id}
                            className="flex items-center justify-between rounded-xl border bg-card p-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-7 w-7 items-center justify-center rounded-lg font-bold text-xs ${
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-muted text-text-3"
                                }`}
                              >
                                {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                              </div>
                              <div>
                                <span className="font-bold text-foreground block">
                                  {inst.code || `Cuota #${index + 1}`}
                                </span>
                                <span className="text-[11px] text-text-3 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Vence: {inst.dueDate || "Sin fecha"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="font-bold text-foreground block">
                                  {formatCurrency(inst.amount, selectedQuote.currency)}
                                </span>
                                <span className="text-[11px] text-text-3">
                                  {isDone ? (
                                    <strong className="text-emerald-600">Pagada</strong>
                                  ) : (
                                    `Pendiente: ${formatCurrency(instBalance, selectedQuote.currency)}`
                                  )}
                                </span>
                              </div>

                              {!isDone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setTargetedInstallmentId(inst.id);
                                    setSuggestedPaymentAmount(instBalance);
                                    setPaymentModalOpen(true);
                                  }}
                                  className="h-7 text-xs px-2.5"
                                >
                                  Pagar
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Historial de Abonos / Recibos */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Historial de Abonos y Recibos de Caja
                    </h3>
                    <span className="text-xs text-text-3">
                      {selectedQuotePayments.length} abonos registrados
                    </span>
                  </div>

                  {selectedQuotePayments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-text-3 text-xs">
                      Aún no se han registrado abonos para este viaje.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedQuotePayments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border bg-card p-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                              <Receipt className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">
                                  {formatCurrency(p.amount, selectedQuote.currency)}
                                </span>
                                <Badge variant="outline" className="text-[10px] py-0">
                                  {p.method}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-text-3">
                                {p.date} · {p.receiptNumber ? `Recibo: ${p.receiptNumber}` : "Sin # de recibo"}
                                {p.reference ? ` · Ref: ${p.reference}` : ""}
                              </p>
                              {p.notes && (
                                <p className="text-[11px] text-text-3 italic mt-0.5">
                                  &ldquo;{p.notes}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadingReceiptId === p.id}
                              onClick={() => void handleDownloadReceipt(p)}
                              className="h-8 text-xs gap-1.5 text-brand border-brand/30 hover:bg-brand-soft"
                            >
                              {downloadingReceiptId === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileDown className="h-3.5 w-3.5" />
                              )}
                              Recibo PDF
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={deletingPaymentId === p.id}
                              onClick={() => void handleDeletePayment(p.id)}
                              className="h-8 w-8 p-0 text-text-3 hover:text-danger"
                            >
                              {deletingPaymentId === p.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed p-12 text-center text-text-3 flex flex-col items-center justify-center min-h-[400px]">
                <Search className="h-10 w-10 text-muted-foreground/40 mb-3 animate-pulse" />
                <h3 className="font-bold text-base text-foreground mb-1">
                  Selecciona un Viaje o Cotización
                </h3>
                <p className="text-xs max-w-sm">
                  Elige un cliente de la lista de la izquierda para consultar su estado financiero, emitir recibos de caja y registrar abonos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: REPORTE DE COMISIONES */}
      {activeTab === "comisiones" && (
        <div className="rounded-3xl border bg-card p-5 md:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Liquidación y Reporte de Comisiones
              </h2>
              <p className="text-xs text-text-3">
                Cálculo de ingresos y comisiones por venta según cotizaciones ganadas y reservas activas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-text-3 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Código</th>
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Destino</th>
                  <th className="pb-3 text-right">Valor Venta</th>
                  <th className="pb-3 text-center">% Comisión</th>
                  <th className="pb-3 text-right">Comisión Agencia</th>
                  <th className="pb-3">Asesor</th>
                  <th className="pb-3 text-center">Estado Cobro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {commissionsReport.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-text-3 text-xs">
                      No hay cotizaciones aceptadas o reservas para calcular comisiones.
                    </td>
                  </tr>
                ) : (
                  commissionsReport.map((rep) => (
                    <tr key={rep.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 pl-2 font-mono font-bold text-brand">
                        {rep.code}
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        {rep.clientName}
                      </td>
                      <td className="py-3 text-text-2">
                        {rep.destination}
                      </td>
                      <td className="py-3 text-right font-bold text-foreground">
                        {formatCurrency(rep.total, rep.currency)}
                      </td>
                      <td className="py-3 text-center font-bold text-brand">
                        {rep.commissionPercent}%
                      </td>
                      <td className="py-3 text-right font-extrabold text-emerald-600">
                        {formatCurrency(rep.commissionAmount, rep.currency)}
                      </td>
                      <td className="py-3 text-text-3">
                        {rep.advisor}
                      </td>
                      <td className="py-3 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            rep.isFullyPaid
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          }`}
                        >
                          {rep.isFullyPaid ? "Pagado 100%" : `Saldo: ${formatCurrency(rep.balance, rep.currency)}`}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal para registrar abono */}
      {paymentModalOpen && selectedQuote && (
        <PaymentModal
          quoteId={selectedQuote.id}
          suggestedAmount={suggestedPaymentAmount}
          currency={selectedQuote.currency}
          installments={selectedQuote.amortizationSchedule || []}
          initialInstallmentId={targetedInstallmentId}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={() => {
            void loadData();
            setPaymentModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
