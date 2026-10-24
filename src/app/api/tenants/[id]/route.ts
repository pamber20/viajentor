import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { TENANT_PLANS, TENANT_STATUSES } from "@/lib/tenants";
import { updateTenant } from "@/server/tenants";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  status: z.enum(TENANT_STATUSES).optional(),
  plan: z.enum(TENANT_PLANS).optional(),
  maxSeats: z.coerce.number().int().min(1).max(1000).optional(),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
  customDomain: z.string().trim().max(120).optional().nullable(),
});

type Params = { params: Promise<{ id: string }> };

export const PATCH = withAuth(async (session, req: Request, { params }: Params) => {
  if (!session.isSuperAdmin) {
    return apiError(
      403,
      "forbidden",
      "Solo el SuperAdmin puede modificar agencias"
    );
  }

  const { id } = await params;
  const body = await parseBody(req, updateSchema);
  if (!body.ok) return body.response;

  const updated = await updateTenant(id, body.data);
  if (!updated) {
    return apiError(404, "not_found", "La agencia no existe");
  }

  return Response.json({ tenant: updated });
});
