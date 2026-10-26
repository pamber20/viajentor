"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, "error"), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, "info"), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, "warning"), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info, warning }}>
      {children}
      {/* Toast container flotante */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex max-w-sm flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          let styles = "bg-card border-border text-foreground";
          let icon = <Info className="h-4 w-4 text-brand shrink-0" />;

          if (t.type === "success") {
            styles = "bg-success-tint border-success-soft text-success-text";
            icon = <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
          } else if (t.type === "error") {
            styles = "bg-danger-tint border-danger-soft text-danger-text";
            icon = <AlertCircle className="h-4 w-4 text-danger shrink-0" />;
          } else if (t.type === "warning") {
            styles = "bg-warning-tint border-warning-soft text-warning-text";
            icon = <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3 shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 text-xs font-medium ${styles}`}
            >
              {icon}
              <div className="flex-1 break-words leading-tight pt-0.5">{t.message}</div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="opacity-70 hover:opacity-100 p-0.5"
                aria-label="Cerrar notificación"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
}
