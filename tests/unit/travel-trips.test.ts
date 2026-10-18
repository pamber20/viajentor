import { describe, expect, it } from "vitest";
import { distributePaymentToInstallments } from "@/lib/travel/pricing";
import type { TravelInstallment } from "@/lib/travel/types";

describe("travel trips & payments service", () => {
  it("distribuye un abono entre cuotas de amortización actualizando sus estados a 'paid' o 'partial'", () => {
    const installments: TravelInstallment[] = [
      { id: "i1", code: "Cuota 1", dueDate: "2026-07-01", amount: 500000, status: "pending" },
      { id: "i2", code: "Cuota 2", dueDate: "2026-08-01", amount: 500000, status: "pending" },
      { id: "i3", code: "Cuota 3", dueDate: "2026-09-01", amount: 500000, status: "pending" },
    ];

    // Primer abono de $700,000 cubre la cuota 1 completa y $200,000 de la cuota 2
    const res = distributePaymentToInstallments(installments, {}, 700000);

    expect(res.updatedInstallments[0]!.status).toBe("paid");
    expect(res.updatedInstallments[1]!.status).toBe("partial");
    expect(res.updatedInstallments[2]!.status).toBe("pending");
  });

  it("completa todas las cuotas cuando el abono total cubre el monto total", () => {
    const installments: TravelInstallment[] = [
      { id: "i1", code: "Cuota 1", dueDate: "2026-07-01", amount: 500000, status: "pending" },
      { id: "i2", code: "Cuota 2", dueDate: "2026-08-01", amount: 500000, status: "pending" },
    ];

    const res = distributePaymentToInstallments(installments, {}, 1000000);

    expect(res.updatedInstallments[0]!.status).toBe("paid");
    expect(res.updatedInstallments[1]!.status).toBe("paid");
  });
});
