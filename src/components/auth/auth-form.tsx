"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/api";
import { safeNextPath, USERNAME_RE } from "@/lib/validators";
import type { SessionUser } from "@/types";

type Errors = Record<string, string>;

function fieldErrorsFrom(err: unknown): Errors | null {
  if (!(err instanceof ApiError)) return null;
  if (err.code === "VALIDATION_ERROR" && Array.isArray(err.details)) {
    const out: Errors = {};
    for (const d of err.details as { path: string; message: string }[]) if (!out[d.path]) out[d.path] = d.message;
    return out;
  }
  if (err.code === "EMAIL_TAKEN") return { email: err.message };
  if (err.code === "USERNAME_TAKEN") return { username: err.message };
  return null;
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [values, setValues] = useState({ identifier: "", email: "", username: "", displayName: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const target = safeNextPath(next);

  const validate = (): Errors => {
    const e: Errors = {};
    if (mode === "login") {
      if (!values.identifier.trim()) e.identifier = "이메일 또는 아이디를 입력해주세요.";
      if (!values.password) e.password = "비밀번호를 입력해주세요.";
      return e;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) e.email = "올바른 이메일 주소를 입력해주세요.";
    if (!USERNAME_RE.test(values.username.trim().toLowerCase())) e.username = "영문 소문자·숫자·밑줄(_) 3~30자로 입력해주세요.";
    if (!values.displayName.trim()) e.displayName = "이름을 입력해주세요.";
    if (values.password.length < 8 || !/[A-Za-z]/.test(values.password) || !/[0-9]/.test(values.password)) {
      e.password = "영문과 숫자를 포함해 8자 이상 입력해주세요.";
    }
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const { user } =
        mode === "login"
          ? await api<{ user: SessionUser }>("/api/auth/login", { body: { identifier: values.identifier, password: values.password } })
          : await api<{ user: SessionUser }>("/api/auth/register", {
              body: { email: values.email, username: values.username, displayName: values.displayName, password: values.password },
            });
      toast.success(mode === "login" ? `${user.displayName}님, 환영합니다!` : "가입을 환영합니다! 첫 핀을 만들어보세요.");
      router.replace(target);
      router.refresh();
    } catch (err) {
      const fe = fieldErrorsFrom(err);
      if (fe) setErrors(fe);
      else setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] bg-white px-6 py-10 shadow-[0_2px_32px_rgba(0,0,0,0.12)] sm:px-10">
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-11" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight">{mode === "login" ? "Mosaic에 로그인" : "Mosaic 가입하기"}</h1>
          <p className="mt-2 text-neutral-600">{mode === "login" ? "다시 만나서 반가워요" : "시도해 볼 만한 새로운 아이디어 찾기"}</p>
        </div>
        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          {mode === "login" ? (
            <Field label="이메일 또는 아이디" htmlFor="identifier" error={errors.identifier}>
              <Input id="identifier" autoComplete="username" value={values.identifier} onChange={set("identifier")} placeholder="you@example.com" autoFocus />
            </Field>
          ) : (
            <>
              <Field label="이메일" htmlFor="email" error={errors.email}>
                <Input id="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} placeholder="you@example.com" autoFocus />
              </Field>
              <Field label="아이디" htmlFor="username" error={errors.username} hint="영문 소문자·숫자·밑줄 3~30자, 프로필 주소로 사용돼요">
                <Input id="username" autoComplete="username" autoCapitalize="none" value={values.username} onChange={set("username")} placeholder="mosaic_lover" />
              </Field>
              <Field label="이름" htmlFor="displayName" error={errors.displayName}>
                <Input id="displayName" autoComplete="nickname" value={values.displayName} onChange={set("displayName")} placeholder="홍길동" />
              </Field>
            </>
          )}
          <Field label="비밀번호" htmlFor="password" error={errors.password} hint={mode === "signup" ? "영문과 숫자를 포함해 8자 이상" : undefined}>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={values.password}
              onChange={set("password")}
              placeholder="비밀번호"
            />
          </Field>
          {formError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</p>}
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            {mode === "login" ? "로그인" : "가입하기"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-neutral-600">
          {mode === "login" ? (
            <>
              아직 회원이 아니신가요?{" "}
              <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-neutral-900 hover:underline">
                가입하기
              </Link>
            </>
          ) : (
            <>
              이미 회원이신가요?{" "}
              <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-neutral-900 hover:underline">
                로그인
              </Link>
            </>
          )}
        </p>
        {mode === "login" && (
          <div className="mt-6 rounded-2xl bg-neutral-50 p-4 text-xs leading-relaxed text-neutral-600">
            <p className="font-semibold text-neutral-800">데모 계정 (npm run db:seed)</p>
            <p>사용자: minji / mosaic1234</p>
            <p>관리자: admin / admin1234</p>
          </div>
        )}
      </div>
    </div>
  );
}
