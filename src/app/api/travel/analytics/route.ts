import { sql } from "drizzle-orm";
import { withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (session) => {
  const db = getDb();

  const [quotesCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.travelQuote)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        session.organizationId,
        sql`${schema.travelQuote.isBooking} = false`
      )
    );

  const [bookingsCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.travelQuote)
    .where(
      scoped(
        schema.travelQuote.organizationId,
        session.organizationId,
        sql`${schema.travelQuote.isBooking} = true`
      )
    );

  const [paymentsSum] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.travelPayment.amount}), 0)::int` })
    .from(schema.travelPayment)
    .where(scoped(schema.travelPayment.organizationId, session.organizationId));

  const topDestinations = await db
    .select({
      destination: schema.travelQuote.destination,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.travelQuote)
    .where(scoped(schema.travelQuote.organizationId, session.organizationId))
    .groupBy(schema.travelQuote.destination)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  return Response.json({
    travelStats: {
      totalQuotes: quotesCount?.count ?? 0,
      totalBookings: bookingsCount?.count ?? 0,
      totalPaid: paymentsSum?.total ?? 0,
      topDestinations,
    },
  });
});
