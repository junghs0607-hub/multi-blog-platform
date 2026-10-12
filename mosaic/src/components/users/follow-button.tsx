"use client";

import { useState } from "react";
import { useRequireAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api";

export function FollowButton({
  username,
  initialFollowing,
  onChange,
  size = "md",
}: {
  username: string;
  initialFollowing: boolean;
  onChange?: (following: boolean, followerCount: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const requireAuth = useRequireAuth();
  const toast = useToast();

  const toggle = async () => {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      const r = await api<{ following: boolean; followerCount: number }>(`/api/users/${username}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      setFollowing(r.following);
      onChange?.(r.following, r.followerCount);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size={size} variant={following ? "secondary" : "dark"} loading={busy} onClick={() => void toggle()}>
      {following ? "팔로잉" : "팔로우"}
    </Button>
  );
}
