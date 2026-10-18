import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  createSupplier,
  listSuppliers,
} from "@/server/travel/suppliers";
import type { TravelSupplierType } from "@/lib/travel/types";

export const dynamic = "force-dynamic";

const supplierTypeEnum = z.enum([
  "hotel",
  "airline",
  "operator",
  "transport",
  "insurance",
  "other",
]);

const createSupplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre del proveedor es obligatorio").max(160),
  type: supplierTypeEnum,
  contact: z
    .object({
      name: z.string().trim().optional(),
      email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
      phone: z.string().trim().optional(),
    })
    .optional()
    .nullable(),
  negotiatedRates: z
    .array(
      z.object({
        description: z.string().trim(),
        rate: z.number().nonnegative(),
        currency: z.enum(["COP", "USD", "EUR"]),
        validUntil: z.string().trim(),
      })
    )
    .optional()
    .nullable(),
  commission: z.number().min(0).max(100).optional().nullable(),
  sla: z.string().trim().max(500).optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
  operatingCities: z.array(z.string().trim()).optional().nullable(),
  hotelMeta: z
    .object({
      checkInTime: z.string().optional(),
      checkOutTime: z.string().optional(),
      hotelAddress: z.string().optional(),
      hotelPhoneCode: z.string().optional(),
      hotelPhone: z.string().optional(),
      hotelPolicies: z.string().optional(),
    })
    .optional()
    .nullable(),
});

export const GET = withAuth(async (session, req: Request) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const rawType = url.searchParams.get("type");
  const type = rawType && rawType !== "all" ? (rawType as TravelSupplierType) : undefined;
  const activeOnly = url.searchParams.get("active") === "true";

  const suppliers = await listSuppliers({
    organizationId: session.organizationId,
    query: q,
    type,
    activeOnly,
  });

  return Response.json({ suppliers });
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createSupplierSchema);
  if (!body.ok) return body.response;

  try {
    const supplier = await createSupplier({
      organizationId: session.organizationId,
      ...body.data,
    });
    return Response.json({ supplier }, { status: 201 });
  } catch (err) {
    console.error("[suppliers] error al crear proveedor:", err);
    return apiError(500, "supplier_create_error", "No se pudo registrar el proveedor");
  }
});
