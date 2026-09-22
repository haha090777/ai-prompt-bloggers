import "server-only";

import { experimental_evaluate as evaluate } from "ai";
import {
  assertCompleteProbabilities,
  booleanQuestions,
  buildStateMessage,
  clampProbability,
  CONFIDENCE_THRESHOLD,
  noulQuestions,
  selectTags,
  type ClassificationAnswer,
} from "@/lib/classify";
import { TAGS, type TagId } from "@/lib/tags";

export type ClassifyProvider = "gateway" | "typesafe";

export type ClassifySuccess = {
  ok: true;
  provider: ClassifyProvider;
  model: string;
  threshold: number;
  suggestedTags: TagId[];
  answers: ClassificationAnswer[];
};

export type ClassifyFailure = {
  ok: false;
  fallback: boolean;
  code: "missing_api_key" | "upstream_error";
  message: string;
  provider: ClassifyProvider | null;
  model: string | null;
  threshold: number;
  suggestedTags: [];
  answers: ClassificationAnswer[];
};

export type ClassifyResult = ClassifySuccess | ClassifyFailure;

const MISSING_KEY_MESSAGE =
  "未配置 Jev 分类密钥。请设置 AI_GATEWAY_API_KEY（推荐，通过 Vercel AI Gateway 调用 typesafe-ai/jev）或 TYPESAFE_API_KEY（TypeSafe 直连）。目录和手动标签仍可使用。";

export function resolveProvider(): ClassifyProvider | null {
  if (process.env.AI_GATEWAY_API_KEY?.trim()) return "gateway";
  if (process.env.TYPESAFE_API_KEY?.trim()) return "typesafe";
  return null;
}

export function configuredModel(provider: ClassifyProvider | null): string | null {
  if (provider === "gateway") return process.env.AI_GATEWAY_MODEL?.trim() || "typesafe-ai/jev";
  if (provider === "typesafe") return process.env.TYPESAFE_MODEL?.trim() || "jev-latest";
  return null;
}

export async function classifyCreator(input: {
  bio: string;
  sampleText?: string;
}): Promise<ClassifyResult> {
  const provider = resolveProvider();
  const threshold = CONFIDENCE_THRESHOLD;
  if (!provider) {
    return {
      ok: false,
      fallback: true,
      code: "missing_api_key",
      message: MISSING_KEY_MESSAGE,
      provider: null,
      model: null,
      threshold,
      suggestedTags: [],
      answers: [],
    };
  }

  const message = buildStateMessage(input.bio, input.sampleText);
  try {
    const outcome =
      provider === "gateway"
        ? await classifyWithGateway(message)
        : await classifyWithTypeSafe(message);
    const selected = selectTags(outcome.probabilities, threshold);
    return {
      ok: true,
      provider,
      model: outcome.model,
      threshold,
      suggestedTags: selected.suggestedTags,
      answers: selected.answers,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "分类请求失败";
    return {
      ok: false,
      fallback: false,
      code: "upstream_error",
      message: `Jev 分类失败：${sanitize(detail)}`,
      provider,
      model: configuredModel(provider),
      threshold,
      suggestedTags: [],
      answers: [],
    };
  }
}

async function classifyWithGateway(message: string) {
  const model = configuredModel("gateway") ?? "typesafe-ai/jev";
  const result = await evaluate({
    model,
    state: { message },
    questions: booleanQuestions(),
    abortSignal: AbortSignal.timeout(20_000),
  });

  const probabilities: Record<string, number | null> = {};
  for (const tag of TAGS) {
    const answer = result.answers[tag.questionId];
    probabilities[tag.questionId] = clampProbability(
      answer && "probability" in answer ? answer.probability : null,
    );
  }

  return {
    model: result.response.modelId || model,
    probabilities: assertCompleteProbabilities(probabilities),
  };
}

async function classifyWithTypeSafe(message: string) {
  const model = configuredModel("typesafe") ?? "jev-latest";
  const baseUrl = (process.env.TYPESAFE_BASE_URL?.trim() || "https://api.typesafe.ai").replace(
    /\/$/,
    "",
  );
  const response = await fetch(`${baseUrl}/v1/systemone`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      state: { message },
      questions: noulQuestions(),
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`TypeSafe API 返回 ${response.status}${raw ? `：${raw.slice(0, 240)}` : ""}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("TypeSafe API 返回了无法解析的 JSON");
  }

  const answers = readAnswers(payload);
  const probabilities: Record<string, number | null> = {};
  for (const tag of TAGS) {
    const answer = answers?.[tag.questionId];
    const value =
      answer && typeof answer === "object"
        ? ("noul" in answer ? answer.noul : "probability" in answer ? answer.probability : null)
        : null;
    probabilities[tag.questionId] = clampProbability(value);
  }

  const reportedModel =
    payload && typeof payload === "object" && "model" in payload && typeof payload.model === "string"
      ? payload.model
      : model;

  return {
    model: reportedModel,
    probabilities: assertCompleteProbabilities(probabilities),
  };
}

function readAnswers(payload: unknown): Record<string, { noul?: unknown; probability?: unknown }> | null {
  if (!payload || typeof payload !== "object" || !("answers" in payload)) return null;
  const answers = payload.answers;
  if (!answers || typeof answers !== "object") return null;
  return answers as Record<string, { noul?: unknown; probability?: unknown }>;
}

function sanitize(text: string) {
  return text.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").replace(/\s+/g, " ").trim().slice(0, 300);
}
