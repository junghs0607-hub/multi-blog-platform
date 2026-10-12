"use client";

import { Copy, Mail, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

type Channel = "copy" | "native" | "twitter" | "facebook" | "kakao" | "email" | "other";

/** 링크 공유 (링크 복사 / 기기 공유 / X / 페이스북 / 네이버 / 이메일) + 핀 공유 수 집계 */
export function ShareDialog({
  open,
  onClose,
  path,
  title,
  pinId,
}: {
  open: boolean;
  onClose: () => void;
  path: string;
  title: string;
  pinId?: number;
}) {
  const toast = useToast();
  const url = typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
  const enc = encodeURIComponent;

  const record = (channel: Channel) => {
    if (pinId) void api(`/api/pins/${pinId}/share`, { body: { channel } }).catch(() => undefined);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("링크를 복사했어요.");
    } catch {
      window.prompt("아래 링크를 복사하세요", url);
    }
    record("copy");
    onClose();
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
      record("native");
      onClose();
    } catch {
      /* 사용자가 취소 */
    }
  };

  const links: { label: string; href: string; channel: Channel; bg: string; text: string }[] = [
    { label: "X", href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(title)}`, channel: "twitter", bg: "bg-black", text: "𝕏" },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, channel: "facebook", bg: "bg-[#1877f2]", text: "f" },
    { label: "네이버", href: `https://share.naver.com/web/shareView?url=${enc(url)}&title=${enc(title)}`, channel: "other", bg: "bg-[#03c75a]", text: "N" },
  ];

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <Modal open={open} onClose={onClose} title="공유하기" size="sm">
      <div className="grid grid-cols-4 gap-3 pt-2 text-center text-xs font-medium text-neutral-700">
        <button type="button" onClick={() => void copy()} className="flex flex-col items-center gap-2">
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 hover:bg-neutral-300">
            <Copy className="size-6" />
          </span>
          링크 복사
        </button>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              record(l.channel);
              onClose();
            }}
            className="flex flex-col items-center gap-2"
          >
            <span className={`flex size-14 items-center justify-center rounded-full text-2xl font-bold text-white ${l.bg}`}>{l.text}</span>
            {l.label}
          </a>
        ))}
        <a
          href={`mailto:?subject=${enc(title)}&body=${enc(url)}`}
          onClick={() => {
            record("email");
            onClose();
          }}
          className="flex flex-col items-center gap-2"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 hover:bg-neutral-300">
            <Mail className="size-6" />
          </span>
          이메일
        </a>
        {canNativeShare && (
          <button type="button" onClick={() => void nativeShare()} className="flex flex-col items-center gap-2">
            <span className="flex size-14 items-center justify-center rounded-full bg-neutral-200 text-neutral-900 hover:bg-neutral-300">
              <Share2 className="size-6" />
            </span>
            더보기
          </button>
        )}
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-2xl bg-neutral-100 p-2 pl-4">
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">{url}</span>
        <button type="button" onClick={() => void copy()} className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white">
          복사
        </button>
      </div>
    </Modal>
  );
}
