import { and, count, eq } from "drizzle-orm";
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

const deleteSchema = z.object({
  memberId: z.string().min(1),
});

/** Baja de miembro del equipo (owner only). */
export const DELETE = withAuth(async (session, req: Request) => {
  if (session.role !== "owner" && !session.isSuperAdmin) {
    return apiError(403, "forbidden", "Solo el propietario puede remover miembros del equipo");
  }

  const body = await parseBody(req, deleteSchema);
  if (!body.ok) return body.response;

  const db = getDb();

  // Buscar el miembro en la organización
  const [targetMember] = await db
    .select({
      id: schema.member.id,
      userId: schema.member.userId,
      role: schema.member.role,
    })
    .from(schema.member)
    .where(
      scoped(
        schema.member.organizationId,
        session.organizationId,
        eq(schema.member.id, body.data.memberId)
      )
    )
    .limit(1);

  if (!targetMember) {
    return apiError(404, "not_found", "Miembro no encontrado en esta agencia");
  }

  // Prevenir que el propietario se remueva a sí mismo
  if (targetMember.role === "owner" || targetMember.userId === session.userId) {
    return apiError(
      400,
      "cannot_remove_owner",
      "No puedes remover al propietario de la agencia"
    );
  }

  // Eliminar membresía
  await db
    .delete(schema.member)
    .where(
      and(
        eq(schema.member.id, targetMember.id),
        eq(schema.member.organizationId, session.organizationId)
      )
    );

  return Response.json({ ok: true, removedId: targetMember.id });
});
