import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import {
  requireSession,
  TenantSuspendedError,
  UnauthorizedError,
  type SessionContext,
} from "@/lib/auth/session";
import { normalizeThemePreference, THEME_COOKIE } from "@/lib/theme";
import { getBranding } from "@/server/branding";
import { accentCssVariables } from "@/lib/branding";
import { AppShell } from "@/components/app-shell";
import { resolveCommit } from "@/lib/version";
import { agendaEnabled } from "@/server/agenda/flag";
import { enabledChannels } from "@/server/channels/enabled";
import { navKicker } from "@/lib/channels";
import { avisoIaDe } from "@/server/ai/aviso";
import { AvisoIaBanner } from "@/components/avisos/aviso-ia";
import { listUserOrganizations } from "@/server/tenants";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  let session: SessionContext | null = null;
  let suspendedMessage: string | null = null;

  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof TenantSuspendedError) {
      suspendedMessage = err.message;
    } else if (err instanceof UnauthorizedError) {
      redirect("/login");
    } else {
      throw err;
    }
  }

  if (suspendedMessage || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="max-w-md rounded-md border bg-card p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-foreground">
            Cuenta de agencia suspendida
          </h1>
          <p className="mt-2 text-sm text-text-2">
            {suspendedMessage ??
              "Esta agencia se encuentra temporalmente suspendida. Contacta al administrador de Viajentor para reactivar tu servicio."}
          </p>
          <a
            href="/login"
            className="mt-4 inline-flex items-center justify-center rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-brand-fg"
          >
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  const [branding, authSession, aviso, accessibleOrganizations] =
    await Promise.all([
      getBranding(session.organizationId),
      getAuth().api.getSession({
        headers: await headers(),
      }),
      avisoIaDe(session.organizationId),
      listUserOrganizations(session.userId, Boolean(session.isSuperAdmin)),
    ]);

  const theme = normalizeThemePreference(
    (await cookies()).get(THEME_COOKIE)?.value
  );

  return (
    <>
      <style
        id="app-theme-vars"
        dangerouslySetInnerHTML={{ __html: accentCssVariables(branding.accent) }}
      />
      <AppShell
        branding={branding}
        userName={authSession?.user.name ?? "Usuario"}
        role={session.role}
        superAdmin={Boolean(session.isSuperAdmin)}
        impersonating={Boolean(session.impersonating)}
        activeOrganizationId={session.organizationId}
        activeOrganizationName={session.organizationName ?? branding.name}
        accessibleOrganizations={accessibleOrganizations}
        theme={theme}
        commit={resolveCommit()}
        agenda={agendaEnabled()}
        kicker={navKicker([...enabledChannels()])}
        aviso={<AvisoIaBanner aviso={aviso} />}
      >
        {children}
      </AppShell>
    </>
  );
}
