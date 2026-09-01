"use client";

import { useEffect, useState } from "react";

export default function AISettingsPage() {
  const [settings, setSettings] = useState({
    provider: "openai",
    apiBaseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-3.5-turbo",
    temperature: 7,
    maxTokens: 2000,
    systemPrompt: "당신은 한국어 블로그 글 작성을 돕는 전문 AI 어시스턴트입니다.",
    imageProvider: "openverse",
    imageApiBaseUrl: "https://api.openai.com/v1",
    imageApiKey: "",
    imageModel: "gpt-image-1",
    imageCount: 3,
  });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  useEffect(() => {
    fetch("/api/ai/settings").then(r => r.json()).then(d => {
      if (d.settings) {
        setSettings({
          provider: d.settings.provider || "openai",
          apiBaseUrl: d.settings.apiBaseUrl || "https://api.openai.com/v1",
          apiKey: d.settings.apiKey || "",
          model: d.settings.model || "gpt-3.5-turbo",
          temperature: d.settings.temperature ?? 7,
          maxTokens: d.settings.maxTokens || 2000,
          systemPrompt: d.settings.systemPrompt || "",
          imageProvider: d.settings.imageProvider || "openverse",
          imageApiBaseUrl: d.settings.imageApiBaseUrl || "https://api.openai.com/v1",
          imageApiKey: d.settings.imageApiKey || "",
          imageModel: d.settings.imageModel || "gpt-image-1",
          imageCount: d.settings.imageCount || 3,
        });
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const d = await r.json();
      if (d.success) alert("저장되었습니다!");
      else alert(d.error || "저장 실패");
    } catch { alert("저장 실패"); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    try {
      const r = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const d = await r.json();
      if (d.success) {
        setTestResult("✅ 연결 성공! " + d.message);
      } else {
        setTestResult("❌ " + (d.error || "연결 실패"));
      }
    } catch { setTestResult("❌ 연결 실패"); }
    finally { setTesting(false); }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(settings.apiKey);
    alert("API 키가 복사되었습니다!");
  };

  const providers = [
    { value: "openai", label: "OpenAI", url: "https://api.openai.com/v1" },
    { value: "claude", label: "Claude (Anthropic)", url: "https://api.anthropic.com/v1" },
    { value: "gemini", label: "Google Gemini", url: "https://generativelanguage.googleapis.com/v1beta" },
    { value: "openrouter", label: "OpenRouter", url: "https://openrouter.ai/api/v1" },
    { value: "ollama", label: "Ollama (로컬)", url: "http://localhost:11434/v1" },
    { value: "lmstudio", label: "LM Studio (로컬)", url: "http://localhost:1234/v1" },
    { value: "custom", label: "기타 (Custom)", url: "" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">⚙️ AI 설정</h1>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
          <select
            value={settings.provider}
            onChange={(e) => {
              const p = providers.find(p => p.value === e.target.value);
              setSettings({ ...settings, provider: e.target.value, apiBaseUrl: p?.url || settings.apiBaseUrl });
            }}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
          >
            {providers.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Base URL</label>
          <input type="text" value={settings.apiBaseUrl}
            onChange={(e) => setSettings({ ...settings, apiBaseUrl: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
          <div className="flex gap-2">
            <input type="text" value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="API 키를 입력하세요 (전체 표시)"
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-mono" />
            <button onClick={copyApiKey} className="px-4 py-3 bg-gray-100 rounded-xl text-sm hover:bg-gray-200" title="복사">📋</button>
          </div>
          <p className="text-xs text-gray-400 mt-1">API 키는 전체가 표시됩니다. 보안에 유의하세요.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
          <input type="text" value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            placeholder="gpt-3.5-turbo, gpt-4, claude-3-sonnet..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (0-10)</label>
            <input type="number" value={settings.temperature} min={0} max={10}
              onChange={(e) => setSettings({ ...settings, temperature: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
            <p className="text-xs text-gray-400 mt-1">실제값: {(settings.temperature / 10).toFixed(1)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Max Tokens</label>
            <input type="number" value={settings.maxTokens} min={100} max={32000}
              onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) || 2000 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">System Prompt</label>
          <textarea value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none h-24" />
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold">🖼️ 본문 이미지 설정</h2>
            <p className="mt-1 text-sm text-gray-500">글쓰기 AI와 이미지 Provider는 서로 독립적으로 동작합니다. 이미지는 확보 후 BlogHub 저장소에 영구 저장됩니다.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이미지 Provider</label>
              <select
                value={settings.imageProvider}
                onChange={(e) => setSettings({ ...settings, imageProvider: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              >
                <option value="openverse">Openverse — 무료 공개 라이선스 이미지 검색 (API Key 불필요)</option>
                <option value="openai-compatible">OpenAI-compatible — AI 이미지 직접 생성</option>
              </select>
              {settings.imageProvider === "openverse" && (
                <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">Creative Commons/공개 라이선스 이미지를 검색하고 작성자·라이선스 출처를 캡션에 자동 표기합니다.</p>
              )}
            </div>

            {settings.imageProvider === "openai-compatible" && (
              <div className="space-y-4 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image API Base URL</label>
                  <input
                    type="text"
                    value={settings.imageApiBaseUrl}
                    onChange={(e) => setSettings({ ...settings, imageApiBaseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.imageApiKey}
                      onChange={(e) => setSettings({ ...settings, imageApiKey: e.target.value })}
                      placeholder="이미지 생성 API 키 (전체 표시)"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(settings.imageApiKey);
                        alert("이미지 API 키가 복사되었습니다!");
                      }}
                      className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm hover:bg-gray-50"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image Model</label>
                  <input
                    type="text"
                    value={settings.imageModel}
                    onChange={(e) => setSettings({ ...settings, imageModel: e.target.value })}
                    placeholder="gpt-image-1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">글당 이미지 수</label>
              <select
                value={settings.imageCount}
                onChange={(e) => setSettings({ ...settings, imageCount: Number(e.target.value) })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm"
              >
                {[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}장</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleTest} disabled={testing}
            className="px-5 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50 text-sm">
            {testing ? "테스트 중..." : "🔌 API 연결 테스트"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 text-sm">
            {saving ? "저장 중..." : "💾 저장"}
          </button>
        </div>

        {testResult && (
          <div className={`p-4 rounded-xl text-sm ${testResult.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
