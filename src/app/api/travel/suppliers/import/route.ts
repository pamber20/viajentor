import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { createSuppliersBulk } from "@/server/travel/suppliers";

export const dynamic = "force-dynamic";

const supplierTypeEnum = z.enum([
  "hotel",
  "airline",
  "operator",
  "transport",
  "insurance",
  "other",
]);

const importSupplierItemSchema = z.object({
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
  commission: z.number().min(0).max(100).optional().nullable(),
  sla: z.string().trim().max(500).optional().nullable(),
  rating: z.number().min(1).max(5).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
  operatingCities: z.array(z.string().trim()).optional().nullable(),
  hotelMeta: z
    .object({
      hotelAddress: z.string().optional(),
      hotelPhone: z.string().optional(),
      checkInTime: z.string().optional(),
      checkOutTime: z.string().optional(),
      hotelPolicies: z.string().optional(),
    })
    .optional()
    .nullable(),
});

const bulkImportSchema = z.object({
  suppliers: z.array(importSupplierItemSchema).min(1, "Debe enviar al menos un proveedor"),
});

export const POST = withAuth(async (session, req: Request) => {
  const parsed = await parseBody(req, bulkImportSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const result = await createSuppliersBulk({
      organizationId: session.organizationId,
      suppliers: parsed.data.suppliers,
    });
    return Response.json({ success: true, count: result.count, suppliers: result.suppliers }, { status: 201 });
  } catch (error) {
    return apiError(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Error al importar proveedores"
    );
  }
});
