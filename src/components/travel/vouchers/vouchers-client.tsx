"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Ticket,
  Search,
  Plane,
  Hotel,
  Car,
  MapPin,
  ShieldCheck,
  FileDown,
  MessageCircle,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { downloadVoucherPdf } from "@/components/travel/pdf/generator";
import { VoucherEditorPanel } from "@/components/travel/trips/voucher-editor-panel";
import type { TravelQuoteDto } from "@/server/travel/quotes";
import type { TravelVoucherDto, VoucherListItemDto } from "@/server/travel/trips";

export function VouchersClient() {
  const searchParams = useSearchParams();
  const initialQuoteId = searchParams?.get("quoteId") ?? null;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<VoucherListItemDto[]>([]);
  const [metrics, setMetrics] = useState({
    totalIssued: 0,
    upcomingTravel: 0,
    pendingVouchers: 0,
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "pending">("all");

  // Estado para el editor dedicado
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(initialQuoteId);
  const [activeQuote, setActiveQuote] = useState<TravelQuoteDto | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<TravelVoucherDto | null>(null);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [openPdfDropdownId, setOpenPdfDropdownId] = useState<string | null>(null);

  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/travel/vouchers");
      if (!res.ok) throw new Error("Error al obtener vouchers");
      const data = (await res.json()) as {
        items: VoucherListItemDto[];
        metrics: {
          totalIssued: number;
          upcomingTravel: number;
          pendingVouchers: number;
        };
      };
      setItems(data.items ?? []);
      setMetrics(
        data.metrics ?? { totalIssued: 0, upcomingTravel: 0, pendingVouchers: 0 }
      );
    } catch (err) {
      console.error(err);
      toast("No se pudieron cargar los vouchers", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchVouchers();
  }, [fetchVouchers]);

  // Cargar cotización y voucher para el modo editor
  const loadEditorData = useCallback(
    async (quoteId: string) => {
      try {
        setLoadingEditor(true);
        const [quoteRes, voucherRes] = await Promise.all([
          fetch(`/api/travel/quotes/${quoteId}`),
          fetch(`/api/travel/vouchers/${quoteId}`),
        ]);

        if (!quoteRes.ok) throw new Error("Error al cargar la reserva");
        const quoteData = (await quoteRes.json()) as { quote: TravelQuoteDto };
        const voucherData = voucherRes.ok
          ? ((await voucherRes.json()) as { voucher: TravelVoucherDto | null })
          : { voucher: null };

        setActiveQuote(quoteData.quote);
        setActiveVoucher(voucherData.voucher);
      } catch (err) {
        console.error(err);
        toast("No se pudo cargar la información para editar el voucher", "error");
        setActiveQuoteId(null);
      } finally {
        setLoadingEditor(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (activeQuoteId) {
      void loadEditorData(activeQuoteId);
    } else {
      setActiveQuote(null);
      setActiveVoucher(null);
    }
  }, [activeQuoteId, loadEditorData]);

  // Filtrado de items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter === "issued" && !item.hasVoucher) return false;
      if (statusFilter === "pending" && item.hasVoucher) return false;

      if (!q) return true;

      const num = item.voucher?.voucherNumber?.toLowerCase() ?? "";
      const client = item.clientName.toLowerCase();
      const dest = item.destination.toLowerCase();
      const quoteCode = (item.bookingNumber ?? item.quoteNumber).toLowerCase();
      const pnr = (item.voucher?.flightDetails?.pnr ?? "").toLowerCase();

      return (
        num.includes(q) ||
        client.includes(q) ||
        dest.includes(q) ||
        quoteCode.includes(q) ||
        pnr.includes(q)
      );
    });
  }, [items, query, statusFilter]);

  // Descarga rápida de PDF desde la lista
  async function handleQuickDownloadPdf(
    item: VoucherListItemDto,
    mode: "full" | "hotel" | "flight" | "transfers" | "activities" = "full"
  ) {
    if (!item.voucher) {
      toast("Esta reserva aún no tiene voucher emitido. Haz clic en Gestionar para crearlo.", "warning");
      return;
    }

    try {
      setDownloadingId(`${item.quoteId}-${mode}`);
      await downloadVoucherPdf(item.voucher, undefined, mode);
      toast("Voucher descargado correctamente", "success");
    } catch (err) {
      console.error(err);
      toast("Error al generar el PDF del voucher", "error");
    } finally {
      setDownloadingId(null);
      setOpenPdfDropdownId(null);
    }
  }

  // Copiar resumen de WhatsApp
  function handleCopyWhatsApp(item: VoucherListItemDto) {
    const lines = [
      `🎫 *VOUCHER DE SERVICIOS TURÍSTICOS*`,
      item.voucher ? `*Voucher N°:* ${item.voucher.voucherNumber}` : `*Reserva:* ${item.bookingNumber ?? item.quoteNumber}`,
      `*Titular:* ${item.clientName}`,
      `*Destino:* ${item.destination}`,
      `*Fechas:* ${item.startDate ?? "Por confirmar"} a ${item.endDate ?? "Por confirmar"}`,
      `*Pasajeros:* ${item.passengers} adultos${item.childPassengers ? ` + ${item.childPassengers} niños` : ""}`,
      ``,
    ];

    if (item.voucher?.flightDetails?.airline) {
      lines.push(
        `✈️ *Vuelo:* ${item.voucher.flightDetails.airline} (${item.voucher.flightDetails.flightNumber ?? "---"})`,
        `Localizador PNR: ${item.voucher.flightDetails.pnr || "Según reserva"}`,
        `Salida: ${item.voucher.flightDetails.departureCity || ""} ➔ ${item.voucher.flightDetails.arrivalCity || ""} (${item.voucher.flightDetails.departureDate || ""})`,
        ``
      );
    }

    if (item.voucher?.hotelDetails?.name) {
      lines.push(
        `🏨 *Alojamiento:* ${item.voucher.hotelDetails.name}`,
        `Check-In: ${item.voucher.hotelDetails.checkIn || item.startDate || ""} | Check-Out: ${item.voucher.hotelDetails.checkOut || item.endDate || ""}`,
        `Plan: ${item.voucher.hotelDetails.mealPlan || "Estándar"}`,
        ``
      );
    }

    if (item.voucher?.additionalInfo) {
      lines.push(`ℹ️ *Instrucciones:*`, item.voucher.additionalInfo, ``);
    }

    lines.push(`Para asistencia comunicarse a los números de atención de la agencia.`);

    void navigator.clipboard.writeText(lines.join("\n"));
    toast("Información del voucher copiada al portapapeles", "success");
  }

  // Si estamos en modo editor y cargó la cotización
  if (activeQuoteId) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden bg-background">
        {/* Barra superior de retorno */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveQuoteId(null)}
              className="gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Volver a Vouchers</span>
            </Button>
            <div className="h-4 w-px bg-border" />
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {activeVoucher ? `Voucher: ${activeVoucher.voucherNumber}` : "Emitir Nuevo Voucher"}
              </h2>
              <p className="text-xs text-text-3">
                {activeQuote?.clientName} · {activeQuote?.destination} ({activeQuote?.bookingNumber ?? activeQuote?.quoteNumber})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/trips?id=${activeQuoteId}`}
              className="inline-flex items-center gap-1 rounded-sm border px-2.5 py-1.5 text-xs font-semibold text-text-2 hover:bg-accent hover:text-foreground"
            >
              <span>Ver Viaje</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Contenido del editor */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
          {loadingEditor || !activeQuote ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-text-2">
                <Loader2 className="h-5 w-5 animate-spin text-brand" />
                <span>Cargando datos del voucher y reserva...</span>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl">
              <VoucherEditorPanel
                quote={activeQuote}
                initialVoucher={activeVoucher}
                onSaved={(savedVoucher) => {
                  setActiveVoucher(savedVoucher);
                  toast("Voucher guardado con éxito", "success");
                  void fetchVouchers();
                }}
                onDownloadPdf={() => {
                  if (activeVoucher) {
                    void downloadVoucherPdf(activeVoucher);
                  }
                }}
                onCopyWhatsApp={() => {
                  if (activeQuote) {
                    const mockItem: VoucherListItemDto = {
                      voucher: activeVoucher,
                      quoteId: activeQuote.id,
                      quoteNumber: activeQuote.quoteNumber,
                      bookingNumber: activeQuote.bookingNumber,
                      destination: activeQuote.destination,
                      startDate: activeQuote.startDate,
                      endDate: activeQuote.endDate,
                      clientName: activeQuote.clientName,
                      clientPhone: activeQuote.clientPhone,
                      clientEmail: activeQuote.clientEmail,
                      passengers: activeQuote.passengers,
                      childPassengers: activeQuote.childPassengers,
                      totalPrice: activeQuote.totals?.finalTotal ?? 0,
                      currency: activeQuote.currency,
                      status: activeQuote.bookingStatus ?? activeQuote.status,
                      hasVoucher: Boolean(activeVoucher),
                      services: {
                        hasFlight: Boolean(activeVoucher?.flightDetails?.airline),
                        hasHotel: Boolean(activeVoucher?.hotelDetails?.name),
                        hasTransfers: Boolean((activeVoucher?.transfers?.length ?? 0) > 0),
                        hasActivities: Boolean((activeVoucher?.activities?.length ?? 0) > 0),
                        hasAssistance: Boolean(activeVoucher?.assistanceInfo?.provider),
                      },
                    };
                    handleCopyWhatsApp(mockItem);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Encabezado Principal */}
      <div className="border-b bg-card px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-soft text-brand-text">
                <Ticket className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                Vouchers de Servicios
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-3">
              Emisión, consulta y descarga de vouchers para pasajeros y prestadores de servicios turísticos.
            </p>
          </div>
        </div>

        {/* Tarjetas de Métricas (KPIs) */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-md border bg-subtle/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Vouchers Emitidos
              </p>
              <p className="text-xl font-bold text-foreground">
                {metrics.totalIssued}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border bg-subtle/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning-text">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Salidas Próximas (15d)
              </p>
              <p className="text-xl font-bold text-foreground">
                {metrics.upcomingTravel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border bg-subtle/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-text-2">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
                Pendientes de Emisión
              </p>
              <p className="text-xl font-bold text-foreground">
                {metrics.pendingVouchers}
              </p>
            </div>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-3" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por voucher (VCH-...), pasajero, destino o PNR..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1 rounded-md border bg-subtle/60 p-0.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-text-3 hover:text-foreground"
              )}
            >
              Todos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("issued")}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === "issued"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-text-3 hover:text-foreground"
              )}
            >
              Emitidos ({metrics.totalIssued})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("pending")}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-semibold transition-colors",
                statusFilter === "pending"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-text-3 hover:text-foreground"
              )}
            >
              Pendientes ({metrics.pendingVouchers})
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Vouchers */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-text-2">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span>Cargando directorio de vouchers...</span>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
            <Ticket className="h-10 w-10 text-text-3 opacity-40" />
            <h3 className="mt-3 text-sm font-bold text-foreground">
              No se encontraron vouchers
            </h3>
            <p className="mt-1 max-w-sm text-xs text-text-3">
              {query
                ? "No hay resultados para el término de búsqueda actual."
                : statusFilter === "pending"
                ? "¡Excelente! Todas las reservas confirmadas cuentan con voucher emitido."
                : "Aún no se han emitido vouchers en esta agencia."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const isPdfOpen = openPdfDropdownId === item.quoteId;
              const isDownloading = downloadingId?.startsWith(item.quoteId);

              return (
                <div
                  key={item.quoteId}
                  className={cn(
                    "relative flex flex-col justify-between gap-4 rounded-md border bg-card p-4 transition-shadow hover:shadow-xs md:flex-row md:items-center",
                    item.hasVoucher ? "border-border" : "border-dashed border-border-strong bg-subtle/20"
                  )}
                >
                  {/* Columna Principal: Código, Destino y Cliente */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.hasVoucher ? (
                        <span className="inline-flex items-center gap-1 rounded bg-brand-soft px-2 py-0.5 font-mono text-xs font-bold text-brand-text">
                          <Ticket className="h-3.5 w-3.5" />
                          {item.voucher?.voucherNumber}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-xs font-bold text-text-3">
                          <AlertCircle className="h-3.5 w-3.5" />
                          Pendiente de emisión
                        </span>
                      )}

                      <span className="text-xs text-text-3">·</span>
                      <span className="text-xs font-semibold text-text-2">
                        Reserva: {item.bookingNumber ?? item.quoteNumber}
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-bold text-foreground">
                        {item.destination}
                      </h4>
                      <span className="text-xs text-text-3">|</span>
                      <span className="flex items-center gap-1 text-xs text-text-2">
                        <Users className="h-3.5 w-3.5 text-text-3" />
                        <strong className="text-foreground">{item.clientName}</strong>
                        <span>({item.passengers} adultos{item.childPassengers ? ` + ${item.childPassengers} niños` : ""})</span>
                      </span>
                    </div>

                    {/* Fechas y Servicios */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-text-3" />
                        {item.startDate ?? "Sin fecha"} a {item.endDate ?? "Sin fecha"}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {item.services.hasFlight && (
                          <span
                            title="Incluye Vuelo"
                            className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            <Plane className="h-3 w-3 text-brand" />
                            Vuelo
                          </span>
                        )}
                        {item.services.hasHotel && (
                          <span
                            title="Incluye Alojamiento"
                            className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            <Hotel className="h-3 w-3 text-emerald-600" />
                            Hotel
                          </span>
                        )}
                        {item.services.hasTransfers && (
                          <span
                            title="Incluye Traslados"
                            className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            <Car className="h-3 w-3 text-amber-600" />
                            Traslados
                          </span>
                        )}
                        {item.services.hasActivities && (
                          <span
                            title="Incluye Actividades / Tours"
                            className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            <MapPin className="h-3 w-3 text-purple-600" />
                            Tours
                          </span>
                        )}
                        {item.services.hasAssistance && (
                          <span
                            title="Incluye Asistencia Médica"
                            className="inline-flex items-center gap-1 rounded bg-subtle px-1.5 py-0.5 text-[11px] font-medium text-foreground"
                          >
                            <ShieldCheck className="h-3 w-3 text-blue-600" />
                            Asistencia
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* Botón WhatsApp */}
                    <button
                      type="button"
                      onClick={() => handleCopyWhatsApp(item)}
                      title="Copiar texto formateado para WhatsApp"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-sm border bg-card text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>

                    {/* Menú Desplegable de Descarga PDF */}
                    {item.hasVoucher && (
                      <div className="relative">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isDownloading}
                          onClick={() =>
                            setOpenPdfDropdownId(isPdfOpen ? null : item.quoteId)
                          }
                          className="gap-1.5"
                        >
                          {isDownloading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-brand" />
                          ) : (
                            <FileDown className="h-4 w-4" />
                          )}
                          <span>Descargar PDF</span>
                          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                        </Button>

                        {isPdfOpen && (
                          <div className="absolute right-0 z-30 mt-1 w-52 rounded-md border bg-card p-1 shadow-pop">
                            <button
                              type="button"
                              onClick={() => handleQuickDownloadPdf(item, "full")}
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-accent"
                            >
                              <FileDown className="h-3.5 w-3.5 text-brand" />
                              <span>Voucher Completo</span>
                            </button>
                            <div className="my-1 border-t" />
                            <button
                              type="button"
                              onClick={() => handleQuickDownloadPdf(item, "hotel")}
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-2 hover:bg-accent hover:text-foreground"
                            >
                              <Hotel className="h-3.5 w-3.5 text-emerald-600" />
                              <span>Solo Alojamiento</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickDownloadPdf(item, "flight")}
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-2 hover:bg-accent hover:text-foreground"
                            >
                              <Plane className="h-3.5 w-3.5 text-brand" />
                              <span>Solo Vuelos</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickDownloadPdf(item, "transfers")}
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-2 hover:bg-accent hover:text-foreground"
                            >
                              <Car className="h-3.5 w-3.5 text-amber-600" />
                              <span>Solo Traslados</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickDownloadPdf(item, "activities")}
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-text-2 hover:bg-accent hover:text-foreground"
                            >
                              <MapPin className="h-3.5 w-3.5 text-purple-600" />
                              <span>Solo Tours / Actividades</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Botón Principal: Gestionar / Emitir */}
                    <Button
                      size="sm"
                      onClick={() => setActiveQuoteId(item.quoteId)}
                      className={cn(
                        "gap-1.5",
                        !item.hasVoucher && "bg-brand text-brand-fg hover:opacity-90"
                      )}
                    >
                      <Ticket className="h-4 w-4" />
                      <span>{item.hasVoucher ? "Editar Voucher" : "Emitir Voucher"}</span>
                    </Button>

                    {/* Enlace al Viaje */}
                    <Link
                      href={`/trips?id=${item.quoteId}`}
                      title="Ver viaje en sección Viajes"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-sm border bg-card text-text-3 hover:bg-accent hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
