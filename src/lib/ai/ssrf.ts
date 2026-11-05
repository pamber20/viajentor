import net from "node:net";
import dns from "node:dns/promises";

/**
 * Comprueba si una dirección IP pertenece a rangos privados, loopback,
 * link-local o reservados (RFC 1918, RFC 3927, RFC 4291, etc.).
 */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
      return true; // Malformada -> no segura
    }
    const p0 = parts[0]!;
    const p1 = parts[1]!;
    const p2 = parts[2]!;

    // 0.0.0.0/8 (red local)
    if (p0 === 0) return true;
    // 10.0.0.0/8 (RFC 1918)
    if (p0 === 10) return true;
    // 127.0.0.0/8 (Loopback)
    if (p0 === 127) return true;
    // 169.254.0.0/16 (Link-local / Cloud metadata: 169.254.169.254)
    if (p0 === 169 && p1 === 254) return true;
    // 172.16.0.0/12 (RFC 1918 - Docker suele usar 172.17..172.24)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 (RFC 1918)
    if (p0 === 192 && p1 === 168) return true;
    // 100.64.0.0/10 (Carrier-grade NAT)
    if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;
    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (p0 === 192 && p1 === 0 && p2 === 0) return true;
    // 198.18.0.0/15 (Benchmarking)
    if (p0 === 198 && (p1 === 18 || p1 === 19)) return true;
    // Multicast (224.0.0.0/4) y Broadcast (255.255.255.255)
    if (p0 >= 224) return true;

    return false;

  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // Loopback ::1 o ::
    if (lower === "::1" || lower === "::") return true;
    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (lower.startsWith("::ffff:")) {
      return isPrivateIp(lower.slice(7));
    }
    // Link-local (fe80::/10)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return true;
    }
    // Unique local (fc00::/7 -> fc.. y fd..)
    if (lower.startsWith("fc") || lower.startsWith("fd")) {
      return true;
    }
    return false;
  }

  return false;
}

const NOMBRES_HOST_BLOQUEADOS = new Set([
  "localhost",
  "postgres",
  "db",
  "app",
  "caddy",
  "traefik",
  "coolify",
  "redis",
  "metadata",
  "instance-data",
]);

/**
 * Valida de forma síncrona/estructural la URL de un proveedor de IA.
 * En producción se exige HTTPS y se bloquean hostnames sospechosos / IPs privadas directas.
 */
export function validateAiBaseUrlFormat(
  urlString: string,
  allowLocalDev = process.env.NODE_ENV !== "production"
): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, error: "La base URL no tiene un formato de URL válido" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "La base URL no puede incluir credenciales en la URL" };
  }

  if (allowLocalDev) {
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "El protocolo debe ser http o https" };
    }
    return { ok: true, url: parsed };
  }

  // En producción: solo HTTPS
  if (parsed.protocol !== "https:") {
    return {
      ok: false,
      error: "En producción, la base URL del proveedor de IA debe usar HTTPS",
    };
  }

  const host = parsed.hostname.toLowerCase();

  // Hostnames de infraestructura o localhost
  if (NOMBRES_HOST_BLOQUEADOS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    return { ok: false, error: "El host especificado no está permitido (red interna)" };
  }

  // Si el host es directamente una IP
  if (net.isIP(host) && isPrivateIp(host)) {
    return {
      ok: false,
      error: "No se permiten direcciones IP privadas o locales para el proveedor de IA",
    };
  }

  return { ok: true, url: parsed };
}

/**
 * Valida que el host resuelto por DNS no apunte a ninguna dirección privada/local.
 */
export async function assertSafePublicUrl(
  urlString: string,
  allowLocalDev = process.env.NODE_ENV !== "production"
): Promise<{ ok: true; url: URL } | { ok: false; error: string }> {
  const check = validateAiBaseUrlFormat(urlString, allowLocalDev);
  if (!check.ok) return check;

  if (allowLocalDev) {
    return check;
  }

  const hostname = check.url.hostname;

  // Si ya es una IP pública, ya fue revisada
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      return { ok: false, error: "La dirección IP resuelta no está permitida (red privada)" };
    }
    return check;
  }

  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIp(addr.address)) {
        return {
          ok: false,
          error: `El host ${hostname} resuelve a una dirección privada no permitida (${addr.address})`,
        };
      }
    }
  } catch {
    // Si la resolución DNS falla
    return {
      ok: false,
      error: `No se pudo resolver el host ${hostname} por DNS`,
    };
  }

  return check;
}
