import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { convertQuoteToBooking } from "@/server/travel/quotes";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const convertSchema = z.object({
  notes: z.string().trim().optional(),
  selectedHotelId: z.string().trim().optional(),
});

export const POST = withAuth(async (session, req: Request, ctx: RouteContext) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, convertSchema);
  const notes = body.ok ? body.data.notes : undefined;
  const selectedHotelId = body.ok ? body.data.selectedHotelId : undefined;

  try {
    const result = await convertQuoteToBooking({
      organizationId: session.organizationId,
      quoteId: id,
      actorUserId: session.userId,
      notes,
      selectedHotelId,
    });

    return Response.json(result);
  } catch (err) {
    console.error("[quotes/convert] error al convertir cotización:", err);
    return apiError(
      500,
      "convert_error",
      err instanceof Error ? err.message : "Error al convertir cotización en reserva"
    );
  }
});
