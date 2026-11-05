import { describe, expect, it } from "vitest";
import { isPrivateIp, validateAiBaseUrlFormat, assertSafePublicUrl } from "@/lib/ai/ssrf";

describe("Seguridad SSRF: isPrivateIp", () => {
  it("detecta IPv4 privadas y restringidas", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("10.255.255.255")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
    expect(isPrivateIp("169.254.169.254")).toBe(true); // AWS / GCP / Azure metadata
    expect(isPrivateIp("0.0.0.0")).toBe(true);
    expect(isPrivateIp("100.64.0.1")).toBe(true);
  });

  it("permite IPv4 públicas legítimas", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("1.1.1.1")).toBe(false);
    expect(isPrivateIp("104.244.42.1")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
  });

  it("detecta IPv6 privadas y loopback", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("::")).toBe(true);
    expect(isPrivateIp("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIp("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true); // Link-local
    expect(isPrivateIp("fc00::1")).toBe(true); // Unique local
    expect(isPrivateIp("fd12:3456:789a::1")).toBe(true);
  });

  it("permite IPv6 públicas legítimas", () => {
    expect(isPrivateIp("2606:4700:4700::1111")).toBe(false);
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
  });
});

describe("Seguridad SSRF: validateAiBaseUrlFormat", () => {
  it("rechaza URLs con credenciales embebidas (user:pass@)", () => {
    const res = validateAiBaseUrlFormat("https://admin:secret@api.openai.com");
    expect(res.ok).toBe(false);
  });

  it("en producción exige https", () => {
    const res = validateAiBaseUrlFormat("http://api.openai.com", false);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toMatch(/HTTPS/i);
    }
  });

  it("en producción bloquea hostnames internos conocidos", () => {
    expect(validateAiBaseUrlFormat("https://localhost:8000", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://postgres:5432", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://caddy", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://redis", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://api.internal", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://service.local", false).ok).toBe(false);
  });

  it("en producción bloquea IPs privadas directas", () => {
    expect(validateAiBaseUrlFormat("https://127.0.0.1:8000", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://169.254.169.254", false).ok).toBe(false);
    expect(validateAiBaseUrlFormat("https://10.0.0.5", false).ok).toBe(false);
  });

  it("permite URLs públicas HTTPS en producción", () => {
    expect(validateAiBaseUrlFormat("https://api.openai.com/v1", false).ok).toBe(true);
    expect(validateAiBaseUrlFormat("https://openrouter.ai/api", false).ok).toBe(true);
    expect(validateAiBaseUrlFormat("https://api.groq.com/openai/v1", false).ok).toBe(true);
  });
});

describe("Seguridad SSRF: assertSafePublicUrl", () => {
  it("en modo desarrollo permite localhost y mock", async () => {
    const res = await assertSafePublicUrl("http://localhost:3000/api/dev/ai-mock", true);
    expect(res.ok).toBe(true);
  });
});
