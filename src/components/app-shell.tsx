"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldAlert } from "lucide-react";
import type { Branding } from "@/lib/branding";
import type { ThemePreference } from "@/lib/theme";
import type { ResolvedCommit } from "@/lib/version";
import type { AccessibleOrganization } from "@/server/tenants";
import { AppNav } from "@/components/app-nav";
import { BrandLogo } from "@/components/brand-mark";

/**
 * Cascarón de la app en dos modos:
 *
 * - Escritorio (lg+): el panel lateral es una columna fija, como siempre.
 * - Móvil/tableta: el lateral sale de la izquierda como cajón sobre un velo,
 *   y arriba queda una barra azul marino con el hamburguesa y la marca. El
 *   cajón se cierra solo al navegar (el `pathname` cambia) y con Escape.
 *
 * La altura usa `100dvh` (no `100vh`) porque en el navegador móvil la barra de
 * direcciones se encoge al hacer scroll: con `vh` el compositor de la Bandeja
 * queda debajo del borde visible.
 */
export function AppShell({
  branding,
  userName,
  role,
  superAdmin = false,
  impersonating = false,
  activeOrganizationId,
  activeOrganizationName,
  accessibleOrganizations = [],
  theme,
  commit,
  agenda = false,
  kicker,
  aviso = null,
  children,
}: {
  branding: Branding;
  userName: string;
  role: string;
  superAdmin?: boolean;
  impersonating?: boolean;
  activeOrganizationId?: string;
  activeOrganizationName?: string;
  accessibleOrganizations?: AccessibleOrganization[];
  theme: ThemePreference;
  /** Commit resuelto en el servidor, con su procedencia (ver `resolveCommit`). */
  commit?: ResolvedCommit;
  /** 015 — ¿esta instancia tiene agenda? Lo decide el servidor. */
  agenda?: boolean;
  /** 028 — La etiqueta bajo el logo (`navKicker`). */
  kicker?: string;
  /**
   * Franja de aviso por encima de TODA la aplicación (#85).
   */
  aviso?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  // Navegar = cerrar el cajón. Sin esto, tocar "Pipeline" deja el velo encima
  // de la pantalla recién cargada.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const primaryOrg = accessibleOrganizations.find((o) => o.slug === "principal");

  async function returnToPrimaryOrg() {
    if (!primaryOrg) return;
    const res = await fetch("/api/tenants/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId: primaryOrg.id }),
    });
    if (res.ok) {
      router.push("/tenants");
      router.refresh();
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {navOpen && (
        <button
          aria-label="Cerrar el menú"
          tabIndex={-1}
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
        />
      )}

      <AppNav
        branding={branding}
        commit={commit}
        userName={userName}
        role={role}
        superAdmin={superAdmin}
        impersonating={impersonating}
        activeOrganizationId={activeOrganizationId}
        accessibleOrganizations={accessibleOrganizations}
        theme={theme}
        agenda={agenda}
        kicker={kicker}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Misma pieza que la barra lateral (`nav-dark`): en el teléfono la
            franja azul marino de arriba es lo que queda del bicolor. */}
        <header className="nav-dark flex h-12 shrink-0 items-center gap-1.5 border-b bg-subtle px-2 text-foreground lg:hidden">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Abrir el menú"
            aria-expanded={navOpen}
            className="rounded-md p-2 text-text-2 hover:bg-accent hover:text-foreground"
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <BrandLogo branding={branding} className="min-w-0" />
        </header>

        {impersonating && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-warning-soft px-4 py-1.5 text-xs text-warning-text">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              Modo Soporte SuperAdmin: estás operando dentro de la agencia{" "}
              <strong>{activeOrganizationName ?? branding.name}</strong>
            </span>
            {primaryOrg && (
              <button
                type="button"
                onClick={returnToPrimaryOrg}
                className="rounded-sm border border-current px-2 py-0.5 font-semibold hover:opacity-80"
              >
                Salir a Agencia Principal
              </button>
            )}
          </div>
        )}

        {aviso}

        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
