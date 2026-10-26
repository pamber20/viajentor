import {
  Building2,
  CalendarDays,
  ChartColumn,
  FileText,
  FlaskConical,
  Inbox,
  Kanban,
  ListChecks,
  Plane,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { canConfigure } from "@/lib/auth/roles";

/**
 * #87 — El modelo del menú, separado del componente que lo pinta.
 *
 * Qué entradas existen lo deciden dos cosas que el nav de cliente no puede
 * leer solo: las banderas de la instancia (`AGENDA`, `CHANNELS`, `ATRIBUCION`,
 * que bajan por prop desde el servidor) y el rol de quien mira. Tenerlo aquí,
 * sin React, deja que una prueba unitaria afirme qué aparece y qué no sin
 * dibujar nada.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Muestra el contador de no leídos (solo la Bandeja). */
  badge?: boolean;
};

export type NavGroup = {
  /** Encabezado pequeño; sin él, el grupo es una entrada suelta. */
  title?: string;
  items: NavItem[];
};

/** La única entrada que va abajo, separada del resto. */
export const SETTINGS_ITEM: NavItem = {
  href: "/settings",
  label: "Ajustes",
  icon: Settings,
};

/**
 * Grupos de la barra lateral, en el orden en que se leen: lo que se atiende
 * cada día, lo que configura al agente y, al final, cómo va el negocio.
 */
export function appNavGroups({
  agenda = false,
  travel = true,
  superAdmin = false,
  role,
}: {
  /** 015 — "Citas" solo existe si esta instancia encendió la agenda. */
  agenda?: boolean;
  /** Módulo de viajes: cotizaciones, viajes/reservas y proveedores. */
  travel?: boolean;
  /** Viajentor 2.0 Multi-Tenant: panel global de agencias para el SuperAdmin. */
  superAdmin?: boolean;
  /** #86 — La guía de inicio solo para quien puede configurar. */
  role?: string | null;
}): NavGroup[] {
  const atencion: NavItem[] = [
    { href: "/inbox", label: "Bandeja", icon: Inbox, badge: true },
    { href: "/pipeline", label: "Pipeline", icon: Kanban },
    { href: "/contacts", label: "Contactos", icon: Users },
  ];
  if (agenda) atencion.push({ href: "/bookings", label: "Citas", icon: CalendarDays });

  const viajes: NavItem[] = [];
  if (travel) {
    viajes.push(
      { href: "/quotes", label: "Cotizaciones", icon: FileText },
      { href: "/trips", label: "Viajes", icon: Plane },
      { href: "/payments", label: "Abonos y Cartera", icon: Wallet },
      { href: "/suppliers", label: "Proveedores", icon: Building2 }
    );
  }

  const agente: NavItem[] = [];
  // Un miembro del equipo no puede hacer ninguno de los pasos de la guía.
  if (canConfigure(role)) {
    agente.push({ href: "/onboarding", label: "Guía de inicio", icon: ListChecks });
  }
  agente.push(
    { href: "/agent", label: "Agente", icon: Sparkles },
    { href: "/lab", label: "Laboratorio", icon: FlaskConical }
  );

  const groups: NavGroup[] = [
    { title: "Atención", items: atencion },
  ];

  if (travel && viajes.length > 0) {
    groups.push({ title: "Operación Turística", items: viajes });
  }

  groups.push({ title: "Agente", items: agente });
  // 019 — Se mide al final: primero se atiende y se organiza.
  groups.push({ items: [{ href: "/results", label: "Resultados", icon: ChartColumn }] });

  if (superAdmin) {
    groups.push({
      title: "SaaS Multi-Cliente",
      items: [{ href: "/tenants", label: "Agencias", icon: ShieldCheck }],
    });
  }

  return groups;
}

export type SettingsLink = { href: string; label: string };

export type SettingsSection = {
  title: string;
  links: SettingsLink[];
};

/**
 * Ajustes en tres secciones: por dónde entran los mensajes, qué hace el agente
 * con ellos y lo que es del negocio. Una pestaña por canal no escala; una
 * sección por canal, sí: cada canal nuevo cae en "Canales" sin tocar el resto.
 *
 * Instagram no tiene pantalla propia todavía: sus credenciales se guardan
 * por API (`/api/settings/instagram`). Cuando la tenga, va aquí tras
 * `CHANNELS`, igual que Messenger.
 */
export function settingsSections({
  agenda = false,
  atribucion = false,
  instagram = false,
  messenger = false,
  tiktok = false,
}: {
  agenda?: boolean;
  /** 016 — "Anuncios" existe solo con la bandera ATRIBUCION. */
  atribucion?: boolean;
  /** 023 — "Instagram" solo si el canal está encendido con CHANNELS. */
  instagram?: boolean;
  /** 017 — "Messenger", igual. */
  messenger?: boolean;
  /** 022 — "TikTok", igual: solo con el canal en CHANNELS. */
  tiktok?: boolean;
}): SettingsSection[] {
  const canales: SettingsLink[] = [];
  // 023 — "Estado" reúne todos los canales; con WhatsApp solo no aporta nada
  // que su pantalla no diga, así que no existe (ADR-001).
  if (instagram || messenger || tiktok) {
    canales.push({ href: "/settings/channels", label: "Estado" });
  }
  canales.push({ href: "/settings/whatsapp", label: "WhatsApp" });
  if (instagram) canales.push({ href: "/settings/instagram", label: "Instagram" });
  if (messenger) canales.push({ href: "/settings/messenger", label: "Messenger" });
  if (tiktok) canales.push({ href: "/settings/tiktok", label: "TikTok" });

  // #85 — el proveedor de IA se configura aquí; el entorno queda de respaldo.
  const agente: SettingsLink[] = [{ href: "/settings/ai", label: "IA" }];
  if (agenda) agente.push({ href: "/settings/calendar", label: "Agenda" });

  const negocio: SettingsLink[] = [
    { href: "/settings/branding", label: "Marca" },
    { href: "/settings/templates", label: "Plantillas" },
    { href: "/settings/team", label: "Equipo" },
  ];
  if (atribucion) negocio.push({ href: "/settings/ads", label: "Anuncios" });

  return [
    { title: "Canales", links: canales },
    { title: "Agente", links: agente },
    { title: "Negocio", links: negocio },
  ];
}

/** Activa si la ruta es la entrada o cuelga de ella (`/inbox/cv_123`). */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
