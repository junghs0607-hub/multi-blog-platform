import { Bookmark, Flag, Heart, Image as ImageIcon, LayoutGrid, MessageCircle, Server, Users } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "@/components/admin/shared";
import { formatBytes } from "@/lib/utils";
import { getAdminStats } from "@/server/services/admin";

export default async function AdminDashboard() {
  const s = await getAdminStats();
  const max = Math.max(1, ...s.daily.map((d) => Math.max(d.users, d.pins)));

  const cards = [
    { label: "전체 사용자", value: s.totals.users, sub: `최근 7일 +${s.last7d.users} · 정지 ${s.totals.suspendedUsers}`, icon: Users, href: "/admin/users" },
    { label: "전체 핀", value: s.totals.pins, sub: `최근 7일 +${s.last7d.pins} · 숨김 ${s.totals.hiddenPins} · 비공개 ${s.totals.privatePins}`, icon: ImageIcon, href: "/admin/pins" },
    { label: "처리 대기 신고", value: s.totals.pendingReports, sub: "신고 관리로 이동", icon: Flag, href: "/admin/reports", alert: s.totals.pendingReports > 0 },
    { label: "보드", value: s.totals.boards, sub: "사용자 생성 보드", icon: LayoutGrid },
    { label: "댓글", value: s.totals.comments, sub: "전체 댓글 수", icon: MessageCircle },
    { label: "좋아요", value: s.totals.likes, sub: "전체 좋아요 수", icon: Heart },
    { label: "이미지 파일", value: s.totals.images, sub: `원본 합계 ${formatBytes(s.totals.storageBytes)}`, icon: Bookmark },
    { label: "백그라운드 작업", value: s.totals.pendingJobs, sub: `대기/실행 중 · 실패 ${s.totals.failedJobs}`, icon: Server },
  ];

  return (
    <div>
      <PageTitle title="대시보드" description="서비스 현황을 한눈에 확인하세요." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, sub, icon: Icon, href, alert }) => {
          const body = (
            <div className={`h-full rounded-3xl bg-white p-5 shadow-sm ring-1 ${alert ? "ring-red-200" : "ring-neutral-100"} transition hover:shadow-md`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-500">{label}</span>
                <Icon className={`size-5 ${alert ? "text-brand" : "text-neutral-400"}`} />
              </div>
              <p className={`mt-2 text-3xl font-bold ${alert ? "text-brand" : ""}`}>{value.toLocaleString()}</p>
              <p className="mt-1 text-xs text-neutral-500">{sub}</p>
            </div>
          );
          return href ? (
            <Link key={label} href={href}>
              {body}
            </Link>
          ) : (
            <div key={label}>{body}</div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-100 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">최근 14일 가입 / 업로드</h2>
            <div className="flex gap-3 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-sky-500" /> 가입
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2.5 rounded-full bg-brand" /> 업로드
              </span>
            </div>
          </div>
          <div className="flex h-48 items-end gap-1.5">
            {s.daily.map((d) => (
              <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.day} 가입 ${d.users} · 업로드 ${d.pins}`}>
                <div className="flex w-full flex-1 items-end justify-center gap-0.5">
                  <div className="w-1/2 rounded-t bg-sky-500" style={{ height: `${(d.users / max) * 100}%`, minHeight: d.users ? 3 : 0 }} />
                  <div className="w-1/2 rounded-t bg-brand" style={{ height: `${(d.pins / max) * 100}%`, minHeight: d.pins ? 3 : 0 }} />
                </div>
                <span className="text-[10px] text-neutral-400">{d.day.slice(8)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-100">
          <h2 className="mb-3 font-semibold">인기 태그 TOP 10</h2>
          <ol className="space-y-2">
            {s.topTags.map((t, i) => (
              <li key={t.name} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-right font-semibold text-neutral-400">{i + 1}</span>
                <Link href={`/search?tag=${encodeURIComponent(t.name)}`} className="flex-1 truncate font-medium hover:underline">
                  #{t.name}
                </Link>
                <span className="text-neutral-500">{t.usageCount}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
