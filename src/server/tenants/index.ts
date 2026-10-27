import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import {
  DEFAULT_BRANDING,
  extractBranding,
  normalizeBranding,
  type Branding,
} from "@/lib/branding";
import {
  DEFAULT_PLAN_SEATS,
  extractTenantConfig,
  normalizeTenantConfig,
  parseOrgMetadataObject,
  slugifyAgencyName,
  type TenantConfig,
  type TenantPlan,
  type TenantStatus,
} from "@/lib/tenants";

export const SEED_STAGES: { name: string; kind: "open" | "won" | "lost" }[] = [
  { name: "Nuevo", kind: "open" },
  { name: "En conversación", kind: "open" },
  { name: "Interesado", kind: "open" },
  { name: "Cliente", kind: "won" },
  { name: "Perdido", kind: "lost" },
];

export function parseSuperAdminEmails(raw?: string): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Determina si un usuario es SuperAdmin de la plataforma SaaS:
 * 1) Su correo está en SUPERADMIN_EMAILS (si se configuró), O
 * 2) Es propietario ("owner") de la organización matriz ("principal").
 */
export async function isSuperAdminUser(
  userId: string,
  userEmail?: string | null
): Promise<boolean> {
  const configured = parseSuperAdminEmails(process.env.SUPERADMIN_EMAILS);
  if (userEmail && configured.has(userEmail.trim().toLowerCase())) {
    return true;
  }

  const db = getDb();
  const rows = await db
    .select({
      role: schema.member.role,
      slug: schema.organization.slug,
      email: schema.user.email,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.member.organizationId, schema.organization.id)
    )
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.userId, userId));

  for (const r of rows) {
    if (configured.has(r.email.trim().toLowerCase())) return true;
    if (r.role === "owner" && r.slug === "principal") return true;
  }
  return false;
}

export type ProvisionOrganizationInput = {
  name: string;
  ownerUserId: string;
  slug?: string;
  plan?: TenantPlan;
  maxSeats?: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  customDomain?: string | null;
  accentColor?: string;
};

/**
 * Crea una nueva organización (agencia cliente) completa con su propietario,
 * etapas de pipeline, perfil de agente, marca y metadatos de suscripción.
 */
export async function provisionOrganization(
  input: ProvisionOrganizationInput
): Promise<{ organizationId: string; slug: string }> {
  const db = getDb();
  const orgId = newId("organization");
  const plan: TenantPlan = input.plan ?? "pro";
  const maxSeats = input.maxSeats ?? DEFAULT_PLAN_SEATS[plan];

  const suffix = orgId.replace(/^org_/, "").slice(0, 6);
  const slug =
    input.slug?.trim() || slugifyAgencyName(input.name, suffix);

  const tenantConfig = normalizeTenantConfig({
    status: "active",
    plan,
    maxSeats,
    contactEmail: input.contactEmail ?? null,
    contactPhone: input.contactPhone ?? null,
    notes: input.notes ?? null,
    customDomain: input.customDomain ?? null,
  });

  const branding = normalizeBranding({
    name: input.name.trim() || DEFAULT_BRANDING.name,
    accent: input.accentColor ?? DEFAULT_BRANDING.accent,
  });

  const metadata = JSON.stringify({
    branding,
    tenant: tenantConfig,
  });

  await db.transaction(async (tx) => {
    await tx.insert(schema.organization).values({
      id: orgId,
      name: input.name.trim(),
      slug,
      metadata,
    });

    await tx.insert(schema.member).values({
      id: newId("member"),
      organizationId: orgId,
      userId: input.ownerUserId,
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

  return { organizationId: orgId, slug };
}

export type TenantSummary = {
  id: string;
  name: string;
  slug: string | null;
  createdAt: string;
  isPrimary: boolean;
  tenant: TenantConfig;
  branding: Branding;
  owner: {
    userId: string;
    name: string;
    email: string;
  } | null;
  metrics: {
    members: number;
    contacts: number;
    conversations: number;
    quotes: number;
    bookings: number;
    whatsappConnected: boolean;
    whatsappPhone: string | null;
  };
};

export async function listTenantsWithMetrics(): Promise<TenantSummary[]> {
  const db = getDb();

  const [
    orgs,
    owners,
    memberCounts,
    contactCounts,
    conversationCounts,
    quoteCounts,
    waCreds,
  ] = await Promise.all([
    db
      .select()
      .from(schema.organization)
      .orderBy(asc(schema.organization.createdAt)),
    db
      .select({
        organizationId: schema.member.organizationId,
        userId: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
        role: schema.member.role,
      })
      .from(schema.member)
      .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
      .where(eq(schema.member.role, "owner")),
    db
      .select({
        organizationId: schema.member.organizationId,
        n: count(),
      })
      .from(schema.member)
      .groupBy(schema.member.organizationId),
    db
      .select({
        organizationId: schema.contact.organizationId,
        n: count(),
      })
      .from(schema.contact)
      .groupBy(schema.contact.organizationId),
    db
      .select({
        organizationId: schema.conversation.organizationId,
        n: count(),
      })
      .from(schema.conversation)
      .where(eq(schema.conversation.isTest, false))
      .groupBy(schema.conversation.organizationId),
    db
      .select({
        organizationId: schema.travelQuote.organizationId,
        totalQuotes: count(),
        totalBookings: sql<number>`count(*) filter (where ${schema.travelQuote.isBooking} = true)::int`,
      })
      .from(schema.travelQuote)
      .groupBy(schema.travelQuote.organizationId),
    db
      .select({
        organizationId: schema.metaCredentials.organizationId,
        status: schema.metaCredentials.status,
        displayPhoneNumber: schema.metaCredentials.displayPhoneNumber,
      })
      .from(schema.metaCredentials),
  ]);

  const ownerByOrg = new Map<
    string,
    { userId: string; name: string; email: string }
  >();
  for (const o of owners) {
    if (!ownerByOrg.has(o.organizationId)) {
      ownerByOrg.set(o.organizationId, {
        userId: o.userId,
        name: o.name,
        email: o.email,
      });
    }
  }

  const membersMap = new Map(memberCounts.map((r) => [r.organizationId, r.n]));
  const contactsMap = new Map(contactCounts.map((r) => [r.organizationId, r.n]));
  const convsMap = new Map(
    conversationCounts.map((r) => [r.organizationId, r.n])
  );
  const quotesMap = new Map(
    quoteCounts.map((r) => [
      r.organizationId,
      { quotes: r.totalQuotes, bookings: Number(r.totalBookings ?? 0) },
    ])
  );
  const waMap = new Map(
    waCreds.map((r) => [
      r.organizationId,
      {
        connected: r.status === "connected",
        phone: r.displayPhoneNumber,
      },
    ])
  );

  return orgs.map((org) => {
    const q = quotesMap.get(org.id);
    const wa = waMap.get(org.id);
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt.toISOString(),
      isPrimary: org.slug === "principal",
      tenant: extractTenantConfig(org.metadata),
      branding: extractBranding(org.metadata),
      owner: ownerByOrg.get(org.id) ?? null,
      metrics: {
        members: membersMap.get(org.id) ?? 0,
        contacts: contactsMap.get(org.id) ?? 0,
        conversations: convsMap.get(org.id) ?? 0,
        quotes: q?.quotes ?? 0,
        bookings: q?.bookings ?? 0,
        whatsappConnected: wa?.connected ?? false,
        whatsappPhone: wa?.phone ?? null,
      },
    };
  });
}

export type UpdateTenantInput = {
  name?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  maxSeats?: number;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  customDomain?: string | null;
  accentColor?: string;
};

export async function updateTenant(
  organizationId: string,
  patch: UpdateTenantInput
): Promise<TenantSummary | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId))
    .limit(1);
  const org = rows[0];
  if (!org) return null;

  // La organización principal nunca puede suspenderse a sí misma por accidente.
  const nextStatus: TenantStatus =
    org.slug === "principal" && patch.status === "suspended"
      ? "active"
      : (patch.status ?? extractTenantConfig(org.metadata).status);

  const metaObj = parseOrgMetadataObject(org.metadata);
  const currentTenant = extractTenantConfig(org.metadata);
  const nextTenant = normalizeTenantConfig({
    ...currentTenant,
    ...(patch.plan !== undefined ? { plan: patch.plan } : {}),
    ...(patch.maxSeats !== undefined ? { maxSeats: patch.maxSeats } : {}),
    ...(patch.contactEmail !== undefined
      ? { contactEmail: patch.contactEmail }
      : {}),
    ...(patch.contactPhone !== undefined
      ? { contactPhone: patch.contactPhone }
      : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
    ...(patch.customDomain !== undefined
      ? { customDomain: patch.customDomain }
      : {}),
    status: nextStatus,
  });

  metaObj.tenant = nextTenant;
  const nextName = patch.name?.trim() || org.name;
  if (patch.name?.trim() || patch.accentColor) {
    const currentBranding =
      typeof metaObj.branding === "object" && metaObj.branding !== null
        ? (metaObj.branding as Record<string, unknown>)
        : {};
    metaObj.branding = normalizeBranding({
      ...currentBranding,
      name: nextName,
      ...(patch.accentColor ? { accent: patch.accentColor } : {}),
    });
  }

  await db
    .update(schema.organization)
    .set({
      name: nextName,
      metadata: JSON.stringify(metaObj),
    })
    .where(eq(schema.organization.id, organizationId));

  const all = await listTenantsWithMetrics();
  return all.find((t) => t.id === organizationId) ?? null;
}

export type AccessibleOrganization = {
  id: string;
  name: string;
  slug: string | null;
  role: string;
  status: TenantStatus;
  plan: TenantPlan;
};

/**
 * Devuelve las organizaciones a las que un usuario puede cambiar.
 * Si es SuperAdmin, devuelve TODAS las organizaciones de la instancia.
 */
export async function listUserOrganizations(
  userId: string,
  superAdmin: boolean
): Promise<AccessibleOrganization[]> {
  const db = getDb();
  if (superAdmin) {
    const orgs = await db
      .select()
      .from(schema.organization)
      .orderBy(
        desc(sql`${schema.organization.slug} = 'principal'`),
        asc(schema.organization.name)
      );
    return orgs.map((o) => {
      const cfg = extractTenantConfig(o.metadata);
      return {
        id: o.id,
        name: o.name,
        slug: o.slug,
        role: "owner",
        status: cfg.status,
        plan: cfg.plan,
      };
    });
  }

  const rows = await db
    .select({
      id: schema.organization.id,
      name: schema.organization.name,
      slug: schema.organization.slug,
      metadata: schema.organization.metadata,
      role: schema.member.role,
    })
    .from(schema.member)
    .innerJoin(
      schema.organization,
      eq(schema.member.organizationId, schema.organization.id)
    )
    .where(eq(schema.member.userId, userId))
    .orderBy(asc(schema.organization.name));

  return rows.map((r) => {
    const cfg = extractTenantConfig(r.metadata);
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      role: r.role,
      status: cfg.status,
      plan: cfg.plan,
    };
  });
}

/**
 * Cambia la organización activa de la sesión actual (`session.activeOrganizationId`).
 */
export async function switchSessionOrganization(input: {
  sessionId: string;
  userId: string;
  targetOrganizationId: string;
  superAdmin: boolean;
}): Promise<{ ok: true; organizationId: string } | { ok: false; reason: string }> {
  const db = getDb();
  const orgRows = await db
    .select()
    .from(schema.organization)
    .where(eq(schema.organization.id, input.targetOrganizationId))
    .limit(1);
  const targetOrg = orgRows[0];
  if (!targetOrg) {
    return { ok: false, reason: "La agencia seleccionada no existe" };
  }

  if (!input.superAdmin) {
    const memRows = await db
      .select({ id: schema.member.id })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, input.userId),
          eq(schema.member.organizationId, input.targetOrganizationId)
        )
      )
      .limit(1);
    if (!memRows[0]) {
      return { ok: false, reason: "No tienes acceso a esta agencia" };
    }
    const cfg = extractTenantConfig(targetOrg.metadata);
    if (cfg.status === "suspended") {
      return { ok: false, reason: "Esta agencia se encuentra suspendida" };
    }
  }

  await db
    .update(schema.session)
    .set({
      activeOrganizationId: input.targetOrganizationId,
      updatedAt: new Date(),
    })
    .where(eq(schema.session.id, input.sessionId));

  return { ok: true, organizationId: input.targetOrganizationId };
}
