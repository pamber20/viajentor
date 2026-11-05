import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveInstanceOrg, resetInstanceOrgCache } from "@/server/bot/auth";

const dbState = {
  orgs: [] as Array<{ id: string; slug: string | null }>,
};

vi.mock("@/lib/db", () => {
  return {
    schema: {
      organization: {
        id: "organization.id",
        slug: "organization.slug",
      },
    },
    getDb: () => ({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => {
              // Simular búsqueda filtrada por ID o SLUG
              return Promise.resolve(dbState.orgs);
            },
          }),
          limit: (n: number) => {
            return Promise.resolve(dbState.orgs.slice(0, n));
          },
        }),
      }),
    }),
  };
});

describe("Multi-tenant organization resolution en /api/bot/*", () => {
  beforeEach(() => {
    resetInstanceOrgCache();
    dbState.orgs = [];
  });

  it("resuelve organización por header x-vocero-organization cuando coincide", async () => {
    dbState.orgs = [{ id: "org-travel-1", slug: "agencia-cancun" }];

    const req = new Request("http://localhost/api/bot/typing", {
      headers: { "x-vocero-organization": "agencia-cancun" },
    });

    const orgId = await resolveInstanceOrg(req);
    expect(orgId).toBe("org-travel-1");
  });

  it("resuelve organización por header x-organization-id", async () => {
    dbState.orgs = [{ id: "org-travel-2", slug: "agencia-medellin" }];

    const req = new Request("http://localhost/api/bot/context", {
      headers: { "x-organization-id": "org-travel-2" },
    });

    const orgId = await resolveInstanceOrg(req);
    expect(orgId).toBe("org-travel-2");
  });

  it("retorna null si la organización solicitada no existe", async () => {
    dbState.orgs = [];

    const req = new Request("http://localhost/api/bot/context", {
      headers: { "x-vocero-organization": "agencia-fantasma" },
    });

    const orgId = await resolveInstanceOrg(req);
    expect(orgId).toBeNull();
  });

  it("sin header, en mono-tenant (exactamente 1 org) usa la única existente", async () => {
    dbState.orgs = [{ id: "org-single", slug: "agencia-unica" }];

    const req = new Request("http://localhost/api/bot/context");
    const orgId = await resolveInstanceOrg(req);
    expect(orgId).toBe("org-single");
  });

  it("sin header, en multi-tenant (2 o más orgs) retorna null para forzar cabecera y evitar mezclar tenants", async () => {
    dbState.orgs = [
      { id: "org-tenant-1", slug: "agencia-1" },
      { id: "org-tenant-2", slug: "agencia-2" },
    ];

    const req = new Request("http://localhost/api/bot/context");
    const orgId = await resolveInstanceOrg(req);
    expect(orgId).toBeNull();
  });
});
