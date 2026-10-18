import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  deleteSupplier,
  getSupplier,
  updateSupplier,
} from "@/server/travel/suppliers";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const supplierTypeEnum = z.enum([
  "hotel",
  "airline",
  "operator",
  "transport",
  "insurance",
  "other",
]);

const updateSupplierSchema = z.object({
  name: z.string().trim().min(1, "El nombre del proveedor es obligatorio").max(160).optional(),
  type: supplierTypeEnum.optional(),
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

export const GET = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const supplier = await getSupplier({
    organizationId: session.organizationId,
    id,
  });

  if (!supplier) {
    return apiError(404, "not_found", "Proveedor no encontrado");
  }

  return Response.json({ supplier });
});

export const PATCH = withAuth(async (session, req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, updateSupplierSchema);
  if (!body.ok) return body.response;

  const updated = await updateSupplier({
    organizationId: session.organizationId,
    id,
    ...body.data,
  });

  if (!updated) {
    return apiError(404, "not_found", "Proveedor no encontrado");
  }

  return Response.json({ supplier: updated });
});

export const DELETE = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const ok = await deleteSupplier({
    organizationId: session.organizationId,
    id,
  });

  if (!ok) {
    return apiError(404, "not_found", "Proveedor no encontrado");
  }

  return Response.json({ success: true });
});
