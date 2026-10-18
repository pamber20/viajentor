import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  createQuote,
  listQuotes,
} from "@/server/travel/quotes";
import type { TravelDay } from "@/lib/travel/types";

export const dynamic = "force-dynamic";

const travelItemSchema = z.object({
  id: z.string(),
  type: z.enum(["Flight", "Hotel", "Activity", "Transfer", "Insurance", "Other"]),
  title: z.string().trim().min(1),
  description: z.string().default(""),
  netPrice: z.number().nonnegative().default(0),
  markup: z.number().default(0),
  totalPrice: z.number().default(0),
  pricePerPerson: z.boolean().optional(),
  netPriceAdult: z.number().optional(),
  netPriceChild: z.number().optional(),
  markupAdult: z.number().optional(),
  markupChild: z.number().optional(),
  pnr: z.string().optional(),
  confirmationNo: z.string().optional(),
  locator: z.string().optional(),
  imageUrl: z.string().optional(),
  provider: z.string().optional(),
  supplierPaymentStatus: z.enum(["pending", "paid"]).optional(),
  supplierPaymentDate: z.string().optional(),
  supplierPaymentMethod: z.string().optional(),
  supplierPaymentReference: z.string().optional(),
  supplierPaymentNotes: z.string().optional(),
  assignedOptions: z.array(z.enum(["A", "B", "C", "Shared"])).optional(),
  flightDetails: z.unknown().optional(),
  hotelDetails: z.unknown().optional(),
  transferDetails: z.unknown().optional(),
});

const travelDaySchema = z.object({
  id: z.string(),
  dayNumber: z.number().int().positive(),
  items: z.array(travelItemSchema),
});

const installmentSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  dueDate: z.string(),
  amount: z.number().nonnegative(),
  status: z.enum(["pending", "paid", "partial"]),
});

const travelerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  idType: z.string(),
  idNumber: z.string(),
  eps: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  originCity: z.string().optional(),
  vaccines: z.string().optional(),
  observations: z.string().optional(),
  birthDate: z.string().optional(),
  type: z.enum(["ADULTO", "NIÑO", "INFANTE"]).optional(),
});

const createQuoteSchema = z.object({
  contactId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  clientName: z.string().trim().min(1, "El nombre del cliente es obligatorio"),
  clientPhone: z.string().trim().optional().nullable(),
  clientEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  originCity: z.string().trim().optional().nullable(),
  destination: z.string().trim().min(1, "El destino es obligatorio"),
  departureAirport: z.string().trim().optional().nullable(),
  arrivalAirport: z.string().trim().optional().nullable(),
  flightType: z.enum(["round-trip", "one-way"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  nights: z.number().int().nonnegative().optional(),
  passengers: z.number().int().positive().default(1),
  childPassengers: z.number().int().nonnegative().default(0),
  childAges: z.string().optional().nullable(),
  rooms: z.number().int().positive().default(1),
  travelReason: z.string().optional().nullable(),
  flexibility: z.string().optional().nullable(),
  preferences: z.record(z.boolean()).optional().nullable(),
  currency: z.enum(["COP", "USD", "EUR"]).default("COP"),
  exchangeRate: z.number().positive().default(1),
  markupPercentage: z.number().nonnegative().default(15),
  taxes: z.number().nonnegative().default(0),
  agencyCommission: z.number().nonnegative().default(0),
  minimumDeposit: z.number().nonnegative().default(0),
  administrativeFee: z.number().nonnegative().default(0),
  medicalAssistance: z.number().nonnegative().default(0),
  profitability: z.number().min(1).max(100).default(75),
  freelanceCommission: z.number().min(0).max(100).default(10),
  validityHours: z.number().int().positive().default(48),
  optionTitles: z.record(z.string()).optional().nullable(),
  isComparisonMode: z.boolean().default(false),
  activeOptionsCount: z.number().int().positive().default(1),
  days: z.array(travelDaySchema).default([]),
  amortizationSchedule: z.array(installmentSchema).optional(),
  travelers: z.array(travelerSchema).optional(),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  bookingConfirmation: z.string().optional().nullable(),
  pnrExpiration: z.string().optional().nullable(),
  billingName: z.string().optional().nullable(),
  billingId: z.string().optional().nullable(),
  counterName: z.string().optional().nullable(),
  advisorName: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
});

export const GET = withAuth(async (session, req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const contactId = url.searchParams.get("contactId") || undefined;
  const leadId = url.searchParams.get("leadId") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const isBookingParam = url.searchParams.get("isBooking");
  const isBooking =
    isBookingParam === "true" ? true : isBookingParam === "false" ? false : undefined;

  const quotes = await listQuotes({
    organizationId: session.organizationId,
    query: q,
    contactId,
    leadId,
    status,
    isBooking,
  });

  return Response.json({ quotes });
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createQuoteSchema);
  if (!body.ok) return body.response;

  try {
    const quote = await createQuote({
      organizationId: session.organizationId,
      assignedUserId: session.userId,
      ...body.data,
      days: (body.data.days ?? []) as unknown as TravelDay[],
      clientEmail: body.data.clientEmail || null,
    });
    return Response.json({ quote }, { status: 201 });
  } catch (err) {
    console.error("[quotes] error al crear cotización:", err);
    return apiError(500, "quote_create_error", "No se pudo crear la cotización");
  }
});
