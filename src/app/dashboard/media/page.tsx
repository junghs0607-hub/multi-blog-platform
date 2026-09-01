"use client";

import { useEffect, useState, useRef } from "react";

export default function MediaPage() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // For now just show upload functionality
    setLoading(false);
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("file", files[i]);
      try {
        const r = await fetch("/api/upload", { method: "POST", body: formData });
        const d = await r.json();
        if (d.media) {
          setMediaList(prev => [d.media, ...prev]);
        } else if (d.error) {
          alert(d.error);
        }
      } catch {
        alert("업로드 실패");
      }
    }
    setUploading(false);
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url);
    alert("URL이 복사되었습니다!");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">미디어 관리</h1>

      <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm border-dashed border-2 border-gray-200 text-center"
        onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}>
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-500 mb-4">파일을 드래그 & 드롭하거나 클릭하여 업로드</p>
        <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50">
          {uploading ? "업로드 중..." : "파일 선택"}
        </button>
        <p className="text-xs text-gray-400 mt-2">이미지, 동영상, PDF (최대 10MB)</p>
      </div>

      {mediaList.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mediaList.map((m) => (
            <div key={m.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
              {m.mimeType?.startsWith("image/") ? (
                <img src={m.url} alt={m.originalName} className="w-full aspect-square object-cover" />
              ) : (
                <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-2xl">📄</div>
              )}
              <div className="p-3">
                <p className="text-xs truncate text-gray-600">{m.originalName}</p>
                <p className="text-xs text-gray-400">{(m.fileSize / 1024).toFixed(1)} KB</p>
                <button onClick={() => copyUrl(m.url)} className="mt-1 text-xs text-green-600 hover:underline">URL 복사</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
