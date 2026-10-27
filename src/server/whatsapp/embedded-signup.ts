import { getEnv } from "@/lib/env";
import { graphRequest, MetaApiError } from "@/lib/meta/client";
import {
  registerWebhookForNumber,
  testConnection,
  type WebhookRegistration,
} from "./connect";
import { saveCredentials } from "./credentials";
import { webhookUrl, webhookVerifyToken } from "./webhook-url";

export type EmbeddedSignupConfig = {
  enabled: boolean;
  appId: string | null;
  configId: string | null;
};

export function getEmbeddedSignupConfig(): EmbeddedSignupConfig {
  const env = getEnv();
  const appId = env.META_APP_ID ?? null;
  const configId = env.META_APP_CONFIG_ID ?? null;
  const secret = env.META_APP_SECRET ?? null;
  return {
    enabled: Boolean(appId && secret),
    appId,
    configId,
  };
}

type OAuthTokenResponse = {
  access_token: string;
  token_type?: string;
  expires_in?: number;
};

type DebugTokenResponse = {
  data?: {
    app_id?: string;
    type?: string;
    is_valid?: boolean;
    granular_scopes?: Array<{
      scope: string;
      target_ids?: string[];
    }>;
  };
};

type PhoneNumbersResponse = {
  data?: Array<{
    id: string;
    display_phone_number?: string;
    verified_name?: string;
  }>;
};

/**
 * Intercambia el `code` devuelto por Meta Embedded Signup por un token de acceso
 * de larga duración / sistema delegado para el WABA.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const env = getEnv();
  if (!env.META_APP_ID || !env.META_APP_SECRET) {
    throw new Error(
      "META_APP_ID y META_APP_SECRET son obligatorios para el flujo de Embedded Signup."
    );
  }

  const url = `${env.META_GRAPH_BASE_URL}/${env.META_GRAPH_API_VERSION}/oauth/access_token?` +
    new URLSearchParams({
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      code,
    }).toString();

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as {
      error?: { message?: string; type?: string; code?: number };
    } | null;
    throw new MetaApiError(
      errorBody?.error?.message ?? "Error al intercambiar el código con Meta",
      {
        status: res.status,
        code: errorBody?.error?.code,
        type: errorBody?.error?.type,
        details: errorBody,
      }
    );
  }

  const data = (await res.json()) as OAuthTokenResponse;
  if (!data.access_token) {
    throw new Error("Meta no devolvió un access_token en la respuesta OAuth");
  }
  return data.access_token;
}

/**
 * Si el frontend no logró extraer wabaId o phoneNumberId del sessionInfoListener,
 * los resuelve consultando a la Graph API con el token obtenido.
 */
export async function resolveWabaAndPhone(opts: {
  token: string;
  wabaId?: string | null;
  phoneNumberId?: string | null;
}): Promise<{ wabaId: string; phoneNumberId: string }> {
  const env = getEnv();
  let resolvedWaba = opts.wabaId?.trim() || null;
  let resolvedPhone = opts.phoneNumberId?.trim() || null;

  // Si falta wabaId, inspeccionamos el token con debug_token
  if (!resolvedWaba && env.META_APP_ID && env.META_APP_SECRET) {
    try {
      const debugRes = await graphRequest<DebugTokenResponse>(
        `debug_token?input_token=${encodeURIComponent(opts.token)}`,
        {
          token: `${env.META_APP_ID}|${env.META_APP_SECRET}`,
        }
      );
      const wabaScope = debugRes.data?.granular_scopes?.find(
        (s) => s.scope === "whatsapp_business_management"
      );
      if (wabaScope?.target_ids?.[0]) {
        resolvedWaba = wabaScope.target_ids[0];
      }
    } catch (err) {
      console.warn("[embedded-signup] no se pudo resolver wabaId vía debug_token:", err);
    }
  }

  if (!resolvedWaba) {
    throw new Error(
      "No se pudo determinar el WABA ID de la cuenta autorizada. Intenta de nuevo."
    );
  }

  // Si falta phoneNumberId, consultamos los números asociados a la WABA
  if (!resolvedPhone) {
    const phonesRes = await graphRequest<PhoneNumbersResponse>(
      `${resolvedWaba}/phone_numbers?fields=id,display_phone_number,verified_name`,
      { token: opts.token }
    );
    const firstPhone = phonesRes.data?.[0];
    if (!firstPhone?.id) {
      throw new Error(
        "No se encontró ningún número de WhatsApp asociado a esta WABA."
      );
    }
    resolvedPhone = firstPhone.id;
  }

  return { wabaId: resolvedWaba, phoneNumberId: resolvedPhone };
}

export type EmbeddedSignupResult = {
  ok: true;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  webhook: WebhookRegistration;
};

/**
 * Proceso completo de conexión mediante Embedded Signup:
 * 1. Intercambia el código por el token.
 * 2. Resuelve WABA ID y Phone Number ID si no venían completos.
 * 3. Valida conectividad y metadatos con Meta.
 * 4. Guarda credenciales cifradas asociadas a la organización.
 * 5. Registra el webhook de la instancia en Meta.
 */
export async function processEmbeddedSignup(opts: {
  organizationId: string;
  code: string;
  wabaId?: string | null;
  phoneNumberId?: string | null;
}): Promise<EmbeddedSignupResult> {
  const token = await exchangeCodeForToken(opts.code);
  const { wabaId, phoneNumberId } = await resolveWabaAndPhone({
    token,
    wabaId: opts.wabaId,
    phoneNumberId: opts.phoneNumberId,
  });

  const check = await testConnection(phoneNumberId, token);
  if (!check.ok) {
    throw new Error(`Validación de conexión fallida: ${check.message}`);
  }

  await saveCredentials({
    organizationId: opts.organizationId,
    wabaId,
    phoneNumberId,
    token,
    displayPhoneNumber: check.displayPhoneNumber,
    verifiedName: check.verifiedName,
  });

  const webhook = await registerWebhookForNumber({
    wabaId,
    phoneNumberId,
    token,
    webhookUrl: webhookUrl("wa"),
    verifyToken: webhookVerifyToken(),
  });

  return {
    ok: true,
    wabaId,
    phoneNumberId,
    displayPhoneNumber: check.displayPhoneNumber,
    verifiedName: check.verifiedName,
    webhook,
  };
}
