import { describe, expect, it } from "vitest";
import {
  calculateDetailedQuoteTotals,
  distributePaymentToInstallments,
  generateAutoInstallments,
  getProfitabilityDivisor,
  type PricingQuoteInput,
} from "@/lib/travel/pricing";
import type { TravelInstallment } from "@/lib/travel/types";

describe("Travel Pricing Engine", () => {
  it("calcula divisor de rentabilidad correctamente", () => {
    // Formato antiguo / divisor directo (< 1)
    expect(getProfitabilityDivisor(0.75, undefined)).toBe(0.75);
    // Formato nuevo / porcentaje de margen (25% -> 0.75)
    expect(getProfitabilityDivisor(25, undefined)).toBe(0.75);
    // Fallback a agencia
    expect(getProfitabilityDivisor(undefined, 0.8)).toBe(0.8);
    expect(getProfitabilityDivisor(undefined, 20)).toBe(0.8);
    // Default 0.75
    expect(getProfitabilityDivisor(undefined, undefined)).toBe(0.75);
  });

  it("calcula totales de cotización con markup, fee y comisiones", () => {
    const mockQuote: PricingQuoteInput = {
      passengers: 2,
      childPassengers: 1,
      currency: "COP",
      taxes: 10,
      agencyCommission: 5,
      administrativeFee: 50000,
      profitability: 0.75, // markup divisor
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          items: [
            {
              id: "item-flight",
              type: "Flight",
              title: "Vuelos",
              description: "Vuelo ida y vuelta",
              netPrice: 600000,
              markup: 0,
              totalPrice: 600000,
              pricePerPerson: true,
              netPriceAdult: 200000,
              netPriceChild: 200000,
              assignedOptions: ["Shared"],
            },
            {
              id: "item-hotel",
              type: "Hotel",
              title: "Hotel Playa",
              description: "3 noches",
              netPrice: 900000,
              markup: 0,
              totalPrice: 900000,
              pricePerPerson: false,
              assignedOptions: ["B"],
            },
          ],
        },
      ],
    };

    const totals = calculateDetailedQuoteTotals(mockQuote);
    expect(totals.subtotal).toBe(1500000);
    // Hotel markup con divisor 0.75: (900000 / 0.75) - 900000 = 1200000 - 900000 = 300000
    expect(totals.markupAmount).toBe(300000);
    // With markup: 600000 + 1200000 = 1800000
    // Taxes (10%): 180000
    expect(totals.taxAmount).toBe(180000);
    // Commission (5%): 90000
    expect(totals.commissionAmount).toBe(90000);
    // Admin fee: 50000 * 3 = 150000
    // Total: 1800000 + 180000 + 90000 + 150000 = 2220000
    expect(totals.total).toBe(2220000);
    expect(totals.finalTotal).toBe(2220000);
  });

  it("distribuye abonos en cascada a las cuotas", () => {
    const installments: TravelInstallment[] = [
      { id: "inst-1", code: "Cuota 1", amount: 500000, dueDate: "2026-11-01", status: "pending" },
      { id: "inst-2", code: "Cuota 2", amount: 500000, dueDate: "2026-12-01", status: "pending" },
      { id: "inst-3", code: "Cuota 3", amount: 500000, dueDate: "2027-01-01", status: "pending" },
    ];

    const paidMap: Record<string, number> = {
      "inst-1": 200000,
    };

    // Abonamos 600000:
    // Cuota 1 necesita 300000 -> queda en 500000 (paid)
    // Cuota 2 recibe los 300000 restantes -> queda en 300000 (partial)
    const result = distributePaymentToInstallments(installments, paidMap, 600000, "inst-1");
    expect(result.distributions).toHaveLength(2);
    expect(result.distributions[0]?.amount).toBe(300000);
    expect(result.distributions[1]?.amount).toBe(300000);

    expect(result.updatedInstallments[0]?.status).toBe("paid");
    expect(result.updatedInstallments[1]?.status).toBe("partial");
    expect(result.updatedInstallments[2]?.status).toBe("pending");
  });

  it("genera plan de cuotas automático equitativo", () => {
    let nextId = 1;
    const genId = () => `inst-${nextId++}`;
    const schedule = generateAutoInstallments(1000000, 3, "monthly", "2026-11-01", genId);

    expect(schedule).toHaveLength(3);
    expect(schedule[0]?.amount).toBe(333333);
    expect(schedule[1]?.amount).toBe(333333);
    expect(schedule[2]?.amount).toBe(333334); // suma exactamente 1000000
    expect(schedule.reduce((sum, s) => sum + s.amount, 0)).toBe(1000000);
    expect(schedule[0]?.dueDate).toBe("2026-11-01");
  });
});
