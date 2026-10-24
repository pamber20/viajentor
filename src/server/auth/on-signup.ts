import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { isInternalSignup } from "@/lib/auth";
import { DEFAULT_BRANDING, normalizeBranding } from "@/lib/branding";
import {
  DEFAULT_TENANT_CONFIG,
  extractTenantConfig,
  slugifyAgencyName,
  type TenantStatus,
} from "@/lib/tenants";
import { isSuperAdminUser, SEED_STAGES } from "@/server/tenants";

/**
 * Registro de usuario (Multi-Tenant Viajentor 2.0):
 * - Si viene de `runInternalSignup()` (alta de miembro de equipo en
 *   `/api/settings/team` o aprovisionamiento explícito en `/api/tenants`),
 *   NO crea una organización automática porque el llamador asigna la membresía.
 * - Si es un registro directo (`/sign-up/email`), crea una organización propia
 *   para el nuevo cliente: la primera lleva `slug: "principal"` y las
 *   siguientes llevan un `slug` único derivado del nombre de la agencia.
 */
export async function onUserCreated(userId: string, userName: string) {
  if (isInternalSignup()) return;

  const db = getDb();
  await db.transaction(async (tx) => {
    // Lock transaccional para evitar colisión en el primer arranque ("principal").
    await tx.execute(sql`select pg_advisory_xact_lock(874201)`);

    // Si el usuario ya tiene membresía asignada, no crear otra.
    const existingMember = await tx
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(eq(schema.member.userId, userId))
      .limit(1);
    if (existingMember[0]) return;

    const [orgs] = await tx
      .select({ n: count() })
      .from(schema.organization);
    const isFirstOrg = (orgs?.n ?? 0) === 0;

    const orgId = newId("organization");
    const orgName = userName?.trim() ? `Agencia de ${userName.trim()}` : "Mi agencia";
    const suffix = orgId.replace(/^org_/, "").slice(0, 6);
    const slug = isFirstOrg ? "principal" : slugifyAgencyName(orgName, suffix);

    const metadata = JSON.stringify({
      branding: normalizeBranding({
        name: orgName,
        accent: DEFAULT_BRANDING.accent,
      }),
      tenant: DEFAULT_TENANT_CONFIG,
    });

    await tx.insert(schema.organization).values({
      id: orgId,
      name: orgName,
      slug,
      metadata,
    });
    await tx.insert(schema.member).values({
      id: newId("member"),
      organizationId: orgId,
      userId,
      role: "owner",
    });
    await tx.insert(schema.pipelineStage).values(
      SEED_STAGES.map((s, i) => ({
        id: newId("stage"),
        organizationId: orgId,
        name: s.name,
        position: i,
        kind: s.kind,
      }))
    );
    await tx.insert(schema.agentProfile).values({
      id: newId("agentProfile"),
      organizationId: orgId,
    });
  });
}

/** Organización activa inicial al crear sesión (la primera membresía del usuario). */
export async function resolveActiveOrganizationId(
  userId: string
): Promise<string | null> {
  return (await resolveMembership(userId))?.organizationId ?? null;
}

export type ResolvedMembership = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  role: string;
  tenantStatus: TenantStatus;
  impersonating: boolean;
};

/**
 * Resuelve la organización activa de un usuario.
 * - Si la sesión trae `preferredOrganizationId`, intenta usar esa organización:
 *   1) Si el usuario es miembro directo de ella, usa su rol en esa organización.
 *   2) Si no es miembro pero es SuperAdmin, entra en modo soporte (`impersonating: true`)
 *      con rol `owner`.
 * - Si no hay `preferredOrganizationId` válido, toma la membresía principal del usuario.
 */
export async function resolveMembership(
  userId: string,
  preferredOrganizationId?: string | null
): Promise<ResolvedMembership | null> {
  const db = getDb();

  if (preferredOrganizationId) {
    const direct = await db
      .select({
        organizationId: schema.member.organizationId,
        role: schema.member.role,
        name: schema.organization.name,
        slug: schema.organization.slug,
        metadata: schema.organization.metadata,
      })
      .from(schema.member)
      .innerJoin(
        schema.organization,
        eq(schema.member.organizationId, schema.organization.id)
      )
      .where(
        and(
          eq(schema.member.userId, userId),
          eq(schema.member.organizationId, preferredOrganizationId)
        )
      )
      .limit(1);

    if (direct[0]) {
      const cfg = extractTenantConfig(direct[0].metadata);
      return {
        organizationId: direct[0].organizationId,
        organizationName: direct[0].name,
        organizationSlug: direct[0].slug,
        role: direct[0].role,
        tenantStatus: cfg.status,
        impersonating: false,
      };
    }

    // Si no es miembro directo pero es SuperAdmin, puede inspeccionar cualquier tenant.
    if (await isSuperAdminUser(userId)) {
      const targetOrg = await db
        .select({
          id: schema.organization.id,
          name: schema.organization.name,
          slug: schema.organization.slug,
          metadata: schema.organization.metadata,
        })
        .from(schema.organization)
        .where(eq(schema.organization.id, preferredOrganizationId))
        .limit(1);

      if (targetOrg[0]) {
        const cfg = extractTenantConfig(targetOrg[0].metadata);
        return {
          organizationId: targetOrg[0].id,
          organizationName: targetOrg[0].name,
          organizationSlug: targetOrg[0].slug,
          role: "owner",
          tenantStatus: cfg.status,
          impersonating: true,
        };
      }
    }
  }

  const rows = await db
    .select({
      organizationId: schema.member.organizationId,
      role: schema.member.role,
      name: schema.organization.name,
      slug: schema.organization.slug,
      metadata: schema.organization.metadata,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.member.organizationId, schema.organization.id)
    )
    .where(eq(schema.member.userId, userId))
    .orderBy(
      desc(sql`${schema.organization.slug} = 'principal'`),
      asc(schema.member.createdAt)
    )
    .limit(1);

  if (!rows[0]) return null;
  const cfg = extractTenantConfig(rows[0].metadata);
  return {
    organizationId: rows[0].organizationId,
    organizationName: rows[0].name,
    organizationSlug: rows[0].slug,
    role: rows[0].role,
    tenantStatus: cfg.status,
    impersonating: false,
  };
}
