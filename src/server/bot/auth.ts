import { timingSafeEqual } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { apiError } from "@/lib/api";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { markBotSeen } from "@/server/bot/status";

/**
 * Autenticación de la API de servicio `/api/bot/*`.
 *
 * Esta superficie NO la consume el navegador: la consume un cerebro externo
 * (un microservicio propio del operador, en su mismo servidor) que quiere
 * conducir la conversación sin que el token de WhatsApp salga del CRM.
 * Header `X-API-Key` contra `BOT_API_KEY` (env), comparación en tiempo
 * constante. Sin `BOT_API_KEY` configurada, toda la superficie responde 401.
 *
 * Primero se autentica y DESPUÉS se cuenta. Antes había un solo cubo global
 * contado antes de mirar la key: 600 requests anónimos por minuto dejaban al
 * cerebro en 429 el resto de la ventana, y los clientes sin respuesta.
 */

const MIN_KEY_LENGTH = 16;

/** La superficie está abierta: hay `BOT_API_KEY` y no es débil. Una key
 *  corta equivale a no tenerla (todo responde 401). */
export function isBotKeyConfigured(): boolean {
  const key = process.env.BOT_API_KEY;
  return typeof key === "string" && key.length >= MIN_KEY_LENGTH;
}

/**
 * Presupuesto del cerebro AUTENTICADO: 1200/min (20/s sostenidos). Nea hace
 * ~4-10 llamadas por turno de cliente (contexto, "escribiendo…", 1-3
 * mensajes y, cuando aplica, ficha, handoff, agenda o adjuntos): alcanza para
 * 120-300 turnos por minuto, por encima del pico de un solo negocio. Un
 * cerebro desbocado en un bucle queda en 20/s, carga que el monolito absorbe
 * sin que la bandeja lo note.
 */
export const BOT_API_BUDGET = { windowMs: 60_000, max: 1200 };

/**
 * Autenticaciones FALLIDAS por IP: 30/min, y luego 429. Jamás tocan el
 * presupuesto de arriba, y una key correcta pasa aunque su IP esté frenada:
 * detrás del mismo proxy (o sin proxy, donde todo es "local") el cerebro puede
 * compartir IP con quien inunda. Adivinar la key tampoco es el riesgo: mide
 * 16+ caracteres.
 */
export const BOT_AUTH_FAILURES = { windowMs: 60_000, max: 30 };

export function requireBotKey(req: Request): Response | null {
  if (!validBotKey(req.headers.get("x-api-key"))) {
    const ip = clientIp(req.headers);
    const fails = checkRateLimit(`bot-api-fail:${ip}`, BOT_AUTH_FAILURES);
    return fails.allowed
      ? apiError(401, "unauthorized", "No autorizado")
      : apiError(429, "rate_limited", "Demasiados intentos fallidos");
  }
  // «Quién responde»: la única huella que deja el cerebro externo en el CRM.
  // Se marca al autenticar, antes del presupuesto: un cerebro frenado por 429
  // sigue siendo el que contesta.
  markBotSeen();
  const rl = checkRateLimit("bot-api", BOT_API_BUDGET);
  if (!rl.allowed) return apiError(429, "rate_limited", "Demasiadas solicitudes");
  return null;
}

function validBotKey(provided: string | null): boolean {
  const expected = process.env.BOT_API_KEY;
  if (!expected || !isBotKeyConfigured() || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type BotOrgResolution =
  | { ok: true; organizationId: string }
  | { ok: false; response: Response };

type OrgCacheEntry = { id: string; expiresAt: number };
const orgCache = new Map<string, OrgCacheEntry>();
const ORG_CACHE_TTL_MS = 60_000;

let cachedOrgId: string | null = null;

/**
 * Resuelve la organización para peticiones del bot.
 * En modo multi-tenant (múltiples agencias), extrae la cabecera
 * `x-vocero-organization` (slug o id) o `x-organization-id`.
 * Si no se provee cabecera y existe una sola organización en BD,
 * se permite por retrocompatibilidad mono-tenant. Si existen varias,
 * se devuelve null para exigir especificarla y evitar contaminación entre agencias.
 */
export async function resolveInstanceOrg(req?: Request): Promise<string | null> {
  const headerVal = req
    ? req.headers.get("x-vocero-organization")?.trim() ||
      req.headers.get("x-organization-id")?.trim()
    : null;

  let queryVal = headerVal;
  if (!queryVal && req) {
    try {
      const url = new URL(req.url);
      queryVal =
        url.searchParams.get("organizationId")?.trim() ||
        url.searchParams.get("org")?.trim() ||
        null;
    } catch {
      // req.url no es absoluta o parseable
    }
  }

  const db = getDb();
  const now = Date.now();

  if (queryVal) {
    const cached = orgCache.get(queryVal);
    if (cached && cached.expiresAt > now) {
      return cached.id;
    }

    const rows = await db
      .select({ id: schema.organization.id, slug: schema.organization.slug })
      .from(schema.organization)
      .where(
        or(
          eq(schema.organization.id, queryVal),
          eq(schema.organization.slug, queryVal)
        )
      )
      .limit(1);

    const found = rows[0];
    if (!found) return null;

    const entry: OrgCacheEntry = { id: found.id, expiresAt: now + ORG_CACHE_TTL_MS };
    orgCache.set(found.id, entry);
    if (found.slug) orgCache.set(found.slug, entry);

    return found.id;
  }

  if (cachedOrgId) return cachedOrgId;

  const orgs = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .limit(2);

  if (orgs.length === 1) {
    cachedOrgId = orgs[0]!.id;
    return cachedOrgId;
  }

  // 0 orgs o >1 org sin especificar cabecera:
  return null;
}

export async function resolveBotOrg(req: Request): Promise<BotOrgResolution> {
  const orgId = await resolveInstanceOrg(req);
  if (orgId) return { ok: true, organizationId: orgId };
  return {
    ok: false,
    response: apiError(
      409,
      "no_org",
      "Organización no encontrada o no especificada en modo multi-tenant ('x-vocero-organization')"
    ),
  };
}

/** Solo para tests. */
export function resetInstanceOrgCache(): void {
  cachedOrgId = null;
  orgCache.clear();
}
