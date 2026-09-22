"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { cx } from "@/lib/cx";
import { sortTags, TAGS, TAG_TONE, tagById, type TagId } from "@/lib/tags";
import type { DirectoryCreator } from "@/lib/types";

export function CreatorCard({
  creator,
  index,
  activeTags,
  highlighted,
  onToggleFilter,
  onSaveTags,
  onResetTags,
  onRemove,
}: {
  creator: DirectoryCreator;
  index: number;
  activeTags: TagId[];
  highlighted: boolean;
  onToggleFilter: (tag: TagId) => void;
  onSaveTags: (id: string, tags: TagId[]) => void;
  onResetTags: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TagId[]>(creator.tags);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [tagError, setTagError] = useState("");
  const accent = tagById(creator.tags[0] ?? "other").accent;

  function startEdit() {
    setDraft(creator.tags);
    setTagError("");
    setEditing(true);
    setConfirmRemove(false);
  }

  function toggleDraft(tag: TagId) {
    setDraft((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : sortTags([...current, tag]),
    );
    setTagError("");
  }

  function save() {
    if (draft.length === 0) {
      setTagError("至少保留一个标签。");
      return;
    }
    onSaveTags(creator.id, draft);
    setEditing(false);
  }

  return (
    <article
      data-testid="creator-card"
      data-handle={creator.handle}
      data-tags={creator.tags.join(",")}
      className={cx(
        "relative flex h-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[#12141b]/90 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-white/18",
        highlighted && "ring-2 ring-lime",
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: accent }} />
      <div className="flex items-start gap-3">
        <Avatar name={creator.name} handle={creator.handle} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="truncate text-lg font-semibold tracking-tight">{creator.name}</h2>
            <span className="font-mono text-[11px] text-white/35 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <p className="truncate text-sm text-mist">@{creator.handle}</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-paper/78">{creator.bio}</p>

      {editing ? (
        <fieldset className="mt-4">
          <legend className="mb-2 text-xs tracking-wide text-mist">调整标签</legend>
          <div className="flex flex-wrap gap-1.5">
            {TAGS.map((tag) => {
              const on = draft.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleDraft(tag.id)}
                  className={cx(
                    "rounded-full border px-2.5 py-1 text-xs font-medium",
                    on ? TAG_TONE[tag.id].on : TAG_TONE[tag.id].idle,
                  )}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
          {tagError ? <p className="mt-2 text-xs text-[#ffb4a8]">{tagError}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={save}
              className="rounded-full bg-lime px-3 py-1 text-xs font-semibold text-[#17190c]"
            >
              完成
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-paper/80"
            >
              取消
            </button>
            {creator.source === "seed" && creator.overridden ? (
              <button
                type="button"
                onClick={() => {
                  onResetTags(creator.id);
                  setEditing(false);
                }}
                className="rounded-full px-3 py-1 text-xs text-mist hover:text-paper"
              >
                恢复默认
              </button>
            ) : null}
          </div>
        </fieldset>
      ) : (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {creator.tags.map((tagId) => {
            const tag = tagById(tagId);
            const active = activeTags.includes(tagId);
            return (
              <button
                key={tagId}
                type="button"
                onClick={() => onToggleFilter(tagId)}
                className={cx(
                  "rounded-full border px-2.5 py-1 text-xs font-medium",
                  active ? TAG_TONE[tagId].on : TAG_TONE[tagId].idle,
                )}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/8 pt-3">
        <a
          href={`https://x.com/${encodeURIComponent(creator.handle)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-lime hover:underline"
        >
          在 X 上查看
        </a>
        <span className="text-white/20">/</span>
        <button type="button" onClick={startEdit} className="text-sm text-paper/70 hover:text-paper">
          改标签
        </button>
        {creator.sample ? (
          <span className="ml-auto rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-white/50">
            样本
          </span>
        ) : null}
        {creator.source === "local" ? (
          <span className="ml-auto rounded-full border border-lime/30 bg-lime/10 px-2 py-0.5 text-[11px] text-lime">
            本地
          </span>
        ) : null}
        {creator.overridden ? (
          <span className="rounded-full border border-white/12 px-2 py-0.5 text-[11px] text-white/55">
            已调整
          </span>
        ) : null}
      </div>

      {creator.source === "local" ? (
        <div className="mt-2">
          {confirmRemove ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-mist">从这台浏览器的目录里移除？</span>
              <button type="button" onClick={() => onRemove(creator.id)} className="text-[#ffb4a8]">
                确认移除
              </button>
              <button type="button" onClick={() => setConfirmRemove(false)} className="text-mist">
                取消
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="text-xs text-white/40 hover:text-[#ffb4a8]"
            >
              移除
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}
