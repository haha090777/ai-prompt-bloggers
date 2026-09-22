import { CONFIDENCE_THRESHOLD } from "@/lib/classify";
import { classifyCreator, configuredModel, resolveProvider } from "@/lib/jev";

export const dynamic = "force-dynamic";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function GET() {
  const provider = resolveProvider();
  return json({
    configured: provider !== null,
    provider,
    model: configuredModel(provider),
    threshold: CONFIDENCE_THRESHOLD,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: "invalid_input", message: "请求体需要是 JSON。" }, 400);
  }

  if (!body || typeof body !== "object") {
    return json({ ok: false, code: "invalid_input", message: "请求体格式不正确。" }, 400);
  }

  const { bio, sampleText } = body as { bio?: unknown; sampleText?: unknown };
  if (typeof bio !== "string" || bio.trim().length === 0) {
    return json({ ok: false, code: "invalid_input", message: "请提供博主简介 bio。" }, 400);
  }
  if (bio.trim().length > 2000) {
    return json({ ok: false, code: "invalid_input", message: "简介请控制在 2000 字以内。" }, 400);
  }
  if (sampleText != null && typeof sampleText !== "string") {
    return json({ ok: false, code: "invalid_input", message: "sampleText 需要是字符串。" }, 400);
  }
  if (typeof sampleText === "string" && sampleText.trim().length > 4000) {
    return json({ ok: false, code: "invalid_input", message: "示例文本请控制在 4000 字以内。" }, 400);
  }

  const result = await classifyCreator({
    bio,
    sampleText: typeof sampleText === "string" ? sampleText : undefined,
  });

  const status = result.ok ? 200 : result.code === "missing_api_key" ? 200 : 502;
  return json(result, status);
}
