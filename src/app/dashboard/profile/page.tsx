"use client";

import { useEffect, useState } from "react";

export default function ProfilePage() {
  const [form, setForm] = useState({ displayName: "", bio: "", avatarUrl: "", currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setForm(prev => ({
          ...prev,
          displayName: d.user.displayName || "",
          bio: d.user.bio || "",
          avatarUrl: d.user.avatarUrl || "",
        }));
      }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) alert("저장되었습니다!");
      else alert(d.error || "저장 실패");
    } catch { alert("저장 실패"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">👤 프로필 설정</h1>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">표시 이름</label>
          <input type="text" value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">소개</label>
          <textarea value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none h-24"
            placeholder="자기소개를 입력하세요" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">프로필 이미지 URL</label>
          <input type="text" value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
        </div>

        <hr />

        <h3 className="font-bold text-sm">비밀번호 변경 (선택)</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
          <input type="password" value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
          <input type="password" value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50">
          {saving ? "저장 중..." : "💾 프로필 저장"}
        </button>
      </div>
    </div>
  );
}
