"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Building2, LogOut, X } from "lucide-react";
import type { Branding } from "@/lib/branding";
import type { ThemePreference } from "@/lib/theme";
import type { AccessibleOrganization } from "@/server/tenants";
import { cn, initials } from "@/lib/utils";
import { appNavGroups, isNavActive, SETTINGS_ITEM, type NavItem } from "@/lib/nav";
import { signOut } from "@/lib/auth/client";
import { useEvents } from "@/components/use-events";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-mark";
import {
  BUILD_COMMIT,
  UNVERIFIED_COMMIT_NOTE,
  versionLabel,
  versionTitle,
  type ResolvedCommit,
} from "@/lib/version";

/**
 * Un renglón del menú, como el `side-item` del mockup de la landing: texto
 * semibold, esquinas de 9px y, activo, lavado del acento con tinta azul.
 * Exportado para la vista previa de Configuración → Marca, que pinta la barra.
 */
export function navItemClass(active: boolean) {
  return cn(
    "flex items-center gap-[10px] rounded-sm px-2.5 py-2.5 text-[13.5px] font-semibold transition-colors lg:py-2",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-brand-tint text-brand-text"
      : "text-text-2 hover:bg-accent hover:text-foreground"
  );
}

export function AppNav({
  branding,
  userName,
  role,
  superAdmin = false,
  impersonating = false,
  activeOrganizationId,
  accessibleOrganizations = [],
  theme,
  commit,
  agenda = false,
  kicker = "CRM · WhatsApp",
  open = false,
  onClose,
}: {
  branding: Branding;
  userName: string;
  role: string;
  superAdmin?: boolean;
  impersonating?: boolean;
  activeOrganizationId?: string;
  accessibleOrganizations?: AccessibleOrganization[];
  theme: ThemePreference;
  commit?: ResolvedCommit;
  kicker?: string;
  agenda?: boolean;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [switchingOrg, setSwitchingOrg] = useState(false);

  async function refetchUnread() {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as {
      conversations: { unreadCount: number }[];
    };
    setUnread(data.conversations.reduce((a, c) => a + c.unreadCount, 0));
  }

  useEffect(() => {
    void refetchUnread();
  }, [activeOrganizationId]);

  useEvents({
    onMessageNew: () => void refetchUnread(),
    onConversationUpdated: () => void refetchUnread(),
  });

  async function handleSwitchOrganization(targetOrgId: string) {
    if (!targetOrgId || targetOrgId === activeOrganizationId) return;
    setSwitchingOrg(true);
    try {
      const res = await fetch("/api/tenants/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: targetOrgId }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setSwitchingOrg(false);
    }
  }

  const version = commit ?? { commit: BUILD_COMMIT, verified: BUILD_COMMIT !== "" };
  const groups = appNavGroups({ agenda, superAdmin, role });

  function renderItem(item: NavItem) {
    const active = isNavActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={navItemClass(active)}
        aria-current={active ? "page" : undefined}
      >
        <item.icon
          className={cn("h-5 w-5 shrink-0", active ? "text-brand" : "text-text-3")}
          strokeWidth={1.8}
          aria-hidden
        />
        <span className="flex-1">{item.label}</span>
        {item.badge && unread > 0 && (
          <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1.5 text-[10.5px] font-bold text-brand-fg">
            {unread}
          </span>
        )}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "nav-dark fixed inset-y-0 left-0 z-50 flex w-[17rem] shrink-0 flex-col overflow-y-auto border-r bg-subtle px-3 pb-3.5 pt-4 text-foreground transition-[transform,visibility] duration-200",
        "lg:static lg:visible lg:z-auto lg:w-56 lg:translate-x-0 lg:overflow-visible lg:transition-none",
        open ? "visible translate-x-0 shadow-pop" : "invisible -translate-x-full"
      )}
    >
      {/* Marca: el logo de Vocero o, white-label, la inicial y el nombre */}
      <div className="mb-4 flex items-start gap-1.5 px-2 pt-0.5">
        <button
          onClick={onClose}
          aria-label="Cerrar el menú"
          className="-ml-1 mt-0.5 rounded-md p-1.5 text-text-3 hover:bg-accent hover:text-foreground lg:hidden"
        >
          <X className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>
        <div className="min-w-0 flex-1">
          <BrandLogo branding={branding} />
          <span className="kicker mt-2 block">{kicker}</span>
        </div>
      </div>

      {/* Selector rápido de Agencia (Multi-Tenant Viajentor 2.0) */}
      {(accessibleOrganizations.length > 1 || superAdmin) && (
        <div className="mb-4 px-2">
          <label
            htmlFor="active-tenant-select"
            className="mb-1 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-text-3"
          >
            <Building2 className="h-3 w-3 shrink-0" />
            <span>Agencia activa ({accessibleOrganizations.length})</span>
          </label>
          <select
            id="active-tenant-select"
            disabled={switchingOrg}
            value={activeOrganizationId ?? ""}
            onChange={(e) => void handleSwitchOrganization(e.target.value)}
            className={cn(
              "w-full truncate rounded-sm border bg-background/60 px-2 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
              impersonating && "border-warning-text text-warning-text"
            )}
          >
            {accessibleOrganizations.map((org) => (
              <option
                key={org.id}
                value={org.id}
                className="bg-background text-foreground"
              >
                {org.name}
                {org.status === "suspended" ? " (Suspendida)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Grupos con encabezado pequeño, sin letras ni colapsables */}
      <nav className="flex flex-col gap-4" aria-label="Secciones">
        {groups.map((group, i) => (
          <div key={group.title ?? i} className="flex flex-col gap-0.5">
            {group.title && (
              <span className="kicker mb-1 block px-2.5" aria-hidden>
                {group.title}
              </span>
            )}
            {group.items.map(renderItem)}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Ajustes va abajo, solo: no es trabajo del día. */}
      {renderItem(SETTINGS_ITEM)}

      <div className="mt-1 flex items-center gap-2.5 rounded-sm px-2.5 py-2 hover:bg-accent">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
          {initials(userName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{userName}</span>
          <span className="block truncate text-[11px] text-text-3">
            {superAdmin
              ? "SuperAdmin"
              : role === "owner"
                ? "Propietario"
                : "Equipo"}{" "}
            · En línea
          </span>
        </span>
        <ThemeToggle initial={theme} />
        <button
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
          className="rounded p-1 text-text-3 hover:text-foreground"
          onClick={async () => {
            await signOut();
            router.push("/login");
            router.refresh();
          }}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} />
        </button>
      </div>

      <p
        className="mt-2 px-2.5 font-mono text-[10.5px] tracking-[0.06em] text-text-2"
        title={versionTitle(branding.name, version)}
      >
        {versionLabel(version.commit)}
        {version.commit && !version.verified && (
          <span className="mt-0.5 flex items-center gap-1">
            <AlertTriangle
              className="h-3 w-3 shrink-0 text-warning-text"
              strokeWidth={2}
              aria-hidden
            />
            {UNVERIFIED_COMMIT_NOTE}
          </span>
        )}
      </p>
    </aside>
  );
}
