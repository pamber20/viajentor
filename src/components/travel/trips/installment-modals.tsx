"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, DollarSign, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/travel/pricing";

/* =========================================================================
   1. MODAL: GENERAR PLAN DE PAGOS AUTOMÁTICO
   ========================================================================= */

interface AutoPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  balanceRemaining: number;
  currency: string;
  defaultFirstDate?: string;
  onApplyPlan: (
    count: number,
    frequency: "weekly" | "fortnightly" | "monthly",
    firstDate: string
  ) => Promise<void> | void;
}

export function AutoPlanModal({
  isOpen,
  onClose,
  balanceRemaining,
  currency,
  defaultFirstDate,
  onApplyPlan,
}: AutoPlanModalProps) {
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState<number>(3);
  const [frequency, setFrequency] = useState<"weekly" | "fortnightly" | "monthly">("monthly");
  const [firstDate, setFirstDate] = useState<string>(
    defaultFirstDate || new Date().toISOString().split("T")[0]!
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaultFirstDate) {
      setFirstDate(defaultFirstDate);
    }
  }, [defaultFirstDate]);

  if (!isOpen || !mounted) return null;

  const validCount = Math.max(1, count || 1);
  const approxPerInstallment = Math.round(balanceRemaining / validCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (validCount <= 0 || !firstDate) return;

    setSubmitting(true);
    try {
      await onApplyPlan(validCount, frequency, firstDate);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Generar Plan de Pagos Automático"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-brand-soft p-1.5 text-brand-text">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Generar Plan de Pagos Automático
              </h3>
              <p className="text-[11px] text-text-3">
                Distribuye el saldo pendiente en cuotas periódicas equidistantes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded p-1 text-text-3 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Card resumen de saldo */}
          <div className="rounded-lg border bg-brand-soft/30 border-brand-soft p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-2">Saldo pendiente a programar:</span>
              <span className="font-extrabold text-foreground text-sm">
                {formatCurrency(balanceRemaining, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-brand-soft/40 mt-1.5 text-[11px] text-text-3">
              <span>Valor aprox. por cuota ({validCount} cuotas):</span>
              <span className="font-semibold text-brand-text">
                ~ {formatCurrency(approxPerInstallment, currency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Número de Cuotas
              </label>
              <Input
                type="number"
                min="1"
                max="24"
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 1)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Frecuencia
              </label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "weekly" | "fortnightly" | "monthly")
                }
                className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <option value="weekly">Semanal (cada 7 días)</option>
                <option value="fortnightly">Quincenal (cada 15 días)</option>
                <option value="monthly">Mensual (cada 30 días)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Primera Cuota
              </label>
              <Input
                type="date"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <p className="text-[11px] text-text-3 leading-relaxed">
            * El sistema calculará automáticamente las fechas de vencimiento de cada cuota y ajustará el monto de la última para garantizar que el total coincida con exactitud al centavo.
          </p>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Generando..." : "Aplicar Plan Automático"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* =========================================================================
   2. MODAL: AGREGAR CUOTA MANUAL
   ========================================================================= */

interface ManualInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxAllowedAmount: number;
  currency: string;
  defaultDueDate?: string;
  onAddInstallment: (amount: number, dueDate: string) => Promise<void> | void;
}

export function ManualInstallmentModal({
  isOpen,
  onClose,
  maxAllowedAmount,
  currency,
  defaultDueDate,
  onAddInstallment,
}: ManualInstallmentModalProps) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState<number | "">("");
  const [dueDate, setDueDate] = useState<string>(
    defaultDueDate || new Date().toISOString().split("T")[0]!
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaultDueDate) {
      setDueDate(defaultDueDate);
    }
  }, [defaultDueDate]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) {
      setError("Indica un monto mayor a 0 para la cuota");
      return;
    }

    if (numAmount > maxAllowedAmount) {
      setError(
        `El monto supera el valor pendiente por programar (${formatCurrency(
          maxAllowedAmount,
          currency
        )})`
      );
      return;
    }

    if (!dueDate) {
      setError("Indica la fecha de vencimiento");
      return;
    }

    setSubmitting(true);
    try {
      await onAddInstallment(numAmount, dueDate);
      setAmount("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Agregar Cuota Manual"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3.5 bg-muted/20">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-600">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Agregar Cuota Manual
              </h3>
              <p className="text-[11px] text-text-3">
                Añade una cuota pactada a la medida del cliente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="rounded p-1 text-text-3 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="rounded-md border border-danger-soft bg-danger-tint p-3 text-xs text-danger-text">
              {error}
            </div>
          )}

          {/* Saldo disponible para cuota */}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs flex items-center justify-between">
            <span className="text-text-3">Máximo por programar:</span>
            <span className="font-extrabold text-foreground">
              {formatCurrency(maxAllowedAmount, currency)}
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Monto de la cuota ({currency}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-text-3" />
                <Input
                  type="number"
                  min="1"
                  max={maxAllowedAmount > 0 ? maxAllowedAmount : undefined}
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value === "" ? "" : Number(e.target.value));
                    setError(null);
                  }}
                  placeholder="Ej. 500000"
                  className="pl-8 h-9 text-xs"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-2">
                Fecha de Vencimiento *
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Guardando..." : "Agregar Cuota"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
