"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import { formatKRW } from "@/lib/utils";
import {
  Sparkles,
  Bot,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  FileText,
  Activity,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export function AIAdvisorView() {
  const { aiAnalysis, filteredAssets, totalAssetsKRW, annualDividendsKRW, isPrivateMode } = useAsset();
  const [activeReportTab, setActiveReportTab] = useState<"daily" | "monthly" | "rebalance" | "diagnostics">("diagnostics");

  // Interactive AI Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "ai",
      text: `안녕하세요! DOMINO X의 전담 AI 자산 어드바이저입니다. 현재 보유 중이신 총 ${filteredAssets.length}개 자산과 ${formatKRW(annualDividendsKRW, true)}의 연간 배당 현금흐름을 바탕으로 질문에 실시간 답변해 드립니다. 무엇이든 편하게 물어보세요!`,
      timestamp: "방금 전",
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim()) return;

    const userText = inputPrompt;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: new Date().toLocaleTimeString().slice(0, 5),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setIsTyping(true);

    // Simulate smart AI response tailored to user's real portfolio data
    setTimeout(() => {
      let reply = "";
      const lower = userText.toLowerCase();

      if (lower.includes("배당") || lower.includes("인컴") || lower.includes("schd") || lower.includes("jepi")) {
        reply = `현재 포트폴리오의 연간 예상 인컴은 ${formatKRW(annualDividendsKRW, true)}(월평균 ${formatKRW(annualDividendsKRW / 12, true)})입니다. 
SCHD는 배당성장률이 연 8~10% 수준으로 장기 복리 효과에 유리하며, JEPI/JEPQ는 연 7~9%의 높은 월배당 현금흐름을 즉각 창출합니다. 
현재 고배당 커버드콜과 배당성장주가 이상적인 5:5 비율로 분산되어 있어 매우 안정적입니다.`;
      } else if (lower.includes("미국") || lower.includes("환율") || lower.includes("달러")) {
        reply = `현재 미국 자산 비중은 전체의 약 34%입니다. 
환율 1,380원대 고환율 국면에서는 신규 매수 시 환율 리스크가 존재하므로, 해외 직투 계좌보다는 원화 기반의 국내 상장 미국 ETF(예: TIGER 미국배당다우존스, ACE 미국S&P500)를 ISA 절세계좌에서 분할 매수하시는 것을 추천합니다.`;
      } else if (lower.includes("코인") || lower.includes("비트코인") || lower.includes("가상자산")) {
        reply = `가상자산 비중은 현재 약 8.2%로 목표치(10% 이내)에 적합하게 유지되고 있습니다. 
김치 프리미엄이 1.4%대로 안정적이므로 급격한 가격 왜곡 위험은 낮습니다. 이더리움 및 솔라나 스테이킹 보상(연 4~7%)을 지속 수령하시면서 비트코인 신고가 돌파 시 일부를 안전자산으로 분할 익절하는 전략을 권장합니다.`;
      } else if (lower.includes("리밸런싱") || lower.includes("비중")) {
        reply = `AI 포트폴리오 진단 결과: 
1. 안전자산(금/국채/현금) 비중이 목표치(15%) 대비 12.8%로 약간 부족합니다.
2. 매월 유입되는 월세(180만원) 및 배당금 중 30%를 KRX 금현물로 자동 적립 매수하시면 하락장 방어력이 더욱 강화됩니다.`;
      } else {
        reply = `회원님의 전체 포트폴리오(총 ${filteredAssets.length}개 자산)를 다각도로 분석한 결과:
- 종합 건전성 점수: 88점 (상위 5% 우수)
- 월 순 현금흐름: 매우 양호 (+${formatKRW(annualDividendsKRW / 12, true)}/월)
- 추천 액션: 금융소득종합과세 2,000만원 한도를 초과하지 않도록 추가 배당주는 ISA 계좌를 적극 활용하세요.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: "ai",
          text: reply,
          timestamp: new Date().toLocaleTimeString().slice(0, 5),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-purple-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              AI 포트폴리오 어드바이저 & 자산 진단
            </div>
            <h1 className="text-2xl sm:text-3xl font-black mt-1">
              인공지능 자산 건전성 스코어 & 실시간 투자 상담
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              사용자의 모든 자산, 부채, 현금흐름, 환율을 AI가 정밀 분석하여 맞춤 리포트를 생성합니다.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-center">
            <div className="text-xs text-gray-300">종합 건전성 점수</div>
            <div className="text-3xl font-black text-amber-300 mt-0.5">
              {aiAnalysis.healthScore}점
            </div>
          </div>
        </div>
      </div>

      {/* 4 Score Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold">자산 분산도</div>
          <div className="text-2xl font-black text-blue-500 mt-1">{aiAnalysis.diversificationScore}점</div>
          <div className="text-[10px] text-gray-400 mt-0.5">11개 자산군 다각화 우수</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold">배당 안정성</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">{aiAnalysis.dividendScore}점</div>
          <div className="text-[10px] text-gray-400 mt-0.5">월간 캐시플로우 탄탄</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold">변동성 위험도</div>
          <div className="text-2xl font-black text-amber-500 mt-1">{aiAnalysis.riskScore}점</div>
          <div className="text-[10px] text-gray-400 mt-0.5">적정 중위험 유지</div>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm">
          <div className="text-xs text-gray-400 font-bold">절세계좌 활용도</div>
          <div className="text-2xl font-black text-purple-500 mt-1">95점</div>
          <div className="text-[10px] text-gray-400 mt-0.5">ISA 및 연금저축 최적화</div>
        </div>
      </div>

      {/* AI Key Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {aiAnalysis.assetHighlights.map((hl, idx) => (
          <div
            key={idx}
            className="p-5 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-2"
          >
            <div className="flex items-center gap-2">
              {hl.sentiment === "POSITIVE" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : hl.sentiment === "WARNING" ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <Lightbulb className="w-4 h-4 text-blue-500 shrink-0" />
              )}
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white">
                {hl.title}
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed pl-6">
              {hl.description}
            </p>
          </div>
        ))}
      </div>

      {/* Interactive AI Chatbot Studio */}
      <div className="bg-white dark:bg-gray-850 rounded-3xl p-6 shadow-sm border border-gray-200/80 dark:border-gray-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                DOMINO X 실시간 AI 금융 챗봇
              </h3>
              <p className="text-xs text-gray-400">
                내 포트폴리오 데이터를 기반으로 정확하고 정밀한 투자 인사이트를 제공합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            "내 포트폴리오 배당 현황 요약해줘",
            "미국 달러 자산 비중 줄여야 할까?",
            "SCHD와 JEPI 중 내게 맞는 것은?",
            "가상자산 리스크는 어느 정도야?",
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => setInputPrompt(prompt)}
              className="px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 text-xs font-semibold border border-gray-200/60 dark:border-gray-700 transition-colors"
            >
              💬 {prompt}
            </button>
          ))}
        </div>

        {/* Chat History Box */}
        <div className="space-y-3 max-h-80 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-800">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-purple-600 text-white"
                }`}
              >
                {msg.sender === "user" ? "ME" : "AI"}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed max-w-[85%] whitespace-pre-line shadow-xs ${
                  msg.sender === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-gray-400 pl-9">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
              <span>AI 어드바이저가 포트폴리오를 분석 중입니다...</span>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="포트폴리오, 배당금, 종목, 세금 등에 대해 무엇이든 질문하세요..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            className="flex-1 px-4 py-3 text-xs sm:text-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/25 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">전송</span>
          </button>
        </form>
      </div>
    </div>
  );
}
