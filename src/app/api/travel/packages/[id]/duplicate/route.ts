import { apiError, withAuth } from "@/lib/api";
import { duplicatePackage } from "@/server/travel/packages";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export const POST = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  try {
    const duplicated = await duplicatePackage(session.organizationId, id);
    if (!duplicated) {
      return apiError(404, "not_found", "Paquete turístico no encontrado para duplicar");
    }
    return Response.json({ package: duplicated }, { status: 201 });
  } catch (err) {
    console.error("[packages] error al duplicar paquete:", err);
    return apiError(
      500,
      "package_error",
      err instanceof Error ? err.message : "Error al duplicar paquete"
    );
  }
});
