"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ParsedResult {
  title?: string;
  subtitle?: string;
  summary?: string;
  content?: string;
  seoTitle?: string;
  seoDescription?: string;
  tags?: string[];
  thumbnailUrl?: string;
  images?: Array<{ url: string; alt: string; caption: string; source: string }>;
  imageWarnings?: string[];
}

export default function AIWritePage() {
  const [prompt, setPrompt] = useState("");
  const [type, setType] = useState("write");
  const [result, setResult] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [includeImages, setIncludeImages] = useState(true);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!prompt.trim()) { alert("주제를 입력하세요."); return; }
    setLoading(true);
    setResult("");
    setParsedResult(null);

    try {
      const r = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt, includeImages }),
      });
      const d = await r.json();
      
      if (d.error) { 
        alert(d.error); 
        setLoading(false);
        return;
      }

      setResult(d.result || "");
      setTokensUsed(d.tokensUsed || 0);

      // Handle structured response for "write" type
      if (d.parsed && type === "write") {
        setParsedResult(d.parsed);
      } else if (type === "write") {
        // Try to parse JSON from raw result
        try {
          let jsonStr = d.result;
          const jsonMatch = d.result.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          const parsed = JSON.parse(jsonStr.trim());
          setParsedResult(parsed);
        } catch {
          // Keep raw result
        }
      } else if (type === "title") {
        // Parse title array
        try {
          let jsonStr = d.result;
          const jsonMatch = d.result.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          const titles = JSON.parse(jsonStr.trim());
          if (Array.isArray(titles)) {
            setParsedResult({ title: titles.join("\n") });
          }
        } catch {}
      } else if (type === "tags") {
        try {
          let jsonStr = d.result;
          const jsonMatch = d.result.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          const tags = JSON.parse(jsonStr.trim());
          if (Array.isArray(tags)) {
            setParsedResult({ tags });
          }
        } catch {}
      } else if (type === "seo") {
        try {
          let jsonStr = d.result;
          const jsonMatch = d.result.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          const seo = JSON.parse(jsonStr.trim());
          setParsedResult(seo);
        } catch {}
      }
    } catch (err) { 
      alert("AI 호출에 실패했습니다."); 
    }
    finally { setLoading(false); }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(result);
    alert("결과가 복사되었습니다!");
  };

  const goToEditor = () => {
    if (parsedResult) {
      // Store in localStorage and redirect to editor
      localStorage.setItem("ai_generated_content", JSON.stringify(parsedResult));
      router.push("/dashboard/write?ai=true");
    }
  };

  const copyHtml = () => {
    if (parsedResult?.content) {
      navigator.clipboard.writeText(parsedResult.content);
      alert("HTML이 복사되었습니다!");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🤖 AI 글쓰기</h1>
        <Link href="/dashboard/ai-settings" className="text-sm text-gray-500 hover:text-green-600">
          ⚙️ AI 설정
        </Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">AI 기능 선택</label>
          <div className="flex flex-wrap gap-2">
            {[
              { v: "write", l: "✨ 글 작성", desc: "전체 블로그 글 생성" },
              { v: "title", l: "💡 제목 추천", desc: "제목 5개 추천" },
              { v: "summary", l: "📋 요약", desc: "글 요약" },
              { v: "improve", l: "✍️ 문장 개선", desc: "문장 다듬기" },
              { v: "tags", l: "🏷️ 태그 생성", desc: "태그 추천" },
              { v: "seo", l: "🔍 SEO 최적화", desc: "SEO 제목/설명" },
            ].map(t => (
              <button key={t.v} onClick={() => setType(t.v)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${type === t.v ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                title={t.desc}>
                {t.l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {type === "write" ? "블로그 글 주제" : type === "title" ? "제목을 만들 주제/내용" : type === "tags" ? "태그를 생성할 내용" : "처리할 내용"}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              type === "write" ? "예: 서울 홍대 카페 추천 TOP 5, 맛있는 커피와 분위기 좋은 곳 위주로" 
              : type === "title" ? "제목을 만들 주제나 내용을 입력하세요"
              : "내용을 입력하세요..."
            }
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>

        {type === "write" && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeImages} 
              onChange={(e) => setIncludeImages(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
            <span className="text-sm text-gray-600">🖼️ 실제 이미지 검색/생성 후 본문에 자동 저장·삽입</span>
          </label>
        )}

        <button onClick={handleGenerate} disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg shadow-purple-500/20 transition-all">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              글과 이미지를 생성·저장 중... (최대 2분 소요)
            </span>
          ) : "🤖 AI로 생성하기"}
        </button>
      </div>

      {/* Parsed Result - Structured View */}
      {parsedResult && type === "write" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">✅ AI 글 생성 완료!</h3>
              <p className="text-green-100 text-sm">아래 내용을 확인하고 에디터로 이동하세요</p>
            </div>
            <div className="flex gap-2">
              <button onClick={copyHtml} className="px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30">
                📋 HTML 복사
              </button>
              <button onClick={goToEditor} className="px-4 py-2 bg-white text-green-600 rounded-lg text-sm font-bold hover:bg-green-50">
                ✏️ 에디터로 이동
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-medium text-gray-400 uppercase">제목</label>
              <h2 className="text-2xl font-bold mt-1">{parsedResult.title}</h2>
              {parsedResult.subtitle && <p className="text-gray-500 mt-1">{parsedResult.subtitle}</p>}
            </div>

            {/* Summary */}
            {parsedResult.summary && (
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="text-xs font-medium text-gray-400 uppercase">요약</label>
                <p className="text-sm text-gray-700 mt-1">{parsedResult.summary}</p>
              </div>
            )}

            {/* Content Preview */}
            {parsedResult.content && (
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase mb-2 block">본문 미리보기</label>
                <div className="border border-gray-200 rounded-xl p-4 max-h-80 overflow-y-auto article-content">
                  <div dangerouslySetInnerHTML={{ __html: parsedResult.content }} />
                </div>
              </div>
            )}

            {/* Image processing result */}
            {parsedResult.images && parsedResult.images.length > 0 && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">🖼️ 이미지 {parsedResult.images.length}장 저장 완료</p>
                    <p className="mt-1 text-xs text-emerald-700">외부 임시 URL이 아닌 BlogHub 업로드 경로로 본문에 삽입되었습니다.</p>
                  </div>
                  <div className="flex -space-x-2">
                    {parsedResult.images.slice(0, 4).map((image, index) => (
                      <img key={`${image.url}-${index}`} src={image.url} alt={image.alt} className="h-10 w-10 rounded-lg border-2 border-white object-cover" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {parsedResult.imageWarnings && parsedResult.imageWarnings.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                <p className="mb-1 font-semibold">이미지 처리 안내</p>
                {parsedResult.imageWarnings.map((warning, index) => <p key={index}>• {warning}</p>)}
              </div>
            )}

            {/* Tags */}
            {parsedResult.tags && parsedResult.tags.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-400 uppercase">태그</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedResult.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* SEO */}
            {(parsedResult.seoTitle || parsedResult.seoDescription) && (
              <div className="bg-blue-50 rounded-xl p-4">
                <label className="text-xs font-medium text-blue-400 uppercase">SEO 정보</label>
                {parsedResult.seoTitle && (
                  <p className="text-sm font-medium text-blue-900 mt-1">{parsedResult.seoTitle}</p>
                )}
                {parsedResult.seoDescription && (
                  <p className="text-xs text-blue-700 mt-1">{parsedResult.seoDescription}</p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {tokensUsed > 0 && `${tokensUsed} tokens 사용`}
              </span>
              <button onClick={goToEditor} 
                className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 shadow-lg shadow-green-500/20">
                ✏️ 에디터에서 수정 후 발행하기 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title suggestions */}
      {type === "title" && parsedResult?.title && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">💡 추천 제목</h3>
          <div className="space-y-2">
            {parsedResult.title.split("\n").filter(Boolean).map((title, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-purple-50 cursor-pointer group"
                onClick={() => { navigator.clipboard.writeText(title); alert("복사됨: " + title); }}>
                <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {i + 1}
                </span>
                <span className="flex-1">{title}</span>
                <span className="text-xs text-gray-400 group-hover:text-purple-600">클릭하여 복사</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags suggestions */}
      {type === "tags" && parsedResult?.tags && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">🏷️ 추천 태그</h3>
            <button onClick={() => { 
              navigator.clipboard.writeText(parsedResult.tags!.join(", ")); 
              alert("태그가 복사되었습니다!"); 
            }} className="text-sm text-purple-600 hover:underline">
              전체 복사
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {parsedResult.tags.map((tag, i) => (
              <span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm cursor-pointer hover:bg-purple-100"
                onClick={() => { navigator.clipboard.writeText(tag); alert("복사됨: " + tag); }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* SEO result */}
      {type === "seo" && parsedResult && (parsedResult.seoTitle || parsedResult.seoDescription) && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-bold mb-4">🔍 SEO 최적화 결과</h3>
          <div className="space-y-4">
            {parsedResult.seoTitle && (
              <div className="p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100"
                onClick={() => { navigator.clipboard.writeText(parsedResult.seoTitle!); alert("복사됨!"); }}>
                <label className="text-xs font-medium text-blue-400">SEO 제목</label>
                <p className="font-medium text-blue-900 mt-1">{parsedResult.seoTitle}</p>
              </div>
            )}
            {parsedResult.seoDescription && (
              <div className="p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100"
                onClick={() => { navigator.clipboard.writeText(parsedResult.seoDescription!); alert("복사됨!"); }}>
                <label className="text-xs font-medium text-blue-400">SEO 설명</label>
                <p className="text-sm text-blue-700 mt-1">{parsedResult.seoDescription}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raw result for summary/improve */}
      {(type === "summary" || type === "improve") && result && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">{type === "summary" ? "📋 요약 결과" : "✍️ 개선된 문장"}</h3>
            <button onClick={copyResult} className="text-sm text-green-600 hover:underline">📋 복사</button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm leading-relaxed">
            {result}
          </div>
        </div>
      )}

      {/* Fallback raw result */}
      {result && !parsedResult && type === "write" && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">생성 결과 (원본)</h3>
            <button onClick={copyResult} className="text-sm text-green-600 hover:underline">📋 복사</button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto font-mono">
            {result}
          </div>
          <p className="mt-3 text-xs text-gray-400">
            ⚠️ JSON 파싱에 실패했습니다. AI 설정을 확인하거나 다시 시도해주세요.
          </p>
        </div>
      )}
    </div>
  );
}
