import { TAGS, type TagId } from "@/lib/tags";
import type { Creator } from "@/lib/types";

/** 自然语言检索的采纳阈值。低于分类打标，避免「有爆款」这类软查询全部落空。 */
export const MATCH_THRESHOLD = 0.62;

const TAG_WORDS: Array<{ pattern: RegExp; tags: TagId[] }> = [
  { pattern: /海报|平面|主视觉|poster/i, tags: ["poster"] },
  { pattern: /短视频|视频提示词|(?<!长)视频|运镜|motion/i, tags: ["video"] },
  { pattern: /长视频|长片|影视|电影|分镜/i, tags: ["long_video"] },
  { pattern: /ui|界面|交互|设计系统/i, tags: ["ui"] },
  { pattern: /代码|编程|开发|agent|cursor|claude/i, tags: ["code"] },
  { pattern: /其他|杂项/i, tags: ["other"] },
];

export type Matchable = Pick<Creator, "id" | "name" | "handle" | "bio" | "tags" | "locale" | "hot" | "sample">;

export function matchCreatorsLocally(
  creators: readonly Matchable[],
  query: string,
  selectedTags: readonly TagId[] = [],
): string[] {
  return creators.filter((creator) => matchesLocally(creator, query, selectedTags)).map((creator) => creator.id);
}

export function matchesLocally(creator: Matchable, query: string, selectedTags: readonly TagId[]): boolean {
  if (selectedTags.length > 0 && !creator.tags.some((tag) => selectedTags.includes(tag))) {
    return false;
  }

  const q = query.trim().toLowerCase();
  if (!q) return true;

  let constrained = false;
  let ok = true;

  if (/英文|english|海外/.test(q)) {
    constrained = true;
    ok &&= creator.locale === "en";
  }
  if (/中文|华语|国内/.test(q)) {
    constrained = true;
    ok &&= creator.locale === "zh";
  }
  if (/爆款|最热|热门|出圈|viral/.test(q)) {
    constrained = true;
    ok &&= creator.hot && !creator.sample;
  }
  if (/示例|虚构|占位/.test(q)) {
    constrained = true;
    ok &&= creator.sample;
  }
  if (/真实账号|真人|真实博主/.test(q)) {
    constrained = true;
    ok &&= !creator.sample;
  }

  const wanted = new Set<TagId>();
  for (const entry of TAG_WORDS) {
    if (entry.pattern.test(q)) entry.tags.forEach((tag) => wanted.add(tag));
  }
  if (wanted.size > 0) {
    constrained = true;
    ok &&= creator.tags.some((tag) => wanted.has(tag));
  }

  if (!ok) return false;
  if (constrained) return true;

  const haystack = `${creator.name}\n${creator.handle}\n${creator.bio}\n${creator.tags
    .map((tag) => TAGS.find((item) => item.id === tag)?.label ?? tag)
    .join(" ")}`.toLowerCase();
  return haystack.includes(q.replace(/^@/, ""));
}
