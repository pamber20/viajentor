import { createHmac } from "node:crypto";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockIngestInboundMessage = vi.hoisted(() => vi.fn(async () => {}));
const mockApplyStatusUpdate = vi.hoisted(() => vi.fn(async () => {}));
const mockGetYCloudCredentialsByPhoneNumber = vi.hoisted(() =>
  vi.fn(async (phone: string) => {
    if (phone === "+1234567890") {
      return {
        id: "ycred_1",
        organizationId: "org_ycloud_1",
        phoneNumber: "+1234567890",
        displayPhoneNumber: "+1 234 567 890",
        verifiedName: "Viajentor Tours",
        status: "connected" as const,
        apiKey: "sk_test_123",
        webhookSecret: "secret_wh_123",
      };
    }
    return null;
  })
);

vi.mock("@/server/inbox/ingest", () => ({
  ingestInboundMessage: mockIngestInboundMessage,
}));

vi.mock("@/server/inbox/status", () => ({
  applyStatusUpdate: mockApplyStatusUpdate,
}));

vi.mock("@/server/ycloud/credentials", () => ({
  getYCloudCredentialsByPhoneNumber: mockGetYCloudCredentialsByPhoneNumber,
}));

vi.mock("@/lib/db", () => ({
  getDb: () => ({
    insert: () => ({
      values: () => Promise.resolve(),
    }),
  }),
  schema: {
    mediaAsset: {},
  },
}));

import {
  isValidYCloudSignature,
  processYCloudWebhookPayload,
} from "@/server/ycloud/webhook";

describe("YCloud Webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isValidYCloudSignature", () => {
    const secret = "test_webhook_secret_key";
    const body = JSON.stringify({ hello: "world" });
    const timestamp = "1672531199";

    it("valida una firma correcta en formato t=...,v1=...", () => {
      const payloadToSign = `${timestamp}.${body}`;
      const signature = createHmac("sha256", secret).update(payloadToSign).digest("hex");
      const header = `t=${timestamp},v1=${signature}`;

      expect(isValidYCloudSignature(body, header, secret)).toBe(true);
    });

    it("rechaza una firma manipulada", () => {
      const header = `t=${timestamp},v1=bad_signature_here`;
      expect(isValidYCloudSignature(body, header, secret)).toBe(false);
    });

    it("permite el paso si no hay secreto configurado (capa opcional)", () => {
      expect(isValidYCloudSignature(body, "any_sig", null)).toBe(true);
      expect(isValidYCloudSignature(body, "any_sig", undefined)).toBe(true);
    });

    it("rechaza si hay secreto configurado pero falta el header", () => {
      expect(isValidYCloudSignature(body, null, secret)).toBe(false);
    });
  });

  describe("processYCloudWebhookPayload", () => {
    it("procesa un mensaje entrante de WhatsApp", async () => {
      await processYCloudWebhookPayload({
        id: "evt_1",
        type: "whatsapp.inbound_message",
        createTime: "2026-11-05T10:00:00Z",
        whatsappInboundMessage: {
          id: "wamid_inbound_1",
          from: "+5215512345678",
          to: "+1234567890",
          customerProfile: { name: "Maria Viajera" },
          type: "text",
          text: { body: "Hola, información de paquetes a Europa" },
        },
      });

      expect(mockIngestInboundMessage).toHaveBeenCalledTimes(1);
      expect(mockIngestInboundMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org_ycloud_1",
          waMessageId: "wamid_inbound_1",
          type: "text",
          text: "Hola, información de paquetes a Europa",
          identity: expect.objectContaining({
            phone: "525512345678",
            profileName: "Maria Viajera",
          }),
        })
      );
    });

    it("procesa una actualización de estado de mensaje (delivered)", async () => {
      await processYCloudWebhookPayload({
        id: "evt_2",
        type: "whatsapp.message.updated",
        createTime: "2026-11-05T10:01:00Z",
        whatsappMessage: {
          id: "wamid_outbound_1",
          from: "+1234567890",
          to: "+5215512345678",
          status: "delivered",
        },
      });

      expect(mockApplyStatusUpdate).toHaveBeenCalledTimes(1);
      expect(mockApplyStatusUpdate).toHaveBeenCalledWith(
        "org_ycloud_1",
        expect.objectContaining({
          id: "wamid_outbound_1",
          status: "delivered",
        })
      );
    });
  });
});
