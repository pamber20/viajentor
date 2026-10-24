import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getAuth, runInternalSignup } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { extractTenantConfig } from "@/lib/tenants";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();
  const [members, orgRows] = await Promise.all([
    db
      .select({
        id: schema.member.id,
        role: schema.member.role,
        createdAt: schema.member.createdAt,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(scoped(schema.member.organizationId, session.organizationId)),
    db
      .select({ metadata: schema.organization.metadata })
      .from(schema.organization)
      .where(eq(schema.organization.id, session.organizationId))
      .limit(1),
  ]);

  const tenant = extractTenantConfig(orgRows[0]?.metadata);

  return Response.json({
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      name: m.name,
      email: m.email,
      createdAt: m.createdAt.toISOString(),
    })),
    plan: tenant.plan,
    maxSeats: tenant.maxSeats,
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

/** Alta de cuenta de equipo (owner only): email + contraseña temporal (FR-061). */
export const POST = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede crear cuentas");
  }
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;

  const db = getDb();
  const [[seatCountRow], orgRows] = await Promise.all([
    db
      .select({ n: count() })
      .from(schema.member)
      .where(scoped(schema.member.organizationId, session.organizationId)),
    db
      .select({ metadata: schema.organization.metadata })
      .from(schema.organization)
      .where(eq(schema.organization.id, session.organizationId))
      .limit(1),
  ]);

  const tenant = extractTenantConfig(orgRows[0]?.metadata);
  const currentSeats = seatCountRow?.n ?? 0;
  if (currentSeats >= tenant.maxSeats && !session.isSuperAdmin) {
    return apiError(
      403,
      "seat_limit_reached",
      `Has alcanzado el límite de ${tenant.maxSeats} usuarios de tu plan (${tenant.plan.toUpperCase()}). Contacta al administrador para ampliar tu cupo.`
    );
  }

  const auth = getAuth();
  let newUserId: string;
  try {
    const result = await runInternalSignup(() =>
      auth.api.signUpEmail({
        body: {
          name: body.data.name,
          email: body.data.email,
          password: body.data.password,
        },
      })
    );
    newUserId = result.user.id;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo crear la cuenta";
    if (/exist/i.test(message)) {
      return apiError(409, "duplicate", "Ya existe una cuenta con ese correo");
    }
    return apiError(422, "invalid", message);
  }

  await db
    .insert(schema.member)
    .values({
      id: newId("member"),
      organizationId: session.organizationId,
      userId: newUserId,
      role: "member",
    })
    .onConflictDoNothing();

  return Response.json({ ok: true }, { status: 201 });
});
