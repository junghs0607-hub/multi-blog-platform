"use client";

import { AlertTriangle, ImagePlus, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BoardFormDialog } from "@/components/boards/board-form-dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TagInput } from "@/components/ui/tag-input";
import { useToast } from "@/components/ui/toast";
import { api, ApiError, errorMessage, sha256OfFile, uploadWithProgress } from "@/lib/api";
import { PIN_DESCRIPTION_MAX, PIN_TITLE_MAX } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";
import { isHttpUrl } from "@/lib/validators";
import type { BoardOption, Category, PinDetail, SimilarCandidate, UploadConfig } from "@/types";
import { SaveDialog } from "./save-dialog";

type FieldErrors = Partial<Record<"title" | "description" | "sourceUrl" | "tags" | "file", string>>;

interface PinFieldsValue {
  title: string;
  description: string;
  sourceUrl: string;
  tags: string[];
  categoryId: string;
  isPrivate: boolean;
}

function validateFields(v: PinFieldsValue): FieldErrors {
  const e: FieldErrors = {};
  if (!v.title.trim()) e.title = "제목을 입력해주세요.";
  else if (v.title.trim().length > PIN_TITLE_MAX) e.title = `제목은 ${PIN_TITLE_MAX}자 이하로 입력해주세요.`;
  if (v.description.length > PIN_DESCRIPTION_MAX) e.description = `설명은 ${PIN_DESCRIPTION_MAX}자 이하로 입력해주세요.`;
  if (v.sourceUrl.trim() && !isHttpUrl(v.sourceUrl.trim())) e.sourceUrl = "http:// 또는 https:// 로 시작하는 URL 을 입력해주세요.";
  return e;
}

function serverFieldErrors(err: unknown): FieldErrors | null {
  if (!(err instanceof ApiError) || err.code !== "VALIDATION_ERROR" || !Array.isArray(err.details)) return null;
  const out: FieldErrors = {};
  for (const d of err.details as { path: string; message: string }[]) {
    const key = d.path.split(".")[0] as keyof FieldErrors;
    if (key && !out[key]) out[key] = d.message;
  }
  return out;
}

function PinFields({
  value,
  onChange,
  errors,
  categories,
  aiTags,
}: {
  value: PinFieldsValue;
  onChange: (patch: Partial<PinFieldsValue>) => void;
  errors: FieldErrors;
  categories: Category[];
  aiTags?: string[];
}) {
  return (
    <div className="space-y-5">
      <Field label="제목" htmlFor="pin-title" error={errors.title} hint={`${value.title.length}/${PIN_TITLE_MAX}`}>
        <Input
          id="pin-title"
          value={value.title}
          maxLength={PIN_TITLE_MAX}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="제목 추가"
          aria-invalid={Boolean(errors.title)}
          className="h-14 text-lg font-semibold"
        />
      </Field>
      <Field label="설명" htmlFor="pin-desc" error={errors.description} hint={`${value.description.length}/${PIN_DESCRIPTION_MAX}`}>
        <Textarea
          id="pin-desc"
          value={value.description}
          maxLength={PIN_DESCRIPTION_MAX}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="이 핀에 대해 자세히 알려주세요"
          rows={4}
        />
      </Field>
      <Field label="원본 링크" htmlFor="pin-url" error={errors.sourceUrl} hint="이미지의 출처나 관련 웹페이지 주소">
        <Input
          id="pin-url"
          type="url"
          inputMode="url"
          value={value.sourceUrl}
          onChange={(e) => onChange({ sourceUrl: e.target.value })}
          placeholder="https://"
          aria-invalid={Boolean(errors.sourceUrl)}
        />
      </Field>
      <Field label="태그" htmlFor="pin-tags" error={errors.tags}>
        <TagInput id="pin-tags" value={value.tags} onChange={(tags) => onChange({ tags })} aiTags={aiTags} />
      </Field>
      <Field label="카테고리" htmlFor="pin-category">
        <Select id="pin-category" value={value.categoryId} onChange={(e) => onChange({ categoryId: e.target.value })}>
          <option value="">카테고리 선택 (선택)</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Switch
        id="pin-private"
        checked={value.isPrivate}
        onChange={(isPrivate) => onChange({ isPrivate })}
        label="비공개 핀"
        description="나만 볼 수 있으며 피드와 검색에 노출되지 않아요."
      />
    </div>
  );
}

/* ────────────────────────── 업로드(생성) ────────────────────────── */

interface Picked {
  file: File;
  url: string;
  width: number;
  height: number;
}

type DuplicateInfo = { existingPinId: number; own: boolean };

export function PinCreateForm({
  categories,
  initialBoards,
  config,
}: {
  categories: Category[];
  initialBoards: BoardOption[];
  config: UploadConfig;
}) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [checking, setChecking] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [fields, setFields] = useState<PinFieldsValue>({ title: "", description: "", sourceUrl: "", tags: [], categoryId: "", isPrivate: false });
  const [boards, setBoards] = useState(initialBoards);
  const [boardId, setBoardId] = useState("");
  const [boardDialog, setBoardDialog] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [progress, setProgress] = useState<number | null>(null);
  const [similar, setSimilar] = useState<SimilarCandidate[] | null>(null);
  const [saveExisting, setSaveExisting] = useState<number | null>(null);

  useEffect(() => {
    const url = picked?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [picked]);

  const pickFile = async (file: File | undefined | null) => {
    if (!file) return;
    setErrors((e) => ({ ...e, file: undefined }));
    setDuplicate(null);
    if (!config.allowedMimeTypes.includes(file.type)) {
      setErrors((e) => ({ ...e, file: "JPG, PNG, WEBP, GIF, AVIF 이미지만 업로드할 수 있어요." }));
      return;
    }
    if (file.size > config.maxBytes) {
      setErrors((e) => ({ ...e, file: `파일 크기는 최대 ${formatBytes(config.maxBytes)}까지 가능해요. (현재 ${formatBytes(file.size)})` }));
      return;
    }
    const url = URL.createObjectURL(file);
    const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = url;
    });
    if (!dims) {
      URL.revokeObjectURL(url);
      setErrors((e) => ({ ...e, file: "이미지를 읽을 수 없어요. 손상된 파일인지 확인해주세요." }));
      return;
    }
    if (dims.width < config.minDimension || dims.height < config.minDimension) {
      URL.revokeObjectURL(url);
      setErrors((e) => ({ ...e, file: `이미지가 너무 작아요. 최소 ${config.minDimension}px 이상이어야 해요.` }));
      return;
    }
    setPicked({ file, url, ...dims });

    // 업로드 전 중복 확인 (브라우저에서 SHA-256 계산)
    setChecking(true);
    try {
      const sha = await sha256OfFile(file);
      if (sha) {
        const r = await api<{ duplicate: DuplicateInfo | null }>("/api/images/check", { query: { sha256: sha } });
        setDuplicate(r.duplicate);
      }
    } catch {
      /* 사전 확인 실패는 무시 (서버에서 다시 검사) */
    } finally {
      setChecking(false);
    }
  };

  const submit = async (allowSimilar = false) => {
    if (!picked) {
      setErrors((e) => ({ ...e, file: "이미지를 선택해주세요." }));
      return;
    }
    const fe = validateFields(fields);
    setErrors(fe);
    if (Object.keys(fe).length) return;

    const form = new FormData();
    form.append("file", picked.file);
    form.append("title", fields.title.trim());
    form.append("description", fields.description.trim());
    form.append("sourceUrl", fields.sourceUrl.trim());
    form.append("tags", JSON.stringify(fields.tags));
    form.append("categoryId", fields.categoryId);
    form.append("boardId", boardId);
    form.append("visibility", fields.isPrivate ? "private" : "public");
    if (allowSimilar) form.append("allowSimilar", "1");

    setProgress(0);
    setSimilar(null);
    try {
      const r = await uploadWithProgress<{ pin: PinDetail }>("/api/pins", form, (p) => setProgress(Math.min(p, 0.97)));
      toast.success("핀을 게시했어요!");
      router.push(`/pins/${r.pin.id}`);
      router.refresh();
    } catch (err) {
      setProgress(null);
      if (err instanceof ApiError && err.code === "SIMILAR_IMAGE") {
        setSimilar((err.details as { candidates: SimilarCandidate[] }).candidates ?? []);
        return;
      }
      if (err instanceof ApiError && err.code === "DUPLICATE_IMAGE") {
        const d = err.details as Partial<DuplicateInfo> | undefined;
        if (d?.existingPinId) setDuplicate({ existingPinId: d.existingPinId, own: Boolean(d.own) });
        toast.error(err.message);
        return;
      }
      const fieldErrs = serverFieldErrors(err);
      if (fieldErrs) {
        setErrors(fieldErrs);
        return;
      }
      if (err instanceof ApiError && ["UNSUPPORTED_TYPE", "TYPE_MISMATCH", "FILE_TOO_LARGE", "CORRUPT_IMAGE", "DIMENSIONS_TOO_SMALL", "DIMENSIONS_TOO_LARGE", "FILE_EMPTY"].includes(err.code)) {
        setErrors((e) => ({ ...e, file: err.message }));
        return;
      }
      toast.error(errorMessage(err));
    }
  };

  const uploading = progress !== null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">핀 만들기</h1>
        <Button size="lg" onClick={() => void submit()} loading={uploading} disabled={!picked || checking}>
          게시
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        {/* 이미지 선택 */}
        <div>
          {picked ? (
            <div className="relative overflow-hidden rounded-[28px] bg-neutral-100">
              <img src={picked.url} alt="미리보기" className="max-h-[70vh] w-full object-contain" />
              <div className="absolute top-3 right-3 flex gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} className="rounded-full bg-white/90 p-2.5 shadow hover:bg-white" aria-label="다른 이미지 선택" disabled={uploading}>
                  <RefreshCw className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(null);
                    setDuplicate(null);
                  }}
                  className="rounded-full bg-white/90 p-2.5 shadow hover:bg-white"
                  aria-label="이미지 제거"
                  disabled={uploading}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/60 px-3 py-2 text-xs text-white">
                {picked.file.name} · {picked.width}×{picked.height} · {formatBytes(picked.file.size)}
              </div>
              {uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm">
                  <Loader2 className="size-8 animate-spin text-neutral-700" />
                  <div className="h-2 w-2/3 overflow-hidden rounded-full bg-neutral-200">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
                  </div>
                  <p className="text-sm font-medium text-neutral-700">{(progress ?? 0) >= 0.97 ? "썸네일 생성 중..." : `업로드 중 ${Math.round((progress ?? 0) * 100)}%`}</p>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex aspect-[3/4] w-full flex-col items-center justify-center gap-4 rounded-[28px] border-2 border-dashed bg-neutral-100 p-8 text-center transition-colors",
                dragOver ? "border-brand bg-red-50" : "border-neutral-300 hover:bg-neutral-200/60",
              )}
            >
              <span className="rounded-full bg-white p-4 shadow-sm">
                <ImagePlus className="size-8 text-neutral-700" />
              </span>
              <span className="text-lg font-semibold">이미지를 끌어다 놓거나 클릭해서 선택하세요</span>
              <span className="text-sm text-neutral-500">
                JPG · PNG · WEBP · GIF · AVIF / 최대 {formatBytes(config.maxBytes)}
                <br />
                고화질 원본은 그대로 보관되고, 피드용 썸네일이 자동 생성됩니다.
              </span>
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={config.allowedMimeTypes.join(",")}
            className="hidden"
            onChange={(e) => {
              void pickFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {errors.file && <p className="mt-3 flex items-center gap-2 text-sm text-red-600"><AlertTriangle className="size-4 shrink-0" />{errors.file}</p>}
          {checking && <p className="mt-3 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="size-4 animate-spin" />중복 이미지 확인 중...</p>}
          {duplicate && (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4" />
                {duplicate.own ? "이미 업로드한 이미지예요." : "이미 다른 사용자가 등록한 이미지예요."}
              </p>
              <p className="mt-1 text-amber-800">중복 업로드는 허용되지 않아요. {duplicate.own ? "" : "대신 기존 핀을 내 보드에 저장할 수 있어요."}</p>
              <div className="mt-3 flex gap-2">
                <Link href={`/pins/${duplicate.existingPinId}`} className="rounded-full bg-white px-4 py-2 font-semibold shadow-sm hover:bg-neutral-50">
                  기존 핀 보기
                </Link>
                {!duplicate.own && (
                  <button type="button" onClick={() => setSaveExisting(duplicate.existingPinId)} className="rounded-full bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-hover">
                    내 보드에 저장
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 입력 폼 */}
        <div className="space-y-5">
          <PinFields value={fields} onChange={(p) => setFields((f) => ({ ...f, ...p }))} errors={errors} categories={categories} />
          <Field label="보드" htmlFor="pin-board" hint="게시와 동시에 선택한 보드에 저장됩니다">
            <div className="flex gap-2">
              <Select id="pin-board" value={boardId} onChange={(e) => setBoardId(e.target.value)}>
                <option value="">보드 선택 안 함</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.visibility === "private" ? " 🔒" : ""}
                  </option>
                ))}
              </Select>
              <Button variant="secondary" size="icon" className="size-12" onClick={() => setBoardDialog(true)} aria-label="새 보드">
                <Plus className="size-5" />
              </Button>
            </div>
          </Field>
        </div>
      </div>

      <BoardFormDialog
        open={boardDialog}
        onClose={() => setBoardDialog(false)}
        onSaved={(b) => {
          setBoards((prev) => [{ id: b.id, name: b.name, visibility: b.visibility, pinCount: 0, coverUrl: null, saved: false }, ...prev]);
          setBoardId(String(b.id));
          setBoardDialog(false);
        }}
      />

      <Modal
        open={similar !== null}
        onClose={() => setSimilar(null)}
        title="비슷한 이미지가 이미 있어요"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSimilar(null)}>
              취소
            </Button>
            <Button onClick={() => void submit(true)}>그래도 업로드</Button>
          </div>
        }
      >
        <p className="text-neutral-600">지각 해시(dHash) 비교 결과 아래 핀과 거의 같은 이미지로 보입니다. 다른 이미지라면 그대로 업로드할 수 있어요.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(similar ?? []).map((c) => (
            <Link key={c.pinId} href={`/pins/${c.pinId}`} target="_blank" className="group">
              <img src={c.thumbUrl} alt={c.title} className="aspect-square w-full rounded-xl object-cover group-hover:brightness-90" />
              <p className="mt-1 truncate text-xs font-medium">{c.title}</p>
              <p className="text-[11px] text-neutral-500">차이 {c.distance}/64</p>
            </Link>
          ))}
        </div>
      </Modal>

      {saveExisting !== null && <SaveDialog open pinId={saveExisting} onClose={() => setSaveExisting(null)} />}
    </div>
  );
}

/* ────────────────────────── 수정 ────────────────────────── */

export function PinEditForm({ pin, categories }: { pin: PinDetail; categories: Category[] }) {
  const router = useRouter();
  const toast = useToast();
  const [fields, setFields] = useState<PinFieldsValue>({
    title: pin.title,
    description: pin.description ?? "",
    sourceUrl: pin.sourceUrl ?? "",
    tags: pin.tags.map((t) => t.name),
    categoryId: pin.category ? String(pin.category.id) : "",
    isPrivate: pin.visibility === "private",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    const fe = validateFields(fields);
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await api(`/api/pins/${pin.id}`, {
        method: "PATCH",
        body: {
          title: fields.title.trim(),
          description: fields.description.trim(),
          sourceUrl: fields.sourceUrl.trim(),
          tags: fields.tags,
          categoryId: fields.categoryId || null,
          visibility: fields.isPrivate ? "private" : "public",
        },
      });
      toast.success("핀을 수정했어요.");
      router.push(`/pins/${pin.id}`);
      router.refresh();
    } catch (err) {
      const fieldErrs = serverFieldErrors(err);
      if (fieldErrs) setErrors(fieldErrs);
      else toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/api/pins/${pin.id}`, { method: "DELETE" });
      toast.success("핀을 삭제했어요.");
      router.push(`/u/${pin.author.username}`);
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 md:py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">핀 수정</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => router.back()}>
            취소
          </Button>
          <Button onClick={() => void save()} loading={busy}>
            저장
          </Button>
        </div>
      </div>
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <img src={pin.image.mediumUrl} alt={pin.title} className="w-full rounded-[28px] bg-neutral-100 object-contain" style={{ aspectRatio: `${pin.image.width} / ${pin.image.height}` }} />
          <p className="mt-2 text-xs text-neutral-500">이미지는 변경할 수 없어요. 다른 이미지를 올리려면 새 핀을 만들어주세요.</p>
        </div>
        <div>
          <PinFields
            value={fields}
            onChange={(p) => setFields((f) => ({ ...f, ...p }))}
            errors={errors}
            categories={categories}
            aiTags={pin.tags.filter((t) => t.source === "ai").map((t) => t.name)}
          />
          <div className="mt-10 rounded-2xl border border-red-100 p-4">
            <h2 className="font-semibold text-red-700">핀 삭제</h2>
            <p className="mt-1 text-sm text-neutral-600">삭제하면 모든 보드에서 사라지며 복구할 수 없어요.</p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> 삭제
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void remove()}
        loading={deleting}
        danger
        title="핀을 삭제할까요?"
        description="삭제한 핀은 복구할 수 없습니다."
        confirmLabel="삭제"
      />
    </div>
  );
}
