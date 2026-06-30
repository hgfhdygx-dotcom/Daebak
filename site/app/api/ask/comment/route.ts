import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addComment, listComments } from "@/lib/questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get("x-forwarded-for");
  return xf ? xf.split(",")[0].trim() : req.headers.get("x-real-ip");
}
function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

// 공개 Ask 댓글 추가. 성공 시 갱신된 댓글 목록을 반환(클라가 바로 새로고침).
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  const slug = str(body.slug);
  const comment = typeof body.comment === "string" ? body.comment : "";
  if (!slug) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const res = await addComment(
    slug,
    { comment, nickname: str(body.nickname), website: typeof body.website === "string" ? body.website : undefined },
    clientIp(req),
    str(body.vid),
  );
  if (res === "added") return NextResponse.json({ ok: true, comments: await listComments(slug) });
  if (res === "notfound") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (res === "rate_limited") return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
}
