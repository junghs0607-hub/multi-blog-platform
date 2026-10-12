import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <circle cx="16" cy="16" r="16" fill="#e60023" />
      <rect x="8" y="7" width="7" height="10.5" rx="2.2" fill="#fff" />
      <rect x="17" y="7" width="7" height="6.5" rx="2.2" fill="#fff" />
      <rect x="8" y="19.5" width="7" height="5.5" rx="2.2" fill="#fff" />
      <rect x="17" y="15.5" width="7" height="9.5" rx="2.2" fill="#fff" />
    </svg>
  );
}

export function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-1.5 rounded-full p-2 hover:bg-neutral-100" aria-label="Mosaic 홈">
      <LogoMark />
      {withText && <span className="hidden text-xl font-bold tracking-tight text-brand lg:inline">Mosaic</span>}
    </Link>
  );
}
