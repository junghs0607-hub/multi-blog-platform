"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { USERNAME_RE, isHttpUrl } from "@/lib/validators";

interface Account {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  websiteUrl: string | null;
  createdAt: string;
}

type Tab = "profile" | "account";

export function SettingsView({ account }: { account: Account }) {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <div className="mx-auto max-w-2xl px-4 py-4 md:py-8">
      <h1 className="text-2xl font-bold">설정</h1>
      <div className="mt-4 mb-8 flex gap-2">
        {(
          [
            ["profile", "프로필 편집"],
            ["account", "계정 관리"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", tab === key ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200")}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "profile" ? <ProfileForm account={account} /> : <AccountForm account={account} />}
    </div>
  );
}

function ProfileForm({ account }: { account: Account }) {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(account.avatarUrl);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [displayName, setDisplayName] = useState(account.displayName);
  const [username, setUsername] = useState(account.username);
  const [bio, setBio] = useState(account.bio ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(account.websiteUrl ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const uploadAvatar = async (file: File | undefined) => {
    if (!file) return;
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const r = await api<{ avatarUrl: string }>("/api/users/me/avatar", { form });
      setAvatarUrl(r.avatarUrl);
      toast.success("프로필 사진을 변경했어요.");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    try {
      await api("/api/users/me/avatar", { method: "DELETE" });
      setAvatarUrl(null);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setAvatarBusy(false);
    }
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!displayName.trim()) e.displayName = "이름을 입력해주세요.";
    if (!USERNAME_RE.test(username.trim().toLowerCase())) e.username = "영문 소문자·숫자·밑줄(_) 3~30자로 입력해주세요.";
    if (websiteUrl.trim() && !isHttpUrl(websiteUrl.trim())) e.websiteUrl = "http:// 또는 https:// 로 시작하는 URL 을 입력해주세요.";
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api("/api/users/me", {
        method: "PATCH",
        body: { displayName: displayName.trim(), username: username.trim().toLowerCase(), bio: bio.trim(), websiteUrl: websiteUrl.trim() },
      });
      toast.success("프로필을 저장했어요.");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.code === "USERNAME_TAKEN") setErrors({ username: err.message });
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <Avatar src={avatarUrl} name={displayName || account.username} size={88} />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={avatarBusy}>
            <Camera className="size-4" /> 사진 변경
          </Button>
          {avatarUrl && (
            <Button variant="ghost" onClick={() => void removeAvatar()} disabled={avatarBusy}>
              <Trash2 className="size-4" /> 삭제
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden"
            onChange={(e) => {
              void uploadAvatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <Field label="이름" htmlFor="s-name" error={errors.displayName}>
        <Input id="s-name" value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>
      <Field label="아이디" htmlFor="s-username" error={errors.username} hint={`프로필 주소: /u/${username || "아이디"}`}>
        <Input id="s-username" value={username} maxLength={30} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
      </Field>
      <Field label="소개" htmlFor="s-bio" hint={`${bio.length}/500`}>
        <Textarea id="s-bio" value={bio} maxLength={500} onChange={(e) => setBio(e.target.value)} placeholder="나를 소개해주세요" />
      </Field>
      <Field label="웹사이트" htmlFor="s-web" error={errors.websiteUrl}>
        <Input id="s-web" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
      </Field>
      <div className="flex justify-end">
        <Button size="lg" onClick={() => void save()} loading={busy}>
          저장
        </Button>
      </div>
    </div>
  );
}

function AccountForm({ account }: { account: Account }) {
  const router = useRouter();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePw, setDeletePw] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const changePassword = async () => {
    if (next !== confirm) {
      setPwError("새 비밀번호가 일치하지 않아요.");
      return;
    }
    setPwBusy(true);
    setPwError(null);
    try {
      await api("/api/users/me/password", { method: "PATCH", body: { currentPassword: current, newPassword: next } });
      toast.success("비밀번호를 변경했어요. 다른 기기에서는 로그아웃됩니다.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setPwError(errorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDeleteBusy(true);
    try {
      await api("/api/users/me", { method: "DELETE", body: { password: deletePw } });
      toast.show("계정을 삭제했어요. 그동안 이용해주셔서 감사합니다.");
      router.push("/");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">이메일</h2>
        <p className="mt-1 text-neutral-600">{account.email}</p>
        <p className="mt-1 text-xs text-neutral-500">가입일 {new Date(account.createdAt).toLocaleDateString("ko-KR")}</p>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">비밀번호 변경</h2>
        <Field label="현재 비밀번호" htmlFor="pw-cur">
          <Input id="pw-cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="새 비밀번호" htmlFor="pw-new" hint="영문과 숫자를 포함해 8자 이상">
          <Input id="pw-new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="새 비밀번호 확인" htmlFor="pw-confirm" error={pwError}>
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => void changePassword()} loading={pwBusy} disabled={!current || !next}>
            비밀번호 변경
          </Button>
        </div>
      </section>
      <section className="rounded-3xl border border-red-100 p-5">
        <h2 className="text-lg font-semibold text-red-700">계정 삭제</h2>
        <p className="mt-1 text-sm text-neutral-600">핀, 보드, 댓글, 좋아요 등 모든 데이터가 영구적으로 삭제되며 복구할 수 없어요.</p>
        <Button variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}>
          계정 삭제
        </Button>
      </section>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void deleteAccount()}
        loading={deleteBusy}
        danger
        title="정말 계정을 삭제할까요?"
        description="확인을 위해 비밀번호를 입력해주세요."
        confirmLabel="영구 삭제"
      >
        <Input className="mt-4" type="password" value={deletePw} onChange={(e) => setDeletePw(e.target.value)} placeholder="비밀번호" autoComplete="current-password" />
      </ConfirmDialog>
    </div>
  );
}
