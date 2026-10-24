import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { switchSessionOrganization } from "@/server/tenants";

export const dynamic = "force-dynamic";

const switchSchema = z.object({
  organizationId: z.string().trim().min(1),
});

export const POST = withAuth(async (session, req: Request) => {
  if (!session.sessionId) {
    return apiError(400, "invalid_session", "Sesión sin identificador activo");
  }

  const body = await parseBody(req, switchSchema);
  if (!body.ok) return body.response;

  const result = await switchSessionOrganization({
    sessionId: session.sessionId,
    userId: session.userId,
    targetOrganizationId: body.data.organizationId,
    superAdmin: Boolean(session.isSuperAdmin),
  });

  if (!result.ok) {
    return apiError(403, "forbidden", result.reason);
  }

  return Response.json({ ok: true, organizationId: result.organizationId });
});
