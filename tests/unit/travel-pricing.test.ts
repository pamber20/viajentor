import { describe, expect, it } from "vitest";
import {
  calculateDetailedQuoteTotals,
  calculatePackageDisplayDays,
  distributePaymentToInstallments,
  extractPackageServices,
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

  describe("extractPackageServices y calculatePackageDisplayDays", () => {
    it("detecta asistencia médica tanto por ítem de itinerario como por inclusiones", () => {
      // 1. Paquete con asistencia en inclusiones (como Punta Cana al atardecer)
      const pkgWithInclusions = {
        days: [],
        medicalAssistance: 0,
        inclusions: "Tiquetes ida y regreso\nAlojamiento todo incluido\nTraslados aeropuerto-hotel\nTarjeta de asistencia médica",
      };
      const services1 = extractPackageServices(pkgWithInclusions);
      expect(services1.hasAssistance).toBe(true);
      expect(services1.hasFlight).toBe(true);
      expect(services1.hasHotel).toBe(true);
      expect(services1.hasTransfers).toBe(true);

      // 2. Paquete con ítem de itinerario tipo Insurance
      const pkgWithItem = {
        days: [
          {
            id: "d1",
            dayNumber: 1,
            items: [
              {
                id: "i1",
                type: "Insurance" as const,
                title: "Asistencia Médica",
                description: "",
                netPrice: 50000,
                markup: 0,
                totalPrice: 50000,
              },
            ],
          },
        ],
        medicalAssistance: 0,
        inclusions: "",
      };
      const services2 = extractPackageServices(pkgWithItem);
      expect(services2.hasAssistance).toBe(true);
    });

    it("calcula correctamente los días de viaje en paquetes (4 noches = 5 días)", () => {
      // Caso 1: 4 noches y días vacío o con 1 solo bloque inicial
      expect(calculatePackageDisplayDays({ nights: 4, days: [] })).toBe(5);
      expect(calculatePackageDisplayDays({ nights: 4, days: [{ id: "d1" }] })).toBe(5);

      // Caso 2: 4 noches y días con 5 bloques de itinerario completos
      expect(
        calculatePackageDisplayDays({
          nights: 4,
          days: [{ id: "d1" }, { id: "d2" }, { id: "d3" }, { id: "d4" }, { id: "d5" }],
        })
      ).toBe(5);

      // Caso 3: 0 noches (pasadía)
      expect(calculatePackageDisplayDays({ nights: 0, days: [{ id: "d1" }] })).toBe(1);
    });
  });
});
