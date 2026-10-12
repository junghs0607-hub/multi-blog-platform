"use client";

import { ArrowUpRight, Lock, Share, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRequireAuth } from "@/components/providers";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import type { PinCard as PinCardType } from "@/types";
import { SaveDialog } from "./save-dialog";
import { ShareDialog } from "./share-dialog";

export const clampRatio = (pin: PinCardType) => Math.min(2.2, Math.max(0.5, pin.image.height / pin.image.width));

export function PinCard({
  pin,
  onSavedChange,
  onRemove,
}: {
  pin: PinCardType;
  onSavedChange?: (saved: boolean) => void;
  /** 보드 소유자가 보드에서 핀을 빼는 경우 */
  onRemove?: () => void;
}) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const requireAuth = useRequireAuth();
  const ratio = clampRatio(pin);

  return (
    <div className="group">
      <div className="relative">
        <Link
          href={`/pins/${pin.id}`}
          className="relative block overflow-hidden rounded-2xl"
          style={{ backgroundColor: pin.image.dominantColor ?? "#e5e5e5", aspectRatio: `1 / ${ratio}` }}
        >
          <img
            src={pin.image.thumbUrl}
            alt={pin.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <span className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-150 md:group-hover:opacity-100 md:group-focus-within:opacity-100" />
          {pin.visibility === "private" && (
            <span className="absolute top-3 left-3 rounded-full bg-white/90 p-1.5 text-neutral-800 shadow" title="비공개 핀">
              <Lock className="size-3.5" />
            </span>
          )}
          {pin.image.isAnimated && (
            <span className="absolute bottom-3 left-3 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-bold text-white md:group-hover:hidden">
              GIF
            </span>
          )}
        </Link>

        {/* 데스크톱 hover 오버레이 */}
        <div className="pointer-events-none absolute inset-0 hidden flex-col justify-between p-3 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <div className="flex justify-end gap-2">
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="pointer-events-auto rounded-full bg-white/90 p-2.5 text-neutral-800 hover:bg-white"
                title="보드에서 제거"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => requireAuth() && setSaveOpen(true)}
              className={cn(
                "pointer-events-auto rounded-full px-4 py-2.5 text-sm font-semibold text-white",
                pin.saved ? "bg-neutral-900 hover:bg-neutral-800" : "bg-brand hover:bg-brand-hover",
              )}
            >
              {pin.saved ? "저장됨" : "저장"}
            </button>
          </div>
          <div className="flex items-center justify-between gap-2">
            {pin.sourceUrl && pin.sourceDomain ? (
              <a
                href={pin.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="pointer-events-auto flex min-w-0 items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-900 hover:bg-white"
              >
                <ArrowUpRight className="size-3.5 shrink-0" />
                <span className="truncate">{pin.sourceDomain}</span>
              </a>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="pointer-events-auto rounded-full bg-white/90 p-2 text-neutral-900 hover:bg-white"
              title="공유"
            >
              <Share className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-1 pt-2 pb-1">
        {pin.title && (
          <Link href={`/pins/${pin.id}`} className="line-clamp-2 text-[13px] leading-snug font-semibold text-neutral-900 md:text-sm">
            {pin.title}
          </Link>
        )}
        <Link href={`/u/${pin.author.username}`} className="mt-1.5 flex items-center gap-1.5">
          <Avatar src={pin.author.avatarUrl} name={pin.author.displayName} size={22} />
          <span className="truncate text-xs text-neutral-600 hover:underline">{pin.author.displayName}</span>
        </Link>
      </div>

      <SaveDialog
        pinId={pin.id}
        pinTitle={pin.title}
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onChange={(savedAny) => onSavedChange?.(savedAny)}
      />
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} path={`/pins/${pin.id}`} title={pin.title} pinId={pin.id} />
    </div>
  );
}
