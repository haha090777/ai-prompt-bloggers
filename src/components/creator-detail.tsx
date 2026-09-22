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
    <div className="fixed inset-0 z-50 flex items-end justify-end sm:items-stretch sm:p-3 sm:pl-0">
      <button type="button" aria-label="关闭" className="absolute inset-0 bg-black/20" onClick={onClose} />
      <article
        role="dialog"
        aria-modal="true"
        aria-labelledby="creator-detail-title"
        className="relative z-10 flex max-h-[78dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-[#ebebed] bg-white shadow-[0_16px_48px_rgba(17,17,17,0.14)] sm:h-auto sm:max-h-none sm:w-[400px] sm:self-stretch sm:rounded-[24px]"
      >
        <div className="flex items-start gap-3 border-b border-[#ebebed] px-4 py-4">
          <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[#f0f0f2] shadow-sm">
            <AvatarToken name={creator.name} handle={creator.handle} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 id="creator-detail-title" className="truncate text-lg font-semibold tracking-tight text-[#111]">
                {creator.name}
              </h2>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  creator.sample ? "bg-[#f4f4f5] text-[#8a8a8e]" : "bg-[#eef6e8] text-[#3d5c12]",
                )}
              >
                {creator.sample ? "示例" : "真实账号"}
              </span>
              {creator.locale === "zh" ? (
                <span className="rounded-full bg-[#f0f0f2] px-2 py-0.5 text-[11px] font-medium text-[#555]">
                  中文
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-sm text-[#8a8a8e]">@{creator.handle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-[#8a8a8e] hover:text-[#111]">
            关闭
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
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
