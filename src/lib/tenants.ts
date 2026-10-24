import { z } from "zod";

export const TENANT_PLANS = ["starter", "pro", "enterprise"] as const;
export type TenantPlan = (typeof TENANT_PLANS)[number];

export const TENANT_STATUSES = ["active", "suspended"] as const;
export type TenantStatus = (typeof TENANT_STATUSES)[number];

export const DEFAULT_PLAN_SEATS: Record<TenantPlan, number> = {
  starter: 3,
  pro: 10,
  enterprise: 50,
};

export const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const tenantConfigSchema = z.object({
  status: z.enum(TENANT_STATUSES).default("active"),
  plan: z.enum(TENANT_PLANS).default("pro"),
  maxSeats: z.number().int().min(1).max(1000).default(10),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
  customDomain: z.string().trim().max(120).optional(),
});

export type TenantConfig = {
  status: TenantStatus;
  plan: TenantPlan;
  maxSeats: number;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  customDomain: string | null;
};

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  status: "active",
  plan: "pro",
  maxSeats: DEFAULT_PLAN_SEATS.pro,
  contactEmail: null,
  contactPhone: null,
  notes: null,
  customDomain: null,
};

export function parseOrgMetadataObject(
  metadata: string | null | undefined
): Record<string, unknown> {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata) as unknown;
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function normalizeTenantConfig(
  input?: Partial<TenantConfig> | Record<string, unknown> | null
): TenantConfig {
  if (!input || typeof input !== "object") {
    return { ...DEFAULT_TENANT_CONFIG };
  }
  const raw = input as Record<string, unknown>;
  const plan: TenantPlan =
    raw.plan === "starter" || raw.plan === "pro" || raw.plan === "enterprise"
      ? raw.plan
      : DEFAULT_TENANT_CONFIG.plan;
  const status: TenantStatus =
    raw.status === "suspended" ? "suspended" : "active";
  const rawSeats =
    typeof raw.maxSeats === "number" && Number.isFinite(raw.maxSeats)
      ? Math.trunc(raw.maxSeats)
      : DEFAULT_PLAN_SEATS[plan];
  const maxSeats = Math.max(1, Math.min(1000, rawSeats));

  const cleanStr = (v: unknown): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 ? t : null;
  };

  return {
    status,
    plan,
    maxSeats,
    contactEmail: cleanStr(raw.contactEmail),
    contactPhone: cleanStr(raw.contactPhone),
    notes: cleanStr(raw.notes),
    customDomain: cleanStr(raw.customDomain),
  };
}

export function extractTenantConfig(metadata: string | null | undefined): TenantConfig {
  const obj = parseOrgMetadataObject(metadata);
  return normalizeTenantConfig(
    (obj.tenant as Record<string, unknown> | undefined) ?? null
  );
}

export function mergeTenantMetadata(
  existingMetadata: string | null | undefined,
  patch: Partial<TenantConfig>
): string {
  const obj = parseOrgMetadataObject(existingMetadata);
  const current = normalizeTenantConfig(
    (obj.tenant as Record<string, unknown> | undefined) ?? null
  );
  obj.tenant = normalizeTenantConfig({ ...current, ...patch });
  return JSON.stringify(obj);
}

/**
 * Convierte el nombre de una agencia en un slug limpio para `organization.slug`.
 */
export function slugifyAgencyName(name: string, uniqueSuffix?: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const cleanBase = base || "agencia";
  return uniqueSuffix ? `${cleanBase}-${uniqueSuffix}` : cleanBase;
}
