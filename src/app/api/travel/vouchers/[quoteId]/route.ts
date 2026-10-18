import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getVoucher, upsertVoucher } from "@/server/travel/trips";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ quoteId: string }> };

const upsertVoucherSchema = z.object({
  travelers: z.array(z.any()).optional(),
  checkInReminder: z.boolean().optional(),
  documentsChecklist: z.array(z.any()).optional(),
  hotelDetails: z.any().optional().nullable(),
  flightDetails: z.any().optional().nullable(),
  serviceDetails: z.any().optional().nullable(),
  transfers: z.array(z.any()).optional(),
  transfersConfirmationNumber: z.string().optional().nullable(),
  activities: z.array(z.any()).optional(),
  assistanceInfo: z.any().optional().nullable(),
  additionalInfo: z.string().optional().nullable(),
});

export const GET = withAuth(async (session, _req: Request, ctx: RouteContext) => {
  const { quoteId } = await ctx.params;
  const voucher = await getVoucher({
    organizationId: session.organizationId,
    quoteId,
  });

  return Response.json({ voucher });
});

export const POST = withAuth(async (session, req: Request, ctx: RouteContext) => {
  const { quoteId } = await ctx.params;
  const body = await parseBody(req, upsertVoucherSchema);
  if (!body.ok) return body.response;

  try {
    const voucher = await upsertVoucher({
      organizationId: session.organizationId,
      quoteId,
      ...body.data,
    });

    return Response.json({ voucher });
  } catch (err) {
    console.error("[vouchers] error al guardar voucher:", err);
    return apiError(
      500,
      "voucher_error",
      err instanceof Error ? err.message : "Error al guardar voucher"
    );
  }
});
