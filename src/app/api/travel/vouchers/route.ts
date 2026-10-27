import { withAuth } from "@/lib/api";
import { listVouchers } from "@/server/travel/trips";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const result = await listVouchers(session.organizationId);
  return Response.json(result);
});
