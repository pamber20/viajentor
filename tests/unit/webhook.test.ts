import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  isPayloadSizeValid,
  isValidSignature,
  isValidWebhookToken,
  MAX_WEBHOOK_PAYLOAD_BYTES,
  safeEqual,
} from "@/server/inbox/webhook";

describe("capa 1: token en la ruta (FR-041/FR-083)", () => {
  it("segmento correcto → válido", () => {
    expect(isValidWebhookToken("token-abc", "token-abc")).toBe(true);
  });

  it("segmento incorrecto → inválido (la ruta responde 404)", () => {
    expect(isValidWebhookToken("token-xyz", "token-abc")).toBe(false);
  });

  it("verify token vacío jamás valida", () => {
    expect(isValidWebhookToken("", "")).toBe(false);
  });
});

describe("capa 2: firma x-hub-signature-256 (FR-042)", () => {
  const secret = "app-secret-de-prueba";
  const body = JSON.stringify({ object: "whatsapp_business_account" });

  function sign(payload: string, key: string): string {
    return `sha256=${createHmac("sha256", key).update(payload, "utf8").digest("hex")}`;
  }

  it("firma válida → pasa", () => {
    expect(isValidSignature(body, sign(body, secret), secret)).toBe(true);
  });

  it("firma inválida → rechaza (la ruta responde 401)", () => {
    expect(isValidSignature(body, sign(body, "otro-secreto"), secret)).toBe(
      false
    );
  });

  it("firma de otro body → rechaza", () => {
    expect(isValidSignature("{}", sign(body, secret), secret)).toBe(false);
  });

  it("header ausente con secreto configurado → rechaza", () => {
    expect(isValidSignature(body, null, secret)).toBe(false);
  });

  it("sin secreto configurado la capa está desactivada → pasa", () => {
    expect(isValidSignature(body, null, undefined)).toBe(true);
    expect(isValidSignature(body, "sha256=basura", undefined)).toBe(true);
  });
});

describe("protección de tamaño de payload en webhooks (DoS mitigation)", () => {
  it("permite payloads normales menores al límite", () => {
    const req = new Request("http://localhost/api/webhooks/wa/test", {
      headers: { "content-length": "1024" },
    });
    expect(isPayloadSizeValid(req, "x".repeat(1024))).toBe(true);
  });

  it("rechaza si content-length excede MAX_WEBHOOK_PAYLOAD_BYTES", () => {
    const req = new Request("http://localhost/api/webhooks/wa/test", {
      headers: { "content-length": String(MAX_WEBHOOK_PAYLOAD_BYTES + 1) },
    });
    expect(isPayloadSizeValid(req)).toBe(false);
  });

  it("rechaza si el body leído excede MAX_WEBHOOK_PAYLOAD_BYTES", () => {
    const req = new Request("http://localhost/api/webhooks/wa/test");
    const hugeBody = "a".repeat(MAX_WEBHOOK_PAYLOAD_BYTES + 10);
    expect(isPayloadSizeValid(req, hugeBody)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("longitudes distintas no lanzan", () => {
    expect(safeEqual("a", "aa")).toBe(false);
  });
});
