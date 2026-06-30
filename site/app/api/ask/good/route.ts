import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { addGood } from "@/lib/questions";

export const runtime = "nodejs"; // node:crypto(visitorHash)
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get("x-forwarded-for");
  return xf ? xf.split(",")[0].trim() : req.headers.get("x-real-ip");
}

// 공개 Ask 에 Good 1개(질문당 방문자 1회). 중복은 ask_goods unique(question_id,visitor_hash) 가 막음.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const slug = body && typeof body.slug === "string" ? body.slug : "";
  const vid = body && typeof body.vid === "string" ? body.vid : undefined;
  if (!slug) return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });

  const res = await addGood(slug, clientIp(req), vid); // added | already | notfound
  if (res === "notfound") return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, result: res });
}
