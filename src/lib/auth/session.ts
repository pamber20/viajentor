import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { resolveMembership } from "@/server/auth/on-signup";
import { isSuperAdminUser } from "@/server/tenants";
import type { TenantStatus } from "@/lib/tenants";

export type SessionContext = {
  userId: string;
  sessionId?: string;
  organizationId: string;
  organizationName?: string;
  role: string;
  isSuperAdmin?: boolean;
  impersonating?: boolean;
  tenantStatus?: TenantStatus;
};

export class UnauthorizedError extends Error {
  constructor(message = "No autenticado") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class TenantSuspendedError extends UnauthorizedError {
  constructor(
    message = "Esta agencia se encuentra suspendida temporalmente. Contacta al administrador."
  ) {
    super(message);
    this.name = "TenantSuspendedError";
  }
}

/**
 * Sesión + organización activa para route handlers y server components.
 * Lanza UnauthorizedError si no hay sesión, organización o si la agencia está suspendida.
 */
export async function requireSession(): Promise<SessionContext> {
  const auth = getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new UnauthorizedError();

  const preferredOrgId =
    (session.session as { activeOrganizationId?: string | null })
      ?.activeOrganizationId ?? null;

  const [membership, superAdmin] = await Promise.all([
    resolveMembership(session.user.id, preferredOrgId),
    isSuperAdminUser(session.user.id, session.user.email),
  ]);

  if (!membership) {
    throw new UnauthorizedError("Sesión sin organización activa");
  }

  if (membership.tenantStatus === "suspended" && !superAdmin) {
    throw new TenantSuspendedError();
  }

  return {
    userId: session.user.id,
    sessionId: session.session.id,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    role: membership.role,
    isSuperAdmin: superAdmin,
    impersonating: membership.impersonating,
    tenantStatus: membership.tenantStatus,
  };
}

/** Igual que requireSession pero devuelve null en vez de lanzar. */
export async function getSessionOrNull(): Promise<SessionContext | null> {
  try {
    return await requireSession();
  } catch {
    return null;
  }
}
