import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  clientIp,
  rateLimitKeys,
  resetRateLimit,
} from "@/lib/rate-limit";

describe("rate limit por IP (FR-062: 10 / 10 min → 429)", () => {
  beforeEach(() => resetRateLimit());

  it("permite hasta el máximo y bloquea el siguiente", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < AUTH_RATE_LIMIT.max; i++) {
      expect(
        checkRateLimit("login:1.2.3.4", AUTH_RATE_LIMIT, t0 + i).allowed
      ).toBe(true);
    }
    expect(
      checkRateLimit("login:1.2.3.4", AUTH_RATE_LIMIT, t0 + 100).allowed
    ).toBe(false);
  });

  it("la ventana desliza: pasados 10 minutos vuelve a permitir", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < AUTH_RATE_LIMIT.max; i++) {
      checkRateLimit("k", AUTH_RATE_LIMIT, t0 + i);
    }
    expect(checkRateLimit("k", AUTH_RATE_LIMIT, t0 + 1000).allowed).toBe(false);
    expect(
      checkRateLimit("k", AUTH_RATE_LIMIT, t0 + AUTH_RATE_LIMIT.windowMs + 500)
        .allowed
    ).toBe(true);
  });

  it("claves distintas (IPs) no se afectan entre sí", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < AUTH_RATE_LIMIT.max; i++) {
      checkRateLimit("login:1.1.1.1", AUTH_RATE_LIMIT, t0 + i);
    }
    expect(
      checkRateLimit("login:1.1.1.1", AUTH_RATE_LIMIT, t0 + 100).allowed
    ).toBe(false);
    expect(
      checkRateLimit("login:2.2.2.2", AUTH_RATE_LIMIT, t0 + 100).allowed
    ).toBe(true);
  });
});

describe("clientIp: a quién frenar (jamás a quién autorizar)", () => {
  const h = (init: Record<string, string>) => new Headers(init);

  it("prioriza cf-connecting-ip si viene de Cloudflare", () => {
    expect(
      clientIp(
        h({
          "cf-connecting-ip": "104.28.1.1",
          "x-real-ip": "192.168.1.1",
          "x-forwarded-for": "10.0.0.1",
        })
      )
    ).toBe("104.28.1.1");
  });

  it("soporta direcciones IPv6 válidas", () => {
    expect(
      clientIp(h({ "x-real-ip": "2001:0db8:85a3:0000:0000:8a2e:0370:7334" }))
    ).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
  });

  it("descarta IPs malformadas y cae a la siguiente cabecera o 'local'", () => {
    expect(
      clientIp(
        h({
          "x-forwarded-for": "malicious_string_not_ip, 203.0.113.5",
        })
      )
    ).toBe("local");
  });

  it("el primer salto de x-forwarded-for es el cliente si es IP válida", () => {
    expect(clientIp(h({ "x-forwarded-for": " 203.0.113.9 , 10.0.0.2" }))).toBe("203.0.113.9");
  });

  it("sin x-forwarded-for, x-real-ip; sin ninguno, 'local'", () => {
    expect(clientIp(h({ "x-real-ip": "198.51.100.7" }))).toBe("198.51.100.7");
    expect(clientIp(h({}))).toBe("local");
    expect(clientIp(undefined)).toBe("local");
  });
});

describe("el mapa de llaves no crece para siempre", () => {
  beforeEach(() => resetRateLimit());

  it("con 10 000 llaves, las vencidas se barren y las vivas se quedan", () => {
    const opts = { windowMs: 60_000, max: 30 };
    const t0 = 1_000_000;
    for (let i = 0; i < 10_000; i++) checkRateLimit(`ip:${i}`, opts, t0);
    // Aún dentro de la ventana: nada se barre.
    checkRateLimit("ip:viva", opts, t0 + 10);
    expect(rateLimitKeys()).toBe(10_001);
    // Pasada la ventana: solo queda la llave nueva.
    checkRateLimit("ip:nueva", opts, t0 + 10 + opts.windowMs + 1);
    expect(rateLimitKeys()).toBe(1);
  });
});
