"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArticleContent } from "@/components/ArticleContent";
import { ExternalPublishPanel } from "@/components/ExternalPublishPanel";

const fonts = [
  { value: "", label: "기본 글꼴" },
  { value: "'Noto Sans KR', sans-serif", label: "노토 산스" },
  { value: "'Nanum Gothic', sans-serif", label: "나눔고딕" },
  { value: "'Nanum Myeongjo', serif", label: "나눔명조" },
  { value: "'Malgun Gothic', sans-serif", label: "맑은 고딕" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "'Courier New', monospace", label: "Courier New" },
];

const fontSizes = [
  { value: "10px", label: "10px" },
  { value: "12px", label: "12px" },
  { value: "14px", label: "14px" },
  { value: "16px", label: "16px (기본)" },
  { value: "18px", label: "18px" },
  { value: "20px", label: "20px" },
  { value: "24px", label: "24px" },
  { value: "28px", label: "28px" },
  { value: "32px", label: "32px" },
  { value: "36px", label: "36px" },
  { value: "48px", label: "48px" },
];

export default function WritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isFromAI = searchParams.get("ai") === "true";

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [status, setStatus] = useState("draft");
  const [scheduledAt, setScheduledAt] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [viewMode, setViewMode] = useState<"editor" | "html" | "split">("editor");
  const [htmlSource, setHtmlSource] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [aiLoaded, setAiLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Tracks the saved article id so the external-publish panel can target it.
  const [savedArticleId, setSavedArticleId] = useState<number | null>(editId ? Number(editId) : null);

  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const autoSaveTimer = useRef<any>(null);

  // ─── Selection helpers ───
  const saveSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    }
  }, []);

  const restoreSelection = useCallback(() => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
  }, []);

  const insertHtmlAtCursor = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();

    // Try to restore saved selection
    if (savedRange.current && editor.contains(savedRange.current.commonAncestorContainer)) {
      restoreSelection();
    }

    // Try execCommand first
    const success = document.execCommand("insertHTML", false, html);
    if (!success) {
      // Fallback: append to end
      editor.innerHTML += html;
    }
  }, [restoreSelection]);

  // ─── Sync HTML ───
  useEffect(() => {
    if (viewMode === "html" || viewMode === "split") {
      if (editorRef.current) {
        setHtmlSource(formatHtml(editorRef.current.innerHTML));
      }
    }
  }, [viewMode]);

  const formatHtml = (html: string): string => {
    let f = html;
    f = f.replace(/(<\/(?:p|div|h[1-6]|ul|ol|li|blockquote|table|tr|thead|tbody)>)/gi, "$1\n");
    f = f.replace(/(<(?:p|div|h[1-6]|ul|ol|blockquote|table|thead|tbody|tr)[^>]*>)/gi, "\n$1");
    f = f.replace(/\n{3,}/g, "\n\n");
    return f.trim();
  };

  const applyHtmlChanges = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = htmlSource;
      if (viewMode === "html") setViewMode("editor");
    }
  };

  // ─── Load data ───
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user?.blog) {
        fetch(`/api/categories?blogId=${d.user.blog.id}`)
          .then(r => r.json()).then(c => setCategories(c.categories || []));
      }
    });
  }, []);

  useEffect(() => {
    if (isFromAI && !aiLoaded) {
      const aiContent = localStorage.getItem("ai_generated_content");
      if (aiContent) {
        try {
          const parsed = JSON.parse(aiContent);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.content && editorRef.current) {
            editorRef.current.innerHTML = parsed.content;
            setContent(parsed.content);
          }
          if (parsed.summary) setExcerpt(parsed.summary);
          if (parsed.seoTitle) setSeoTitle(parsed.seoTitle);
          if (parsed.seoDescription) setSeoDescription(parsed.seoDescription);
          if (parsed.tags && Array.isArray(parsed.tags)) setTags(parsed.tags);
          if (parsed.thumbnailUrl) setThumbnailUrl(parsed.thumbnailUrl);
          localStorage.removeItem("ai_generated_content");
          setAiLoaded(true);
        } catch {}
      }
    }
  }, [isFromAI, aiLoaded]);

  useEffect(() => {
    if (editId) {
      fetch(`/api/articles/${editId}`).then(r => r.json()).then(d => {
        if (d.article) {
          const a = d.article;
          setTitle(a.title || "");
          setContent(a.content || "");
          setExcerpt(a.excerpt || "");
          setCategoryId(a.categoryId);
          setThumbnailUrl(a.thumbnailUrl || "");
          setSeoTitle(a.seoTitle || "");
          setSeoDescription(a.seoDescription || "");
          setStatus(a.status || "draft");
          setTags(a.tags?.map((t: any) => t.name).filter(Boolean) || []);
          if (editorRef.current) editorRef.current.innerHTML = a.content || "";
        }
      });
    }
  }, [editId]);

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (editorRef.current) {
        const c = editorRef.current.innerHTML;
        if (c && title) {
          localStorage.setItem("blog_draft", JSON.stringify({ title, content: c, excerpt, tags, categoryId }));
          setAutoSaved(new Date().toLocaleTimeString("ko-KR"));
        }
      }
    }, 30000);
    return () => clearInterval(autoSaveTimer.current);
  }, [title, excerpt, tags, categoryId]);

  useEffect(() => {
    if (!editId && !isFromAI) {
      const draft = localStorage.getItem("blog_draft");
      if (draft) {
        try {
          const d = JSON.parse(draft);
          if (d.title) setTitle(d.title);
          if (d.content && editorRef.current) {
            editorRef.current.innerHTML = d.content;
            setContent(d.content);
          }
          if (d.excerpt) setExcerpt(d.excerpt);
          if (d.tags) setTags(d.tags);
          if (d.categoryId) setCategoryId(d.categoryId);
        } catch {}
      }
    }
  }, [editId, isFromAI]);

  // ─── Commands ───
  const execCmd = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const applyFont = (fontFamily: string) => {
    if (!fontFamily) return;
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const span = document.createElement("span");
      span.style.fontFamily = fontFamily;
      sel.getRangeAt(0).surroundContents(span);
    }
    editorRef.current?.focus();
  };

  const applyFontSize = (size: string) => {
    if (!size) return;
    restoreSelection();
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const span = document.createElement("span");
      span.style.fontSize = size;
      sel.getRangeAt(0).surroundContents(span);
    }
    editorRef.current?.focus();
  };

  // ─── Image upload → insert into editor body ───
  const uploadAndInsertImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("파일 크기는 10MB 이하만 가능합니다.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        alert(data.error);
        return;
      }

      if (data.url) {
        // Focus editor, restore cursor, insert
        const imgHtml = `<img src="${data.url}" alt="${file.name}" style="max-width:100%;border-radius:12px;margin:1em 0" /><p><br></p>`;
        insertHtmlAtCursor(imgHtml);
      }
    } catch {
      alert("이미지 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  // ─── Thumbnail-only upload ───
  const uploadThumbnail = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("이미지 파일만 가능합니다."); return; }
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setThumbnailUrl(data.url);
      else if (data.error) alert(data.error);
    } catch { alert("업로드 실패"); }
    finally { setUploading(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      if (e.dataTransfer.files[i].type.startsWith("image/")) {
        uploadAndInsertImage(e.dataTransfer.files[i]);
      }
    }
  };

  // ─── Toolbar: open file picker for BODY image ───
  const openBodyImagePicker = () => {
    saveSelection();
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e: any) => {
      const files: FileList = e.target.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          uploadAndInsertImage(files[i]);
        }
      }
    };
    input.click();
  };

  const insertStockImage = async () => {
    saveSelection();
    const keyword = prompt("이미지 검색어를 입력하세요 (영문 권장, 예: coffee shop, Seoul travel):");
    if (!keyword?.trim()) return;

    setUploading(true);
    try {
      const response = await fetch("/api/images/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: keyword.trim(), alt: keyword.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.image?.url) {
        alert(data.error || "이미지를 찾지 못했습니다.");
        return;
      }
      const image = data.image;
      const safeLabel = keyword.trim()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      insertHtmlAtCursor(
        `<figure style="margin:28px 0"><img src="${image.url}" alt="${safeLabel}" loading="lazy" style="display:block;width:100%;height:auto;border-radius:14px"/><figcaption style="margin-top:8px;text-align:center;color:#64748b;font-size:12px">${safeLabel}</figcaption></figure><p><br></p>`,
      );
    } catch {
      alert("이미지 검색 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const insertTable = () => {
    insertHtmlAtCursor(`<table style="width:100%;border-collapse:collapse;margin:1em 0"><thead><tr><th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f8fafc">제목1</th><th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f8fafc">제목2</th><th style="border:1px solid #e2e8f0;padding:8px 12px;background:#f8fafc">제목3</th></tr></thead><tbody><tr><td style="border:1px solid #e2e8f0;padding:8px 12px">내용</td><td style="border:1px solid #e2e8f0;padding:8px 12px">내용</td><td style="border:1px solid #e2e8f0;padding:8px 12px">내용</td></tr></tbody></table><p><br></p>`);
  };

  const insertYouTube = () => {
    saveSelection();
    const url = prompt("YouTube URL을 입력하세요:");
    if (url) {
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (m) {
        insertHtmlAtCursor(`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;margin:1em 0;border-radius:12px"><iframe src="https://www.youtube.com/embed/${m[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%" frameborder="0" allowfullscreen></iframe></div><p><br></p>`);
      } else alert("올바른 YouTube URL이 아닙니다.");
    }
  };

  const insertLink = () => {
    saveSelection();
    const url = prompt("URL을 입력하세요:");
    if (url) {
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.toString()) {
        execCmd("createLink", url);
      } else {
        const text = prompt("링크 텍스트:", url);
        insertHtmlAtCursor(`<a href="${url}" target="_blank" style="color:#2563eb;text-decoration:underline">${text || url}</a>`);
      }
    }
  };

  const insertBlockquote = () => {
    insertHtmlAtCursor(`<blockquote style="border-left:4px solid #03c75a;padding:12px 16px;margin:1em 0;background:#f8fafb;border-radius:0 8px 8px 0;font-style:italic">인용문을 입력하세요</blockquote><p><br></p>`);
  };

  const insertHR = () => {
    insertHtmlAtCursor(`<hr style="border:none;border-top:1px solid #e2e8f0;margin:2em 0" /><p><br></p>`);
  };

  const insertCodeBlock = () => {
    saveSelection();
    const lang = prompt(
      "언어를 입력하세요 (javascript, typescript, python, java, php, sql, css, html, bash, json):",
      "javascript"
    );
    if (lang === null) return;
    const code = prompt("코드를 입력하세요:");
    if (!code) return;
    const escaped = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    insertHtmlAtCursor(
      `<pre><code class="language-${lang || "text"}">${escaped}</code></pre><p><br></p>`
    );
  };

  const insertInlineCode = () => {
    restoreSelection();
    const sel = window.getSelection();
    const selected = sel?.toString();
    if (selected) {
      execCmd("insertHTML", `<code>${selected.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>`);
    } else {
      const text = prompt("인라인 코드를 입력하세요:");
      if (text) {
        insertHtmlAtCursor(`<code>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code>&nbsp;`);
      }
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 20) { setTags([...tags, t]); setTagInput(""); }
  };

  // ─── Save ───
  const handleSave = async (publishStatus: string, options?: { stay?: boolean }) => {
    if (viewMode === "html" || viewMode === "split") {
      if (editorRef.current) editorRef.current.innerHTML = htmlSource;
    }
    if (!title.trim()) { alert("제목을 입력하세요."); return; }
    setSaving(true);

    const editorContent = editorRef.current?.innerHTML || content;
    const body = {
      title, content: editorContent,
      excerpt: excerpt || editorContent.replace(/<[^>]*>/g, "").substring(0, 200),
      categoryId, tagNames: tags, status: publishStatus, thumbnailUrl,
      seoTitle: seoTitle || title, seoDescription: seoDescription || excerpt,
      scheduledAt: publishStatus === "scheduled" ? scheduledAt : null,
    };

    try {
      const url = editId ? `/api/articles/${editId}` : "/api/articles";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success || data.article) {
        localStorage.removeItem("blog_draft");
        const newId = data.article?.id ?? (editId ? Number(editId) : null);
        if (newId) setSavedArticleId(Number(newId));
        // Staying put lets the author queue external publishing right away.
        if (!options?.stay) router.push("/dashboard/articles");
      } else alert(data.error || "저장에 실패했습니다.");
    } catch { alert("저장에 실패했습니다."); }
    finally { setSaving(false); }
  };

  // ─── AI ───
  const handleAI = async (type: string) => {
    setAiLoading(true);
    try {
      const editorContent = editorRef.current?.innerHTML || "";
      const res = await fetch("/api/ai/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, prompt: aiPrompt || title, content: editorContent, includeImages: true }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }

      if (type === "write" && data.parsed) {
        const p = data.parsed;
        if (p.title) setTitle(p.title);
        if (p.content && editorRef.current) editorRef.current.innerHTML = p.content;
        if (p.summary) setExcerpt(p.summary);
        if (p.seoTitle) setSeoTitle(p.seoTitle);
        if (p.seoDescription) setSeoDescription(p.seoDescription);
        if (p.tags) setTags(p.tags);
        if (p.thumbnailUrl) setThumbnailUrl(p.thumbnailUrl);
      } else if (type === "title") {
        try { const titles = JSON.parse(data.result.replace(/```(?:json)?\s*([\s\S]*?)```/, "$1").trim()); const s = prompt(`선택:\n${titles.map((t: string, i: number) => `${i+1}. ${t}`).join("\n")}\n\n번호:`); if (s) setTitle(titles[parseInt(s)-1]||titles[0]); } catch { alert(data.result); }
      } else if (type === "tags") {
        try { setTags(JSON.parse(data.result.replace(/```(?:json)?\s*([\s\S]*?)```/, "$1").trim())); } catch { alert(data.result); }
      } else if (type === "seo") {
        try { const seo = JSON.parse(data.result.replace(/```(?:json)?\s*([\s\S]*?)```/, "$1").trim()); if (seo.seoTitle) setSeoTitle(seo.seoTitle); if (seo.seoDescription) setSeoDescription(seo.seoDescription); } catch { alert(data.result); }
      } else if (type === "summary") { setExcerpt(data.result);
      } else if (type === "improve") { if (editorRef.current) editorRef.current.innerHTML = data.result;
      }
    } catch (err: any) { alert("AI 실패: " + (err.message || "")); }
    finally { setAiLoading(false); }
  };

  const insertHtmlSnippet = (snippet: string) => {
    const ta = document.querySelector("textarea[data-html-editor]") as HTMLTextAreaElement;
    if (ta) { const s = ta.selectionStart; setHtmlSource(htmlSource.substring(0, s) + snippet + htmlSource.substring(ta.selectionEnd)); setTimeout(() => { ta.focus(); ta.setSelectionRange(s + snippet.length, s + snippet.length); }, 0); }
  };

  // ─── Render ───
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{editId ? "게시글 수정" : isFromAI ? "✨ AI 생성 글 편집" : "새 글 작성"}</h1>
          {uploading && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium animate-pulse">📷 업로드 중...</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {autoSaved && <span className="text-xs text-gray-400">자동저장: {autoSaved}</span>}
          <button onClick={() => handleSave("draft")} disabled={saving} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">임시저장</button>
          <button onClick={() => setShowPreview(!showPreview)} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50">{showPreview ? "편집" : "미리보기"}</button>
          <button onClick={() => handleSave("published")} disabled={saving} className="px-4 py-2 rounded-xl bg-green-500 text-white text-sm font-medium hover:bg-green-600 disabled:opacity-50">{saving ? "저장 중..." : "발행하기"}</button>
        </div>
      </div>

      {showPreview ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
          <h1 className="text-3xl font-bold mb-6">{title || "제목 없음"}</h1>
          <ArticleContent content={editorRef.current?.innerHTML || ""} />
        </div>
      ) : (
        <>
          {/* Title */}
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요"
            className="w-full text-3xl font-bold bg-white rounded-2xl px-6 py-5 border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-green-500 placeholder-gray-300" />

          {/* Editor */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Toolbar Row 1 */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
              <select onChange={(e) => applyFont(e.target.value)} className="px-2 py-1.5 text-sm border rounded-lg bg-white min-w-[100px]" defaultValue=""><option value="" disabled>글꼴</option>{fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
              <select onChange={(e) => applyFontSize(e.target.value)} className="px-2 py-1.5 text-sm border rounded-lg bg-white min-w-[90px]" defaultValue=""><option value="" disabled>크기</option>{fontSizes.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
              <select onChange={(e) => execCmd("formatBlock", e.target.value)} className="px-2 py-1.5 text-sm border rounded-lg bg-white" defaultValue=""><option value="" disabled>서식</option><option value="p">본문</option><option value="h1">제목1</option><option value="h2">제목2</option><option value="h3">제목3</option></select>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => execCmd("bold")} className="p-2 rounded-lg hover:bg-gray-200 font-bold text-sm" title="굵게">B</button>
              <button onClick={() => execCmd("italic")} className="p-2 rounded-lg hover:bg-gray-200 italic text-sm" title="기울임">I</button>
              <button onClick={() => execCmd("underline")} className="p-2 rounded-lg hover:bg-gray-200 underline text-sm" title="밑줄">U</button>
              <button onClick={() => execCmd("strikeThrough")} className="p-2 rounded-lg hover:bg-gray-200 line-through text-sm" title="취소선">S</button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <input type="color" onChange={(e) => execCmd("foreColor", e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-gray-200" title="글자색" defaultValue="#000000" />
              <input type="color" onChange={(e) => execCmd("hiliteColor", e.target.value)} className="w-7 h-7 rounded cursor-pointer border border-gray-200" title="배경색" defaultValue="#ffff00" />
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => execCmd("justifyLeft")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="왼쪽 정렬">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2V4zm0 4h10v2H2V8zm0 4h16v2H2v-2zm0 4h10v2H2v-2z"/></svg>
              </button>
              <button onClick={() => execCmd("justifyCenter")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="가운데 정렬">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2V4zm3 4h10v2H5V8zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z"/></svg>
              </button>
              <button onClick={() => execCmd("justifyRight")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="오른쪽 정렬">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 4h16v2H2V4zm6 4h10v2H8V8zm-6 4h16v2H2v-2zm6 4h10v2H8v-2z"/></svg>
              </button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => execCmd("insertUnorderedList")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="글머리 기호">•목록</button>
              <button onClick={() => execCmd("insertOrderedList")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="번호 목록">1.목록</button>
            </div>

            {/* Toolbar Row 2 */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 bg-gray-50">
              <button onClick={openBodyImagePicker} disabled={uploading} className="px-2.5 py-1.5 rounded-lg hover:bg-blue-100 text-sm flex items-center gap-1 disabled:opacity-50 font-medium text-blue-600" title="이미지 업로드 → 본문 삽입">
                📷 이미지 업로드
              </button>
              <button onClick={insertStockImage} className="px-2.5 py-1.5 rounded-lg hover:bg-purple-100 text-sm flex items-center gap-1 text-purple-600" title="무료 이미지 검색">🖼️ 무료이미지</button>
              <button onClick={insertYouTube} className="px-2.5 py-1.5 rounded-lg hover:bg-gray-200 text-sm" title="YouTube">▶️ YouTube</button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={insertLink} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="링크">🔗</button>
              <button onClick={insertTable} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="표">📊</button>
              <button onClick={insertBlockquote} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="인용문">❝</button>
              <button onClick={insertCodeBlock} className="px-2.5 py-1.5 rounded-lg hover:bg-slate-200 text-sm font-mono text-slate-700" title="코드 블록 삽입">{"{ }"}</button>
              <button onClick={insertInlineCode} className="p-2 rounded-lg hover:bg-gray-200 text-sm font-mono" title="인라인 코드">`code`</button>
              <button onClick={insertHR} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="구분선">—</button>
              <button onClick={() => execCmd("removeFormat")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="서식 제거">🧹</button>
              <button onClick={() => execCmd("undo")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="실행취소">↩️</button>
              <button onClick={() => execCmd("redo")} className="p-2 rounded-lg hover:bg-gray-200 text-sm" title="다시실행">↪️</button>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button onClick={() => setShowAI(!showAI)} className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${showAI ? "bg-purple-100 text-purple-700" : "hover:bg-purple-100 text-purple-600"}`}>🤖 AI</button>
            </div>

            {/* View mode tabs */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-100 border-b border-gray-200">
              <button onClick={() => { if (viewMode !== "editor") applyHtmlChanges(); setViewMode("editor"); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "editor" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>📝 에디터</button>
              <button onClick={() => setViewMode("html")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "html" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>&lt;/&gt; HTML</button>
              <button onClick={() => setViewMode("split")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${viewMode === "split" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>⬜⬜ 분할</button>
              {(viewMode === "html" || viewMode === "split") && <button onClick={applyHtmlChanges} className="ml-auto px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600">✓ HTML 적용</button>}
            </div>

            {/* AI Panel */}
            {showAI && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-purple-100 animate-fade-in">
                <input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="주제, 키워드 (빈칸이면 제목 사용)" className="w-full px-4 py-2.5 rounded-xl border border-purple-200 text-sm focus:ring-2 focus:ring-purple-500 outline-none mb-3" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleAI("write")} disabled={aiLoading} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50">{aiLoading ? "생성 중..." : "✨ AI 글쓰기"}</button>
                  <button onClick={() => handleAI("title")} disabled={aiLoading} className="px-3 py-1.5 bg-white text-purple-600 rounded-lg text-xs font-medium border border-purple-200 disabled:opacity-50">💡 제목 추천</button>
                  <button onClick={() => handleAI("summary")} disabled={aiLoading} className="px-3 py-1.5 bg-white text-purple-600 rounded-lg text-xs font-medium border border-purple-200 disabled:opacity-50">📋 요약</button>
                  <button onClick={() => handleAI("tags")} disabled={aiLoading} className="px-3 py-1.5 bg-white text-purple-600 rounded-lg text-xs font-medium border border-purple-200 disabled:opacity-50">🏷️ 태그</button>
                  <button onClick={() => handleAI("seo")} disabled={aiLoading} className="px-3 py-1.5 bg-white text-purple-600 rounded-lg text-xs font-medium border border-purple-200 disabled:opacity-50">🔍 SEO</button>
                </div>
              </div>
            )}

            {/* Editor body */}
            <div className={viewMode === "split" ? "grid grid-cols-2 divide-x divide-gray-200" : ""}>
              <div className={viewMode === "html" ? "hidden" : ""}>
                <div
                  ref={editorRef}
                  className="editor-content p-6 min-h-[400px] outline-none"
                  contentEditable
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (items) {
                      for (let i = 0; i < items.length; i++) {
                        if (items[i].type.indexOf("image") !== -1) {
                          e.preventDefault();
                          const file = items[i].getAsFile();
                          if (file) uploadAndInsertImage(file);
                          return;
                        }
                      }
                    }
                  }}
                  suppressContentEditableWarning
                />
              </div>

              {(viewMode === "html" || viewMode === "split") && (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700 overflow-x-auto">
                    <span className="text-xs text-slate-400 mr-2 whitespace-nowrap">삽입:</span>
                    {["<p>","<h2>","<h3>","<ul>","<blockquote>","<img>","<a>","<b>","<span>"].map(tag => (
                      <button key={tag} onClick={() => {
                        const full = tag === "<img>" ? '<img src="" alt="" style="width:100%;border-radius:12px" />' : tag === "<ul>" ? '<ul>\n  <li></li>\n</ul>' : tag.replace(">", "></") + tag.replace("<","</");
                        insertHtmlSnippet(full);
                      }} className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 whitespace-nowrap">{tag}</button>
                    ))}
                  </div>
                  <textarea data-html-editor value={htmlSource} onChange={(e) => setHtmlSource(e.target.value)} className="flex-1 p-4 min-h-[400px] font-mono text-sm bg-slate-900 text-green-400 outline-none resize-none leading-relaxed" placeholder="HTML 코드를 편집하세요..." spellCheck={false} style={{ tabSize: 2 }} onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); const t = e.target as HTMLTextAreaElement; const s = t.selectionStart; setHtmlSource(htmlSource.substring(0, s) + "  " + htmlSource.substring(t.selectionEnd)); setTimeout(() => { t.selectionStart = t.selectionEnd = s + 2; }, 0); } }} />
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
                    <span>글자: {htmlSource.length.toLocaleString()}</span>
                    <span>줄: {htmlSource.split("\n").length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category & Tags */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-sm mb-3">📁 카테고리</h3>
              <select value={categoryId || ""} onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm">
                <option value="">선택 안 함</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-sm mb-3">🏷️ 태그</h3>
              <div className="flex gap-2 mb-2">
                <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="태그 입력 후 Enter" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm" />
                <button onClick={addTag} className="px-3 py-2 bg-gray-100 rounded-xl text-sm hover:bg-gray-200">추가</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-xs">#{t}<button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="text-green-400 hover:text-red-500">×</button></span>
                ))}
              </div>
            </div>
          </div>

          {/* Excerpt & Thumbnail */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-sm mb-3">📋 요약</h3>
              <textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="게시글 요약 (목록에 표시)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none h-24" />
            </div>
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-sm mb-3">🖼️ 썸네일</h3>
              <div
                className={`relative border-2 border-dashed rounded-xl overflow-hidden cursor-pointer transition-all hover:border-green-400 ${thumbnailUrl ? "border-transparent" : "border-gray-200 bg-gray-50"}`}
                style={{ aspectRatio: "16/9" }}
                onClick={() => { const input = document.createElement("input"); input.type = "file"; input.accept = "image/*"; input.onchange = (e: any) => { const f = e.target?.files?.[0]; if (f) uploadThumbnail(f); }; input.click(); }}
              >
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} alt="썸네일" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400"><span className="text-3xl mb-2">📷</span><span className="text-xs">클릭하여 썸네일 업로드</span></div>
                )}
                {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm animate-pulse">업로드 중...</span></div>}
                {thumbnailUrl && <button onClick={(e) => { e.stopPropagation(); setThumbnailUrl(""); }} className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-red-500 text-xs">×</button>}
              </div>
              <input type="text" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="또는 이미지 URL 직접 입력" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm mt-3" />
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <button onClick={() => setShowSeo(!showSeo)} className="font-bold text-sm flex items-center gap-2 w-full text-left">🔍 SEO 설정 <span className="text-gray-400 text-xs">{showSeo ? "▲" : "▼"}</span>{seoTitle && <span className="ml-auto text-xs text-green-500">✓ 설정됨</span>}</button>
            {showSeo && <div className="mt-4 space-y-3 animate-fade-in"><input type="text" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="SEO 제목 (60자 이내)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm" /><textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="SEO 설명 (160자 이내)" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none h-20" /></div>}
          </div>

          {/* External platform publishing (additive module) */}
          <div className="space-y-2">
            <ExternalPublishPanel articleId={savedArticleId} />
            {!savedArticleId && (
              <button
                type="button"
                onClick={() => handleSave("published", { stay: true })}
                disabled={saving}
                className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
              >
                저장 후 외부 발행 준비하기
              </button>
            )}
          </div>

          {/* Publish */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-bold text-sm mb-3">📅 발행 옵션</h3>
            <div className="flex flex-wrap gap-3">
              {["published","private","scheduled","draft"].map(s => (
                <label key={s} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="status" value={s} checked={status === s} onChange={(e) => setStatus(e.target.value)} className="accent-green-500" /><span className="text-sm">{s === "published" ? "즉시 발행" : s === "private" ? "비공개" : s === "scheduled" ? "예약 발행" : "임시저장"}</span></label>
              ))}
            </div>
            {status === "scheduled" && <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="mt-3 px-3 py-2 rounded-xl border border-gray-200 text-sm" />}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pb-8">
            <Link href="/dashboard/ai" className="px-6 py-3 rounded-xl border border-purple-200 text-purple-600 font-medium hover:bg-purple-50">🤖 AI 글쓰기</Link>
            <button type="button" onClick={() => handleSave("draft")} disabled={saving} className="px-6 py-3 rounded-xl border border-gray-200 font-medium hover:bg-gray-50 disabled:opacity-50">임시저장</button>
            <button type="button" onClick={() => handleSave(status === "draft" ? "published" : status)} disabled={saving} className="px-6 py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 disabled:opacity-50 shadow-lg shadow-green-500/20">{saving ? "저장 중..." : status === "published" ? "발행하기" : status === "scheduled" ? "예약 발행" : status === "private" ? "비공개 저장" : "발행하기"}</button>
          </div>
        </>
      )}
    </div>
  );
}
