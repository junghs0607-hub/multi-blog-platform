"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, errorMessage, withQuery } from "@/lib/api";
import type { Page } from "@/types";

interface ListState<T> {
  items: T[];
  done: boolean;
  loaded: boolean;
  error: string | null;
}

/**
 * 커서 기반 무한 목록.
 * url 이 바뀌면 컴포넌트를 key 로 리마운트하여 상태를 초기화하는 방식으로 사용합니다.
 */
export function useInfiniteList<T extends { id: number }>(url: string, pageSize = 25) {
  const [state, setState] = useState<ListState<T>>({ items: [], done: false, loaded: false, error: null });
  const cursorRef = useRef<string | null>(null);
  const doneRef = useRef(false);
  const inflightRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (inflightRef.current || doneRef.current) return;
    inflightRef.current = true;
    try {
      const page = await api<Page<T>>(withQuery(url, { cursor: cursorRef.current, limit: pageSize }));
      cursorRef.current = page.nextCursor;
      doneRef.current = !page.nextCursor;
      setState((prev) => {
        const seen = new Set(prev.items.map((i) => i.id));
        const merged = [...prev.items, ...page.items.filter((i) => !seen.has(i.id))];
        return { items: merged, done: !page.nextCursor, loaded: true, error: null };
      });
    } catch (err) {
      setState((prev) => ({ ...prev, loaded: true, error: errorMessage(err, "목록을 불러오지 못했습니다.") }));
    } finally {
      inflightRef.current = false;
    }
  }, [url, pageSize]);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  const retry = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
    void loadMore();
  }, [loadMore]);

  const removeItem = useCallback((id: number) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.id !== id) }));
  }, []);

  const updateItem = useCallback((id: number, patch: Partial<T>) => {
    setState((prev) => ({ ...prev, items: prev.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  }, []);

  return { ...state, loadMore, retry, removeItem, updateItem };
}
