import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  sendYCloudMessage,
  testYCloudConnection,
  uploadYCloudMedia,
  YCloudApiError,
} from "@/lib/ycloud/client";

describe("YCloud Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("testYCloudConnection", () => {
    it("devuelve ok: true cuando el número está en la lista de items", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              phoneNumber: "+5215512345678",
              displayPhoneNumber: "+52 1 55 1234 5678",
              verifiedName: "Viajentor Agencia",
            },
          ],
        }),
      } as unknown as Response);

      const res = await testYCloudConnection("sk_valid_key", "+52 1 55 1234 5678");
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.displayPhoneNumber).toBe("+52 1 55 1234 5678");
        expect(res.verifiedName).toBe("Viajentor Agencia");
      }
    });

    it("devuelve error si la API Key es rechazada con 401", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as unknown as Response);

      const res = await testYCloudConnection("sk_invalid_key", "+5215512345678");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("invalid_api_key");
      }
    });

    it("devuelve error si el número no coincide con ninguno registrado", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              phoneNumber: "+1234567890",
              displayPhoneNumber: "+1 234 567 890",
            },
          ],
        }),
      } as unknown as Response);

      const res = await testYCloudConnection("sk_valid_key", "+525599999999");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("phone_not_found");
      }
    });
  });

  describe("sendYCloudMessage", () => {
    it("envía mensaje y retorna id", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "wamid_sent_123", status: "accepted" }),
      } as unknown as Response);

      const id = await sendYCloudMessage("sk_test", {
        from: "+1234567890",
        to: "+5215512345678",
        type: "text",
        text: { body: "Hola" },
      });

      expect(id).toBe("wamid_sent_123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.ycloud.com/v2/whatsapp/messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-API-Key": "sk_test",
          }),
        })
      );
    });

    it("lanza YCloudApiError con status 401 cuando la API Key expira", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Unauthorized", code: "unauthorized" } }),
      } as unknown as Response);

      await expect(
        sendYCloudMessage("sk_expired", { from: "+1", to: "+2", type: "text" })
      ).rejects.toThrow(YCloudApiError);
    });
  });

  describe("uploadYCloudMedia", () => {
    it("sube archivo y retorna URL o ID", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "file_999", url: "https://api.ycloud.com/v2/files/file_999" }),
      } as unknown as Response);

      const url = await uploadYCloudMedia("sk_test", {
        data: Buffer.from("fake-image-bytes"),
        mimeType: "image/jpeg",
        fileName: "voucher.jpg",
      });

      expect(url).toBe("https://api.ycloud.com/v2/files/file_999");
    });
  });
});
