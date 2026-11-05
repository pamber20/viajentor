import { z } from "zod";
import { apiError, parseBody, withAuth, withConfigAuth } from "@/lib/api";
import {
  desconectarCanal,
  getCredentialsByOrg,
  saveCredentials,
  tokenLast4,
} from "@/server/whatsapp/credentials";
import {
  registerWebhookForNumber,
  testConnection,
  unregisterWebhookForNumber,
} from "@/server/whatsapp/connect";
import {
  webhookPath,
  webhookUrl,
  webhookVerifyToken,
} from "@/server/whatsapp/webhook-url";

import {
  desconectarYCloud,
  getYCloudCredentialsByOrg,
  apiKeyLast4,
} from "@/server/ycloud/credentials";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const ycloud = await getYCloudCredentialsByOrg(session.organizationId);
  if (ycloud) {
    return Response.json({
      connection: {
        provider: "ycloud",
        phoneNumber: ycloud.phoneNumber,
        displayPhoneNumber: ycloud.displayPhoneNumber,
        verifiedName: ycloud.verifiedName,
        status: ycloud.status,
        apiKeyLast4: apiKeyLast4(ycloud.apiKey),
        hasWebhookSecret: Boolean(ycloud.webhookSecret),
      },
    });
  }

  const creds = await getCredentialsByOrg(session.organizationId);
  if (!creds) return Response.json({ connection: null });
  return Response.json({
    connection: {
      provider: "meta",
      wabaId: creds.wabaId,
      phoneNumberId: creds.phoneNumberId,
      displayPhoneNumber: creds.displayPhoneNumber,
      verifiedName: creds.verifiedName,
      status: creds.status,
      tokenLast4: tokenLast4(creds.token),
    },
  });
});

const putSchema = z.object({
  wabaId: z.string().trim().min(1),
  phoneNumberId: z.string().trim().min(1),
  token: z.string().trim().min(1),
});

/**
 * Guarda la conexión: re-valida contra Meta, cifra (FR-040) y registra el
 * webhook de esta instancia en el número.
 *
 * Antes el CRM solo suscribía la app a la WABA y la URL había que pegarla a
 * mano en el panel de Meta. Si Meta rechaza el registro, la conexión YA está
 * guardada y es válida: se avisa en `webhook` y la tarjeta del webhook ofrece
 * reintentar (o pegar la URL a mano, que sigue a la vista).
 */
export const PUT = withConfigAuth(async (session, req: Request) => {
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;

  const check = await testConnection(body.data.phoneNumberId, body.data.token);
  if (!check.ok) {
    const status = check.code === "meta_unavailable" ? 503 : 422;
    return apiError(status, check.code, check.message);
  }

  await desconectarYCloud(session.organizationId);

  await saveCredentials({
    organizationId: session.organizationId,
    wabaId: body.data.wabaId,
    phoneNumberId: body.data.phoneNumberId,
    token: body.data.token,
    displayPhoneNumber: check.displayPhoneNumber,
    verifiedName: check.verifiedName,
  });

  const webhook = await registerWebhookForNumber({
    wabaId: body.data.wabaId,
    phoneNumberId: body.data.phoneNumberId,
    token: body.data.token,
    webhookUrl: webhookUrl("wa"),
    verifyToken: webhookVerifyToken(),
  });

  return Response.json({
    ok: true,
    displayPhoneNumber: check.displayPhoneNumber,
    webhook,
  });
});

/**
 * Desconectar el número. Sin esto, conectar era una calle de un solo
 * sentido: la unicidad del número impedía moverlo a otra instancia y no había
 * pantalla donde soltarlo.
 *
 * Primero quita el override del webhook que puso el guardado —con el token
 * todavía a mano; sin él no se podría— y después borra las credenciales. No
 * borra la bandeja: las conversaciones son de la organización, no de la
 * conexión. Idempotente: sin conexión responde 200 igual.
 */
export const DELETE = withConfigAuth(async (session) => {
  await desconectarYCloud(session.organizationId);
  const creds = await getCredentialsByOrg(session.organizationId);
  if (creds) {
    await unregisterWebhookForNumber({
      phoneNumberId: creds.phoneNumberId,
      token: creds.token,
      webhookPath: webhookPath("wa"),
    });
  }
  await desconectarCanal(session.organizationId);
  return Response.json({ ok: true });
});

