"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { EconomicEvent } from "@/types/asset";
import { Calendar as CalendarIcon, Filter, Bell, Flag, Clock } from "lucide-react";

export function InvestmentCalendarView() {
  const { economicEvents } = useAsset();
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [importanceFilter, setImportanceFilter] = useState<string>("ALL");

  const filteredEvents = economicEvents.filter((ev) => {
    if (categoryFilter !== "ALL" && ev.category !== categoryFilter) return false;
    if (importanceFilter !== "ALL" && ev.importance !== importanceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <CalendarIcon className="w-4 h-4" />
            투자 & 글로벌 거시경제 캘린더
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            FOMC · CPI · 주요 기업 실적 발표 · 배당락일 통합 일정
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            투자 자산 가격에 직접적인 영향을 미치는 주요 경제지표 발표 및 실적 일정을 놓치지 마세요.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-gray-850 rounded-2xl border border-gray-200/80 dark:border-gray-800 text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">카테고리:</span>
          {["ALL", "FOMC", "CPI", "EARNINGS", "DIVIDEND", "INTEREST_RATE"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                categoryFilter === cat
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              }`}
            >
              {cat === "ALL"
                ? "전체"
                : cat === "EARNINGS"
                ? "실적발표"
                : cat === "DIVIDEND"
                ? "배당락"
                : cat === "INTEREST_RATE"
                ? "금리결정"
                : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-gray-400">중요도:</span>
          {["ALL", "HIGH", "MEDIUM"].map((imp) => (
            <button
              key={imp}
              onClick={() => setImportanceFilter(imp)}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                importanceFilter === imp
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
              }`}
            >
              {imp === "ALL" ? "전체" : imp === "HIGH" ? "🔴 높음만" : "보통"}
            </button>
          ))}
        </div>
      </div>

      {/* Event Timeline List */}
      <div className="space-y-3">
        {filteredEvents.map((ev) => (
          <div
            key={ev.id}
            className="p-5 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 font-black text-center min-w-[70px]">
                <div className="text-[10px] uppercase font-bold text-gray-400">{ev.country}</div>
                <div className="text-sm font-extrabold mt-0.5">{ev.date.slice(5)}</div>
                {ev.time && <div className="text-[10px] font-normal text-gray-500">{ev.time}</div>}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {ev.category}
                  </span>
                  {ev.importance === "HIGH" && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                      중요도 높음
                    </span>
                  )}
                  {ev.relatedAsset && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                      {ev.relatedAsset}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-base text-gray-900 dark:text-white mt-1">
                  {ev.title}
                </h3>
                {ev.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {ev.description}
                  </p>
                )}
              </div>
            </div>

            {(ev.forecast || ev.previous) && (
              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 dark:border-gray-800 text-xs">
                {ev.forecast && (
                  <div className="text-gray-500">
                    예상치: <span className="font-bold text-blue-600">{ev.forecast}</span>
                  </div>
                )}
                {ev.previous && (
                  <div className="text-gray-400 text-[11px]">
                    이전치: {ev.previous}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
