import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { scoped } from "@/lib/db/tenant";

export type YCloudCredentials = {
  id: string;
  organizationId: string;
  phoneNumber: string;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  status: "connected" | "reconnect_required";
  apiKey: string;
  webhookSecret: string | null;
};

type Row = typeof schema.ycloudCredentials.$inferSelect;

function toCredentials(row: Row): YCloudCredentials {
  return {
    id: row.id,
    organizationId: row.organizationId,
    phoneNumber: row.phoneNumber,
    displayPhoneNumber: row.displayPhoneNumber,
    verifiedName: row.verifiedName,
    status: row.status,
    apiKey: decryptSecret({
      cipher: row.apiKeyCipher,
      iv: row.apiKeyIv,
      tag: row.apiKeyTag,
    }),
    webhookSecret:
      row.webhookSecretCipher && row.webhookSecretIv && row.webhookSecretTag
        ? decryptSecret({
            cipher: row.webhookSecretCipher,
            iv: row.webhookSecretIv,
            tag: row.webhookSecretTag,
          })
        : null,
  };
}

/**
 * Normaliza un número de teléfono E.164 quitando espacios y asegurando el '+'
 * para búsquedas consistentes.
 */
export function normalizeE164(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `+${digits}`;
}

/** Resuelve la conexión YCloud por número de teléfono (enrutamiento de webhook). */
export async function getYCloudCredentialsByPhoneNumber(
  phoneNumber: string
): Promise<YCloudCredentials | null> {
  const db = getDb();
  const normalized = normalizeE164(phoneNumber);
  const rows = await db
    .select()
    .from(schema.ycloudCredentials)
    .where(eq(schema.ycloudCredentials.phoneNumber, normalized))
    .limit(1);

  if (rows[0]) return toCredentials(rows[0]);

  // Si no se encuentra con '+', intentar con el valor exacto recibido
  const rawRows = await db
    .select()
    .from(schema.ycloudCredentials)
    .where(eq(schema.ycloudCredentials.phoneNumber, phoneNumber.trim()))
    .limit(1);

  return rawRows[0] ? toCredentials(rawRows[0]) : null;
}

/** Resuelve la conexión YCloud de una organización. */
export async function getYCloudCredentialsByOrg(
  organizationId: string
): Promise<YCloudCredentials | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.ycloudCredentials)
    .where(scoped(schema.ycloudCredentials.organizationId, organizationId))
    .limit(1);
  return rows[0] ? toCredentials(rows[0]) : null;
}

export async function saveYCloudCredentials(input: {
  organizationId: string;
  phoneNumber: string;
  apiKey: string;
  webhookSecret?: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
}): Promise<void> {
  const db = getDb();
  const encKey = encryptSecret(input.apiKey.trim());
  const encSecret = input.webhookSecret?.trim()
    ? encryptSecret(input.webhookSecret.trim())
    : null;
  const normalizedPhone = normalizeE164(input.phoneNumber);

  await db
    .insert(schema.ycloudCredentials)
    .values({
      id: newId("ycloudCredentials"),
      organizationId: input.organizationId,
      phoneNumber: normalizedPhone,
      displayPhoneNumber: input.displayPhoneNumber?.trim() || normalizedPhone,
      verifiedName: input.verifiedName?.trim() || null,
      apiKeyCipher: encKey.cipher,
      apiKeyIv: encKey.iv,
      apiKeyTag: encKey.tag,
      webhookSecretCipher: encSecret?.cipher ?? null,
      webhookSecretIv: encSecret?.iv ?? null,
      webhookSecretTag: encSecret?.tag ?? null,
      status: "connected",
    })
    .onConflictDoUpdate({
      target: [schema.ycloudCredentials.organizationId],
      set: {
        phoneNumber: normalizedPhone,
        displayPhoneNumber: input.displayPhoneNumber?.trim() || normalizedPhone,
        verifiedName: input.verifiedName?.trim() || null,
        apiKeyCipher: encKey.cipher,
        apiKeyIv: encKey.iv,
        apiKeyTag: encKey.tag,
        webhookSecretCipher: encSecret?.cipher ?? null,
        webhookSecretIv: encSecret?.iv ?? null,
        webhookSecretTag: encSecret?.tag ?? null,
        status: "connected",
        updatedAt: new Date(),
      },
    });
}

/** Desconecta YCloud para la organización eliminando sus credenciales. */
export async function desconectarYCloud(organizationId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(schema.ycloudCredentials)
    .where(scoped(schema.ycloudCredentials.organizationId, organizationId));
}

/** Marca la conexión de YCloud como requerida de reconexión. */
export async function markYCloudReconnectRequired(
  organizationId: string
): Promise<void> {
  const db = getDb();
  await db
    .update(schema.ycloudCredentials)
    .set({ status: "reconnect_required", updatedAt: new Date() })
    .where(scoped(schema.ycloudCredentials.organizationId, organizationId));
}

export function apiKeyLast4(apiKey: string): string {
  return apiKey.slice(-4);
}
