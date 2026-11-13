import { describe, expect, it } from "vitest";
import {
  getActiveFutureDepartures,
  getLowestDepartureAdultPrice,
  resolveDepartureForQuote,
  resolvePackageDepartures,
  shiftDaysToDeparture,
} from "@/lib/travel/departures";
import { calculateDetailedQuoteTotals } from "@/lib/travel/pricing";
import type { TravelDay, TravelPackageDeparture } from "@/lib/travel/types";
import { renderPackagesCatalog } from "@/server/ai/prompts";
import type { TravelPackageDto } from "@/server/travel/packages";

function makeDepartureDays(params: {
  startDate: string;
  endDate: string;
  flightNet: number;
  hotelNet: number;
  transferNet: number;
  insuranceNet: number;
  activityNet: number;
}): TravelDay[] {
  return [
    {
      id: "day_1",
      dayNumber: 1,
      items: [
        {
          id: "flt_1",
          type: "Flight",
          title: "Vuelo MDE-CUN",
          description: "Ida y vuelta",
          netPrice: params.flightNet,
          markup: 0,
          totalPrice: params.flightNet,
          pricePerPerson: true,
          netPriceAdult: params.flightNet,
          netPriceChild: params.flightNet,
          markupAdult: 0,
          markupChild: 0,
          flightDetails: {
            airline: "AV",
            flightNumber: "101",
            origin: "MDE",
            destination: "CUN",
            departureDate: params.startDate,
            departureTime: "08:00",
            arrivalDate: params.startDate,
            arrivalTime: "11:00",
            cabin: "Economica",
          },
        },
        {
          id: "htl_1",
          type: "Hotel",
          title: "Hotel Cancún Palace",
          description: "Todo Incluido",
          netPrice: params.hotelNet,
          markup: 0,
          totalPrice: params.hotelNet,
          pricePerPerson: true,
          netPriceAdult: params.hotelNet,
          netPriceChild: Math.round(params.hotelNet * 0.6),
          markupAdult: 0,
          markupChild: 0,
          hotelDetails: {
            hotelName: "Hotel Cancún Palace",
            address: "Zona Hotelera",
            checkIn: params.startDate,
            checkOut: params.endDate,
            roomType: "Estándar",
            boardBasis: "Todo Incluido",
          },
        },
        {
          id: "trf_1",
          type: "Transfer",
          title: "Traslado Aeropuerto - Hotel",
          description: "Privado",
          netPrice: params.transferNet,
          markup: 0,
          totalPrice: params.transferNet,
          pricePerPerson: true,
          netPriceAdult: params.transferNet,
          netPriceChild: params.transferNet,
          markupAdult: 0,
          markupChild: 0,
          transferDetails: {
            pickupPoint: "Aeropuerto",
            dropoffPoint: "Hotel",
            date: params.startDate,
            time: "12:00",
            vehicleType: "Van",
            passengers: 1,
          },
        },
        {
          id: "ins_1",
          type: "Insurance",
          title: "Asistencia Médica",
          description: "Cobertura total",
          netPrice: params.insuranceNet,
          markup: 0,
          totalPrice: params.insuranceNet,
          pricePerPerson: true,
          netPriceAdult: params.insuranceNet,
          netPriceChild: params.insuranceNet,
          markupAdult: 0,
          markupChild: 0,
        },
        {
          id: "act_1",
          type: "Activity",
          title: "Tour Isla Mujeres",
          description: "Full day",
          netPrice: params.activityNet,
          markup: 0,
          totalPrice: params.activityNet,
          pricePerPerson: true,
          netPriceAdult: params.activityNet,
          netPriceChild: params.activityNet,
          markupAdult: 0,
          markupChild: 0,
        },
      ],
    },
  ];
}

describe("Paquetes con múltiples salidas", () => {
  it("calcula totales independientes por salida cuando cambian vuelo, hotel, traslado, asistencia y actividades", () => {
    const depMayDays = makeDepartureDays({
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      flightNet: 900_000,
      hotelNet: 800_000,
      transferNet: 100_000,
      insuranceNet: 80_000,
      activityNet: 120_000,
    });
    const depJuneDays = makeDepartureDays({
      startDate: "2027-06-01",
      endDate: "2027-06-05",
      flightNet: 1_100_000,
      hotelNet: 900_000,
      transferNet: 120_000,
      insuranceNet: 90_000,
      activityNet: 150_000,
    });

    const totalsMay = calculateDetailedQuoteTotals({
      passengers: 1,
      childPassengers: 0,
      currency: "COP",
      markupPercentage: 0,
      taxes: 0,
      agencyCommission: 0,
      administrativeFee: 0,
      profitability: 0,
      days: depMayDays,
    });

    const totalsJune = calculateDetailedQuoteTotals({
      passengers: 1,
      childPassengers: 0,
      currency: "COP",
      markupPercentage: 0,
      taxes: 0,
      agencyCommission: 0,
      administrativeFee: 0,
      profitability: 0,
      days: depJuneDays,
    });

    expect(totalsMay.finalTotal).toBeCloseTo(2_266_666.67, 1);
    expect(totalsJune.finalTotal).toBeCloseTo(2_660_000, 1);
    expect(totalsJune.finalTotal).toBeGreaterThan(totalsMay.finalTotal);
  });

  it("desplaza las fechas de vuelos, hoteles y traslados al copiar una salida a otra fecha", () => {
    const sourceDays = makeDepartureDays({
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      flightNet: 900_000,
      hotelNet: 800_000,
      transferNet: 100_000,
      insuranceNet: 80_000,
      activityNet: 120_000,
    });

    const shifted = shiftDaysToDeparture({
      days: sourceDays,
      fromStartDate: "2027-05-01",
      toStartDate: "2027-06-01",
      targetNights: 4,
    });

    expect(shifted.length).toBe(5);
    const items = shifted[0]!.items;
    expect(items[0]!.id).not.toBe("flt_1");
    expect(items[0]!.flightDetails?.departureDate).toBe("2027-06-01");
    expect(items[1]!.hotelDetails?.checkIn).toBe("2027-06-01");
    expect(items[1]!.hotelDetails?.checkOut).toBe("2027-06-05");
    expect(items[2]!.transferDetails?.date).toBe("2027-06-01");
    expect(items[0]!.netPriceAdult).toBe(900_000);
  });

  it("mantiene retrocompatibilidad con paquetes legacy sin array de salidas", () => {
    const legacyDays = makeDepartureDays({
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      flightNet: 900_000,
      hotelNet: 800_000,
      transferNet: 100_000,
      insuranceNet: 80_000,
      activityNet: 120_000,
    });

    const resolved = resolvePackageDepartures({
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      nights: 4,
      days: legacyDays,
      selectedHotelId: "htl_1",
      amortizationSchedule: [],
      departures: [],
      status: "active",
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]!.id).toBe("default");
    expect(resolved[0]!.startDate).toBe("2027-05-01");
    expect(resolved[0]!.status).toBe("active");
    expect(resolved[0]!.days).toHaveLength(1);
  });

  it("valida departureId en el agente IA y oculta salidas pasadas o cerradas", () => {
    const depPast: TravelPackageDeparture = {
      id: "dep_past",
      startDate: "2025-01-10",
      endDate: "2025-01-14",
      nights: 4,
      days: [],
      status: "active",
    };
    const depClosed: TravelPackageDeparture = {
      id: "dep_closed",
      startDate: "2027-04-01",
      endDate: "2027-04-05",
      nights: 4,
      days: [],
      status: "closed",
    };
    const depMay: TravelPackageDeparture = {
      id: "dep_may",
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      nights: 4,
      days: [],
      spots: 10,
      status: "active",
    };
    const depJune: TravelPackageDeparture = {
      id: "dep_june",
      startDate: "2027-06-01",
      endDate: "2027-06-05",
      nights: 4,
      days: [],
      spots: 6,
      status: "active",
    };

    const pkg = {
      departures: [depPast, depClosed, depMay, depJune],
      status: "active",
    };
    const refDate = "2026-11-12";

    const activeFuture = getActiveFutureDepartures(
      resolvePackageDepartures(pkg),
      refDate
    );
    expect(activeFuture.map((d) => d.id)).toEqual(["dep_may", "dep_june"]);

    // Sin departureId cuando hay >1 salida activa futura => rechazado
    expect(resolveDepartureForQuote(pkg, undefined, refDate)).toEqual({
      ok: false,
      reason: "departure_required",
    });

    // Salida pasada => rechazada
    expect(resolveDepartureForQuote(pkg, "dep_past", refDate)).toEqual({
      ok: false,
      reason: "departure_unavailable",
    });

    // Salida cerrada => rechazada
    expect(resolveDepartureForQuote(pkg, "dep_closed", refDate)).toEqual({
      ok: false,
      reason: "departure_unavailable",
    });

    // Salida inexistente => rechazada
    expect(resolveDepartureForQuote(pkg, "dep_unknown", refDate)).toEqual({
      ok: false,
      reason: "departure_not_found",
    });

    // Salida válida => aceptada
    const valid = resolveDepartureForQuote(pkg, "dep_june", refDate);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.departure.id).toBe("dep_june");
    }

    // Si solo queda 1 salida activa futura, se auto-selecciona sin departureId
    const singlePkg = { departures: [depPast, depClosed, depMay], status: "active" };
    const auto = resolveDepartureForQuote(singlePkg, undefined, refDate);
    expect(auto.ok).toBe(true);
    if (auto.ok) {
      expect(auto.departure.id).toBe("dep_may");
    }
  });

  it("renderiza salidas vigentes con sus precios en el catálogo de IA y calcula el precio 'Desde'", () => {
    const depMayDays = makeDepartureDays({
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      flightNet: 900_000,
      hotelNet: 800_000,
      transferNet: 100_000,
      insuranceNet: 80_000,
      activityNet: 120_000,
    });
    const depJuneDays = makeDepartureDays({
      startDate: "2027-06-01",
      endDate: "2027-06-05",
      flightNet: 1_100_000,
      hotelNet: 900_000,
      transferNet: 120_000,
      insuranceNet: 90_000,
      activityNet: 150_000,
    });

    const totalsMay = calculateDetailedQuoteTotals({
      passengers: 1,
      childPassengers: 0,
      currency: "COP",
      markupPercentage: 0,
      taxes: 0,
      agencyCommission: 0,
      administrativeFee: 0,
      profitability: 0,
      days: depMayDays,
    });
    const totalsJune = calculateDetailedQuoteTotals({
      passengers: 1,
      childPassengers: 0,
      currency: "COP",
      markupPercentage: 0,
      taxes: 0,
      agencyCommission: 0,
      administrativeFee: 0,
      profitability: 0,
      days: depJuneDays,
    });

    const mockPkg: TravelPackageDto = {
      id: "pkg_cancun",
      organizationId: "org_1",
      title: "Cancún Todo Incluido",
      description: null,
      destination: "Cancún",
      originCity: "Medellín",
      departureAirport: "MDE",
      arrivalAirport: "CUN",
      flightType: "round-trip",
      startDate: "2027-05-01",
      endDate: "2027-05-05",
      nights: 4,
      passengers: 1,
      childPassengers: 0,
      currency: "COP",
      exchangeRate: 1,
      markupPercentage: 0,
      taxes: 0,
      agencyCommission: 0,
      minimumDeposit: 500_000,
      administrativeFee: 0,
      medicalAssistance: 0,
      profitability: 0,
      freelanceCommission: 0,
      selectedHotelId: "htl_1",
      days: depMayDays,
      amortizationSchedule: [],
      departures: [
        {
          id: "dep_past",
          startDate: "2025-01-01",
          endDate: "2025-01-05",
          nights: 4,
          days: depMayDays,
          status: "active",
          totals: totalsMay,
        },
        {
          id: "dep_may",
          startDate: "2027-05-01",
          endDate: "2027-05-05",
          nights: 4,
          days: depMayDays,
          spots: 12,
          status: "active",
          totals: totalsMay,
        },
        {
          id: "dep_june",
          startDate: "2027-06-01",
          endDate: "2027-06-05",
          nights: 4,
          days: depJuneDays,
          spots: 8,
          status: "active",
          totals: totalsJune,
        },
      ],
      inclusions: "Vuelos y hotel",
      exclusions: null,
      policies: null,
      status: "active",
      totals: totalsMay,
      services: {
        hasFlight: true,
        hasHotel: true,
        hasTransfers: true,
        hasActivities: true,
        hasAssistance: true,
      },
      createdAt: "2026-11-12T00:00:00.000Z",
      updatedAt: "2026-11-12T00:00:00.000Z",
    };

    const lowest = getLowestDepartureAdultPrice(mockPkg.departures, "2026-11-12");
    expect(lowest).toBeCloseTo(totalsMay.finalTotal, 2);

    const catalog = renderPackagesCatalog([mockPkg]);
    expect(catalog).toBeTruthy();
    expect(catalog).toContain('departureId: "dep_may"');
    expect(catalog).toContain('departureId: "dep_june"');
    expect(catalog).not.toContain('departureId: "dep_past"');
    expect(catalog).toContain("Cupos disponibles: 12");
    expect(catalog).toContain("Cupos disponibles: 8");
  });
});
