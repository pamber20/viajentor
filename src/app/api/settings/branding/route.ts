import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getSessionOrNull } from "@/lib/auth/session";
import { isValidHex, resolveAccentSet } from "@/lib/branding";
import { CURRENCIES } from "@/lib/money";
import { getBranding, saveBranding } from "@/server/branding";

export const dynamic = "force-dynamic";

/** GET público: el login necesita la marca antes de autenticarse. */
export async function GET() {
  const session = await getSessionOrNull();
  const branding = await getBranding(session?.organizationId);
  return Response.json({ branding, accentSet: resolveAccentSet(branding.accent) });
}

const agencySchema = z
  .object({
    nit: z.string().optional(),
    rnt: z.string().optional(),
    slogan: z.string().optional(),
    bankEntity: z.string().optional(),
    bankAccount: z.string().optional(),
    phone: z.string().optional(),
    phone2: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    email: z.string().optional(),
    email2: z.string().optional(),
    website: z.string().optional(),
    advisorName: z.string().optional(),
    generalPolicies: z.string().optional(),
    bookingConfirmation: z.string().optional(),
    profitability: z.number().optional(),
    freelanceCommission: z.number().optional(),
    socialMedia: z
      .object({
        instagram: z.string().optional(),
        facebook: z.string().optional(),
        whatsapp: z.string().optional(),
      })
      .optional(),
    theme: z
      .object({
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        fontFamily: z.string().optional(),
        pdfNavy: z.string().optional(),
        pdfAccent: z.string().optional(),
        pdfBackground: z.string().optional(),
        pdfTextPrimary: z.string().optional(),
        pdfTextSecondary: z.string().optional(),
      })
      .optional(),
  })
  .optional();

const putSchema = z.object({
  name: z.string().trim().min(1).max(30),
  accent: z.string().refine(isValidHex, "Color hex inválido (#rrggbb)"),
  /** La moneda del negocio: la única que el tablero suma. */
  currency: z.enum(CURRENCIES),
  agency: agencySchema,
});

export const PUT = withAuth(async (session, req: Request) => {
  if (session.role !== "owner") {
    return apiError(403, "forbidden", "Solo el propietario puede cambiar la marca");
  }
  const body = await parseBody(req, putSchema);
  if (!body.ok) return body.response;
  // El icono se conserva: este formulario es de nombre, color y moneda, y se
  // sube y se quita por su propia ruta. Sin esto, guardar el nombre borraría
  // el logo sin que nadie lo pidiera.
  const actual = await getBranding(session.organizationId);
  await saveBranding(session.organizationId, {
    ...body.data,
    favicon: actual.favicon,
  });
  return Response.json({ ok: true });
});
