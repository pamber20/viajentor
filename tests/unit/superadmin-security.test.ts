import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isSuperAdminUser,
  provisionOrganization,
  RESERVED_TENANT_SLUGS,
} from "@/server/tenants";

const dbState = {
  users: [] as Array<{ id: string; email: string }>,
  members: [] as Array<{ userId: string; role: string; slug: string }>,
  insertedOrg: null as unknown,
};

vi.mock("@/lib/db", () => ({
  schema: {
    user: { id: "user.id", email: "user.email" },
    organization: { id: "organization.id", slug: "organization.slug" },
    member: { userId: "member.userId", organizationId: "member.organizationId", role: "member.role" },
    leadStage: {},
    agentProfile: {},
  },
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => {
            const u = dbState.users[0];
            return Promise.resolve(u ? [u] : []);
          },
        }),
        innerJoin: () => ({
          where: () => Promise.resolve(dbState.members.map((m) => ({
            role: m.role,
            slug: m.slug,
          }))),
        }),
      }),
    }),
    transaction: async (cb: (tx: unknown) => unknown) => {
      const tx = {
        insert: () => ({
          values: (v: unknown) => {
            dbState.insertedOrg = v;
            return Promise.resolve();
          },
        }),
      };
      return cb(tx);
    },
  }),
}));

describe("Seguridad SuperAdmin y Reserva de Slugs (Hallazgo 8)", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    dbState.users = [];
    dbState.members = [];
    dbState.insertedOrg = null;
  });

  it("RESERVED_TENANT_SLUGS incluye identificadores críticos del sistema", () => {
    expect(RESERVED_TENANT_SLUGS.has("principal")).toBe(true);
    expect(RESERVED_TENANT_SLUGS.has("admin")).toBe(true);
    expect(RESERVED_TENANT_SLUGS.has("superadmin")).toBe(true);
    expect(RESERVED_TENANT_SLUGS.has("system")).toBe(true);
    expect(RESERVED_TENANT_SLUGS.has("api")).toBe(true);
  });

  it("provisionOrganization impide que una agencia tome un slug reservado como 'principal'", async () => {
    const res = await provisionOrganization({
      name: "Agencia Maliciosa",
      ownerUserId: "user-attacker",
      slug: "principal",
    });

    expect(res.slug).not.toBe("principal");
    expect(res.slug).toMatch(/^agencia-maliciosa-/);
  });

  it("cuando SUPERADMIN_EMAILS está configurado, solo los correos de la lista son SuperAdmin", async () => {
    vi.stubEnv("SUPERADMIN_EMAILS", "ceo@viajentor.com, admin@viajentor.com");

    // Usuario que es owner de 'principal' pero con correo no autorizado
    dbState.users = [{ id: "user-intruder", email: "intruder@externo.com" }];
    dbState.members = [{ userId: "user-intruder", role: "owner", slug: "principal" }];

    const esSuperAdmin = await isSuperAdminUser("user-intruder", "intruder@externo.com");
    expect(esSuperAdmin).toBe(false);

    // Usuario con correo explícito autorizado
    const esSuperAdminReal = await isSuperAdminUser("user-ceo", "ceo@viajentor.com");
    expect(esSuperAdminReal).toBe(true);
  });

  it("cuando SUPERADMIN_EMAILS NO está configurado, permite al owner de 'principal' por fallback inicial", async () => {
    vi.stubEnv("SUPERADMIN_EMAILS", "");

    dbState.members = [{ userId: "user-owner-dev", role: "owner", slug: "principal" }];
    const esSuperAdmin = await isSuperAdminUser("user-owner-dev");
    expect(esSuperAdmin).toBe(true);

    // Un owner de otra organización no es SuperAdmin
    dbState.members = [{ userId: "user-other", role: "owner", slug: "agencia-cancun" }];
    const esOtroSuperAdmin = await isSuperAdminUser("user-other");
    expect(esOtroSuperAdmin).toBe(false);
  });
});
