import "server-only";

import { experimental_evaluate as evaluate } from "ai";
import { MATCH_THRESHOLD, matchCreatorsLocally, type Matchable } from "@/lib/match";
import { configuredModel, resolveProvider, type ClassifyProvider } from "@/lib/jev";
import { tagById, type TagId } from "@/lib/tags";

export type SearchResult = {
  ok: boolean;
  fallback: boolean;
  provider: ClassifyProvider | null;
  model: string | null;
  threshold: number;
  matchedIds: string[];
  message?: string;
};

export async function searchCreators(input: {
  query: string;
  selectedTags: TagId[];
  creators: Matchable[];
}): Promise<SearchResult> {
  const localIds = matchCreatorsLocally(input.creators, input.query, input.selectedTags);
  const provider = resolveProvider();
  const threshold = MATCH_THRESHOLD;

  if (!provider) {
    return {
      ok: true,
      fallback: true,
      provider: null,
      model: null,
      threshold,
      matchedIds: localIds,
      message: "未配置 Jev。已用本地关键词和标签完成筛选。",
    };
  }

  try {
    const matchedIds =
      provider === "gateway"
        ? await matchWithGateway(input, threshold)
        : await matchWithTypeSafe(input, threshold);
    return {
      ok: true,
      fallback: false,
      provider,
      model: configuredModel(provider),
      threshold,
      matchedIds,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "检索失败";
    return {
      ok: true,
      fallback: true,
      provider,
      model: configuredModel(provider),
      threshold,
      matchedIds: localIds,
      message: `Jev 检索失败，已改用本地筛选：${sanitize(detail)}`,
    };
  }
}

async function matchWithGateway(
  input: { query: string; selectedTags: TagId[]; creators: Matchable[] },
  threshold: number,
) {
  const model = configuredModel("gateway") ?? "typesafe-ai/jev";
  const result = await evaluate({
    model,
    state: buildState(input),
    questions: booleanQuestions(input.creators, input.query),
    abortSignal: AbortSignal.timeout(20_000),
  });
  return pickIds(input.creators, result.answers, threshold);
}

async function matchWithTypeSafe(
  input: { query: string; selectedTags: TagId[]; creators: Matchable[] },
  threshold: number,
) {
  const model = configuredModel("typesafe") ?? "jev-latest";
  const baseUrl = (process.env.TYPESAFE_BASE_URL?.trim() || "https://api.typesafe.ai").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/v1/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      state: buildState(input),
      questions: noulQuestions(input.creators, input.query),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`TypeSafe API 返回 ${response.status}${raw ? `：${raw.slice(0, 180)}` : ""}`);
  }
  const payload = JSON.parse(raw) as { answers?: Record<string, { noul?: unknown; probability?: unknown }> };
  return pickIds(input.creators, payload.answers ?? {}, threshold);
}

function buildState(input: { query: string; selectedTags: TagId[]; creators: Matchable[] }) {
  return {
    query: input.query.trim(),
    selectedTags: input.selectedTags.map((tag) => tagById(tag).label),
    creators: input.creators.map((creator) => ({
      id: creator.id,
      name: creator.name,
      handle: creator.handle,
      bio: creator.bio.slice(0, 280),
      tags: creator.tags.map((tag) => tagById(tag).label),
      locale: creator.locale,
      hot: creator.hot,
      sample: creator.sample,
    })),
  };
}

function questionText(creator: Matchable, query: string, index: number) {
  return `用户查询是「${query.trim()}」。state.creators[${index}]（${creator.name}，@${creator.handle}）是否应该出现在结果里？locale 为 en 表示英文博主，zh 表示中文博主；hot 表示受众较广、近期较活跃；sample 表示虚构示例。若 state.selectedTags 非空，还需要符合其中任一标签。`;
}

function booleanQuestions(creators: Matchable[], query: string) {
  return Object.fromEntries(
    creators.map((creator, index) => [
      `m${index}`,
      {
        type: "boolean" as const,
        instructions: questionText(creator, query, index),
        criteria: {
          true: "这位博主明显符合查询，并且不与已选标签冲突。",
          false: "不符合查询，或只是勉强沾边。",
        },
      },
    ]),
  );
}

function noulQuestions(creators: Matchable[], query: string) {
  return Object.fromEntries(
    creators.map((creator, index) => [
      `m${index}`,
      {
        type: "noul" as const,
        instructions: questionText(creator, query, index),
        criteria: {
          true: "这位博主明显符合查询，并且不与已选标签冲突。",
          false: "不符合查询，或只是勉强沾边。",
        },
      },
    ]),
  );
}

function pickIds(
  creators: Matchable[],
  answers: Record<string, { probability?: unknown; noul?: unknown }>,
  threshold: number,
) {
  return creators.flatMap((creator, index) => {
    const answer = answers[`m${index}`];
    const raw = answer?.probability ?? answer?.noul;
    const probability = typeof raw === "number" ? raw : Number.NaN;
    return Number.isFinite(probability) && probability >= threshold ? [creator.id] : [];
  });
}

function sanitize(text: string) {
  return text.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/\s+/g, " ").trim().slice(0, 240);
}
