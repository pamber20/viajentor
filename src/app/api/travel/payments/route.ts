import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { createPayment, listPayments } from "@/server/travel/trips";

export const dynamic = "force-dynamic";

const createPaymentSchema = z.object({
  quoteId: z.string().min(1, "quoteId es obligatorio"),
  installmentId: z.string().optional().nullable(),
  amount: z.number().positive("El monto debe ser mayor a 0"),
  date: z.string().min(1, "La fecha es obligatoria"),
  method: z.string().min(1, "El método de pago es obligatorio"),
  reference: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  mediaAssetId: z.string().optional().nullable(),
});

export const GET = withAuth(async (session, req: Request) => {
  const url = new URL(req.url);
  const quoteId = url.searchParams.get("quoteId");

  if (!quoteId) {
    return apiError(400, "missing_param", "El parámetro quoteId es obligatorio");
  }

  const payments = await listPayments({
    organizationId: session.organizationId,
    quoteId,
  });

  return Response.json({ payments });
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createPaymentSchema);
  if (!body.ok) return body.response;

  try {
    const payment = await createPayment({
      organizationId: session.organizationId,
      ...body.data,
    });

    return Response.json({ payment }, { status: 201 });
  } catch (err) {
    console.error("[payments] error al registrar abono:", err);
    return apiError(
      500,
      "payment_create_error",
      err instanceof Error ? err.message : "Error al registrar abono"
    );
  }
});
