import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  deletePackage,
  getPackage,
  updatePackage,
} from "@/server/travel/packages";

import type { TravelCurrency, TravelDay } from "@/lib/travel/types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const updatePackageSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().optional().nullable(),
  destination: z.string().trim().min(2).optional(),
  originCity: z.string().trim().optional().nullable(),
  departureAirport: z.string().trim().optional().nullable(),
  arrivalAirport: z.string().trim().optional().nullable(),
  flightType: z.enum(["round-trip", "one-way"]).optional().nullable(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  nights: z.number().int().min(0).optional(),
  passengers: z.number().int().min(1).optional(),
  childPassengers: z.number().int().min(0).optional(),
  currency: z.enum(["COP", "USD", "EUR"]).optional() as z.ZodType<TravelCurrency | undefined>,
  exchangeRate: z.number().positive().optional(),
  markupPercentage: z.number().min(0).optional(),
  taxes: z.number().min(0).optional(),
  agencyCommission: z.number().min(0).optional(),
  minimumDeposit: z.number().min(0).optional(),
  administrativeFee: z.number().min(0).optional(),
  medicalAssistance: z.number().min(0).optional(),
  profitability: z.number().min(0).optional(),
  freelanceCommission: z.number().min(0).optional(),
  selectedHotelId: z.string().optional().nullable(),
  days: z.array(z.any()).optional() as z.ZodType<TravelDay[] | undefined>,
  amortizationSchedule: z.array(z.any()).optional().nullable(),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  status: z.enum(["active", "draft", "archived"]).optional(),
});

export const GET = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const pkg = await getPackage(session.organizationId, id);
  if (!pkg) {
    return apiError(404, "not_found", "Paquete turístico no encontrado");
  }
  return Response.json({ package: pkg });
});

export const PATCH = withAuth(async (session, req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, updatePackageSchema);
  if (!body.ok) return body.response;

  try {
    const updated = await updatePackage(session.organizationId, id, body.data);
    if (!updated) {
      return apiError(404, "not_found", "Paquete turístico no encontrado");
    }
    return Response.json({ package: updated });
  } catch (err) {
    console.error("[packages] error al actualizar paquete:", err);
    return apiError(
      500,
      "package_error",
      err instanceof Error ? err.message : "Error al actualizar paquete"
    );
  }
});

export const DELETE = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const ok = await deletePackage(session.organizationId, id);
  if (!ok) {
    return apiError(404, "not_found", "Paquete turístico no encontrado");
  }
  return Response.json({ ok: true });
});
