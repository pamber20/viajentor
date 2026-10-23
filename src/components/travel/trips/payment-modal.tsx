"use client";

import { useState } from "react";
import { DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/travel/pricing";
import type { TravelInstallment } from "@/lib/travel/types";
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
  installments = [],
  initialInstallmentId,
  onClose,
  onSaved,
}: {
  quoteId: string;
  suggestedAmount?: number;
  currency?: string;
  installments?: TravelInstallment[];
  initialInstallmentId?: string;
  onClose: () => void;
  onSaved: (payment: TravelPaymentDto) => void;
}) {
  const [amount, setAmount] = useState<number | "">(suggestedAmount ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]!);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]!);
  const [installmentId, setInstallmentId] = useState<string>(initialInstallmentId ?? "");
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
          installmentId: installmentId || null,
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

          {installments.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Asignar a Cuota Específica
              </label>
              <select
                value={installmentId}
                onChange={(e) => {
                  setInstallmentId(e.target.value);
                  const selectedInst = installments.find((i) => i.id === e.target.value);
                  if (selectedInst && (!amount || amount === suggestedAmount)) {
                    setAmount(selectedInst.amount);
                  }
                }}
                className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground font-semibold"
              >
                <option value="">Distribución automática general</option>
                {installments.map((inst, idx) => (
                  <option key={inst.id} value={inst.id}>
                    Cuota {idx + 1} {inst.code ? `(${inst.code})` : ""} - {formatCurrency(inst.amount, currency)} [Vence: {inst.dueDate}]
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <label className="text-xs font-semibold text-text-2">Nº de Recibo</label>
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
              className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground font-semibold"
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
              Referencia / Comprobante (opcional)
            </label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ej. Aprobación #884920, Transferencia Bancolombia"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-2">
              Notas u observaciones (opcional)
            </label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Abono correspondiente al 50% de bloqueo..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Registrando…" : "Confirmar Abono"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
