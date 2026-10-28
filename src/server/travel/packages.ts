import { and, desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { normalizeText } from "@/lib/search";
import { calculateDetailedQuoteTotals } from "@/lib/travel/pricing";
import type {
  TravelCurrency,
  TravelDay,
  TravelInstallment,
} from "@/lib/travel/types";

export type PackageStatus = "active" | "draft" | "archived";

type PackageRow = typeof schema.travelPackage.$inferSelect;

export interface TravelPackageDto {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  destination: string;
  originCity: string | null;
  departureAirport: string | null;
  arrivalAirport: string | null;
  flightType: "round-trip" | "one-way" | null;
  startDate: string;
  endDate: string;
  nights: number;
  passengers: number;
  childPassengers: number;
  currency: TravelCurrency;
  exchangeRate: number;
  markupPercentage: number;
  taxes: number;
  agencyCommission: number;
  minimumDeposit: number;
  administrativeFee: number;
  medicalAssistance: number;
  profitability: number;
  freelanceCommission: number;
  selectedHotelId: string | null;
  days: TravelDay[];
  amortizationSchedule: TravelInstallment[];
  inclusions: string | null;
  exclusions: string | null;
  policies: string | null;
  status: PackageStatus;
  totals: ReturnType<typeof calculateDetailedQuoteTotals>;
  services: {
    hasFlight: boolean;
    hasHotel: boolean;
    hasTransfers: boolean;
    hasActivities: boolean;
    hasAssistance: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export function serializePackage(row: PackageRow): TravelPackageDto {
  const days = (row.days ?? []) as TravelDay[];
  const exchangeRate = row.exchangeRate ?? 1;
  const markupPercentage = row.markupPercentage ?? 15;
  const taxes = row.taxes ?? 0;
  const administrativeFee = row.administrativeFee ?? 0;
  const medicalAssistance = row.medicalAssistance ?? 0;
  const agencyCommission = row.agencyCommission ?? 0;
  const profitability = row.profitability ?? 75;
  const freelanceCommission = row.freelanceCommission ?? 10;
  const passengers = row.passengers ?? 2;
  const childPassengers = row.childPassengers ?? 0;

  const totals = calculateDetailedQuoteTotals({
    passengers,
    childPassengers,
    currency: row.currency ?? "COP",
    markupPercentage,
    taxes,
    agencyCommission,
    administrativeFee,
    profitability,
    days,
  });

  const hasFlight = days.some((d) => d.items?.some((i) => i.type === "Flight"));
  const hasHotel = Boolean(
    row.selectedHotelId || days.some((d) => d.items?.some((i) => i.type === "Hotel"))
  );
  const hasTransfers = days.some((d) => d.items?.some((i) => i.type === "Transfer"));
  const hasActivities = days.some((d) => d.items?.some((i) => i.type === "Activity"));
  const hasAssistance = medicalAssistance > 0;

  return {
    id: row.id,
    organizationId: row.organizationId,
    title: row.title,
    description: row.description,
    destination: row.destination,
    originCity: row.originCity,
    departureAirport: row.departureAirport,
    arrivalAirport: row.arrivalAirport,
    flightType: (row.flightType as "round-trip" | "one-way" | null) ?? "round-trip",
    startDate: row.startDate,
    endDate: row.endDate,
    nights: row.nights ?? 0,
    passengers,
    childPassengers,
    currency: (row.currency as TravelCurrency) ?? "COP",
    exchangeRate,
    markupPercentage,
    taxes,
    agencyCommission,
    minimumDeposit: row.minimumDeposit ?? 0,
    administrativeFee,
    medicalAssistance,
    profitability,
    freelanceCommission,
    selectedHotelId: row.selectedHotelId,
    days,
    amortizationSchedule: (row.amortizationSchedule ?? []) as TravelInstallment[],
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    policies: row.policies,
    status: (row.status as PackageStatus) ?? "active",
    totals,
    services: {
      hasFlight,
      hasHotel,
      hasTransfers,
      hasActivities,
      hasAssistance,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type CreatePackageInput = {
  organizationId: string;
  title: string;
  description?: string | null;
  destination: string;
  originCity?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  flightType?: "round-trip" | "one-way" | null;
  startDate: string;
  endDate: string;
  nights?: number;
  passengers?: number;
  childPassengers?: number;
  currency?: TravelCurrency;
  exchangeRate?: number;
  markupPercentage?: number;
  taxes?: number;
  agencyCommission?: number;
  minimumDeposit?: number;
  administrativeFee?: number;
  medicalAssistance?: number;
  profitability?: number;
  freelanceCommission?: number;
  selectedHotelId?: string | null;
  days: TravelDay[];
  amortizationSchedule?: TravelInstallment[] | null;
  inclusions?: string | null;
  exclusions?: string | null;
  policies?: string | null;
  status?: PackageStatus;
};

export async function createPackage(
  input: CreatePackageInput
): Promise<TravelPackageDto> {
  const db = getDb();
  const id = newId("travelPackage");

  const [row] = await db
    .insert(schema.travelPackage)
    .values({
      id,
      organizationId: input.organizationId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      destination: input.destination.trim(),
      originCity: input.originCity?.trim() || null,
      departureAirport: input.departureAirport?.trim() || null,
      arrivalAirport: input.arrivalAirport?.trim() || null,
      flightType: input.flightType ?? "round-trip",
      startDate: input.startDate,
      endDate: input.endDate,
      nights: input.nights ?? 0,
      passengers: input.passengers ?? 2,
      childPassengers: input.childPassengers ?? 0,
      currency: input.currency ?? "COP",
      exchangeRate: input.exchangeRate ?? 1,
      markupPercentage: input.markupPercentage ?? 15,
      taxes: input.taxes ?? 0,
      agencyCommission: input.agencyCommission ?? 0,
      minimumDeposit: input.minimumDeposit ?? 0,
      administrativeFee: input.administrativeFee ?? 0,
      medicalAssistance: input.medicalAssistance ?? 0,
      profitability: input.profitability ?? 75,
      freelanceCommission: input.freelanceCommission ?? 10,
      selectedHotelId: input.selectedHotelId ?? null,
      days: input.days ?? [],
      amortizationSchedule: input.amortizationSchedule ?? [],
      inclusions: input.inclusions ?? null,
      exclusions: input.exclusions ?? null,
      policies: input.policies ?? null,
      status: input.status ?? "active",
    })
    .returning();

  if (!row) {
    throw new Error("No se pudo crear el paquete turístico");
  }

  return serializePackage(row);
}

export async function listPackages(
  organizationId: string,
  options?: {
    search?: string;
    status?: string;
  }
): Promise<TravelPackageDto[]> {
  const db = getDb();
  const conditions = [scoped(schema.travelPackage.organizationId, organizationId)];

  if (options?.status && options.status !== "all") {
    conditions.push(eq(schema.travelPackage.status, options.status as PackageStatus));
  }

  const rows = await db
    .select()
    .from(schema.travelPackage)
    .where(and(...conditions))
    .orderBy(desc(schema.travelPackage.createdAt));

  let results = rows.map(serializePackage);

  if (options?.search?.trim()) {
    const qNorm = normalizeText(options.search.trim().toLowerCase());
    results = results.filter((p) => {
      const matchTitle = normalizeText(p.title.toLowerCase()).includes(qNorm);
      const matchDest = normalizeText(p.destination.toLowerCase()).includes(qNorm);
      const matchDesc = p.description ? normalizeText(p.description.toLowerCase()).includes(qNorm) : false;
      return matchTitle || matchDest || matchDesc;
    });
  }

  return results;
}

export async function getPackage(
  organizationId: string,
  id: string
): Promise<TravelPackageDto | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.travelPackage)
    .where(
      scoped(
        schema.travelPackage.organizationId,
        organizationId,
        eq(schema.travelPackage.id, id)
      )
    )
    .limit(1);

  return row ? serializePackage(row) : null;
}

export type UpdatePackageInput = Partial<Omit<CreatePackageInput, "organizationId">>;

export async function updatePackage(
  organizationId: string,
  id: string,
  patch: UpdatePackageInput
): Promise<TravelPackageDto | null> {
  const db = getDb();

  const [row] = await db
    .update(schema.travelPackage)
    .set({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.description !== undefined ? { description: patch.description?.trim() || null } : {}),
      ...(patch.destination !== undefined ? { destination: patch.destination.trim() } : {}),
      ...(patch.originCity !== undefined ? { originCity: patch.originCity?.trim() || null } : {}),
      ...(patch.departureAirport !== undefined ? { departureAirport: patch.departureAirport?.trim() || null } : {}),
      ...(patch.arrivalAirport !== undefined ? { arrivalAirport: patch.arrivalAirport?.trim() || null } : {}),
      ...(patch.flightType !== undefined ? { flightType: patch.flightType } : {}),
      ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
      ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
      ...(patch.nights !== undefined ? { nights: patch.nights } : {}),
      ...(patch.passengers !== undefined ? { passengers: patch.passengers } : {}),
      ...(patch.childPassengers !== undefined ? { childPassengers: patch.childPassengers } : {}),
      ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
      ...(patch.exchangeRate !== undefined ? { exchangeRate: patch.exchangeRate } : {}),
      ...(patch.markupPercentage !== undefined ? { markupPercentage: patch.markupPercentage } : {}),
      ...(patch.taxes !== undefined ? { taxes: patch.taxes } : {}),
      ...(patch.agencyCommission !== undefined ? { agencyCommission: patch.agencyCommission } : {}),
      ...(patch.minimumDeposit !== undefined ? { minimumDeposit: patch.minimumDeposit } : {}),
      ...(patch.administrativeFee !== undefined ? { administrativeFee: patch.administrativeFee } : {}),
      ...(patch.medicalAssistance !== undefined ? { medicalAssistance: patch.medicalAssistance } : {}),
      ...(patch.profitability !== undefined ? { profitability: patch.profitability } : {}),
      ...(patch.freelanceCommission !== undefined ? { freelanceCommission: patch.freelanceCommission } : {}),
      ...(patch.selectedHotelId !== undefined ? { selectedHotelId: patch.selectedHotelId } : {}),
      ...(patch.days !== undefined ? { days: patch.days } : {}),
      ...(patch.amortizationSchedule !== undefined ? { amortizationSchedule: patch.amortizationSchedule ?? [] } : {}),
      ...(patch.inclusions !== undefined ? { inclusions: patch.inclusions } : {}),
      ...(patch.exclusions !== undefined ? { exclusions: patch.exclusions } : {}),
      ...(patch.policies !== undefined ? { policies: patch.policies } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      updatedAt: new Date(),
    })
    .where(
      scoped(
        schema.travelPackage.organizationId,
        organizationId,
        eq(schema.travelPackage.id, id)
      )
    )
    .returning();

  return row ? serializePackage(row) : null;
}

export async function deletePackage(
  organizationId: string,
  id: string
): Promise<boolean> {
  const db = getDb();
  const [deleted] = await db
    .delete(schema.travelPackage)
    .where(
      scoped(
        schema.travelPackage.organizationId,
        organizationId,
        eq(schema.travelPackage.id, id)
      )
    )
    .returning({ id: schema.travelPackage.id });

  return Boolean(deleted);
}

export async function duplicatePackage(
  organizationId: string,
  id: string
): Promise<TravelPackageDto | null> {
  const original = await getPackage(organizationId, id);
  if (!original) return null;

  return createPackage({
    organizationId,
    title: `${original.title} (Copia)`,
    description: original.description,
    destination: original.destination,
    originCity: original.originCity,
    departureAirport: original.departureAirport,
    arrivalAirport: original.arrivalAirport,
    flightType: original.flightType,
    startDate: original.startDate,
    endDate: original.endDate,
    nights: original.nights,
    passengers: original.passengers,
    childPassengers: original.childPassengers,
    currency: original.currency,
    exchangeRate: original.exchangeRate,
    markupPercentage: original.markupPercentage,
    taxes: original.taxes,
    agencyCommission: original.agencyCommission,
    minimumDeposit: original.minimumDeposit,
    administrativeFee: original.administrativeFee,
    medicalAssistance: original.medicalAssistance,
    profitability: original.profitability,
    freelanceCommission: original.freelanceCommission,
    selectedHotelId: original.selectedHotelId,
    days: original.days,
    amortizationSchedule: original.amortizationSchedule,
    inclusions: original.inclusions,
    exclusions: original.exclusions,
    policies: original.policies,
    status: "draft",
  });
}
