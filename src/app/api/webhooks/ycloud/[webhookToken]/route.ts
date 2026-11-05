import { after } from "next/server";
import { getEnv } from "@/lib/env";
import {
  isPayloadSizeValid,
  isValidWebhookToken,
} from "@/server/inbox/webhook";
import {
  isValidYCloudSignature,
  processYCloudWebhookPayload,
  type YCloudWebhookPayload,
} from "@/server/ycloud/webhook";
import { getYCloudCredentialsByPhoneNumber } from "@/server/ycloud/credentials";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ webhookToken: string }> };

export async function GET(req: Request, { params }: Params) {
  const { webhookToken } = await params;
  const env = getEnv();
  if (!isValidWebhookToken(webhookToken, env.META_WEBHOOK_VERIFY_TOKEN)) {
    return new Response(null, { status: 404 });
  }
  return new Response("OK", { status: 200 });
}

export async function POST(req: Request, { params }: Params) {
  const { webhookToken } = await params;
  const env = getEnv();
  if (!isValidWebhookToken(webhookToken, env.META_WEBHOOK_VERIFY_TOKEN)) {
    return new Response(null, { status: 404 });
  }

  if (!isPayloadSizeValid(req)) {
    return new Response(null, { status: 413 });
  }

  const rawBody = await req.text();
  if (!isPayloadSizeValid(req, rawBody)) {
    return new Response(null, { status: 413 });
  }

  let payload: YCloudWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as YCloudWebhookPayload;
  } catch {
    return Response.json({ received: true });
  }

  const signatureHeader =
    req.headers.get("ycloud-signature") ||
    req.headers.get("x-ycloud-signature");

  // Si el evento tiene número asociado, podemos consultar si la agencia configuró un webhookSecret
  let secret: string | null = null;
  const phone =
    "whatsappInboundMessage" in payload && payload.whatsappInboundMessage
      ? (payload.whatsappInboundMessage as { to?: string }).to
      : "whatsappMessage" in payload && payload.whatsappMessage
      ? (payload.whatsappMessage as { from?: string; to?: string }).from ||
        (payload.whatsappMessage as { from?: string; to?: string }).to
      : null;

  if (phone) {
    const creds = await getYCloudCredentialsByPhoneNumber(phone);
    if (creds?.webhookSecret) {
      secret = creds.webhookSecret;
    }
  }

  if (secret && !isValidYCloudSignature(rawBody, signatureHeader, secret)) {
    return new Response(null, { status: 401 });
  }

  after(async () => {
    try {
      await processYCloudWebhookPayload(payload);
    } catch (err) {
      console.error("[ycloud-webhook] error procesando payload:", err);
    }
  });

  return Response.json({ received: true });
}
