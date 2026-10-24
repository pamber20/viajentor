import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLAN_SEATS,
  extractTenantConfig,
  mergeTenantMetadata,
  normalizeTenantConfig,
  slugifyAgencyName,
} from "@/lib/tenants";
import { parseSuperAdminEmails } from "@/server/tenants";

describe("Multi-Tenant Viajentor 2.0 (tenants)", () => {
  it("normaliza la configuración por defecto a plan pro activo con 10 asientos", () => {
    const cfg = normalizeTenantConfig(null);
    expect(cfg).toEqual({
      status: "active",
      plan: "pro",
      maxSeats: DEFAULT_PLAN_SEATS.pro,
      contactEmail: null,
      contactPhone: null,
      notes: null,
      customDomain: null,
    });
  });

  it("asigna los asientos por defecto del plan cuando maxSeats no viene", () => {
    expect(normalizeTenantConfig({ plan: "starter" }).maxSeats).toBe(3);
    expect(normalizeTenantConfig({ plan: "enterprise" }).maxSeats).toBe(50);
  });

  it("preserva branding y otras llaves en organization.metadata al hacer merge de tenant", () => {
    const initial = JSON.stringify({
      branding: { name: "Viajes Caribe", accentColor: "#0d5bff" },
      customKey: 123,
    });
    const merged = mergeTenantMetadata(initial, {
      plan: "enterprise",
      maxSeats: 80,
      status: "suspended",
      contactEmail: "admin@caribe.com",
    });

    const parsed = JSON.parse(merged) as Record<string, unknown>;
    expect(parsed.branding).toEqual({
      name: "Viajes Caribe",
      accentColor: "#0d5bff",
    });
    expect(parsed.customKey).toBe(123);

    const extracted = extractTenantConfig(merged);
    expect(extracted.plan).toBe("enterprise");
    expect(extracted.maxSeats).toBe(80);
    expect(extracted.status).toBe("suspended");
    expect(extracted.contactEmail).toBe("admin@caribe.com");
  });

  it("genera slugs limpios sin tildes ni caracteres especiales", () => {
    expect(slugifyAgencyName("Viajes & Turismo El Dorado S.A.S.", "ab12")).toBe(
      "viajes-turismo-el-dorado-s-a-s-ab12"
    );
    expect(slugifyAgencyName("   ", "99")).toBe("agencia-99");
  });

  it("parsea la lista de correos de SUPERADMIN_EMAILS ignorando espacios y mayúsculas", () => {
    const set = parseSuperAdminEmails(" Admin@Viajentor.com , soporte@viajentor.com ,, ");
    expect(set.has("admin@viajentor.com")).toBe(true);
    expect(set.has("soporte@viajentor.com")).toBe(true);
    expect(set.size).toBe(2);
  });
});
