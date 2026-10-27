import { describe, expect, it, vi, beforeEach } from "vitest";

const env = vi.hoisted(() => ({
  APP_BASE_URL: "https://crm.ejemplo.test",
  META_WEBHOOK_VERIFY_TOKEN: "verify-abc",
  META_APP_ID: "app_12345",
  META_APP_SECRET: "secret_xyz",
  META_APP_CONFIG_ID: "config_999",
  META_GRAPH_BASE_URL: "https://graph.facebook.com",
  META_GRAPH_API_VERSION: "v25.0",
}));

const mockSaveCredentials = vi.hoisted(() => vi.fn(async () => {}));
const mockRegisterWebhook = vi.hoisted(() => vi.fn(async () => ({ ok: true, appWithoutWebhook: false })));
const mockTestConnection = vi.hoisted(() => vi.fn(async () => ({
  ok: true,
  displayPhoneNumber: "+52 55 1234 5678",
  verifiedName: "Viajentor Tours",
})));

vi.mock("@/lib/env", () => ({ getEnv: () => env }));
vi.mock("@/lib/auth/session", () => ({
  requireSession: async () => ({ userId: "usr_1", organizationId: "org_tenant_1", role: "owner" }),
  getSessionOrNull: async () => ({ userId: "usr_1", organizationId: "org_tenant_1", role: "owner" }),
}));
vi.mock("@/server/whatsapp/credentials", () => ({
  saveCredentials: mockSaveCredentials,
}));
vi.mock("@/server/whatsapp/connect", () => ({
  testConnection: mockTestConnection,
  registerWebhookForNumber: mockRegisterWebhook,
}));

import { GET, POST } from "@/app/api/settings/whatsapp/embedded-signup/route";

describe("Embedded Signup API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("GET devuelve la configuración de Embedded Signup cuando está activa", async () => {
    const res = await GET(new Request("https://crm.ejemplo.test/api/settings/whatsapp/embedded-signup"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      enabled: true,
      appId: "app_12345",
      configId: "config_999",
    });
  });

  it("POST intercambia el código, valida la conexión, guarda credenciales y registra el webhook", async () => {
    // Mock del intercambio de OAuth con Meta
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "meta_system_user_token_abc",
        token_type: "bearer",
      }),
    } as unknown as Response);

    const req = new Request("https://crm.ejemplo.test/api/settings/whatsapp/embedded-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "auth_code_from_facebook",
        wabaId: "waba_789",
        phoneNumberId: "phone_456",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.wabaId).toBe("waba_789");
    expect(body.phoneNumberId).toBe("phone_456");
    expect(body.displayPhoneNumber).toBe("+52 55 1234 5678");

    // Verifica que se guardaron las credenciales con el organizationId del tenant
    expect(mockSaveCredentials).toHaveBeenCalledWith({
      organizationId: "org_tenant_1",
      wabaId: "waba_789",
      phoneNumberId: "phone_456",
      token: "meta_system_user_token_abc",
      displayPhoneNumber: "+52 55 1234 5678",
      verifiedName: "Viajentor Tours",
    });

    // Verifica que se registró el webhook
    expect(mockRegisterWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        wabaId: "waba_789",
        phoneNumberId: "phone_456",
        token: "meta_system_user_token_abc",
      })
    );
  });

  it("POST retorna 422 si falta el código", async () => {
    const req = new Request("https://crm.ejemplo.test/api/settings/whatsapp/embedded-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wabaId: "waba_789",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(422);
  });
});
