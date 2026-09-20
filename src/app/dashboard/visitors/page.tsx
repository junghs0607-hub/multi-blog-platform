"use client";

import { useEffect, useState } from "react";

export default function VisitorsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/visitors")
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">방문자 로그</h1>
      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 skeleton rounded-xl"></div>)}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <span className="text-4xl block mb-2">🕵️</span>
            방문자 기록이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-medium">
                  <th className="px-4 py-3">일시</th>
                  <th className="px-4 py-3">IP 주소</th>
                  <th className="px-4 py-3">접속 페이지 (글 제목)</th>
                  <th className="px-4 py-3 max-w-[200px]">Referer (유입경로)</th>
                  <th className="px-4 py-3 max-w-[200px]">User-Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {log.ip || "알 수 없음"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-800">{log.articleTitle || "블로그 메인/기타"}</span>
                    </td>
                    <td className="px-4 py-3 truncate max-w-[200px] text-xs text-gray-500" title={log.referer}>
                      {log.referer || "-"}
                    </td>
                    <td className="px-4 py-3 truncate max-w-[200px] text-xs text-gray-500" title={log.userAgent}>
                      {log.userAgent || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
