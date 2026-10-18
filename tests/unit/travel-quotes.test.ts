import { describe, expect, it } from "vitest";
import { serializeQuote } from "@/server/travel/quotes";

describe("travel quotes service", () => {
  it("serializa una cotización con días e ítems calculando los totales de margen y rentabilidad", () => {
    const now = new Date("2026-06-01T10:00:00Z");
    const mockRow = {
      id: "qt_test123",
      organizationId: "org_1",
      contactId: "ct_1",
      leadId: "ld_1",
      assignedUserId: "usr_1",
      quoteNumber: "COT-2026-0001",
      bookingNumber: null,
      isBooking: false,
      status: "draft",
      bookingStatus: null,
      clientName: "Familia Gómez",
      clientPhone: "+573001234567",
      clientEmail: "gomez@example.com",
      originCity: "Bogotá",
      destination: "Punta Cana",
      departureAirport: "BOG",
      arrivalAirport: "PUJ",
      flightType: "round-trip",
      startDate: "2026-08-01",
      endDate: "2026-08-06",
      nights: 5,
      passengers: 2,
      childPassengers: 0,
      childAges: null,
      rooms: 1,
      travelReason: "Vacaciones de verano",
      flexibility: "Exactas",
      preferences: { allInclusive: true },
      currency: "COP",
      exchangeRate: 1,
      markupPercentage: 15,
      taxes: 50000,
      agencyCommission: 0,
      minimumDeposit: 500000,
      administrativeFee: 80000,
      medicalAssistance: 60000,
      profitability: 75,
      freelanceCommission: 10,
      validityHours: 48,
      optionTitles: null,
      isComparisonMode: false,
      activeOptionsCount: 1,
      days: [
        {
          id: "d1",
          dayNumber: 1,
          items: [
            {
              id: "it1",
              type: "Hotel",
              title: "Hard Rock Hotel Punta Cana",
              description: "Habitación Caribe Deluxe All Inclusive",
              netPrice: 2000000,
              markup: 300000,
              totalPrice: 2300000,
            },
          ],
        },
      ],
      amortizationSchedule: [],
      travelers: [],
      inclusions: "Todo incluido, traslados",
      exclusions: "Tiquetes aéreos no incluidos",
      policies: "Cancelación hasta 15 días antes",
      bookingConfirmation: null,
      pnrExpiration: null,
      billingName: "Pedro Gómez",
      billingId: "12345678",
      counterName: "Agencia Principal",
      advisorName: "Laura Asesora",
      observations: "Clientes VIP",
      createdAt: now,
      updatedAt: now,
    };

    const quote = serializeQuote(
      mockRow as unknown as Parameters<typeof serializeQuote>[0]
    );

    expect(quote.id).toBe("qt_test123");
    expect(quote.quoteNumber).toBe("COT-2026-0001");
    expect(quote.isBooking).toBe(false);
    expect(quote.status).toBe("draft");
    expect(quote.totals.hotelSubtotal).toBe(2300000);
    expect(quote.totals.total).toBeGreaterThan(2300000);
    expect(quote.totals.finalTotal).toBeGreaterThan(2300000);
  });
});
