import { apiError, withAuth } from "@/lib/api";
import { deletePayment } from "@/server/travel/trips";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const DELETE = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const ok = await deletePayment({
    organizationId: session.organizationId,
    id,
  });

  if (!ok) {
    return apiError(404, "not_found", "Abono no encontrado");
  }

  return Response.json({ success: true });
});
