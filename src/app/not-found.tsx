import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <h1 className="mt-4 text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-neutral-500">삭제되었거나 비공개로 전환된 콘텐츠일 수 있어요.</p>
      <Link href="/" className={buttonClass("primary", "lg", "mt-8")}>
        홈으로
      </Link>
    </div>
  );
}
