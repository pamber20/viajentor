import { describe, expect, it, vi } from "vitest";
import { withAuth, withConfigAuth } from "@/lib/api";
import * as sessionModule from "@/lib/auth/session";

describe("Seguridad RBAC: withAuth y withConfigAuth", () => {
  it("withAuth sin rol especificado permite cualquier sesión válida", async () => {
    vi.spyOn(sessionModule, "requireSession").mockResolvedValueOnce({
      userId: "user-1",
      organizationId: "org-1",
      role: "member",
    });

    const handler = withAuth(async (session, _req: Request) => {
      return Response.json({ ok: true, role: session.role });
    });

    const res = await handler(new Request("http://localhost"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("withConfigAuth rechaza role='member' con 403 Forbidden", async () => {
    vi.spyOn(sessionModule, "requireSession").mockResolvedValueOnce({
      userId: "user-member",
      organizationId: "org-1",
      role: "member",
    });

    const handler = withConfigAuth(async (_session, _req: Request) => {
      return Response.json({ ok: true });
    });

    const res = await handler(new Request("http://localhost"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("forbidden");
    expect(body.error?.message).toMatch(/rol de configuración/i);
  });

  it("withConfigAuth permite role='owner'", async () => {
    vi.spyOn(sessionModule, "requireSession").mockResolvedValueOnce({
      userId: "user-owner",
      organizationId: "org-1",
      role: "owner",
    });

    const handler = withConfigAuth(async (session, _req: Request) => {
      return Response.json({ ok: true, role: session.role });
    });

    const res = await handler(new Request("http://localhost"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("owner");
  });

  it("withConfigAuth permite role='admin'", async () => {
    vi.spyOn(sessionModule, "requireSession").mockResolvedValueOnce({
      userId: "user-admin",
      organizationId: "org-1",
      role: "admin",
    });

    const handler = withConfigAuth(async (session, _req: Request) => {
      return Response.json({ ok: true, role: session.role });
    });

    const res = await handler(new Request("http://localhost"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("admin");
  });

  it("withAuth con lista de roles específica restringe accesos no autorizados", async () => {
    vi.spyOn(sessionModule, "requireSession").mockResolvedValueOnce({
      userId: "user-member",
      organizationId: "org-1",
      role: "member",
    });

    const handler = withAuth({ roles: ["owner"] }, async (_session, _req: Request) => {
      return Response.json({ ok: true });
    });

    const res = await handler(new Request("http://localhost"));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error?.code).toBe("forbidden");
  });
});
