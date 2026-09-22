"use client";

import { useEffect, useState } from "react";
import { AvatarToken } from "@/components/avatar-token";
import { cx } from "@/lib/cx";
import { sortTags, TAGS, TAG_TONE, tagById, type TagId } from "@/lib/tags";
import type { DirectoryCreator } from "@/lib/types";

export function CreatorDetail({
  creator,
  onClose,
  onSaveTags,
  onResetTags,
  onRemove,
}: {
  creator: DirectoryCreator;
  onClose: () => void;
  onSaveTags: (id: string, tags: TagId[]) => void;
  onResetTags: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState<TagId[]>(creator.tags);
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(tag: TagId) {
    setDraft((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : sortTags([...current, tag]),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <button type="button" aria-label="关闭" className="absolute inset-0 bg-black/25" onClick={onClose} />
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-detail-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-[#ebebed] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.12)]"
      >
        <div className="card-dark rounded-none border-0 px-5 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border-[3px] border-white/90 shadow-md">
              <AvatarToken name={creator.name} handle={creator.handle} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="creator-detail-title" className="truncate text-xl font-semibold tracking-tight text-white">
                  {creator.name}
                </h2>
                <span
                  className={cx(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                    creator.sample ? "bg-white/10 text-white/65" : "bg-white/15 text-white",
                  )}
                >
                  {creator.sample ? "示例" : "真实账号"}
                </span>
                {creator.locale === "zh" ? (
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white">
                    中文
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-sm text-white/55">@{creator.handle}</p>
            </div>
            <button type="button" onClick={onClose} className="text-sm text-white/55 hover:text-white">
              关闭
            </button>
          </div>
        </div>

        <div className="px-5 py-5">
          <p className="text-sm leading-6 text-[#111]/80">{creator.bio}</p>

          {editing ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {TAGS.map((tag) => {
                const on = draft.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(tag.id)}
                    className={cx(
                      "rounded-full border px-2.5 py-1 text-xs",
                      on ? TAG_TONE[tag.id].on : "border-[#ebebed] text-[#111]/70",
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {creator.tags.map((tagId) => (
                <span
                  key={tagId}
                  className="rounded-full border border-[#ebebed] bg-[#fafafa] px-2.5 py-1 text-xs text-[#111]/70"
                >
                  {tagById(tagId).label}
                </span>
              ))}
              {creator.overridden ? <span className="text-xs text-[#8a8a8e]">已调整</span> : null}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href={`https://x.com/${encodeURIComponent(creator.handle)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-primary px-4 py-2 text-sm font-semibold"
            >
              在 X 上查看
            </a>
            {editing ? (
              <button
                type="button"
                onClick={() => {
                  if (draft.length === 0) return;
                  onSaveTags(creator.id, draft);
                  setEditing(false);
                }}
                className="pill-primary px-4 py-2 text-sm font-semibold"
              >
                完成
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setDraft(creator.tags);
                  setEditing(true);
                }}
                className="pill-ghost px-4 py-2 text-sm font-medium"
              >
                改标签
              </button>
            )}
            {creator.source === "seed" && creator.overridden ? (
              <button
                type="button"
                onClick={() => {
                  onResetTags(creator.id);
                  setEditing(false);
                }}
                className="rounded-full px-3 py-2 text-sm text-[#8a8a8e]"
              >
                恢复默认
              </button>
            ) : null}
            {creator.source === "local" ? (
              confirmRemove ? (
                <button type="button" onClick={() => onRemove(creator.id)} className="text-sm text-[#b42318]">
                  确认移除
                </button>
              ) : (
                <button type="button" onClick={() => setConfirmRemove(true)} className="text-sm text-[#8a8a8e]">
                  移除
                </button>
              )
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );
}
