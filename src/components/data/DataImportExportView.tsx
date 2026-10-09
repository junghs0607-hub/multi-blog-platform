"use client";

import React, { useState } from "react";
import { useAsset } from "@/context/AssetContext";
import {
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export function DataImportExportView() {
  const { assets, exportToJSON, importFromJSON, importFromCSV, resetToDemoData } = useAsset();

  const [jsonInput, setJsonInput] = useState("");
  const [csvText, setCsvText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const sampleCsvTemplate = `category,name,code,currency,quantity,avgBuyPrice,currentPrice,dividendYield
KR_STOCK,삼성전자,005930,KRW,100,70000,74200,2.18
US_STOCK,Apple Inc,AAPL,USD,50,200,228.5,0.44
ETF,SCHD,SCHD,USD,100,80,83.2,3.42
CRYPTO,비트코인,BTC,KRW,0.1,90000000,135400000,0
COMMODITY,금현물,KRX-GOLD,KRW,50,100000,118500,0`;

  const handleDownloadJSON = () => {
    const jsonStr = exportToJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `domino_asset_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSampleCSV = () => {
    const blob = new Blob([sampleCsvTemplate], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "domino_asset_sample_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = () => {
    if (!jsonInput.trim()) return;
    const ok = importFromJSON(jsonInput);
    if (ok) {
      setImportStatus("JSON 백업 데이터가 성공적으로 복원되었습니다.");
      setJsonInput("");
    } else {
      setImportStatus("JSON 파싱에 실패했습니다. 올바른 포맷인지 확인해주세요.");
    }
  };

  const handleImportCSVText = () => {
    if (!csvText.trim()) return;
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return;

    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });

    importFromCSV(rows);
    setImportStatus(`CSV에서 ${rows.length}개 자산을 성공적으로 가져왔습니다.`);
    setCsvText("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
            <FileSpreadsheet className="w-4 h-4" />
            데이터 가져오기 / 내보내기 & 백업 허브
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            CSV / 엑셀 가져오기 및 JSON 전체 백업 & 복원
          </h1>
          <p className="text-xs sm:text-sm text-gray-300 mt-1">
            증권사 거래내역 CSV를 업로드하거나 포트폴리오를 파일로 안전하게 백업하세요.
          </p>
        </div>
      </div>

      {importStatus && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* CSV Import & Template Download */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" />
              CSV 텍스트 직접 입력 / 가져오기
            </h3>
            <button
              onClick={handleDownloadSampleCSV}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>샘플 CSV 서식 받기</span>
            </button>
          </div>

          <p className="text-xs text-gray-400">
            CSV 헤더: category, name, code, currency, quantity, avgBuyPrice, currentPrice, dividendYield
          </p>

          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={sampleCsvTemplate}
            className="w-full p-3 text-xs font-mono rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={handleImportCSVText}
            className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
          >
            CSV 데이터 포트폴리오에 추가하기
          </button>
        </div>

        {/* JSON Full Backup & Restore */}
        <div className="p-6 rounded-3xl bg-white dark:bg-gray-850 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
              <FileJson className="w-4 h-4 text-purple-500" />
              JSON 포트폴리오 전체 백업 & 복원
            </h3>
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>전체 백업 다운로드</span>
            </button>
          </div>

          <p className="text-xs text-gray-400">
            모든 보유 자산, 계좌, 과거 거래내역, 관심종목, 알림이 포함된 JSON 데이터를 복원합니다.
          </p>

          <textarea
            rows={5}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="JSON 백업 파일 내용을 여기에 붙여넣으세요..."
            className="w-full p-3 text-xs font-mono rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
          />

          <button
            onClick={handleImportJSON}
            className="w-full py-3 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all"
          >
            JSON 백업 데이터로 복원하기
          </button>
        </div>
      </div>
    </div>
  );
}
