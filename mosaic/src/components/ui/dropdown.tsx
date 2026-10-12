"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 클릭으로 여닫는 드롭다운 메뉴 (바깥 클릭/ESC 로 닫힘) */
export function Dropdown({
  trigger,
  children,
  align = "right",
  className,
  label,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          aria-label={label}
          className={cn(
            "absolute top-full z-50 mt-2 min-w-52 animate-[fade-in_.12s_ease-out] overflow-hidden rounded-2xl border border-neutral-100 bg-white p-2 shadow-[0_8px_32px_rgba(0,0,0,0.16)]",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const itemClass =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium text-neutral-800 hover:bg-neutral-100";

export function MenuItem({
  onClick,
  href,
  children,
  danger,
}: {
  onClick?: () => void;
  href?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  if (href) {
    return (
      <Link href={href} role="menuitem" className={cn(itemClass, danger && "text-red-600")} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" className={cn(itemClass, danger && "text-red-600")} onClick={onClick}>
      {children}
    </button>
  );
}
