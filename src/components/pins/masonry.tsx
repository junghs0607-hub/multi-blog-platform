"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * JS 기반 Masonry 레이아웃
 *  - 컨테이너 폭에 따라 컬럼 수 계산 (모바일 2열 ~ 데스크톱 최대 8열)
 *  - 저장된 이미지 비율(width/height)로 높이를 미리 계산해 가장 짧은 컬럼에 배치 → 이미지 로딩 전에도 레이아웃이 흔들리지 않음
 *  - 항목이 뒤에 추가되어도 앞쪽 항목의 위치는 바뀌지 않음 (무한 스크롤에 적합)
 */
export function MasonryGrid<T extends { id: number }>({
  items,
  getRatio,
  renderItem,
  extraHeight = 56,
  maxColumns = 7,
}: {
  items: T[];
  /** 높이 / 너비 */
  getRatio: (item: T) => number;
  renderItem: (item: T) => ReactNode;
  extraHeight?: number;
  maxColumns?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      setWidth((prev) => (Math.abs(prev - w) > 1 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const gap = width < 640 ? 10 : 16;
  const minColumnWidth = width < 640 ? 150 : 236;
  const cols = width > 0 ? Math.max(2, Math.min(maxColumns, Math.floor((width + gap) / (minColumnWidth + gap)))) : 0;
  const colWidth = cols > 0 ? (width - gap * (cols - 1)) / cols : 0;

  const columns: T[][] = Array.from({ length: cols }, () => []);
  const heights = new Array<number>(cols).fill(0);
  // 폭 측정 전(cols=0)에는 배치하지 않습니다.
  if (cols > 0) {
    for (const item of items) {
      let target = 0;
      for (let i = 1; i < cols; i++) if (heights[i]! < heights[target]!) target = i;
      columns[target]!.push(item);
      heights[target]! += colWidth * getRatio(item) + extraHeight + gap;
    }
  }

  return (
    <div ref={ref} className="w-full">
      {cols > 0 && (
        <div className="flex items-start" style={{ gap }}>
          {columns.map((col, i) => (
            <div key={i} className="flex min-w-0 flex-1 flex-col" style={{ gap }}>
              {col.map((item) => (
                <div key={item.id}>{renderItem(item)}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SKELETON_HEIGHTS = [260, 180, 320, 220, 280, 200, 340, 240, 190, 300, 230, 270, 210, 330];

export function MasonrySkeleton({ count = 14 }: { count?: number }) {
  return (
    <div className="columns-2 gap-2.5 sm:columns-3 md:columns-4 md:gap-4 lg:columns-5 xl:columns-6">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="mb-2.5 animate-pulse break-inside-avoid rounded-2xl bg-neutral-200/70 md:mb-4"
          style={{ height: SKELETON_HEIGHTS[i % SKELETON_HEIGHTS.length] }}
        />
      ))}
    </div>
  );
}
