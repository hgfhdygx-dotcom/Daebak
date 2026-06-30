import { redirect } from "next/navigation";

// 구 경로 — 새 private 제출확인 페이지로 영구 이동(기존 링크 호환).
export const dynamic = "force-dynamic";

export default async function StatusRedirect({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/ask/submitted/${token}`);
}
