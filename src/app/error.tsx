"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <p className="text-5xl">😵</p>
      <h1 className="mt-4 text-2xl font-bold">문제가 발생했어요</h1>
      <p className="mt-2 text-neutral-500">일시적인 오류일 수 있어요. 잠시 후 다시 시도해주세요.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-neutral-400">오류 코드: {error.digest}</p>}
      <Button size="lg" className="mt-8" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
