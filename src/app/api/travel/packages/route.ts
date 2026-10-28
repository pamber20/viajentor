import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { createPackage, listPackages } from "@/server/travel/packages";

import type { TravelCurrency, TravelDay } from "@/lib/travel/types";

export const dynamic = "force-dynamic";

const createPackageSchema = z.object({
  title: z.string().trim().min(2, "El título debe tener al menos 2 caracteres"),
  description: z.string().trim().optional().nullable(),
  destination: z.string().trim().min(2, "El destino es obligatorio"),
  originCity: z.string().trim().optional().nullable(),
  departureAirport: z.string().trim().optional().nullable(),
  arrivalAirport: z.string().trim().optional().nullable(),
  flightType: z.enum(["round-trip", "one-way"]).optional().nullable(),
  startDate: z.string().min(1, "La fecha de salida es obligatoria"),
  endDate: z.string().min(1, "La fecha de regreso es obligatoria"),
  nights: z.number().int().min(0).default(0),
  passengers: z.number().int().min(1).default(2),
  childPassengers: z.number().int().min(0).default(0),
  currency: z.enum(["COP", "USD", "EUR"]).default("COP") as z.ZodType<TravelCurrency>,
  exchangeRate: z.number().positive().default(1),
  markupPercentage: z.number().min(0).default(15),
  taxes: z.number().min(0).default(0),
  agencyCommission: z.number().min(0).default(0),
  minimumDeposit: z.number().min(0).default(0),
  administrativeFee: z.number().min(0).default(0),
  medicalAssistance: z.number().min(0).default(0),
  profitability: z.number().min(0).default(75),
  freelanceCommission: z.number().min(0).default(10),
  selectedHotelId: z.string().optional().nullable(),
  days: z.array(z.any()).min(1, "Debe tener al menos un día de itinerario") as z.ZodType<TravelDay[]>,
  amortizationSchedule: z.array(z.any()).optional().nullable(),
  inclusions: z.string().optional().nullable(),
  exclusions: z.string().optional().nullable(),
  policies: z.string().optional().nullable(),
  status: z.enum(["active", "draft", "archived"]).default("active"),
});

export const GET = withAuth(async (session, req: Request) => {
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? url.searchParams.get("q") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const packages = await listPackages(session.organizationId, { search, status });
  return Response.json(
    { packages, items: packages },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createPackageSchema);
  if (!body.ok) return body.response;

  try {
    const pkg = await createPackage({
      organizationId: session.organizationId,
      ...body.data,
    });
    return Response.json({ package: pkg }, { status: 201 });
  } catch (err) {
    console.error("[packages] error al crear paquete:", err);
    return apiError(
      500,
      "package_error",
      err instanceof Error ? err.message : "Error al crear paquete"
    );
  }
});
