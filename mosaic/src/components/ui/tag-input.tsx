"use client";

import { Hash, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MAX_TAGS, normalizeTag } from "@/lib/validators";
import type { TagSuggestion } from "@/types";

/** 태그 칩 입력 (Enter/쉼표로 추가, Backspace 로 삭제, 자동완성) */
export function TagInput({
  value,
  onChange,
  id,
  aiTags = [],
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  id?: string;
  /** AI 가 추가한 태그 (표시용) */
  aiTags?: string[];
}) {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const term = normalizeTag(text);
    if (!focused || !term) return;
    const timer = setTimeout(async () => {
      try {
        const r = await api<{ items: TagSuggestion[] }>("/api/tags", { query: { q: term, limit: 6 } });
        setSuggestions(r.items);
      } catch {
        /* ignore */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [text, focused]);

  const add = (raw: string) => {
    const parts = raw.split(/[,\n]/).map(normalizeTag).filter(Boolean);
    const next = [...value];
    for (const p of parts) if (!next.includes(p) && next.length < MAX_TAGS) next.push(p);
    onChange(next);
    setText("");
    setSuggestions([]);
  };

  const visibleSuggestions = normalizeTag(text) ? suggestions.filter((s) => !value.includes(s.name)) : [];

  return (
    <div className="relative">
      <div className="flex min-h-12 flex-wrap items-center gap-1.5 rounded-2xl border-2 border-neutral-200 bg-white px-3 py-2 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
        {value.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full bg-neutral-100 py-1 pr-1.5 pl-2.5 text-sm font-medium">
            {aiTags.includes(t) ? "✨" : "#"}
            {t}
            <button type="button" aria-label={`${t} 태그 삭제`} onClick={() => onChange(value.filter((v) => v !== t))} className="rounded-full p-0.5 hover:bg-neutral-300">
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (v.includes(",")) add(v);
            else setText(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (text.trim()) add(text);
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150);
            if (text.trim()) add(text);
          }}
          placeholder={value.length >= MAX_TAGS ? "" : value.length ? "태그 추가" : "태그 입력 후 Enter (예: 인테리어, 북유럽)"}
          disabled={value.length >= MAX_TAGS}
          className="min-w-32 flex-1 bg-transparent py-1 text-[15px] outline-none placeholder:text-neutral-400"
        />
      </div>
      <div className="mt-1 px-1 text-xs text-neutral-500">
        {value.length}/{MAX_TAGS}개 · 검색과 관련 핀 추천에 사용됩니다
      </div>
      {focused && visibleSuggestions.length > 0 && (
        <div className="absolute inset-x-0 top-14 z-20 rounded-2xl border border-neutral-100 bg-white p-1.5 shadow-xl">
          {visibleSuggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(s.name)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-neutral-100"
            >
              <Hash className="size-4 text-neutral-400" />
              <span className="flex-1 font-medium">{s.name}</span>
              <span className="text-xs text-neutral-400">핀 {s.usageCount}개</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
