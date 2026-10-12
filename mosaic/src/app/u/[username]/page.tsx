import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProfileBoards } from "@/components/boards/profile-boards";
import { TabLinks } from "@/components/layout/chips";
import { PinFeed } from "@/components/pins/pin-feed";
import { buttonClass } from "@/components/ui/button";
import { ProfileHeader } from "@/components/users/profile-header";
import { getViewer } from "@/server/auth/session";
import { listBoardsForUser } from "@/server/services/boards";
import { getProfile } from "@/server/services/users";

type Params = Promise<{ username: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

const loadProfile = cache(async (username: string) => getProfile(decodeURIComponent(username), await getViewer()));

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const profile = await loadProfile((await params).username);
  if (!profile) return { title: "사용자를 찾을 수 없습니다" };
  return { title: `${profile.displayName} (@${profile.username})`, description: profile.bio ?? undefined };
}

export default async function ProfilePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { username } = await params;
  const sp = await searchParams;
  const profile = await loadProfile(username);
  if (!profile) notFound();

  const tab = sp.tab === "saved" || (sp.tab === "liked" && profile.isMe) ? sp.tab : "created";
  const viewer = await getViewer();
  const boards = tab === "saved" ? await listBoardsForUser(profile.id, viewer) : [];
  const base = `/u/${profile.username}`;

  return (
    <div className="pb-10">
      <ProfileHeader key={profile.id} profile={profile} />
      <TabLinks
        className="mt-8 mb-6"
        items={[
          { href: base, label: "생성됨", active: tab === "created" },
          { href: `${base}?tab=saved`, label: "저장됨 (보드)", active: tab === "saved" },
          ...(profile.isMe ? [{ href: `${base}?tab=liked`, label: "좋아요", active: tab === "liked" }] : []),
        ]}
      />
      <div className="px-2 md:px-4">
        {tab === "created" && (
          <PinFeed
            key={`created-${profile.id}`}
            url={`/api/users/${profile.username}/pins`}
            emptyTitle={profile.isMe ? "아직 만든 핀이 없어요" : "아직 공개된 핀이 없어요"}
            emptyDescription={profile.isMe ? "마음에 드는 이미지를 업로드해 첫 핀을 만들어보세요." : undefined}
            emptyAction={
              profile.isMe ? (
                <Link href="/create" className={buttonClass("primary")}>
                  핀 만들기
                </Link>
              ) : undefined
            }
          />
        )}
        {tab === "saved" && <ProfileBoards boards={boards} isMe={profile.isMe} />}
        {tab === "liked" && (
          <PinFeed key="liked" url="/api/users/me/likes" emptyTitle="좋아요한 핀이 없어요" emptyDescription="마음에 드는 핀에 하트를 눌러보세요." />
        )}
      </div>
    </div>
  );
}
