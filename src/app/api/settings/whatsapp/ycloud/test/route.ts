import { z } from "zod";
import { apiError, parseBody, withConfigAuth } from "@/lib/api";
import { testYCloudConnection } from "@/lib/ycloud/client";

export const dynamic = "force-dynamic";

const testSchema = z.object({
  phoneNumber: z.string().trim().min(5, "Número de teléfono requerido"),
  apiKey: z.string().trim().min(5, "API Key requerida"),
});

export const POST = withConfigAuth(async (_session, req: Request) => {
  const body = await parseBody(req, testSchema);
  if (!body.ok) return body.response;

  const result = await testYCloudConnection(
    body.data.apiKey,
    body.data.phoneNumber
  );

  if (!result.ok) {
    const status = result.code === "network_error" ? 503 : 422;
    return apiError(status, result.code, result.message);
  }

  return Response.json({
    ok: true,
    displayPhoneNumber: result.displayPhoneNumber,
    verifiedName: result.verifiedName,
  });
});
