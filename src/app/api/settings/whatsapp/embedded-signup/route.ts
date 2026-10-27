import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  getEmbeddedSignupConfig,
  processEmbeddedSignup,
} from "@/server/whatsapp/embedded-signup";
import { MetaApiError } from "@/lib/meta/client";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_session, _req: Request) => {
  const config = getEmbeddedSignupConfig();
  return Response.json(config);
});

const postSchema = z.object({
  code: z.string().trim().min(1, "El código de autorización es requerido"),
  wabaId: z.string().trim().optional().nullable(),
  phoneNumberId: z.string().trim().optional().nullable(),
});

/**
 * Endpoint invocado tras completar el popup de Meta Embedded Signup:
 * intercambia el código, obtiene el token del cliente, vincula el número,
 * cifra credenciales y suscribe los webhooks.
 */
export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, postSchema);
  if (!body.ok) return body.response;

  try {
    const result = await processEmbeddedSignup({
      organizationId: session.organizationId,
      code: body.data.code,
      wabaId: body.data.wabaId,
      phoneNumberId: body.data.phoneNumberId,
    });

    return Response.json(result);
  } catch (err) {
    if (err instanceof MetaApiError) {
      const status = err.isAuthError ? 401 : err.status >= 500 ? 503 : 422;
      return apiError(status, "meta_error", err.message);
    }
    const message = err instanceof Error ? err.message : "Error al procesar Embedded Signup";
    return apiError(422, "embedded_signup_failed", message);
  }
});
