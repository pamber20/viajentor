import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getAuth, runInternalSignup } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { DEFAULT_PLAN_SEATS, TENANT_PLANS } from "@/lib/tenants";
import {
  listTenantsWithMetrics,
  listUserOrganizations,
  provisionOrganization,
} from "@/server/tenants";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const superAdmin = Boolean(session.isSuperAdmin);
  const [accessibleOrganizations, tenants] = await Promise.all([
    listUserOrganizations(session.userId, superAdmin),
    superAdmin ? listTenantsWithMetrics() : Promise.resolve([]),
  ]);

  return Response.json({
    activeOrganizationId: session.organizationId,
    activeOrganizationName: session.organizationName ?? null,
    isSuperAdmin: superAdmin,
    impersonating: Boolean(session.impersonating),
    accessibleOrganizations,
    tenants,
  });
});

const createTenantSchema = z.object({
  agencyName: z.string().trim().min(2).max(120),
  plan: z.enum(TENANT_PLANS).default("pro"),
  maxSeats: z.coerce.number().int().min(1).max(1000).optional(),
  ownerName: z.string().trim().min(2).max(120),
  ownerEmail: z.string().trim().email(),
  ownerPassword: z.string().min(8).max(128),
  contactPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

/**
 * Alta de una nueva agencia cliente (Tenant) desde el panel de SuperAdmin.
 * Funciona incluso con `ALLOW_SIGNUP` cerrado al público.
 */
export const POST = withAuth(async (session, req: Request) => {
  if (!session.isSuperAdmin) {
    return apiError(
      403,
      "forbidden",
      "Solo el SuperAdmin puede dar de alta nuevas agencias"
    );
  }

  const body = await parseBody(req, createTenantSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const normalizedEmail = body.data.ownerEmail.toLowerCase();

  // Si el correo ya existe en el sistema, vinculamos a ese usuario como dueño
  // de la nueva agencia; si no existe, creamos su cuenta.
  const existingUsers = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, normalizedEmail))
    .limit(1);

  let ownerUserId: string;
  if (existingUsers[0]) {
    ownerUserId = existingUsers[0].id;
  } else {
    const auth = getAuth();
    try {
      const result = await runInternalSignup(() =>
        auth.api.signUpEmail({
          body: {
            name: body.data.ownerName,
            email: normalizedEmail,
            password: body.data.ownerPassword,
          },
        })
      );
      ownerUserId = result.user.id;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "No se pudo crear el usuario propietario";
      return apiError(422, "invalid", msg);
    }
  }

  const plan = body.data.plan ?? "pro";
  const maxSeats = body.data.maxSeats ?? DEFAULT_PLAN_SEATS[plan];

  const provisioned = await provisionOrganization({
    name: body.data.agencyName,
    ownerUserId,
    plan,
    maxSeats,
    contactEmail: normalizedEmail,
    contactPhone: body.data.contactPhone ?? null,
    notes: body.data.notes ?? null,
    accentColor: body.data.accentColor,
  });

  return Response.json(
    {
      ok: true,
      organizationId: provisioned.organizationId,
      slug: provisioned.slug,
    },
    { status: 201 }
  );
});
