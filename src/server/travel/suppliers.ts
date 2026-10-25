import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { normalizeText } from "@/lib/search";
import type {
  TravelSupplier,
  TravelSupplierHotelMeta,
  TravelSupplierNegotiatedRate,
  TravelSupplierType,
} from "@/lib/travel/types";

const UNACCENT_FROM = "áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ";
const UNACCENT_TO = "aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC";

type SupplierRow = typeof schema.travelSupplier.$inferSelect;

export function serializeSupplier(row: SupplierRow): TravelSupplier {
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    type: row.type as TravelSupplierType,
    contact: row.contact,
    negotiatedRates: row.negotiatedRates as TravelSupplierNegotiatedRate[] | null,
    commission: row.commission,
    sla: row.sla,
    rating: row.rating,
    notes: row.notes,
    active: row.active,
    operatingCities: row.operatingCities,
    hotelMeta: row.hotelMeta as TravelSupplierHotelMeta | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listSuppliers(input: {
  organizationId: string;
  query?: string;
  type?: TravelSupplierType | "all";
  activeOnly?: boolean;
}): Promise<TravelSupplier[]> {
  const db = getDb();
  const q = input.query?.trim();

  let searchCondition = undefined;
  if (q && q.length > 0) {
    const qLike = normalizeText(q).replace(/[\\%_]/g, "\\$&");
    searchCondition = sql`lower(translate(${schema.travelSupplier.name}, ${UNACCENT_FROM}, ${UNACCENT_TO}))
      like ${`%${qLike}%`}`;
  }

  const typeCondition =
    input.type && input.type !== "all"
      ? eq(schema.travelSupplier.type, input.type)
      : undefined;

  const activeCondition =
    input.activeOnly ? eq(schema.travelSupplier.active, true) : undefined;

  const rows = await db
    .select()
    .from(schema.travelSupplier)
    .where(
      scoped(
        schema.travelSupplier.organizationId,
        input.organizationId,
        searchCondition,
        typeCondition,
        activeCondition
      )
    )
    .orderBy(desc(schema.travelSupplier.updatedAt))
    .limit(300);

  return rows.map(serializeSupplier);
}

export async function getSupplier(input: {
  organizationId: string;
  id: string;
}): Promise<TravelSupplier | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.travelSupplier)
    .where(
      scoped(
        schema.travelSupplier.organizationId,
        input.organizationId,
        eq(schema.travelSupplier.id, input.id)
      )
    )
    .limit(1);

  if (!rows[0]) return null;
  return serializeSupplier(rows[0]);
}

export interface CreateSupplierInput {
  organizationId: string;
  name: string;
  type: TravelSupplierType;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  negotiatedRates?: TravelSupplierNegotiatedRate[] | null;
  commission?: number | null;
  sla?: string | null;
  rating?: number | null;
  notes?: string | null;
  active?: boolean;
  operatingCities?: string[] | null;
  hotelMeta?: TravelSupplierHotelMeta | null;
}

export async function createSupplier(input: CreateSupplierInput): Promise<TravelSupplier> {
  const db = getDb();
  const id = newId("travelSupplier");

  const [inserted] = await db
    .insert(schema.travelSupplier)
    .values({
      id,
      organizationId: input.organizationId,
      name: input.name.trim(),
      type: input.type,
      contact: input.contact ?? null,
      negotiatedRates: input.negotiatedRates ?? null,
      commission: input.commission ?? null,
      sla: input.sla?.trim() ?? null,
      rating: input.rating ?? 5,
      notes: input.notes?.trim() ?? null,
      active: input.active ?? true,
      operatingCities: input.operatingCities ?? null,
      hotelMeta: input.hotelMeta ?? null,
    })
    .returning();

  if (!inserted) {
    throw new Error("No se pudo crear el proveedor");
  }

  return serializeSupplier(inserted);
}

export interface UpdateSupplierInput {
  organizationId: string;
  id: string;
  name?: string;
  type?: TravelSupplierType;
  contact?: {
    name?: string;
    email?: string;
    phone?: string;
  } | null;
  negotiatedRates?: TravelSupplierNegotiatedRate[] | null;
  commission?: number | null;
  sla?: string | null;
  rating?: number | null;
  notes?: string | null;
  active?: boolean;
  operatingCities?: string[] | null;
  hotelMeta?: TravelSupplierHotelMeta | null;
}

export async function updateSupplier(input: UpdateSupplierInput): Promise<TravelSupplier | null> {
  const db = getDb();

  const patch: Partial<typeof schema.travelSupplier.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.type !== undefined) patch.type = input.type;
  if (input.contact !== undefined) patch.contact = input.contact;
  if (input.negotiatedRates !== undefined) patch.negotiatedRates = input.negotiatedRates;
  if (input.commission !== undefined) patch.commission = input.commission;
  if (input.sla !== undefined) patch.sla = input.sla ? input.sla.trim() : null;
  if (input.rating !== undefined) patch.rating = input.rating;
  if (input.notes !== undefined) patch.notes = input.notes ? input.notes.trim() : null;
  if (input.active !== undefined) patch.active = input.active;
  if (input.operatingCities !== undefined) patch.operatingCities = input.operatingCities;
  if (input.hotelMeta !== undefined) patch.hotelMeta = input.hotelMeta;

  const [updated] = await db
    .update(schema.travelSupplier)
    .set(patch)
    .where(
      scoped(
        schema.travelSupplier.organizationId,
        input.organizationId,
        eq(schema.travelSupplier.id, input.id)
      )
    )
    .returning();

  if (!updated) return null;
  return serializeSupplier(updated);
}

export async function deleteSupplier(input: {
  organizationId: string;
  id: string;
}): Promise<boolean> {
  const db = getDb();
  const deleted = await db
    .delete(schema.travelSupplier)
    .where(
      scoped(
        schema.travelSupplier.organizationId,
        input.organizationId,
        eq(schema.travelSupplier.id, input.id)
      )
    )
    .returning({ id: schema.travelSupplier.id });

  return deleted.length > 0;
}

export async function createSuppliersBulk(input: {
  organizationId: string;
  suppliers: Array<Omit<CreateSupplierInput, "organizationId">>;
}): Promise<{ count: number; suppliers: TravelSupplier[] }> {
  const db = getDb();
  if (input.suppliers.length === 0) return { count: 0, suppliers: [] };

  const valuesToInsert = input.suppliers.map((s) => ({
    id: newId("travelSupplier"),
    organizationId: input.organizationId,
    name: s.name.trim(),
    type: s.type,
    contact: s.contact ?? null,
    negotiatedRates: s.negotiatedRates ?? null,
    commission: s.commission ?? null,
    sla: s.sla?.trim() ?? null,
    rating: s.rating ?? 5,
    notes: s.notes?.trim() ?? null,
    active: s.active ?? true,
    operatingCities: s.operatingCities ?? null,
    hotelMeta: s.hotelMeta ?? null,
  }));

  const inserted = await db
    .insert(schema.travelSupplier)
    .values(valuesToInsert)
    .returning();

  return {
    count: inserted.length,
    suppliers: inserted.map(serializeSupplier),
  };
}
