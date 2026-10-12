import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { safeNextPath } from "@/lib/validators";
import { getViewer } from "@/server/auth/session";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getViewer()) redirect(safeNextPath(next));
  return <AuthForm mode="signup" next={next} />;
}
