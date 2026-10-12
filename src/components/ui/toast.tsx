"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: { label: string; href: string };
}

interface ToastApi {
  show: (message: string, kind?: ToastKind, action?: ToastItem["action"]) => void;
  success: (message: string, action?: ToastItem["action"]) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const show = useCallback((message: string, kind: ToastKind = "info", action?: ToastItem["action"]) => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-2), { id, kind, message, action }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  const success = useCallback((m: string, action?: ToastItem["action"]) => show(m, "success", action), [show]);
  const error = useCallback((m: string) => show(m, "error"), [show]);

  return (
    <ToastContext.Provider value={{ show, success, error }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex max-w-md animate-[toast-in_.25s_ease-out] items-center gap-3 rounded-full px-5 py-3 text-sm font-medium text-white shadow-xl",
              t.kind === "error" ? "bg-red-600" : "bg-neutral-900",
            )}
          >
            {t.kind === "success" && <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />}
            {t.kind === "error" && <XCircle className="size-5 shrink-0" />}
            {t.kind === "info" && <Info className="size-5 shrink-0 text-sky-300" />}
            <span>{t.message}</span>
            {t.action && (
              <a href={t.action.href} className="ml-1 shrink-0 rounded-full bg-white/15 px-3 py-1 hover:bg-white/25">
                {t.action.label}
              </a>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
