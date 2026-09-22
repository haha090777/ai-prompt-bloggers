"use client";

import { useEffect, useId, useState } from "react";
import { CONFIDENCE_THRESHOLD } from "@/lib/classify";
import { cx } from "@/lib/cx";
import { sortTags, TAGS, TAG_TONE, type TagId } from "@/lib/tags";

const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

type Answer = {
  questionId: string;
  tag: TagId;
  label: string;
  probability: number;
  matched: boolean;
};

type Notice = { tone: "info" | "error"; text: string };

const PRESETS = [
  {
    label: "海报示例",
    name: "纸上光",
    handle: "paperlight",
    bio: "专注电商海报和展览主视觉，每天一条可直接复用的平面 AI 提示词。",
    sampleText: "高级感护肤海报，大面积留白，衬线中文标题，柔和侧光，印刷颗粒。",
  },
  {
    label: "代码示例",
    name: "指令栈",
    handle: "promptstack",
    bio: "分享编程提示词：让模型改 TypeScript、补测试、解释报错，并整理编辑器里的开发工作流。",
    sampleText: "把这个 React 组件拆成可测试的纯函数，补上边界用例，不要改对外接口。",
  },
  {
    label: "跨界示例",
    name: "短片界面",
    handle: "clipinterface",
    bio: "同时发短视频运镜提示词和 App 界面提示词，封面和产品页经常成套出现。",
    sampleText: "手持跟拍夜市 6 秒，霓虹反射。另附一张同色系的移动端点餐界面。",
  },
];

export function ClassifyDialog({
  existingHandles,
  onClose,
  onCreate,
}: {
  existingHandles: string[];
  onClose: () => void;
  onCreate: (creator: { name: string; handle: string; bio: string; tags: TagId[] }) => void;
}) {
  const titleId = useId();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [sampleText, setSampleText] = useState("");
  const [selected, setSelected] = useState<TagId[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  function applyPreset(preset: (typeof PRESETS)[number]) {
    setName(preset.name);
    setHandle(preset.handle);
    setBio(preset.bio);
    setSampleText(preset.sampleText);
    setFormError("");
  }

  function toggleTag(tag: TagId) {
    setSelected((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : sortTags([...current, tag]),
    );
    setFormError("");
  }

  async function classify() {
    if (!bio.trim()) {
      setFormError("先写简介，Jev 才能判断。");
      return;
    }
    setPending(true);
    setNotice(null);
    setFormError("");
    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim(),
          sampleText: sampleText.trim() || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        fallback?: boolean;
        message?: string;
        model?: string | null;
        suggestedTags?: TagId[];
        answers?: Answer[];
      };
      if (!response.ok && !data.message) {
        setNotice({ tone: "error", text: "分类请求失败，请稍后再试。" });
        return;
      }
      setAnswers(Array.isArray(data.answers) ? data.answers : []);
      setModel(data.model ?? null);
      if (data.ok && data.suggestedTags) {
        setSelected(sortTags(data.suggestedTags));
        setNotice({
          tone: "info",
          text:
            data.suggestedTags.length > 0
              ? "已按 Jev 建议勾选达到 70% 的标签，你仍可以改。"
              : "没有标签达到 70%。可以手动选择后再加入目录。",
        });
        return;
      }
      setNotice({
        tone: data.fallback ? "info" : "error",
        text: data.message ?? "分类没有返回结果。",
      });
    } catch {
      setNotice({ tone: "error", text: "网络异常，分类没有完成。仍可以手动选择标签。" });
    } finally {
      setPending(false);
    }
  }

  function submit() {
    const cleanName = name.trim();
    const cleanHandle = handle.trim().replace(/^@/, "");
    const cleanBio = bio.trim();
    if (!cleanName) {
      setFormError("请填写显示名。");
      return;
    }
    if (!HANDLE_PATTERN.test(cleanHandle)) {
      setFormError("用户名需要是 1–15 位字母、数字或下划线。");
      return;
    }
    if (existingHandles.some((item) => item.toLowerCase() === cleanHandle.toLowerCase())) {
      setFormError("这个用户名已经在目录里。");
      return;
    }
    if (!cleanBio) {
      setFormError("请填写简介。");
      return;
    }
    if (selected.length === 0) {
      setFormError("请至少选择一个标签。");
      return;
    }
    onCreate({ name: cleanName, handle: cleanHandle, bio: cleanBio, tags: selected });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-[28px] border border-white/12 bg-[#10131a] p-5 shadow-2xl sm:rounded-[28px] sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs tracking-[0.22em] text-lime">JEV</p>
            <h2 id={titleId} className="mt-1 text-2xl font-semibold">
              收录新博主
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-mist">
              贴上简介，Jev 会用是/否问题给出每个分类的概率。达到 {Math.round(CONFIDENCE_THRESHOLD * 100)}%
              的标签会自动勾选，也可以全部手动改。结果只保存在这台浏览器。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 px-3 py-1 text-sm text-paper/80"
          >
            关闭
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.handle}
              type="button"
              onClick={() => applyPreset(preset)}
              className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-xs text-paper/80 hover:bg-white/10"
            >
              填入{preset.label}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-mist">显示名</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如 林纸间"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none placeholder:text-white/28 focus:border-lime/70"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-mist">X 用户名</span>
            <div className="flex items-center rounded-2xl border border-white/10 bg-white/5 focus-within:border-lime/70">
              <span className="pl-3 text-mist">@</span>
              <input
                value={handle}
                onChange={(event) => setHandle(event.target.value.replace(/^@/, ""))}
                placeholder="handle"
                className="w-full bg-transparent px-2 py-2.5 outline-none placeholder:text-white/28"
              />
            </div>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1.5 block text-mist">简介</span>
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={3}
              placeholder="这位博主主要分享什么提示词？"
              className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none placeholder:text-white/28 focus:border-lime/70"
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1.5 block text-mist">示例内容（可选）</span>
            <textarea
              value={sampleText}
              onChange={(event) => setSampleText(event.target.value)}
              rows={3}
              placeholder="贴一条代表性的提示词或帖子摘要，分类会更稳。"
              className="w-full resize-y rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 outline-none placeholder:text-white/28 focus:border-lime/70"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="run-classify"
            onClick={classify}
            disabled={pending}
            className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-[#17190c] disabled:opacity-60"
          >
            {pending ? "正在询问 Jev…" : "用 Jev 分类"}
          </button>
          {model ? <span className="text-xs text-mist">模型 {model}</span> : null}
        </div>

        {notice ? (
          <p
            data-testid="classify-notice"
            className={cx(
              "mt-4 rounded-2xl border px-3 py-2 text-sm leading-6",
              notice.tone === "info"
                ? "border-lime/30 bg-lime/8 text-paper"
                : "border-[#ff8d70]/40 bg-[#ff8d70]/10 text-[#ffd0c4]",
            )}
          >
            {notice.text}
          </p>
        ) : null}

        {answers.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {answers.map((answer) => (
              <li key={answer.questionId}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span>{answer.label}</span>
                  <span className={cx("tabular-nums", answer.matched ? "text-lime" : "text-mist")}>
                    {Math.round(answer.probability * 100)}%
                    {answer.matched ? " · 采用" : ""}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={cx("h-full rounded-full", answer.matched ? "bg-lime" : "bg-white/35")}
                    style={{ width: `${Math.round(answer.probability * 100)}%` }}
                  />
                  <span
                    className="absolute top-0 h-full w-px bg-white/50"
                    style={{ left: `${CONFIDENCE_THRESHOLD * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <fieldset className="mt-5">
          <legend className="text-sm text-paper">标签（可手动调整）</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const on = selected.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTag(tag.id)}
                  className={cx(
                    "rounded-full border px-3 py-1.5 text-sm",
                    on ? TAG_TONE[tag.id].on : TAG_TONE[tag.id].idle,
                  )}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {formError ? <p className="mt-3 text-sm text-[#ffb4a8]">{formError}</p> : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="add-creator"
            onClick={submit}
            className="rounded-full bg-paper px-4 py-2 text-sm font-semibold text-[#17190c]"
          >
            加入目录
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/12 px-4 py-2 text-sm text-paper/80"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
