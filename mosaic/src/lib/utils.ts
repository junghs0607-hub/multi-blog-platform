import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1234 → "1.2천", 25000 → "2.5만" */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  if (n < 100_000_000) return `${(n / 10_000).toFixed(1).replace(/\.0$/, "")}만`;
  return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** 상대 시간 (한국어) */
export function timeAgo(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))}주 전`;
  return formatDate(date);
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

/** 이름 기반의 안정적인 아바타 배경색 */
export function colorFromString(s: string): string {
  const palette = ["#e60023", "#0074e8", "#00a650", "#f59e0b", "#7c3aed", "#db2777", "#0d9488", "#ea580c"];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
