import { describe, expect, it } from "vitest";
import { renderPackagesCatalog, buildAgentSystemPrompt } from "@/server/ai/prompts";
import type { TravelPackageDto } from "@/server/travel/packages";

describe("Catálogo de Paquetes Turísticos para el Agente de IA", () => {
  const samplePackage: TravelPackageDto = {
    id: "pkg_test_1",
    organizationId: "org_1",
    title: "Punta Cana al atardecer",
    description: "Haz espacio para tu próximo descanso.",
    destination: "Punta Cana",
    originCity: "Medellín",
    departureAirport: "MDE",
    arrivalAirport: "PUJ",
    flightType: "round-trip",
    startDate: "2027-05-01",
    endDate: "2027-05-05",
    nights: 4,
    passengers: 2,
    childPassengers: 0,
    currency: "COP",
    exchangeRate: 1,
    markupPercentage: 15,
    taxes: 0,
    agencyCommission: 0,
    minimumDeposit: 500000,
    administrativeFee: 0,
    medicalAssistance: 0,
    profitability: 75,
    freelanceCommission: 0,
    selectedHotelId: "hotel_1",
    days: [],
    amortizationSchedule: [],
    inclusions: "Tiquetes ida y regreso\nAlojamiento todo incluido\nTraslados aeropuerto-hotel\nAsistencia médica",
    exclusions: "Gastos personales",
    policies: "Separa con $500.000 por persona y abona mes a mes.",
    status: "active",
    totals: {
      subtotal: 6000000,
      hotelSubtotal: 4000000,
      otherSubtotal: 2000000,
      markupAmount: 1000000,
      taxAmount: 0,
      commissionAmount: 0,
      total: 7000000,
      totalAdult: 7000000,
      totalChild: 0,
      flightsTotal: 1500000,
      finalTotal: 7000000,
      byHotel: [
        {
          hotelId: "hotel_1",
          hotelTitle: "VIK Arena Blanca",
          hotelSubtotal: 3000000,
          flightsTotal: 1500000,
          otherSubtotal: 500000,
          markupAmount: 998000,
          taxAmount: 0,
          commissionAmount: 0,
          total: 5998000,
          totalAdult: 5998000,
          totalChild: 0,
        },
        {
          hotelId: "hotel_2",
          hotelTitle: "Bahía Príncipe Grand Punta Cana",
          hotelSubtotal: 4000000,
          flightsTotal: 1500000,
          otherSubtotal: 500000,
          markupAmount: 998000,
          taxAmount: 0,
          commissionAmount: 0,
          total: 6998000,
          totalAdult: 6998000,
          totalChild: 0,
        },
        {
          hotelId: "hotel_3",
          hotelTitle: "Riu República (Solo adultos)",
          hotelSubtotal: 4500000,
          flightsTotal: 1500000,
          otherSubtotal: 500000,
          markupAmount: 1198000,
          taxAmount: 0,
          commissionAmount: 0,
          total: 7198000,
          totalAdult: 7198000,
          totalChild: 0,
        },
      ],
      options: {
        A: {} as any,
        B: {} as any,
        C: {} as any,
      },
    },
    services: {
      hasFlight: true,
      hasHotel: true,
      hasTransfers: true,
      hasActivities: false,
      hasAssistance: true,
    },
    createdAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
  };

  it("renderiza el catálogo de paquetes con múltiples hoteles y tarifas por persona", () => {
    const catalog = renderPackagesCatalog([samplePackage]);
    expect(catalog).not.toBeNull();
    expect(catalog).toContain('Punta Cana al atardecer');
    expect(catalog).toContain("Medellín (MDE) ➔ Punta Cana (PUJ)");
    expect(catalog).toContain("2027-05-01 al 2027-05-05 (4 noches)");
    expect(catalog).toContain("Separa con $500.000 COP por persona (abono mes a mes)");
    expect(catalog).toContain("VIK Arena Blanca");
    expect(catalog).toContain("Bahía Príncipe Grand Punta Cana");
    expect(catalog).toContain("Riu República (Solo adultos)");
    expect(catalog).toContain("Adulto: $2.999.000 COP c/u");
    expect(catalog).toContain("Adulto: $3.499.000 COP c/u");
    expect(catalog).toContain("Adulto: $3.599.000 COP c/u");
  });

  it("integra el catálogo de paquetes en buildAgentSystemPrompt", () => {
    const prompt = buildAgentSystemPrompt({
      profile: {
        id: "prof_1",
        organizationId: "org_1",
        name: "Sofía",
        enabled: true,
        tone: null,
        instructions: null,
        escalationRules: null,
        greeting: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      kb: [],
      stages: [{ name: "Nuevo" }, { name: "Interesado" }],
      agenda: false,
      packages: [samplePackage],
    });

    expect(prompt).toContain("CATÁLOGO DE PAQUETES TURÍSTICOS VIGENTES");
    expect(prompt).toContain("Punta Cana al atardecer");
    expect(prompt).toContain("VIK Arena Blanca");
    expect(prompt).toContain("(Adultos × Tarifa Adulto) + (Niños × Tarifa Niño)");
  });

  it("devuelve null si no hay paquetes turísticos activos", () => {
    expect(renderPackagesCatalog([])).toBeNull();
    expect(renderPackagesCatalog(undefined)).toBeNull();
  });
});
