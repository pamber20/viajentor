import { describe, expect, it } from "vitest";
import {
  calculateDetailedQuoteTotals,
  prepareQuoteDaysFromPackage,
} from "@/lib/travel/pricing";
import type { TravelDay } from "@/lib/travel/types";

describe("prepareQuoteDaysFromPackage y cálculo de cotización", () => {
  it("reescala ítems para 2 adultos y filtra el hotel seleccionado correctamente", () => {
    // Simular los días de un paquete base para 1 adulto con 3 opciones de hotel
    const mockPackageDays: TravelDay[] = [
      {
        id: "day_1",
        dayNumber: 1,
        items: [
          {
            id: "flight_1",
            type: "Flight",
            title: "Vuelos Medellín - Punta Cana",
            description: "Ida y vuelta",
            netPrice: 1200000,
            markup: 200000,
            totalPrice: 1400000,
            pricePerPerson: true,
            netPriceAdult: 1200000,
            markupAdult: 200000,
          },
          {
            id: "hotel_rio",
            type: "Hotel",
            title: "Rio Republica",
            description: "Todo incluido",
            netPrice: 1500000,
            markup: 300000,
            totalPrice: 1800000,
            pricePerPerson: true,
            netPriceAdult: 1500000,
            markupAdult: 300000,
          },
          {
            id: "hotel_bahia",
            type: "Hotel",
            title: "Bahía Príncipe Grand Punta Cana",
            description: "Todo incluido",
            netPrice: 1300000,
            markup: 250000,
            totalPrice: 1550000,
            pricePerPerson: true,
            netPriceAdult: 1300000,
            markupAdult: 250000,
          },
        ],
      },
    ];

    // Preparar para 2 adultos y hotel "hotel_rio"
    const prepared = prepareQuoteDaysFromPackage({
      days: mockPackageDays,
      passengers: 2,
      childPassengers: 0,
      selectedHotelId: "hotel_rio",
      nights: 4,
    });

    // 1. Debe haber completado los días hasta 5 días (4 noches + 1)
    expect(prepared.length).toBe(5);

    // 2. En el día 1, solo debe quedar el hotel Rio Republica (el Bahía fue excluido)
    const day1Hotels = prepared[0]!.items.filter((i) => i.type === "Hotel");
    expect(day1Hotels.length).toBe(1);
    expect(day1Hotels[0]!.id).toBe("hotel_rio");

    // 3. El total del vuelo debe haberse reescalado para 2 adultos (1.400.000 * 2 = 2.800.000)
    const flight = prepared[0]!.items.find((i) => i.type === "Flight");
    expect(flight?.totalPrice).toBe(2800000);

    // 4. El total del hotel Rio debe haberse reescalado para 2 adultos (1.800.000 * 2 = 3.600.000)
    expect(day1Hotels[0]!.totalPrice).toBe(3600000);

    // 5. El cálculo final de la cotización debe sumar los valores reescalados para 2 pasajeros
    const totals = calculateDetailedQuoteTotals({
      passengers: 2,
      childPassengers: 0,
      currency: "COP",
      markupPercentage: 15,
      profitability: 75,
      days: prepared,
    });

    expect(totals.finalTotal).toBeGreaterThan(6000000);
  });
});
