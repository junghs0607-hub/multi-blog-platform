"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * 모달 다이얼로그 (모바일에서는 하단 시트 형태)
 *  - ESC / 배경 클릭으로 닫기, 열려 있는 동안 body 스크롤 잠금, 첫 포커스 이동
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], input, textarea, button:not([data-close])");
      focusable?.focus();
    }, 30);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="닫기"
        data-close
        className="absolute inset-0 animate-[fade-in_.15s_ease-out] cursor-default bg-black/50"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          "relative flex max-h-[92dvh] w-full animate-[sheet-in_.22s_ease-out] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]",
          size === "sm" && "sm:max-w-sm",
          size === "md" && "sm:max-w-lg",
          size === "lg" && "sm:max-w-2xl",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" data-close onClick={onClose} className="rounded-full p-2 text-neutral-600 hover:bg-neutral-100" aria-label="닫기">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="border-t border-neutral-100 px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
