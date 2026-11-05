import { z } from "zod";
import { apiError, parseBody, withAuth, withConfigAuth } from "@/lib/api";
import {
  apiKeyLast4,
  desconectarYCloud,
  getYCloudCredentialsByOrg,
  saveYCloudCredentials,
} from "@/server/ycloud/credentials";
import { testYCloudConnection } from "@/lib/ycloud/client";
import { desconectarCanal, getCredentialsByOrg } from "@/server/whatsapp/credentials";
import { unregisterWebhookForNumber } from "@/server/whatsapp/connect";
import { webhookPath } from "@/server/whatsapp/webhook-url";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const creds = await getYCloudCredentialsByOrg(session.organizationId);
  if (!creds) return Response.json({ connection: null });

  return Response.json({
    connection: {
      provider: "ycloud",
      phoneNumber: creds.phoneNumber,
      displayPhoneNumber: creds.displayPhoneNumber,
      verifiedName: creds.verifiedName,
      status: creds.status,
      apiKeyLast4: apiKeyLast4(creds.apiKey),
      hasWebhookSecret: Boolean(creds.webhookSecret),
    },
  });
});

const putSchema = z.object({
  phoneNumber: z.string().trim().min(5, "Número de teléfono requerido"),
  apiKey: z.string().trim().min(5, "API Key requerida"),
  webhookSecret: z.string().trim().optional().nullable(),
});

/**
 * Guarda o actualiza la conexión de YCloud para la agencia (tenant).
 */
export const PUT = withConfigAuth(async (session, req: Request) => {
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;

  // 1. Probar validez de credenciales contra YCloud
  const check = await testYCloudConnection(body.data.apiKey, body.data.phoneNumber);
  if (!check.ok) {
    const status = check.code === "network_error" ? 503 : 422;
    return apiError(status, check.code, check.message);
  }

  // 2. Si había una conexión previa de Meta, desconectarla limpiamente
  const metaCreds = await getCredentialsByOrg(session.organizationId);
  if (metaCreds) {
    try {
      await unregisterWebhookForNumber({
        phoneNumberId: metaCreds.phoneNumberId,
        token: metaCreds.token,
        webhookPath: webhookPath("wa"),
      });
    } catch {
      // Ignorar fallo de unregister si el token expiró
    }
    await desconectarCanal(session.organizationId);
  }

  // 3. Guardar credenciales cifradas de YCloud
  await saveYCloudCredentials({
    organizationId: session.organizationId,
    phoneNumber: body.data.phoneNumber,
    apiKey: body.data.apiKey,
    webhookSecret: body.data.webhookSecret,
    displayPhoneNumber: check.displayPhoneNumber,
    verifiedName: check.verifiedName,
  });

  return Response.json({
    ok: true,
    displayPhoneNumber: check.displayPhoneNumber,
    verifiedName: check.verifiedName,
  });
});

/**
 * Desconectar el proveedor YCloud.
 */
export const DELETE = withConfigAuth(async (session) => {
  await desconectarYCloud(session.organizationId);
  return Response.json({ ok: true });
});
