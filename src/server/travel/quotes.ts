import { desc, eq, or, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { normalizeText } from "@/lib/search";
import { calculateDetailedQuoteTotals } from "@/lib/travel/pricing";
import type {
  BookingStatus,
  QuoteStatus,
  TravelCurrency,
  TravelDay,
  TravelInstallment,
  Traveler,
} from "@/lib/travel/types";
import { moveLeadToStage } from "@/server/leads/stage-history";

const UNACCENT_FROM = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ";
const UNACCENT_TO = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC";

type QuoteRow = typeof schema.travelQuote.$inferSelect;

export interface TravelQuoteDto {
  id: string;
  organizationId: string;
  contactId: string | null;
  leadId: string | null;
  assignedUserId: string | null;
  quoteNumber: string;
  bookingNumber: string | null;
  selectedHotelId: string | null;
  isBooking: boolean;
  status: QuoteStatus;
  bookingStatus: BookingStatus | null;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  originCity: string | null;
  destination: string;
  departureAirport: string | null;
  arrivalAirport: string | null;
  flightType: "round-trip" | "one-way" | null;
  startDate: string | null;
  endDate: string | null;
  nights: number;
  passengers: number;
  childPassengers: number;
  childAges: string | null;
  rooms: number;
  travelReason: string | null;
  flexibility: string | null;
  preferences: Record<string, boolean> | null;
  currency: TravelCurrency;
  exchangeRate: number;
  markupPercentage: number;
  taxes: number;
  agencyCommission: number;
  minimumDeposit: number;
  administrativeFee: number;
  medicalAssistance: number;
  profitability: number;
  freelanceCommission: number;
  validityHours: number;
  optionTitles: Record<string, string> | null;
  isComparisonMode: boolean;
  activeOptionsCount: number;
  days: TravelDay[];
  amortizationSchedule: TravelInstallment[];
  travelers: Traveler[];
  inclusions: string | null;
  exclusions: string | null;
  policies: string | null;
  bookingConfirmation: string | null;
  pnrExpiration: string | null;
  billingName: string | null;
  billingId: string | null;
  counterName: string | null;
  advisorName: string | null;
  observations: string | null;
  quoteDate: string | null;
  totals: ReturnType<typeof calculateDetailedQuoteTotals>;
  createdAt: string;
  updatedAt: string;
}

export function serializeQuote(row: QuoteRow): TravelQuoteDto {
  const days = (row.days ?? []) as TravelDay[];
  const exchangeRate = row.exchangeRate ?? 1;
  const markupPercentage = row.markupPercentage ?? 15;
  const taxes = row.taxes ?? 0;
  const administrativeFee = row.administrativeFee ?? 0;
  const medicalAssistance = row.medicalAssistance ?? 0;
  const agencyCommission = row.agencyCommission ?? 0;
  const profitability = row.profitability ?? 75;
  const freelanceCommission = row.freelanceCommission ?? 10;
  const passengers = row.passengers ?? 1;

  const totals = calculateDetailedQuoteTotals({
    passengers,
    childPassengers: row.childPassengers ?? 0,
    currency: row.currency ?? "COP",
    markupPercentage,
    taxes,
    agencyCommission,
    administrativeFee,
    profitability,
    days,
  });

  return {
    id: row.id,
    organizationId: row.organizationId,
    contactId: row.contactId,
    leadId: row.leadId,
    assignedUserId: row.assignedUserId,
    quoteNumber: row.quoteNumber,
    bookingNumber: row.bookingNumber,
    selectedHotelId: row.selectedHotelId ?? null,
    isBooking: row.isBooking,
    status: row.status as QuoteStatus,
    bookingStatus: (row.bookingStatus as BookingStatus) ?? null,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    clientEmail: row.clientEmail,
    originCity: row.originCity,
    destination: row.destination,
    departureAirport: row.departureAirport,
    arrivalAirport: row.arrivalAirport,
    flightType: (row.flightType as "round-trip" | "one-way") ?? "round-trip",
    startDate: row.startDate,
    endDate: row.endDate,
    nights: row.nights ?? 0,
    passengers,
    childPassengers: row.childPassengers ?? 0,
    childAges: row.childAges,
    rooms: row.rooms ?? 1,
    travelReason: row.travelReason,
    flexibility: row.flexibility,
    preferences: row.preferences,
    currency: (row.currency as TravelCurrency) ?? "COP",
    exchangeRate,
    markupPercentage,
    taxes,
    agencyCommission,
    minimumDeposit: row.minimumDeposit ?? 0,
    administrativeFee,
    medicalAssistance,
    profitability,
    freelanceCommission,
    validityHours: row.validityHours ?? 48,
    optionTitles: row.optionTitles,
    isComparisonMode: !!row.isComparisonMode,
    activeOptionsCount: row.activeOptionsCount ?? 1,
    days,
    amortizationSchedule: (row.amortizationSchedule ?? []) as TravelInstallment[],
    travelers: (row.travelers ?? []) as Traveler[],
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    policies: row.policies,
    bookingConfirmation: row.bookingConfirmation,
    pnrExpiration: row.pnrExpiration,
    billingName: row.billingName,
    billingId: row.billingId,
    counterName: row.counterName,
    advisorName: row.advisorName,
    observations: row.observations,
    quoteDate: row.quoteDate ?? null,
    totals,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function generateQuoteNumber(organizationId: string): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.travelQuote)
    .where(scoped(schema.travelQuote.organizationId, organizationId));

  const seq = String((result?.count ?? 0) + 1).padStart(4, "0");
  return `COT-${year}-${seq}`;
}

export async function generateBookingNumber(organizationId: string): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.travelQuote)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        organizationId,
        eq(schema.travelQuote.isBooking, true)
      )
    );

  const seq = String((result?.count ?? 0) + 1).padStart(4, "0");
  return `RES-${year}-${seq}`;
}

export async function listQuotes(input: {
  organizationId: string;
  isBooking?: boolean;
  contactId?: string;
  leadId?: string;
  status?: string;
  query?: string;
  limit?: number;
}): Promise<TravelQuoteDto[]> {
  const db = getDb();
  const q = input.query?.trim();

  let searchCondition = undefined;
  if (q && q.length > 0) {
    const qLike = normalizeText(q).replace(/[\\%_]/g, "\\$&");
    searchCondition = or(
      sql`lower(translate(${schema.travelQuote.clientName}, ${UNACCENT_FROM}, ${UNACCENT_TO}))
        like ${`%${qLike}%`}`,
      sql`lower(translate(${schema.travelQuote.destination}, ${UNACCENT_FROM}, ${UNACCENT_TO}))
        like ${`%${qLike}%`}`,
      sql`lower(${schema.travelQuote.quoteNumber}) like ${`%${qLike.toLowerCase()}%`}`,
      sql`lower(coalesce(${schema.travelQuote.bookingNumber}, '')) like ${`%${qLike.toLowerCase()}%`}`
    );
  }

  const bookingCondition =
    input.isBooking !== undefined
      ? eq(schema.travelQuote.isBooking, input.isBooking)
      : undefined;

  const contactCondition = input.contactId
    ? eq(schema.travelQuote.contactId, input.contactId)
    : undefined;

  const leadCondition = input.leadId
    ? eq(schema.travelQuote.leadId, input.leadId)
    : undefined;

  const statusCondition =
    input.status && input.status !== "all"
      ? eq(schema.travelQuote.status, input.status as QuoteStatus)
      : undefined;

  const rows = await db
    .select()
    .from(schema.travelQuote)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        input.organizationId,
        searchCondition,
        bookingCondition,
        contactCondition,
        leadCondition,
        statusCondition
      )
    )
    .orderBy(desc(schema.travelQuote.createdAt))
    .limit(input.limit ?? 200);

  return rows.map(serializeQuote);
}

export async function getQuote(input: {
  organizationId: string;
  id: string;
}): Promise<TravelQuoteDto | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.travelQuote)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        input.organizationId,
        eq(schema.travelQuote.id, input.id)
      )
    )
    .limit(1);

  if (!rows[0]) return null;
  return serializeQuote(rows[0]);
}

export type CreateQuoteInput = {
  organizationId: string;
  contactId?: string | null;
  leadId?: string | null;
  assignedUserId?: string | null;
  clientName: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  originCity?: string | null;
  destination: string;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  flightType?: "round-trip" | "one-way";
  startDate?: string | null;
  endDate?: string | null;
  nights?: number;
  passengers?: number;
  childPassengers?: number;
  childAges?: string | null;
  rooms?: number;
  travelReason?: string | null;
  flexibility?: string | null;
  preferences?: Record<string, boolean> | null;
  currency?: TravelCurrency;
  exchangeRate?: number;
  markupPercentage?: number;
  taxes?: number;
  agencyCommission?: number;
  minimumDeposit?: number;
  administrativeFee?: number;
  medicalAssistance?: number;
  profitability?: number;
  freelanceCommission?: number;
  validityHours?: number;
  optionTitles?: Record<string, string> | null;
  selectedHotelId?: string | null;
  isComparisonMode?: boolean;
  activeOptionsCount?: number;
  days: TravelDay[];
  amortizationSchedule?: TravelInstallment[];
  travelers?: Traveler[];
  inclusions?: string | null;
  exclusions?: string | null;
  policies?: string | null;
  bookingConfirmation?: string | null;
  pnrExpiration?: string | null;
  billingName?: string | null;
  billingId?: string | null;
  counterName?: string | null;
  advisorName?: string | null;
  observations?: string | null;
  quoteDate?: string | null;
};

export async function createQuote(input: CreateQuoteInput): Promise<TravelQuoteDto> {
  const db = getDb();
  const id = newId("travelQuote");
  const quoteNumber = await generateQuoteNumber(input.organizationId);

  // Si viene contactId pero no leadId, buscar el lead activo del contacto para asociarlo automáticamente
  let resolvedLeadId = input.leadId;
  if (!resolvedLeadId && input.contactId) {
    const activeLead = await db
      .select({ id: schema.lead.id })
      .from(schema.lead)
      .where(
        scoped(
          schema.lead.organizationId,
          input.organizationId,
          eq(schema.lead.contactId, input.contactId)
        )
      )
      .orderBy(desc(schema.lead.createdAt))
      .limit(1);

    if (activeLead[0]) {
      resolvedLeadId = activeLead[0].id;
    }
  }

  const [inserted] = await db
    .insert(schema.travelQuote)
    .values({
      id,
      organizationId: input.organizationId,
      contactId: input.contactId ?? null,
      leadId: resolvedLeadId ?? null,
      assignedUserId: input.assignedUserId ?? null,
      quoteNumber,
      isBooking: false,
      status: "draft",
      clientName: input.clientName.trim(),
      clientPhone: input.clientPhone?.trim() ?? null,
      clientEmail: input.clientEmail?.trim() ?? null,
      originCity: input.originCity?.trim() ?? null,
      destination: input.destination.trim(),
      departureAirport: input.departureAirport?.trim() ?? null,
      arrivalAirport: input.arrivalAirport?.trim() ?? null,
      flightType: input.flightType ?? "round-trip",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      nights: input.nights ?? 0,
      passengers: input.passengers ?? 1,
      childPassengers: input.childPassengers ?? 0,
      childAges: input.childAges?.trim() ?? null,
      rooms: input.rooms ?? 1,
      travelReason: input.travelReason?.trim() ?? null,
      flexibility: input.flexibility?.trim() ?? null,
      preferences: input.preferences ?? null,
      currency: input.currency ?? "COP",
      exchangeRate: input.exchangeRate ?? 1,
      markupPercentage: input.markupPercentage ?? 15,
      taxes: input.taxes ?? 0,
      agencyCommission: input.agencyCommission ?? 0,
      minimumDeposit: input.minimumDeposit ?? 0,
      administrativeFee: input.administrativeFee ?? 0,
      medicalAssistance: input.medicalAssistance ?? 0,
      profitability: input.profitability ?? 75,
      freelanceCommission: input.freelanceCommission ?? 10,
      validityHours: input.validityHours ?? 48,
      optionTitles: input.optionTitles ?? null,
      selectedHotelId: input.selectedHotelId ?? null,
      isComparisonMode: input.isComparisonMode ?? false,
      activeOptionsCount: input.activeOptionsCount ?? 1,
      days: input.days,
      amortizationSchedule: input.amortizationSchedule ?? [],
      travelers: input.travelers ?? [],
      inclusions: input.inclusions ?? null,
      exclusions: input.exclusions ?? null,
      policies: input.policies ?? null,
      bookingConfirmation: input.bookingConfirmation ?? null,
      pnrExpiration: input.pnrExpiration ?? null,
      billingName: input.billingName ?? null,
      billingId: input.billingId ?? null,
      counterName: input.counterName ?? null,
      advisorName: input.advisorName ?? null,
      observations: input.observations ?? null,
      quoteDate: input.quoteDate?.trim() ?? null,
    })
    .returning();

  if (!inserted) {
    throw new Error("No se pudo crear la cotización");
  }

  return serializeQuote(inserted);
}

export type UpdateQuoteInput = {
  organizationId: string;
  id: string;
  contactId?: string | null;
  leadId?: string | null;
  assignedUserId?: string | null;
  status?: QuoteStatus;
  bookingStatus?: BookingStatus | null;
  clientName?: string;
  clientPhone?: string | null;
  clientEmail?: string | null;
  originCity?: string | null;
  destination?: string;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  flightType?: "round-trip" | "one-way";
  startDate?: string | null;
  endDate?: string | null;
  nights?: number;
  passengers?: number;
  childPassengers?: number;
  childAges?: string | null;
  rooms?: number;
  travelReason?: string | null;
  flexibility?: string | null;
  preferences?: Record<string, boolean> | null;
  currency?: TravelCurrency;
  exchangeRate?: number;
  markupPercentage?: number;
  taxes?: number;
  agencyCommission?: number;
  minimumDeposit?: number;
  administrativeFee?: number;
  medicalAssistance?: number;
  profitability?: number;
  freelanceCommission?: number;
  validityHours?: number;
  optionTitles?: Record<string, string> | null;
  selectedHotelId?: string | null;
  isComparisonMode?: boolean;
  activeOptionsCount?: number;
  days?: TravelDay[];
  amortizationSchedule?: TravelInstallment[];
  travelers?: Traveler[];
  inclusions?: string | null;
  exclusions?: string | null;
  policies?: string | null;
  bookingConfirmation?: string | null;
  pnrExpiration?: string | null;
  billingName?: string | null;
  billingId?: string | null;
  counterName?: string | null;
  advisorName?: string | null;
  observations?: string | null;
  quoteDate?: string | null;
};

export async function updateQuote(input: UpdateQuoteInput): Promise<TravelQuoteDto | null> {
  const db = getDb();

  const patch: Partial<typeof schema.travelQuote.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.contactId !== undefined) patch.contactId = input.contactId;
  if (input.leadId !== undefined) patch.leadId = input.leadId;
  if (input.assignedUserId !== undefined) patch.assignedUserId = input.assignedUserId;
  if (input.status !== undefined) patch.status = input.status;
  if (input.bookingStatus !== undefined) patch.bookingStatus = input.bookingStatus;
  if (input.clientName !== undefined) patch.clientName = input.clientName.trim();
  if (input.clientPhone !== undefined) patch.clientPhone = input.clientPhone?.trim() ?? null;
  if (input.clientEmail !== undefined) patch.clientEmail = input.clientEmail?.trim() ?? null;
  if (input.originCity !== undefined) patch.originCity = input.originCity?.trim() ?? null;
  if (input.destination !== undefined) patch.destination = input.destination.trim();
  if (input.departureAirport !== undefined) patch.departureAirport = input.departureAirport?.trim() ?? null;
  if (input.arrivalAirport !== undefined) patch.arrivalAirport = input.arrivalAirport?.trim() ?? null;
  if (input.flightType !== undefined) patch.flightType = input.flightType;
  if (input.startDate !== undefined) patch.startDate = input.startDate;
  if (input.endDate !== undefined) patch.endDate = input.endDate;
  if (input.nights !== undefined) patch.nights = input.nights;
  if (input.passengers !== undefined) patch.passengers = input.passengers;
  if (input.childPassengers !== undefined) patch.childPassengers = input.childPassengers;
  if (input.childAges !== undefined) patch.childAges = input.childAges?.trim() ?? null;
  if (input.rooms !== undefined) patch.rooms = input.rooms;
  if (input.travelReason !== undefined) patch.travelReason = input.travelReason?.trim() ?? null;
  if (input.flexibility !== undefined) patch.flexibility = input.flexibility?.trim() ?? null;
  if (input.preferences !== undefined) patch.preferences = input.preferences;
  if (input.currency !== undefined) patch.currency = input.currency;
  if (input.exchangeRate !== undefined) patch.exchangeRate = input.exchangeRate;
  if (input.markupPercentage !== undefined) patch.markupPercentage = input.markupPercentage;
  if (input.taxes !== undefined) patch.taxes = input.taxes;
  if (input.agencyCommission !== undefined) patch.agencyCommission = input.agencyCommission;
  if (input.minimumDeposit !== undefined) patch.minimumDeposit = input.minimumDeposit;
  if (input.administrativeFee !== undefined) patch.administrativeFee = input.administrativeFee;
  if (input.medicalAssistance !== undefined) patch.medicalAssistance = input.medicalAssistance;
  if (input.profitability !== undefined) patch.profitability = input.profitability;
  if (input.freelanceCommission !== undefined) patch.freelanceCommission = input.freelanceCommission;
  if (input.validityHours !== undefined) patch.validityHours = input.validityHours;
  if (input.optionTitles !== undefined) patch.optionTitles = input.optionTitles;
  if (input.selectedHotelId !== undefined) patch.selectedHotelId = input.selectedHotelId;
  if (input.isComparisonMode !== undefined) patch.isComparisonMode = input.isComparisonMode;
  if (input.activeOptionsCount !== undefined) patch.activeOptionsCount = input.activeOptionsCount;
  if (input.days !== undefined) patch.days = input.days;
  if (input.amortizationSchedule !== undefined) patch.amortizationSchedule = input.amortizationSchedule;
  if (input.travelers !== undefined) patch.travelers = input.travelers;
  if (input.inclusions !== undefined) patch.inclusions = input.inclusions;
  if (input.exclusions !== undefined) patch.exclusions = input.exclusions;
  if (input.policies !== undefined) patch.policies = input.policies;
  if (input.bookingConfirmation !== undefined) patch.bookingConfirmation = input.bookingConfirmation;
  if (input.pnrExpiration !== undefined) patch.pnrExpiration = input.pnrExpiration;
  if (input.billingName !== undefined) patch.billingName = input.billingName;
  if (input.billingId !== undefined) patch.billingId = input.billingId;
  if (input.counterName !== undefined) patch.counterName = input.counterName;
  if (input.advisorName !== undefined) patch.advisorName = input.advisorName;
  if (input.observations !== undefined) patch.observations = input.observations;
  if (input.quoteDate !== undefined) patch.quoteDate = input.quoteDate ? input.quoteDate.trim() : null;

  const [updated] = await db
    .update(schema.travelQuote)
    .set(patch)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        input.organizationId,
        eq(schema.travelQuote.id, input.id)
      )
    )
    .returning();

  if (!updated) return null;
  return serializeQuote(updated);
}

export async function deleteQuote(input: {
  organizationId: string;
  id: string;
}): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.travelQuote)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        input.organizationId,
        eq(schema.travelQuote.id, input.id)
      )
    )
    .returning({ id: schema.travelQuote.id });

  return deleted.length > 0;
}

/**
 * Convierte una cotización en Reserva turística (isBooking = true).
 * Invariante de negocio:
 * 1. Genera número de reserva `bookingNumber` (RES-YYYY-XXXX).
 * 2. Si la cotización tiene un `leadId` asociado, busca la etapa 'won' del embudo
 *    y mueve el lead usando `moveLeadToStage`, fijando además el `amountCents` en el lead.
 */
export async function convertQuoteToBooking(input: {
  organizationId: string;
  quoteId: string;
  selectedHotelId?: string | null;
  selectedOption?: "A" | "B" | "C" | null;
  actorUserId?: string | null;
  notes?: string | null;
}): Promise<{ quote: TravelQuoteDto; leadMoved: boolean }> {
  const db = getDb();
  const quote = await getQuote({
    organizationId: input.organizationId,
    id: input.quoteId,
  });

  if (!quote) {
    throw new Error("Cotización no encontrada");
  }

  const selectedOpt = input.selectedOption || "A";
  let finalWinningTotal = quote.totals.finalTotal;

  // 1. Filtrar por Opción Comparativa (A, B o C) si aplica
  let filteredDays = quote.days.map((day) => ({
    ...day,
    items: day.items.filter((item) => {
      // Ítems compartidos o sin asignación específica aplican a todas las opciones
      if (
        !item.assignedOptions ||
        item.assignedOptions.length === 0 ||
        item.assignedOptions.includes("Shared")
      ) {
        return true;
      }
      // Ítems exclusivos de la opción seleccionada
      return item.assignedOptions.includes(selectedOpt);
    }),
  }));

  // Si la cotización tiene desglose por opciones, tomar el total de la opción ganadora
  const optionTotal = quote.totals?.options?.[selectedOpt]?.total;
  if (optionTotal && optionTotal > 0) {
    finalWinningTotal = optionTotal;
  }

  // 2. Filtrar por Hotel seleccionado si hay opciones de hotel
  const allHotels = filteredDays.flatMap((d) => d.items).filter((i) => i.type === "Hotel");
  const hotelToKeep = input.selectedHotelId || allHotels[0]?.id || null;

  if (hotelToKeep && allHotels.length > 1) {
    filteredDays = filteredDays.map((day) => ({
      ...day,
      items: day.items.filter((item) => item.type !== "Hotel" || item.id === hotelToKeep),
    }));

    const matchedHotel = quote.totals.byHotel?.find((h) => h.hotelId === hotelToKeep);
    if (matchedHotel) {
      finalWinningTotal = matchedHotel.total;
    }
  }

  const updatedDays = filteredDays;
  const bookingNumber = quote.bookingNumber ?? (await generateBookingNumber(input.organizationId));

  const [updated] = await db
    .update(schema.travelQuote)
    .set({
      isBooking: true,
      bookingNumber,
      selectedHotelId: hotelToKeep,
      isComparisonMode: false,
      activeOptionsCount: 1,
      days: updatedDays,
      status: "accepted",
      bookingStatus: "confirmed",
      observations: input.notes
        ? `${quote.observations ?? ""}\n[Reserva confirmada]: ${input.notes}`.trim()
        : quote.observations,
      updatedAt: new Date(),
    })
    .where(
      scoped(
        schema.travelQuote.organizationId,
        input.organizationId,
        eq(schema.travelQuote.id, input.quoteId)
      )
    )
    .returning();

  if (!updated) {
    throw new Error("Error al convertir cotización en reserva");
  }

  let leadMoved = false;

  // Si tiene un lead asociado, moverlo a la etapa de cierre / ganado (won)
  if (quote.leadId) {
    const wonStages = await db
      .select({ id: schema.pipelineStage.id })
      .from(schema.pipelineStage)
      .where(
        scoped(
          schema.pipelineStage.organizationId,
          input.organizationId,
          eq(schema.pipelineStage.kind, "won")
        )
      )
      .limit(1);

    if (wonStages[0]) {
      // Monto total en centavos para el CRM (COP o USD a centavos)
      const amountCents = Math.round(finalWinningTotal * 100);

      const moveRes = await moveLeadToStage({
        organizationId: input.organizationId,
        leadId: quote.leadId,
        toStageId: wonStages[0].id,
        actorUserId: input.actorUserId ?? null,
        source: "dueno",
        extra: {
          amountCents,
        },
      });

      leadMoved = moveRes.ok;
    }
  }

  return {
    quote: serializeQuote(updated),
    leadMoved,
  };
}
