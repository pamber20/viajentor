import { describe, expect, it } from "vitest";
import { agentActionSchema, degradeAction } from "@/server/ai/actions";

describe("create_quote action schema", () => {
  it("valida una acción create_quote completa con packageId", () => {
    const schema = agentActionSchema(false);
    const valid = schema.safeParse({
      action: "create_quote",
      packageId: "pkg_123",
      selectedHotelId: "hotel_abc",
      passengers: 2,
      childPassengers: 1,
      childAges: "7",
      observations: "Habitación vista al mar",
      reply: "¡Excelente! He preparado y guardado tu cotización para Cancún.",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.action).toBe("create_quote");
      if (valid.data.action === "create_quote") {
        expect(valid.data.packageId).toBe("pkg_123");
        expect(valid.data.passengers).toBe(2);
        expect(valid.data.childPassengers).toBe(1);
      }
    }
  });

  it("rechaza create_quote si no incluye packageId", () => {
    const schema = agentActionSchema(false);
    const invalid = schema.safeParse({
      action: "create_quote",
      passengers: 2,
      reply: "Cotización creada",
    });

    expect(invalid.success).toBe(false);
  });

  it("degrada create_quote a reply si no se puede procesar", () => {
    const action = {
      action: "create_quote" as const,
      packageId: "pkg_123",
      passengers: 2,
      childPassengers: 0,
      reply: "Te confirmo los detalles de la cotización.",
    };

    const degraded = degradeAction(action);
    expect(degraded).toEqual({
      action: "reply",
      text: "Te confirmo los detalles de la cotización.",
    });
  });
});
