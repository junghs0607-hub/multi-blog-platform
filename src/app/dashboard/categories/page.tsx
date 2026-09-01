"use client";

import { useEffect, useState } from "react";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user?.blog) {
        fetch(`/api/categories?blogId=${d.user.blog.id}`).then(r => r.json()).then(c => {
          setCategories(c.categories || []);
          setLoading(false);
        });
      } else setLoading(false);
    });
  }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    const r = await fetch("/api/categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const d = await r.json();
    if (d.category) { setCategories([...categories, d.category]); setNewName(""); }
  };

  const deleteCategory = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    const r = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.success) setCategories(categories.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">카테고리 관리</h1>

      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-4">새 카테고리 추가</h3>
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addCategory(); }}
            placeholder="카테고리 이름" className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm" />
          <button onClick={addCategory} className="px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600">추가</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6"><div className="h-10 skeleton mb-2"></div><div className="h-10 skeleton"></div></div>
        ) : categories.length === 0 ? (
          <div className="p-12 text-center text-gray-400">카테고리가 없습니다</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-gray-400">/{cat.slug}</p>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="text-xs text-red-500 hover:text-red-700 px-3 py-1 rounded-lg hover:bg-red-50">삭제</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
