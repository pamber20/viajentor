import { z } from "zod";
import {
  requireSession,
  TenantSuspendedError,
  UnauthorizedError,
  type SessionContext,
} from "@/lib/auth/session";
import { canConfigure } from "@/lib/auth/roles";

/** Respuesta de error estándar de la API interna (contrato api.md). */
export function apiError(
  status: number,
  code: string,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

export type AuthGuardOptions = {
  roles?: string[];
  requireConfigRole?: boolean;
};

/**
 * Envuelve un route handler autenticado: resuelve la sesión (401 si no hay),
 * comprueba permisos/roles si se configuran (403 forbidden), captura errores
 * no controlados (500 sin stack) y deja pasar Response.
 */
export function withAuth<Args extends unknown[]>(
  handlerOrOptions:
    | ((session: SessionContext, ...args: Args) => Promise<Response>)
    | AuthGuardOptions,
  maybeHandler?: (session: SessionContext, ...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  const options: AuthGuardOptions =
    typeof handlerOrOptions === "function" ? {} : handlerOrOptions;
  const handler =
    typeof handlerOrOptions === "function" ? handlerOrOptions : maybeHandler!;

  return async (...args: Args) => {
    let session: SessionContext;
    try {
      session = await requireSession();
    } catch (err) {
      if (err instanceof TenantSuspendedError) {
        return apiError(403, "tenant_suspended", err.message);
      }
      if (err instanceof UnauthorizedError) {
        return apiError(401, "unauthorized", "No autenticado");
      }
      throw err;
    }

    if (options.requireConfigRole && !canConfigure(session.role)) {
      return apiError(
        403,
        "forbidden",
        "Se requiere rol de configuración (propietario o administrador)"
      );
    }

    if (
      options.roles &&
      options.roles.length > 0 &&
      !options.roles.includes(session.role)
    ) {
      return apiError(403, "forbidden", "No tienes permisos para esta acción");
    }

    try {
      return await handler(session, ...args);
    } catch (err) {
      console.error("[api] error no controlado:", err);
      return apiError(500, "internal", "Error interno");
    }
  };
}

/**
 * Atajo para endpoints que requieren rol de configuración (owner o admin),
 * como ajustes, KB, prompts, etc.
 */
export function withConfigAuth<Args extends unknown[]>(
  handler: (session: SessionContext, ...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return withAuth({ requireConfigRole: true }, handler);
}


/** Parsea el body JSON con un esquema Zod; inválido → Response 422. */
export async function parseBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return {
      ok: false,
      response: apiError(422, "invalid_body", "El body debe ser JSON válido"),
    };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return {
      ok: false,
      response: apiError(422, "invalid_body", detail),
    };
  }
  return { ok: true, data: parsed.data };
}
