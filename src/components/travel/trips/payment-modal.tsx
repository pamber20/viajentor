"use client";

import { useState } from "react";
import { DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { TravelPaymentDto } from "@/server/travel/trips";

const PAYMENT_METHODS = [
  "Transferencia Bancaria (Bancolombia)",
  "Transferencia Bancaria (Davivienda)",
  "Transferencia Bancaria (Otro banco)",
  "Enlace de Pago / Tarjeta de Crédito",
  "PSE / Wompi",
  "Efectivo / Caja",
  "Datáfono en Agencia",
  "Otro",
];

export function PaymentModal({
  quoteId,
  suggestedAmount,
  currency = "COP",
  onClose,
  onSaved,
}: {
  quoteId: string;
  suggestedAmount?: number;
  currency?: string;
  onClose: () => void;
  onSaved: (payment: TravelPaymentDto) => void;
}) {
  const [amount, setAmount] = useState<number | "">(suggestedAmount ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!);
  const [reference, setReference] = useState("");
  const [receiptNumber, setReceiptNumber] = useState(
    `REC-${Date.now().toString().slice(-6)}`
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError("Indica un monto válido mayor a 0");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/travel/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quoteId,
          amount: Number(amount),
          date,
          method,
          reference: reference.trim() || null,
          receiptNumber: receiptNumber.trim() || null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error?.message || "Error al registrar el abono");
      }

      const data = (await res.json()) as { payment: TravelPaymentDto };
      onSaved(data.payment);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Registrar Abono"
        className="w-full max-w-md rounded-xl border bg-card p-5 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <h3 className="font-bold text-foreground">Registrar Abono de Cliente</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-text-3 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-2">
              Monto del abono ({currency})
            </label>
            <Input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ej. 1000000"
              required
              autoFocus
              className="text-base font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">Fecha de pago</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">N° Comprobante / Recibo</label>
              <Input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="REC-001"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-2">Método de pago</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-card px-2.5 text-xs text-foreground"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-2">
              Número de Referencia / Aprobación bancaria
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. Transf #98234, Aprobación #1240"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-2">Notas internas</label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comprobante verificado en cuenta..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Registrar Abono"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
