import { beforeAll, describe, expect, it, vi } from "vitest";

const insertedRows: Record<string, unknown>[] = [];

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        insertedRows.push(v);
        return {
          onConflictDoUpdate: () => Promise.resolve(),
        };
      },
    }),
  }),
  schema: {
    ycloudCredentials: { organizationId: "organization_id", phoneNumber: "phone_number" },
  },
}));

beforeAll(() => {
  process.env.APP_BASE_URL = "http://localhost:3000";
  process.env.DATABASE_URL = "postgresql://t:t@localhost:5432/t";
  process.env.BETTER_AUTH_SECRET = "secret-de-test-suficiente";
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
  process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-test";
});

describe("credenciales de YCloud", () => {
  it("saveYCloudCredentials cifra apiKey y webhookSecret y normaliza el teléfono", async () => {
    const { saveYCloudCredentials, normalizeE164, apiKeyLast4 } = await import("@/server/ycloud/credentials");
    const apiKey = "sk_live_1234567890abcdef";
    const webhookSecret = "whsec_abcdef987654321";

    await saveYCloudCredentials({
      organizationId: "org_ycloud_1",
      phoneNumber: " 52 1 55 1234 5678 ",
      apiKey,
      webhookSecret,
    });

    const row = insertedRows[0]!;
    expect(row.phoneNumber).toBe("+5215512345678");

    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(webhookSecret);
    expect(row.apiKeyCipher).toBeTruthy();
    expect(row.webhookSecretCipher).toBeTruthy();

    const { decryptSecret } = await import("@/lib/crypto");
    expect(
      decryptSecret({
        cipher: row.apiKeyCipher as string,
        iv: row.apiKeyIv as string,
        tag: row.apiKeyTag as string,
      })
    ).toBe(apiKey);

    expect(
      decryptSecret({
        cipher: row.webhookSecretCipher as string,
        iv: row.webhookSecretIv as string,
        tag: row.webhookSecretTag as string,
      })
    ).toBe(webhookSecret);

    expect(apiKeyLast4(apiKey)).toBe("cdef");
    expect(normalizeE164("+52 55 1111 2222")).toBe("+525511112222");
  });
});
