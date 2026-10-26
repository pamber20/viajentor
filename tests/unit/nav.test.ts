import { describe, expect, it } from "vitest";
import {
  appNavGroups,
  isNavActive,
  SETTINGS_ITEM,
  settingsSections,
} from "@/lib/nav";

/**
 * #87 — El menú agrupado y Ajustes en tres secciones. Lo que aparece y lo
 * que no lo deciden las banderas (`AGENDA`, `CHANNELS`, `ATRIBUCION`) y el
 * rol; aquí se afirma sobre el modelo, sin dibujar nada.
 */

const labels = (groups: { items: { label: string }[] }[]) =>
  groups.map((g) => g.items.map((i) => i.label));

describe("barra lateral agrupada", () => {
  it("con todo apagado y como miembro: Atención, Agente y Resultados", () => {
    const groups = appNavGroups({ role: "member", travel: false });
    expect(groups.map((g) => g.title)).toEqual(["Atención", "Agente", undefined]);
    expect(labels(groups)).toEqual([
      ["Bandeja", "Pipeline", "Contactos"],
      ["Agente", "Laboratorio"],
      ["Resultados"],
    ]);
  });

  it("módulo de viajes activo por defecto en Operación Turística", () => {
    const groups = appNavGroups({ role: "member" });
    expect(groups.map((g) => g.title)).toEqual([
      "Atención",
      "Operación Turística",
      "Agente",
      undefined,
    ]);
    expect(labels(groups)[0]).toEqual([
      "Bandeja",
      "Pipeline",
      "Contactos",
    ]);
    expect(labels(groups)[1]).toEqual([
      "Cotizaciones",
      "Viajes",
      "Abonos y Cartera",
      "Proveedores",
    ]);
  });

  it("AGENDA añade Citas al final de Atención", () => {
    const [atencion] = appNavGroups({ agenda: true, travel: false, role: "member" });
    expect(atencion!.items.map((i) => i.label)).toEqual([
      "Bandeja",
      "Pipeline",
      "Contactos",
      "Citas",
    ]);
    expect(atencion!.items.at(-1)!.href).toBe("/bookings");
  });

  it("la guía de inicio abre el grupo Agente solo para quien configura", () => {
    for (const role of ["owner", "admin"]) {
      const agente = appNavGroups({ role }).find((g) => g.title === "Agente")!;
      expect(agente.items[0]).toMatchObject({ href: "/onboarding", label: "Guía de inicio" });
    }
    for (const role of ["member", null, undefined]) {
      const agente = appNavGroups({ role }).find((g) => g.title === "Agente")!;
      expect(agente.items.map((i) => i.href)).not.toContain("/onboarding");
    }
  });

  it("solo la Bandeja lleva el contador y Ajustes queda fuera de los grupos", () => {
    const todos = appNavGroups({ agenda: true, role: "owner" }).flatMap((g) => g.items);
    expect(todos.filter((i) => i.badge).map((i) => i.href)).toEqual(["/inbox"]);
    expect(todos.map((i) => i.href)).not.toContain("/settings");
    expect(SETTINGS_ITEM.href).toBe("/settings");
    // Cada entrada trae su icono: el renglón lo pinta sin condicionar.
    for (const item of [...todos, SETTINGS_ITEM]) expect(item.icon).toBeDefined();
  });

  it("una ruta hija activa su entrada, y /settings no activa nada más", () => {
    expect(isNavActive("/inbox/cv_123", "/inbox")).toBe(true);
    expect(isNavActive("/inbox", "/inbox")).toBe(true);
    expect(isNavActive("/inboxes", "/inbox")).toBe(false);
    expect(isNavActive("/settings/ai", "/settings")).toBe(true);
    expect(isNavActive("/settings/ai", "/agent")).toBe(false);
  });

  it("superAdmin añade el grupo SaaS Multi-Cliente con /tenants", () => {
    const groups = appNavGroups({ role: "owner", superAdmin: true });
    const saasGroup = groups.at(-1)!;
    expect(saasGroup.title).toBe("SaaS Multi-Cliente");
    expect(saasGroup.items.map((i) => ({ href: i.href, label: i.label }))).toEqual([
      { href: "/tenants", label: "Agencias" },
    ]);
  });
});

describe("ajustes en tres secciones", () => {
  const links = (s: { title: string; links: { label: string }[] }[]) =>
    Object.fromEntries(s.map((x) => [x.title, x.links.map((l) => l.label)]));

  it("con todo apagado: Canales, Agente y Negocio con lo mínimo", () => {
    const sections = settingsSections({});
    expect(sections.map((s) => s.title)).toEqual(["Canales", "Agente", "Negocio"]);
    expect(links(sections)).toEqual({
      Canales: ["WhatsApp"],
      Agente: ["IA"],
      Negocio: ["Marca", "Plantillas", "Equipo"],
    });
  });

  it("cada bandera añade su enlace en su sección y en ninguna otra", () => {
    // 023: con un canal social, "Estado" abre la sección.
    expect(links(settingsSections({ messenger: true }))).toEqual({
      Canales: ["Estado", "WhatsApp", "Messenger"],
      Agente: ["IA"],
      Negocio: ["Marca", "Plantillas", "Equipo"],
    });
    expect(links(settingsSections({ instagram: true })).Canales).toEqual([
      "Estado",
      "WhatsApp",
      "Instagram",
    ]);
    expect(
      links(settingsSections({ instagram: true, messenger: true, tiktok: true })).Canales
    ).toEqual(["Estado", "WhatsApp", "Instagram", "Messenger", "TikTok"]);
    expect(links(settingsSections({ agenda: true }))).toEqual({
      Canales: ["WhatsApp"],
      Agente: ["IA", "Agenda"],
      Negocio: ["Marca", "Plantillas", "Equipo"],
    });
    expect(links(settingsSections({ atribucion: true }))).toEqual({
      Canales: ["WhatsApp"],
      Agente: ["IA"],
      Negocio: ["Marca", "Plantillas", "Equipo", "Anuncios"],
    });
  });

  it("con todo encendido, cada pantalla de Ajustes tiene exactamente un enlace", () => {
    const all = settingsSections({
      agenda: true,
      atribucion: true,
      instagram: true,
      messenger: true,
      tiktok: true,
    })
      .flatMap((s) => s.links)
      .map((l) => l.href);
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(
      [
        "/settings/channels",
        "/settings/whatsapp",
        "/settings/instagram",
        "/settings/messenger",
        "/settings/tiktok",
        "/settings/ai",
        "/settings/calendar",
        "/settings/branding",
        "/settings/templates",
        "/settings/team",
        "/settings/ads",
      ].sort()
    );
  });

  it("el Laboratorio no está en Ajustes: sigue en el menú principal", () => {
    const hrefs = settingsSections({ agenda: true, atribucion: true, messenger: true })
      .flatMap((s) => s.links)
      .map((l) => l.href);
    expect(hrefs).not.toContain("/lab");
    expect(appNavGroups({ role: "owner" }).flatMap((g) => g.items).map((i) => i.href)).toContain("/lab");
  });
});
