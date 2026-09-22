import { TAGS, type TagId } from "@/lib/tags";

/** 是/否概率达到该阈值才自动打上标签。noul 的值本身就是 P(true)。 */
export const CONFIDENCE_THRESHOLD = 0.7;

export type ClassificationAnswer = {
  questionId: string;
  tag: TagId;
  label: string;
  probability: number;
  matched: boolean;
};

export type NoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

export type BooleanQuestion = {
  type: "boolean";
  instructions: string;
  criteria: { true: string; false: string };
};

export function buildStateMessage(bio: string, sampleText?: string): string {
  const parts = [`博主简介：${bio.trim()}`];
  const sample = sampleText?.trim();
  if (sample) {
    parts.push(`示例内容：${sample}`);
  }
  return parts.join("\n\n");
}

export function noulQuestions(): Record<string, NoulQuestion> {
  return Object.fromEntries(
    TAGS.map((tag) => [
      tag.questionId,
      {
        type: "noul" as const,
        instructions: tag.instruction,
        criteria: { true: tag.criteria.true, false: tag.criteria.false },
      },
    ]),
  );
}

export function booleanQuestions(): Record<string, BooleanQuestion> {
  return Object.fromEntries(
    TAGS.map((tag) => [
      tag.questionId,
      {
        type: "boolean" as const,
        instructions: tag.instruction,
        criteria: { true: tag.criteria.true, false: tag.criteria.false },
      },
    ]),
  );
}

export function clampProbability(value: unknown): number | null {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(number)) return null;
  return Math.min(1, Math.max(0, number));
}

export function selectTags(
  probabilities: Record<string, number | null>,
  threshold = CONFIDENCE_THRESHOLD,
): { suggestedTags: TagId[]; answers: ClassificationAnswer[] } {
  const answers = TAGS.map((tag) => {
    const probability = probabilities[tag.questionId];
    const value = probability ?? 0;
    return {
      questionId: tag.questionId,
      tag: tag.id,
      label: tag.label,
      probability: value,
      matched: probability !== null && probability >= threshold,
    };
  });

  return {
    suggestedTags: answers.filter((answer) => answer.matched).map((answer) => answer.tag),
    answers,
  };
}

export function assertCompleteProbabilities(
  probabilities: Record<string, number | null>,
): Record<string, number | null> {
  const missing = TAGS.filter((tag) => probabilities[tag.questionId] === null).map(
    (tag) => tag.questionId,
  );
  if (missing.length > 0) {
    throw new Error(`Jev 响应缺少问题答案：${missing.join("、")}`);
  }
  return probabilities;
}
