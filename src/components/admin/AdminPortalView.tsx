"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW } from "@/lib/utils";
import {
  ShieldCheck,
  Database,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  AlertCircle,
  Users,
  Layers,
  Calendar,
} from "lucide-react";

export function AdminPortalView() {
  const { assets, accounts, transactions, simulateTick, resetToDemoData } = useAsset();
  const [syncStatus, setSyncStatus] = useState<"IDLE" | "SYNCING" | "SUCCESS">("IDLE");

  const handleManualSync = () => {
    setSyncStatus("SYNCING");
    setTimeout(() => {
      simulateTick();
      setSyncStatus("SUCCESS");
      setTimeout(() => setSyncStatus("IDLE"), 2500);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              시스템 관리자 & 데이터 마스터 포털 (Admin Studio)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              마스터 자산 DB · 시세 연동 피드 · 시스템 헬스 모니터링
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              KRX, NASDAQ, 바이낸스, KB부동산 마스터 데이터 연동 상태 및 시스템 로그를 감독합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={syncStatus === "SYNCING"}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === "SYNCING" ? "animate-spin" : ""}`} />
              <span>{syncStatus === "SYNCING" ? "시세 동기화 중..." : syncStatus === "SUCCESS" ? "동기화 완료!" : "전체 시세 수동 동기화"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 System Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-blue-500" />
            등록 자산 수
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {assets.length}개
          </div>
          <div className="text-[10px] text-emerald-500 mt-0.5">정상 모니터링 중</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-purple-500" />
            활성 계좌 수
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {accounts.length}개
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">증권/은행/코인 계좌</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            누적 트랜잭션
          </div>
          <div className="text-2xl font-black text-gray-900 dark:text-white mt-1">
            {transactions.length}건
          </div>
          <div className="text-[10px] text-emerald-500 mt-0.5">원장 무결성 검증됨</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-teal-500" />
            API 피드 상태
          </div>
          <div className="text-2xl font-black text-emerald-500 mt-1">
            100% OK
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">지연시간 12ms</div>
        </div>
      </div>

      {/* External API Health Status */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
        <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-500" />
          외부 금융 API 및 시장 데이터 피드 연결 상태
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          {[
            { name: "KRX 한국거래소 주식/ETF 피드", status: "ONLINE", latency: "8ms", updated: "실시간" },
            { name: "NASDAQ / NYSE 미국 시세 피드", status: "ONLINE", latency: "24ms", updated: "실시간" },
            { name: "Upbit WebSocket 크립토 피드", status: "ONLINE", latency: "5ms", updated: "24시간 LIVE" },
            { name: "Binance Global WebSocket", status: "ONLINE", latency: "18ms", updated: "24시간 LIVE" },
            { name: "KB부동산 실거래가 엔진", status: "ONLINE", latency: "42ms", updated: "주간 동기화" },
            { name: "한국은행 외환 고시 환율 피드", status: "ONLINE", latency: "15ms", updated: "실시간" },
          ].map((feed, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-750 flex items-center justify-between"
            >
              <div>
                <div className="font-bold text-gray-900 dark:text-white">{feed.name}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  지연시간 {feed.latency} · {feed.updated}
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                {feed.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Database Maintenance Actions */}
      <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
        <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
          데이터베이스 유지보수 및 데모 초기화
        </h3>

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div>
            <div className="font-bold text-amber-900 dark:text-amber-300 text-sm">
              데모 포트폴리오 데이터셋 원클릭 복원
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-0.5">
              국내외 주식, ETF, 코인, 부동산, 채권, 배당주 등 약 30여개 종합 자산과 과거 거래내역을 초기 상태로 복원합니다.
            </div>
          </div>

          <button
            onClick={() => {
              if (confirm("정말 데모 포트폴리오 데이터로 초기화하시겠습니까?")) {
                resetToDemoData();
                alert("포트폴리오가 완벽한 데모 데이터로 복원되었습니다.");
              }
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold whitespace-nowrap shadow-sm"
          >
            데모 데이터로 초기화
          </button>
        </div>
      </div>
    </div>
  );
}
