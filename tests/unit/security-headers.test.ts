import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("Cabeceras de Seguridad HTTP (Hallazgo 6)", () => {
  it("next.config.ts define la función headers()", async () => {
    expect(typeof nextConfig.headers).toBe("function");
    const headersList = await nextConfig.headers!();
    expect(headersList.length).toBeGreaterThan(0);

    const rootConfig = headersList.find((h) => h.source === "/:path*");
    expect(rootConfig).toBeDefined();

    const headersMap = new Map(
      rootConfig!.headers.map((h) => [h.key.toLowerCase(), h.value])
    );

    // X-Content-Type-Options: nosniff
    expect(headersMap.get("x-content-type-options")).toBe("nosniff");

    // X-Frame-Options: DENY
    expect(headersMap.get("x-frame-options")).toBe("DENY");

    // Referrer-Policy
    expect(headersMap.get("referrer-policy")).toBe("strict-origin-when-cross-origin");

    // Strict-Transport-Security (HSTS)
    expect(headersMap.get("strict-transport-security")).toContain("max-age=");
    expect(headersMap.get("strict-transport-security")).toContain("includeSubDomains");

    // Permissions-Policy
    expect(headersMap.get("permissions-policy")).toContain("camera=()");
    expect(headersMap.get("permissions-policy")).toContain("microphone=()");

    // Content-Security-Policy (CSP)
    const csp = headersMap.get("content-security-policy");
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});
