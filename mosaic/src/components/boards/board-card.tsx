import { Lock } from "lucide-react";
import Link from "next/link";
import { TimeAgo } from "@/components/ui/misc";
import type { Board } from "@/types";

/** Pinterest 스타일 보드 카드 (큰 커버 1개 + 작은 커버 2개 콜라주) */
export function BoardCard({ board }: { board: Board }) {
  const [a, b, c] = board.coverUrls;
  return (
    <Link href={`/boards/${board.id}`} className="group block">
      <div className="grid aspect-[3/2] grid-cols-3 grid-rows-2 gap-0.5 overflow-hidden rounded-2xl bg-neutral-100 transition group-hover:brightness-95">
        <div className="col-span-2 row-span-2 bg-neutral-200">{a && <img src={a} alt="" className="size-full object-cover" loading="lazy" />}</div>
        <div className="bg-neutral-200">{b && <img src={b} alt="" className="size-full object-cover" loading="lazy" />}</div>
        <div className="bg-neutral-200">{c && <img src={c} alt="" className="size-full object-cover" loading="lazy" />}</div>
      </div>
      <div className="px-1 pt-2">
        <h3 className="flex items-center gap-1.5 text-lg font-semibold">
          <span className="truncate">{board.name}</span>
          {board.visibility === "private" && <Lock className="size-4 shrink-0 text-neutral-500" aria-label="비공개" />}
        </h3>
        <p className="text-xs text-neutral-500">
          핀 {board.pinCount}개 · <TimeAgo date={board.updatedAt} />
        </p>
      </div>
    </Link>
  );
}
