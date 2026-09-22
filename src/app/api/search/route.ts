import { isTagId, type TagId } from "@/lib/tags";
import type { Matchable } from "@/lib/match";
import { searchCreators } from "@/lib/search-jev";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, message: "请求体需要是 JSON。" }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ ok: false, message: "请求体格式不正确。" }, 400);
  }

  const { query, selectedTags, creators } = body as {
    query?: unknown;
    selectedTags?: unknown;
    creators?: unknown;
  };

  if (typeof query !== "string" || query.trim().length === 0) {
    return json({ ok: false, message: "请提供查询 query。" }, 400);
  }
  if (query.trim().length > 200) {
    return json({ ok: false, message: "查询请控制在 200 字以内。" }, 400);
  }
  if (!Array.isArray(creators) || creators.length === 0 || creators.length > 40) {
    return json({ ok: false, message: "需要 1 到 40 位博主。" }, 400);
  }

  const tags = Array.isArray(selectedTags)
    ? selectedTags.filter((tag): tag is TagId => typeof tag === "string" && isTagId(tag))
    : [];

  const profiles: Matchable[] = [];
  for (const item of creators) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string" || typeof record.handle !== "string") {
      continue;
    }
    if (typeof record.bio !== "string" || !Array.isArray(record.tags)) continue;
    const parsedTags = record.tags.filter((tag): tag is TagId => typeof tag === "string" && isTagId(tag));
    profiles.push({
      id: record.id,
      name: record.name.slice(0, 40),
      handle: record.handle.slice(0, 15),
      bio: record.bio.slice(0, 500),
      tags: parsedTags,
      locale: record.locale === "zh" ? "zh" : "en",
      hot: record.hot === true,
      sample: record.sample === true,
    });
  }

  if (profiles.length === 0) {
    return json({ ok: false, message: "没有可检索的博主。" }, 400);
  }

  const result = await searchCreators({
    query,
    selectedTags: tags,
    creators: profiles,
  });
  return json(result);
}
