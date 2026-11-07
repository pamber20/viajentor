import { normalizeE164 } from "@/server/ycloud/credentials";

export const YCLOUD_API_BASE_URL = "https://api.ycloud.com/v2";

export class YCloudApiError extends Error {
  status: number;
  code?: string;
  isAuthError: boolean;
  details?: unknown;

  constructor(
    message: string,
    opts: { status: number; code?: string; details?: unknown }
  ) {
    super(message);
    this.name = "YCloudApiError";
    this.status = opts.status;
    this.code = opts.code;
    this.isAuthError = opts.status === 401 || opts.status === 403;
    this.details = opts.details;
  }
}

type YCloudPhoneNumberItem = {
  phoneNumber: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  status?: string;
  qualityRating?: string;
};

type YCloudPhoneNumbersResponse = {
  items?: YCloudPhoneNumberItem[];
};

export type YCloudTestResult =
  | { ok: true; displayPhoneNumber: string; verifiedName: string | null }
  | { ok: false; code: string; message: string };

/**
 * Prueba la validez de la API Key y la presencia del número de teléfono en YCloud.
 */
export async function testYCloudConnection(
  apiKey: string,
  phoneNumber: string
): Promise<YCloudTestResult> {
  const normalizedTarget = normalizeE164(phoneNumber);

  try {
    const res = await fetch(`${YCLOUD_API_BASE_URL}/whatsapp/phoneNumbers`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey.trim(),
        Accept: "application/json",
      },
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        code: "invalid_api_key",
        message: "La API Key de YCloud es inválida, expiró o no tiene permisos.",
      };
    }

    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as {
        error?: { message?: string; code?: string };
      } | null;
      return {
        ok: false,
        code: errBody?.error?.code ?? `http_${res.status}`,
        message:
          errBody?.error?.message ??
          `Error de YCloud (HTTP ${res.status}): no se pudo verificar la cuenta.`,
      };
    }

    const data = (await res.json().catch(() => null)) as YCloudPhoneNumbersResponse | null;
    const items = data?.items ?? [];

    // Buscar si el número coincide con alguno de los registrados
    const match = items.find((item) => {
      const itemNormalized = normalizeE164(item.phoneNumber);
      return itemNormalized === normalizedTarget;
    });

    if (match) {
      return {
        ok: true,
        displayPhoneNumber: match.displayPhoneNumber ?? match.phoneNumber,
        verifiedName: match.verifiedName ?? null,
      };
    }

    // Si la API key es válida pero el número no está en la lista de items
    if (items.length > 0) {
      const disponibles = items.map((i) => i.phoneNumber).join(", ");
      return {
        ok: false,
        code: "phone_not_found",
        message: `El número ${phoneNumber} no coincide con los números de tu cuenta de YCloud (${disponibles}).`,
      };
    }

    // Si la lista vino vacía pero la API key respondió 200
    return {
      ok: true,
      displayPhoneNumber: phoneNumber,
      verifiedName: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error de red al conectar con YCloud";
    return { ok: false, code: "network_error", message: msg };
  }
}

type SendMessageResponse = {
  id?: string;
  status?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

/**
 * Envía un mensaje mediante la API de YCloud.
 */
export async function sendYCloudMessage(
  apiKey: string,
  payload: Record<string, unknown>
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${YCLOUD_API_BASE_URL}/whatsapp/messages`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey.trim(),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new YCloudApiError("No se pudo conectar con los servidores de YCloud", {
      status: 0,
      code: "network_error",
      details: err,
    });
  }

  const data = (await res.json().catch(() => null)) as SendMessageResponse | null;

  if (!res.ok || !data?.id) {
    const errorMsg = data?.error?.message ?? `Error en YCloud (HTTP ${res.status})`;
    throw new YCloudApiError(errorMsg, {
      status: res.status,
      code: data?.error?.code ?? `http_${res.status}`,
      details: data,
    });
  }

  return data.id;
}

/**
 * Sube un archivo adjunto a YCloud para ser enviado en WhatsApp.
 */
export async function uploadYCloudMedia(
  apiKey: string,
  file: { data: Buffer; mimeType: string; fileName?: string }
): Promise<string> {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(file.data)], { type: file.mimeType });
  formData.append("file", blob, file.fileName || "attachment");
  formData.append("purpose", "whatsapp");

  let res: Response;
  try {
    res = await fetch(`${YCLOUD_API_BASE_URL}/files`, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey.trim(),
        Accept: "application/json",
      },
      body: formData,
    });
  } catch (err) {
    throw new YCloudApiError("Error de red al subir archivo a YCloud", {
      status: 0,
      code: "network_error",
      details: err,
    });
  }

  const data = (await res.json().catch(() => null)) as { id?: string; url?: string } | null;
  if (!res.ok || (!data?.url && !data?.id)) {
    throw new YCloudApiError("YCloud no devolvió URL ni ID para el archivo subido", {
      status: res.status,
      code: `upload_failed_${res.status}`,
      details: data,
    });
  }

  return data.url || data.id!;
}
