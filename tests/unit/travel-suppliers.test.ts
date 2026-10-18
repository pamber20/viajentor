import { describe, expect, it } from "vitest";
import { serializeSupplier } from "@/server/travel/suppliers";

describe("travel suppliers service", () => {
  it("serializa un registro de base de datos a formato de dominio TravelSupplier", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const rawRow = {
      id: "sup_12345",
      organizationId: "org_test",
      name: "Decameron Barú",
      type: "hotel",
      contact: {
        name: "Carlos Reservas",
        email: "reservas@decameron.com",
        phone: "+573001234567",
      },
      negotiatedRates: [
        {
          description: "Habitación Estándar Todo Incluido",
          rate: 450000,
          currency: "COP",
          validUntil: "2026-12-31",
        },
      ],
      commission: 12,
      sla: "Confirmación en menos de 2 horas hábiles",
      rating: 5,
      notes: "Tarifas netas con IVA incluido",
      active: true,
      operatingCities: ["Cartagena", "Barú"],
      hotelMeta: {
        checkInTime: "15:00",
        checkOutTime: "12:00",
        hotelAddress: "Km 7 vía Barú",
        hotelPhone: "+573001234567",
        hotelPolicies: "No reembolsable en temporada alta",
      },
      createdAt: now,
      updatedAt: now,
    };

    const supplier = serializeSupplier(
      rawRow as unknown as Parameters<typeof serializeSupplier>[0]
    );

    expect(supplier.id).toBe("sup_12345");
    expect(supplier.name).toBe("Decameron Barú");
    expect(supplier.type).toBe("hotel");
    expect(supplier.contact?.email).toBe("reservas@decameron.com");
    expect(supplier.commission).toBe(12);
    expect(supplier.hotelMeta?.checkInTime).toBe("15:00");
    expect(supplier.createdAt).toBe("2026-05-10T12:00:00.000Z");
    expect(supplier.updatedAt).toBe("2026-05-10T12:00:00.000Z");
  });
});
