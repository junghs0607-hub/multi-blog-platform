"use client";

import { useEffect, useRef } from "react";

/** 요소가 화면 근처(rootMargin)에 들어오면 콜백 호출 (무한 스크롤 센티널) */
export function useIntersection<T extends Element>(
  onIntersect: () => void,
  enabled = true,
  rootMargin = "800px",
  /** 값이 바뀌면 관찰을 다시 시작 → 콘텐츠가 짧아 센티널이 계속 보이는 경우에도 추가 로드 */
  version: unknown = 0,
) {
  const ref = useRef<T | null>(null);
  const callbackRef = useRef(onIntersect);

  useEffect(() => {
    callbackRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) callbackRef.current();
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled, rootMargin, version]);

  return ref;
}
