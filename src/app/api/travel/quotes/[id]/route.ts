import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  deleteQuote,
  getQuote,
  updateQuote,
} from "@/server/travel/quotes";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const updateQuoteSchema = z.object({
  contactId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  assignedUserId: z.string().optional().nullable(),
  status: z
    .enum(["draft", "sent", "viewed", "accepted", "rejected", "expired", "completed"])
    .optional(),
  bookingStatus: z
    .enum(["pending", "confirmed", "emitted", "operating", "completed", "cancelled"])
    .optional()
    .nullable(),
  clientName: z.string().trim().min(1).optional(),
  clientPhone: z.string().trim().optional().nullable(),
  clientEmail: z.string().trim().email().optional().nullable().or(z.literal("")),
  originCity: z.string().trim().optional().nullable(),
  destination: z.string().trim().min(1).optional(),
  departureAirport: z.string().trim().optional().nullable(),
  arrivalAirport: z.string().trim().optional().nullable(),
  flightType: z.enum(["round-trip", "one-way"]).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  nights: z.number().int().nonnegative().optional(),
  passengers: z.number().int().positive().optional(),
  childPassengers: z.number().int().nonnegative().optional(),
  childAges: z.string().optional().nullable(),
  rooms: z.number().int().positive().optional(),
  travelReason: z.string().optional().nullable(),
  flexibility: z.string().optional().nullable(),
  preferences: z.record(z.boolean()).optional().nullable(),
  currency: z.enum(["COP", "USD", "EUR"]).optional(),
  exchangeRate: z.number().positive().optional(),
  markupPercentage: z.number().nonnegative().optional(),
  taxes: z.number().nonnegative().optional(),
  agencyCommission: z.number().nonnegative().optional(),
  minimumDeposit: z.number().nonnegative().optional(),
  administrativeFee: z.number().nonnegative().optional(),
  medicalAssistance: z.number().nonnegative().optional(),
  profitability: z.number().min(1).max(100).optional(),
  freelanceCommission: z.number().min(0).max(100).optional(),
  validityHours: z.number().int().positive().optional(),
  optionTitles: z.record(z.string()).optional().nullable(),
  isComparisonMode: z.boolean().optional(),
  activeOptionsCount: z.number().int().positive().optional(),
  days: z.array(z.any()).optional(),
  amortizationSchedule: z.array(z.any()).optional(),
  travelers: z.array(z.any()).optional(),
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

export const GET = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const quote = await getQuote({
    organizationId: session.organizationId,
    id,
  });

  if (!quote) {
    return apiError(404, "not_found", "Cotización no encontrada");
  }

  return Response.json({ quote });
});

export const PATCH = withAuth(async (session, req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, updateQuoteSchema);
  if (!body.ok) return body.response;

  const updated = await updateQuote({
    organizationId: session.organizationId,
    id,
    ...body.data,
    clientEmail: body.data.clientEmail || null,
  });

  if (!updated) {
    return apiError(404, "not_found", "Cotización no encontrada");
  }

  return Response.json({ quote: updated });
});

export const DELETE = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const ok = await deleteQuote({
    organizationId: session.organizationId,
    id,
  });

  if (!ok) {
    return apiError(404, "not_found", "Cotización no encontrada");
  }

  return Response.json({ success: true });
});
