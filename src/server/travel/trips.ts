import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { distributePaymentToInstallments } from "@/lib/travel/pricing";
import type {
  ActivityDetail,
  TransferDetail,
  Traveler,
} from "@/lib/travel/types";
import { getQuote } from "./quotes";

export interface TravelPaymentDto {
  id: string;
  organizationId: string;
  quoteId: string;
  installmentId: string | null;
  amount: number;
  date: string;
  method: string;
  reference: string | null;
  receiptNumber: string | null;
  notes: string | null;
  mediaAssetId: string | null;
  createdAt: string;
}

export interface TravelVoucherDto {
  id: string;
  organizationId: string;
  quoteId: string;
  voucherNumber: string;
  travelers: Traveler[];
  checkInReminder: boolean;
  documentsChecklist: {
    id: string;
    label: string;
    completed: boolean;
    mediaAssetId?: string;
    fileName?: string;
  }[];
  hotelDetails: {
    name?: string;
    address?: string;
    checkIn?: string;
    checkOut?: string;
    roomType?: string;
    confirmationNumber?: string;
    notes?: string;
    phone?: string;
    accommodation?: string;
    mealPlan?: string;
    reservationHolder?: string;
    quantity?: number;
    policies?: string;
  } | null;
  flightDetails: {
    airline?: string;
    flightNumber?: string;
    departureDate?: string;
    departureTime?: string;
    departureCity?: string;
    arrivalCity?: string;
    returnAirline?: string;
    returnFlightNumber?: string;
    returnDate?: string;
    returnTime?: string;
    pnr?: string;
  } | null;
  serviceDetails: {
    description?: string;
    provider?: string;
    date?: string;
    time?: string;
    pickupLocation?: string;
  } | null;
  transfers: TransferDetail[];
  transfersConfirmationNumber: string | null;
  activities: ActivityDetail[];
  assistanceInfo: {
    provider?: string;
    policyNumber?: string;
    emergencyPhone?: string;
    coverageDetails?: string;
  } | null;
  additionalInfo: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ============================================================
 * Pagos y Abonos
 * ============================================================ */

export async function listPayments(input: {
  organizationId: string;
  quoteId: string;
}): Promise<TravelPaymentDto[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.travelPayment)
    .where(
      scoped(
        schema.travelPayment.organizationId,
        input.organizationId,
        eq(schema.travelPayment.quoteId, input.quoteId)
      )
    )
    .orderBy(desc(schema.travelPayment.createdAt));

  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    quoteId: r.quoteId,
    installmentId: r.installmentId,
    amount: r.amount,
    date: r.date,
    method: r.method,
    reference: r.reference,
    receiptNumber: r.receiptNumber,
    notes: r.notes,
    mediaAssetId: r.mediaAssetId,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function createPayment(input: {
  organizationId: string;
  quoteId: string;
  installmentId?: string | null;
  amount: number;
  date: string;
  method: string;
  reference?: string | null;
  receiptNumber?: string | null;
  notes?: string | null;
  mediaAssetId?: string | null;
}): Promise<TravelPaymentDto> {
  const db = getDb();
  const quote = await getQuote({
    organizationId: input.organizationId,
    id: input.quoteId,
  });

  if (!quote) {
    throw new Error("Reserva o cotización no encontrada");
  }

  const paymentId = newId("travelPayment");
  const receiptNumber =
    input.receiptNumber ?? `REC-${Date.now().toString().slice(-6)}`;

  const [inserted] = await db
    .insert(schema.travelPayment)
    .values({
      id: paymentId,
      organizationId: input.organizationId,
      quoteId: input.quoteId,
      installmentId: input.installmentId ?? null,
      amount: input.amount,
      date: input.date,
      method: input.method,
      reference: input.reference ?? null,
      receiptNumber,
      notes: input.notes ?? null,
      mediaAssetId: input.mediaAssetId ?? null,
    })
    .returning();

  if (!inserted) {
    throw new Error("No se pudo registrar el abono");
  }

  // Actualizar el plan de cuotas / amortización en la reserva si existe
  if (quote.amortizationSchedule && quote.amortizationSchedule.length > 0) {
    const allPayments = await listPayments({
      organizationId: input.organizationId,
      quoteId: input.quoteId,
    });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    const { updatedInstallments } = distributePaymentToInstallments(
      quote.amortizationSchedule,
      {},
      totalPaid
    );

    await db
      .update(schema.travelQuote)
      .set({
        amortizationSchedule: updatedInstallments,
        updatedAt: new Date(),
      })
      .where(
        scoped(
          schema.travelQuote.organizationId,
          input.organizationId,
          eq(schema.travelQuote.id, input.quoteId)
        )
      );
  }

  return {
    id: inserted.id,
    organizationId: inserted.organizationId,
    quoteId: inserted.quoteId,
    installmentId: inserted.installmentId,
    amount: inserted.amount,
    date: inserted.date,
    method: inserted.method,
    reference: inserted.reference,
    receiptNumber: inserted.receiptNumber,
    notes: inserted.notes,
    mediaAssetId: inserted.mediaAssetId,
    createdAt: inserted.createdAt.toISOString(),
  };
}

export async function deletePayment(input: {
  organizationId: string;
  id: string;
}): Promise<boolean> {
  const db = getDb();

  const [payment] = await db
    .select({ quoteId: schema.travelPayment.quoteId })
    .from(schema.travelPayment)
    .where(
      scoped(
        schema.travelPayment.organizationId,
        input.organizationId,
        eq(schema.travelPayment.id, input.id)
      )
    );

  if (!payment) return false;

  const deleted = await db
    .delete(schema.travelPayment)
    .where(
      scoped(
        schema.travelPayment.organizationId,
        input.organizationId,
        eq(schema.travelPayment.id, input.id)
      )
    )
    .returning({ id: schema.travelPayment.id });

  if (deleted.length > 0) {
    // Recalcular cuotas
    const quote = await getQuote({
      organizationId: input.organizationId,
      id: payment.quoteId,
    });
    if (quote?.amortizationSchedule && quote.amortizationSchedule.length > 0) {
      const remainingPayments = await listPayments({
        organizationId: input.organizationId,
        quoteId: payment.quoteId,
      });
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      const { updatedInstallments } = distributePaymentToInstallments(
        quote.amortizationSchedule,
        {},
        totalPaid
      );

      await db
        .update(schema.travelQuote)
        .set({
          amortizationSchedule: updatedInstallments,
          updatedAt: new Date(),
        })
        .where(
          scoped(
            schema.travelQuote.organizationId,
            input.organizationId,
            eq(schema.travelQuote.id, payment.quoteId)
          )
        );
    }
  }

  return deleted.length > 0;
}

/* ============================================================
 * Vouchers Turísticos
 * ============================================================ */

export async function generateVoucherNumber(organizationId: string): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.travelVoucher)
    .where(scoped(schema.travelVoucher.organizationId, organizationId));

  const seq = String((result?.count ?? 0) + 1).padStart(4, "0");
  return `VCH-${year}-${seq}`;
}

export async function getVoucher(input: {
  organizationId: string;
  quoteId: string;
}): Promise<TravelVoucherDto | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.travelVoucher)
    .where(
      scoped(
        schema.travelVoucher.organizationId,
        input.organizationId,
        eq(schema.travelVoucher.quoteId, input.quoteId)
      )
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    organizationId: row.organizationId,
    quoteId: row.quoteId,
    voucherNumber: row.voucherNumber,
    travelers: (row.travelers ?? []) as Traveler[],
    checkInReminder: row.checkInReminder,
    documentsChecklist: row.documentsChecklist ?? [],
    hotelDetails: row.hotelDetails ?? null,
    flightDetails: row.flightDetails ?? null,
    serviceDetails: row.serviceDetails ?? null,
    transfers: (row.transfers ?? []) as TransferDetail[],
    transfersConfirmationNumber: row.transfersConfirmationNumber,
    activities: (row.activities ?? []) as ActivityDetail[],
    assistanceInfo: row.assistanceInfo ?? null,
    additionalInfo: row.additionalInfo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type UpsertVoucherInput = {
  organizationId: string;
  quoteId: string;
  travelers?: Traveler[];
  checkInReminder?: boolean;
  documentsChecklist?: {
    id: string;
    label: string;
    completed: boolean;
    mediaAssetId?: string;
    fileName?: string;
  }[];
  hotelDetails?: Record<string, unknown> | null;
  flightDetails?: Record<string, unknown> | null;
  serviceDetails?: Record<string, unknown> | null;
  transfers?: TransferDetail[];
  transfersConfirmationNumber?: string | null;
  activities?: ActivityDetail[];
  assistanceInfo?: Record<string, unknown> | null;
  additionalInfo?: string | null;
};

export async function upsertVoucher(input: UpsertVoucherInput): Promise<TravelVoucherDto> {
  const db = getDb();
  const existing = await getVoucher({
    organizationId: input.organizationId,
    quoteId: input.quoteId,
  });

  if (existing) {
    await db
      .update(schema.travelVoucher)
      .set({
        travelers: input.travelers ?? existing.travelers,
        checkInReminder:
          input.checkInReminder !== undefined
            ? input.checkInReminder
            : existing.checkInReminder,
        documentsChecklist:
          input.documentsChecklist ?? existing.documentsChecklist,
        hotelDetails: input.hotelDetails ?? existing.hotelDetails,
        flightDetails: input.flightDetails ?? existing.flightDetails,
        serviceDetails: input.serviceDetails ?? existing.serviceDetails,
        transfers: input.transfers ?? existing.transfers,
        transfersConfirmationNumber:
          input.transfersConfirmationNumber !== undefined
            ? input.transfersConfirmationNumber
            : existing.transfersConfirmationNumber,
        activities: input.activities ?? existing.activities,
        assistanceInfo: input.assistanceInfo ?? existing.assistanceInfo,
        additionalInfo:
          input.additionalInfo !== undefined
            ? input.additionalInfo
            : existing.additionalInfo,
        updatedAt: new Date(),
      })
      .where(
        scoped(
          schema.travelVoucher.organizationId,
          input.organizationId,
          eq(schema.travelVoucher.id, existing.id)
        )
      )
      .returning();

    return getVoucher({ organizationId: input.organizationId, quoteId: input.quoteId }) as Promise<TravelVoucherDto>;
  }

  const id = newId("travelVoucher");
  const voucherNumber = await generateVoucherNumber(input.organizationId);

  const [inserted] = await db
    .insert(schema.travelVoucher)
    .values({
      id,
      organizationId: input.organizationId,
      quoteId: input.quoteId,
      voucherNumber,
      travelers: input.travelers ?? [],
      checkInReminder: input.checkInReminder ?? true,
      documentsChecklist: input.documentsChecklist ?? [],
      hotelDetails: input.hotelDetails ?? null,
      flightDetails: input.flightDetails ?? null,
      serviceDetails: input.serviceDetails ?? null,
      transfers: input.transfers ?? [],
      transfersConfirmationNumber: input.transfersConfirmationNumber ?? null,
      activities: input.activities ?? [],
      assistanceInfo: input.assistanceInfo ?? null,
      additionalInfo: input.additionalInfo ?? null,
    })
    .returning();

  if (!inserted) {
    throw new Error("No se pudo registrar el voucher");
  }

  return {
    id: inserted.id,
    organizationId: inserted.organizationId,
    quoteId: inserted.quoteId,
    voucherNumber: inserted.voucherNumber,
    travelers: (inserted.travelers ?? []) as Traveler[],
    checkInReminder: inserted.checkInReminder,
    documentsChecklist: inserted.documentsChecklist ?? [],
    hotelDetails: inserted.hotelDetails ?? null,
    flightDetails: inserted.flightDetails ?? null,
    serviceDetails: inserted.serviceDetails ?? null,
    transfers: (inserted.transfers ?? []) as TransferDetail[],
    transfersConfirmationNumber: inserted.transfersConfirmationNumber,
    activities: (inserted.activities ?? []) as ActivityDetail[],
    assistanceInfo: inserted.assistanceInfo ?? null,
    additionalInfo: inserted.additionalInfo,
    createdAt: inserted.createdAt.toISOString(),
    updatedAt: inserted.updatedAt.toISOString(),
  };
}
