import { createHmac } from "node:crypto";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { normalizeMx } from "@/lib/meta/client";
import { ingestInboundMessage } from "@/server/inbox/ingest";
import { applyStatusUpdate } from "@/server/inbox/status";
import { safeEqual } from "@/server/inbox/webhook";
import { saveMediaFile } from "@/server/whatsapp/media";
import { getYCloudCredentialsByPhoneNumber } from "./credentials";

/**
 * Valida la firma HMAC-SHA256 enviada por YCloud en el encabezado
 * `YCloud-Signature` o `X-YCloud-Signature`.
 */
export function isValidYCloudSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret?: string | null
): boolean {
  if (!webhookSecret) return true;
  if (!signatureHeader) return false;

  let timestamp = "";
  let signature = "";

  const parts = signatureHeader.split(",");
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (k?.trim() === "t") timestamp = v?.trim() ?? "";
    if (k?.trim() === "v1") signature = v?.trim() ?? "";
  }

  if (timestamp && signature) {
    const payloadToSign = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", webhookSecret)
      .update(payloadToSign, "utf8")
      .digest("hex");
    return safeEqual(expected, signature);
  }

  const cleanSig = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  const expectedDirect = createHmac("sha256", webhookSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  return safeEqual(expectedDirect, cleanSig);
}

export type YCloudWebhookInboundEvent = {
  id: string;
  type: "whatsapp.inbound_message";
  createTime?: string;
  whatsappInboundMessage: {
    id: string;
    from: string;
    to: string;
    customerProfile?: { name?: string };
    type: string;
    text?: { body?: string };
    image?: { link?: string; caption?: string; mimeType?: string };
    audio?: { link?: string; mimeType?: string };
    video?: { link?: string; caption?: string; mimeType?: string };
    document?: { link?: string; filename?: string; mimeType?: string };
    button?: { text?: string; payload?: string };
    interactive?: {
      button_reply?: { id?: string; title?: string };
      list_reply?: { id?: string; title?: string };
    };
  };
};

export type YCloudWebhookStatusEvent = {
  id: string;
  type: "whatsapp.message.updated";
  createTime?: string;
  whatsappMessage: {
    id: string;
    from?: string;
    to?: string;
    status: "accepted" | "sent" | "delivered" | "read" | "failed";
    errorCode?: string;
    errorMessage?: string;
  };
};

export type YCloudWebhookPayload =
  | YCloudWebhookInboundEvent
  | YCloudWebhookStatusEvent
  | Record<string, unknown>;

const STATUS_MAP: Record<string, "sent" | "delivered" | "read" | "failed"> = {
  accepted: "sent",
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
};

function parseEventTimestamp(createTime?: unknown): string {
  if (typeof createTime === "string" && createTime) {
    const parsed = new Date(createTime).getTime();
    if (!Number.isNaN(parsed)) {
      return String(Math.floor(parsed / 1000));
    }
  }
  return String(Math.floor(Date.now() / 1000));
}

/**
 * Procesa el evento de webhook recibido desde YCloud.
 */
export async function processYCloudWebhookPayload(
  payload: YCloudWebhookPayload
): Promise<void> {
  if (!payload || typeof payload !== "object" || !("type" in payload)) {
    return;
  }

  if (payload.type === "whatsapp.inbound_message") {
    const inbound = (payload as YCloudWebhookInboundEvent).whatsappInboundMessage;
    if (!inbound?.to || !inbound.from || !inbound.id) return;

    const creds = await getYCloudCredentialsByPhoneNumber(inbound.to);
    if (!creds) {
      console.warn(
        `[ycloud-webhook] mensaje para número no registrado en CRM (${inbound.to}): descartado`
      );
      return;
    }

    const rawFrom = inbound.from.replace(/^\+/, "").trim();
    const fromPhone = normalizeMx(rawFrom);

    let type = inbound.type || "text";
    let text: string | null = null;

    if (type === "button") {
      text = inbound.button?.text?.trim() ?? inbound.button?.payload?.trim() ?? null;
      type = "text";
    } else if (type === "interactive") {
      const reply = inbound.interactive?.button_reply ?? inbound.interactive?.list_reply;
      text = reply?.title?.trim() ?? reply?.id?.trim() ?? null;
      type = "text";
    } else if (type === "text") {
      text = inbound.text?.body?.trim() ?? null;
    }

    // Procesamiento de adjuntos multimedia si vienen
    let mediaInput: {
      kind: (typeof schema.mediaAsset.$inferSelect)["kind"];
      waMediaId: string | null;
      mimeType: string | null;
      fileName: string | null;
      caption: string | null;
      payload: unknown;
      fetchStatus: "available" | "pending";
    } | null = null;

    const isMedia = ["image", "audio", "video", "document"].includes(inbound.type);
    if (isMedia) {
      const kind = inbound.type as "image" | "audio" | "video" | "document";
      const mediaObj = inbound[kind];
      const link = mediaObj?.link;
      const caption = "caption" in (mediaObj ?? {}) ? (mediaObj as { caption?: string }).caption ?? null : null;
      const fileName = "filename" in (mediaObj ?? {}) ? (mediaObj as { filename?: string }).filename ?? null : null;
      const mimeType = "mimeType" in (mediaObj ?? {}) ? (mediaObj as { mimeType?: string }).mimeType ?? null : null;

      const assetId = newId("mediaAsset");
      let storagePath: string | null = null;
      let fileSize = 0;

      if (link) {
        try {
          const dlRes = await fetch(link);
          if (dlRes.ok) {
            const buf = Buffer.from(await dlRes.arrayBuffer());
            storagePath = await saveMediaFile(creds.organizationId, assetId, buf);
            fileSize = buf.byteLength;
          }
        } catch (err) {
          console.warn("[ycloud-webhook] fallo descargando archivo de link:", err);
        }
      }

      const db = getDb();
      await db.insert(schema.mediaAsset).values({
        id: assetId,
        organizationId: creds.organizationId,
        kind,
        mimeType,
        fileName,
        fileSize,
        caption,
        storagePath,
        fetchStatus: storagePath ? "available" : "pending",
      });

      mediaInput = {
        kind,
        waMediaId: null,
        mimeType,
        fileName,
        caption,
        payload: null,
        fetchStatus: storagePath ? "available" : "pending",
      };
    }

    await ingestInboundMessage({
      organizationId: creds.organizationId,
      identity: {
        identity: fromPhone,
        channel: "whatsapp",
        phone: fromPhone,
        waUserId: null,
        profileName: inbound.customerProfile?.name?.trim() || null,
      },
      waMessageId: inbound.id,
      type,
      text,
      timestamp: parseEventTimestamp("createTime" in payload ? payload.createTime : undefined),
      media: mediaInput,
      anuncio: null,
    });
  } else if (payload.type === "whatsapp.message.updated") {
    const statusEvt = (payload as YCloudWebhookStatusEvent).whatsappMessage;
    if (!statusEvt?.id || !statusEvt.status) return;

    const senderPhone = statusEvt.from || statusEvt.to;
    if (!senderPhone) return;

    const creds = await getYCloudCredentialsByPhoneNumber(senderPhone);
    if (!creds) return;

    const nextStatus = STATUS_MAP[statusEvt.status] ?? "sent";

    await applyStatusUpdate(creds.organizationId, {
      id: statusEvt.id,
      status: nextStatus,
      timestamp: parseEventTimestamp("createTime" in payload ? payload.createTime : undefined),
      errors: statusEvt.errorCode
        ? [
            {
              code: Number(statusEvt.errorCode) || 0,
              message: statusEvt.errorMessage,
            },
          ]
        : undefined,
    });
  }
}
