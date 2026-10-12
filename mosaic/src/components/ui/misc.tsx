import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn, colorFromString, timeAgo } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 40,
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt={name} width={size} height={size} style={style} className={cn("shrink-0 rounded-full bg-neutral-200 object-cover", className)} />;
  }
  return (
    <span
      aria-label={name}
      style={{ ...style, backgroundColor: colorFromString(name), fontSize: Math.max(11, size * 0.42) }}
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white", className)}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-6 animate-spin text-neutral-400", className)} />;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      {icon && <div className="mb-4 rounded-full bg-neutral-100 p-5 text-neutral-500">{icon}</div>}
      <h3 className="text-xl font-semibold">{title}</h3>
      {description && <p className="mt-2 text-neutral-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** 서버/클라이언트 렌더 시각 차이로 인한 hydration 경고를 막기 위해 suppressHydrationWarning 사용 */
export function TimeAgo({ date, className }: { date: string; className?: string }) {
  return (
    <time dateTime={date} className={className} suppressHydrationWarning title={new Date(date).toLocaleString("ko-KR")}>
      {timeAgo(date)}
    </time>
  );
}
