"use client";

import { useEffect, useMemo, useState } from "react";
import { ClassifyDialog } from "@/components/classify-dialog";
import { CreatorCard } from "@/components/creator-card";
import { TagBar } from "@/components/tag-bar";
import { cx } from "@/lib/cx";
import { loadLibrary, saveLibrary } from "@/lib/storage";
import { sortTags, TAGS, type TagId } from "@/lib/tags";
import type { Creator, DirectoryCreator } from "@/lib/types";

type ClassifyStatus = {
  configured: boolean;
  provider: "gateway" | "typesafe" | null;
  model: string | null;
  threshold: number;
};

function sameTags(left: readonly TagId[], right: readonly TagId[]) {
  if (left.length !== right.length) return false;
  const a = sortTags(left);
  const b = sortTags(right);
  return a.every((tag, index) => tag === b[index]);
}

function matchesQuery(creator: Creator, query: string) {
  const needle = query.trim().toLowerCase().replace(/^@/, "");
  if (!needle) return true;
  return `${creator.name}\n${creator.handle}\n${creator.bio}`.toLowerCase().includes(needle);
}

export function Directory({ seed }: { seed: Creator[] }) {
  const [added, setAdded] = useState<Creator[]>([]);
  const [overrides, setOverrides] = useState<Record<string, TagId[]>>({});
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<TagId[]>([]);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [status, setStatus] = useState<ClassifyStatus | null>(null);

  useEffect(() => {
    const stored = loadLibrary();
    setAdded(stored.added);
    setOverrides(stored.overrides);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveLibrary({ added, overrides });
  }, [added, overrides, ready]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/classify")
      .then((response) => response.json())
      .then((data: ClassifyStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 2400);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

  const creators = useMemo<DirectoryCreator[]>(() => {
    const locals = added.map((creator) => ({ ...creator, overridden: false }));
    const seeded = seed.map((creator) => {
      const tags = overrides[creator.id];
      return tags ? { ...creator, tags, overridden: true } : { ...creator, overridden: false };
    });
    return [...locals, ...seeded];
  }, [added, overrides, seed]);

  const searched = useMemo(
    () => creators.filter((creator) => matchesQuery(creator, query)),
    [creators, query],
  );

  const counts = useMemo(() => {
    const next = Object.fromEntries(TAGS.map((tag) => [tag.id, 0])) as Record<TagId, number>;
    for (const creator of searched) {
      for (const tag of creator.tags) next[tag] += 1;
    }
    return next;
  }, [searched]);

  const filtered = useMemo(() => {
    if (selected.length === 0) return searched;
    return searched.filter((creator) => creator.tags.some((tag) => selected.includes(tag)));
  }, [searched, selected]);

  function toggleTag(tag: TagId) {
    setSelected((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : sortTags([...current, tag]),
    );
  }

  function saveTags(id: string, tags: TagId[]) {
    const next = sortTags(tags);
    if (next.length === 0) return;
    if (added.some((creator) => creator.id === id)) {
      setAdded((current) => current.map((creator) => (creator.id === id ? { ...creator, tags: next } : creator)));
      return;
    }
    const original = seed.find((creator) => creator.id === id);
    if (!original) return;
    setOverrides((current) => {
      const copy = { ...current };
      if (sameTags(original.tags, next)) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  function resetTags(id: string) {
    setOverrides((current) => {
      const copy = { ...current };
      delete copy[id];
      return copy;
    });
  }

  function removeCreator(id: string) {
    setAdded((current) => current.filter((creator) => creator.id !== id));
  }

  function addCreator(input: { name: string; handle: string; bio: string; tags: TagId[] }) {
    const creator: Creator = {
      id: `local-${input.handle.toLowerCase()}`,
      name: input.name,
      handle: input.handle,
      bio: input.bio,
      tags: sortTags(input.tags),
      sample: false,
      source: "local",
    };
    setAdded((current) => [creator, ...current.filter((item) => item.id !== creator.id)]);
    setSelected([]);
    setQuery("");
    setHighlightId(creator.id);
    setDialogOpen(false);
  }

  const filteredOut = filtered.length === 0;
  const statusLabel = !status
    ? "正在检查分类服务"
    : status.provider === "gateway"
      ? "Jev · AI Gateway"
      : status.provider === "typesafe"
        ? "Jev · TypeSafe"
        : "未配置密钥 · 可手动打标";

  return (
    <div className="relative mx-auto min-h-screen max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 bg-[#07080c]/78 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-auto flex items-center gap-3">
            <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden className="shrink-0">
              <rect width="32" height="32" rx="9" fill="#d6ff4a" />
              <path
                fill="#14160c"
                d="M16 6.2 18.3 13.7 25.8 16 18.3 18.3 16 25.8 13.7 18.3 6.2 16 13.7 13.7Z"
              />
            </svg>
            <div>
              <p className="font-display text-[11px] tracking-[0.22em] text-lime">PROMPT ATLAS</p>
              <p className="text-sm font-semibold leading-5">提示词星图</p>
            </div>
          </div>
          <p
            data-testid="jev-status"
            className={cx(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
              status?.configured
                ? "border-lime/30 bg-lime/10 text-lime"
                : "border-white/12 bg-white/5 text-mist",
            )}
          >
            <span className={cx("h-1.5 w-1.5 rounded-full", status?.configured ? "bg-lime" : "bg-white/35")} />
            {statusLabel}
          </p>
          <button
            type="button"
            data-testid="open-classify"
            onClick={() => setDialogOpen(true)}
            className="rounded-full bg-lime px-3.5 py-1.5 text-sm font-semibold text-[#17190c]"
          >
            收录新博主
          </button>
        </div>
        <div className="mt-3">
          <TagBar selected={selected} counts={counts} onToggle={toggleTag} onClear={() => setSelected([])} />
          <p className="mt-2 text-xs text-mist">多选时显示包含任一标签的博主。点「全部」可清除筛选。</p>
        </div>
      </header>

      <section className="pt-10 sm:pt-14">
        <p className="font-display text-xs tracking-[0.28em] text-lime">AI PROMPT INDEX</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-balance sm:text-6xl sm:leading-[1.05]">
          AI 提示词博主合集
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-paper/72 sm:text-lg">
          在 X 上按作品找人。海报、短视频、界面、长片和代码都可以点选；一位作者带多个标签时，会出现在每一个相关分类里。
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative block w-full sm:max-w-md">
            <span className="sr-only">搜索</span>
            <input
              data-testid="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索名字、账号或简介"
              className="w-full rounded-full border border-white/12 bg-white/5 px-4 py-2.5 text-sm outline-none placeholder:text-white/35 focus:border-lime/70"
            />
          </label>
          <p data-testid="result-count" aria-live="polite" className="text-sm text-mist">
            {filteredOut
              ? "没有符合条件的博主"
              : selected.length === 0 && !query.trim()
                ? `全部 ${creators.length} 位`
                : `显示 ${filtered.length} / ${creators.length} 位`}
          </p>
        </div>
      </section>

      {filteredOut ? (
        <div
          data-testid="empty-state"
          className="mt-10 rounded-[28px] border border-dashed border-white/15 bg-white/3 px-6 py-16 text-center"
        >
          <p className="font-display text-xs tracking-[0.22em] text-lime">EMPTY</p>
          <h2 className="mt-3 text-2xl font-semibold">没有符合条件的博主</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mist">
            这组标签或搜索词没有命中目录。清除筛选后可以看回全部样本，也可以收录一位新博主。
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              data-testid="clear-filters"
              onClick={() => {
                setSelected([]);
                setQuery("");
              }}
              className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-[#17190c]"
            >
              查看全部
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="rounded-full border border-white/15 px-4 py-2 text-sm"
            >
              收录新博主
            </button>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((creator, index) => (
            <li key={creator.id}>
              <CreatorCard
                creator={creator}
                index={index}
                activeTags={selected}
                highlighted={highlightId === creator.id}
                onToggleFilter={toggleTag}
                onSaveTags={saveTags}
                onResetTags={resetTags}
                onRemove={removeCreator}
              />
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-14 border-t border-white/8 pt-6 text-sm leading-6 text-mist">
        <p>
          目录里的账号是占位样本，不代表真实的 X 用户。链接按用户名打开 x.com。分类调用 TypeSafe Jev：简介作为
          state，每个标签是一道是/否问题，概率达到 70% 才自动打标。没有密钥时，筛选、样本和手动标签都照常可用。
        </p>
      </footer>

      {dialogOpen ? (
        <ClassifyDialog
          existingHandles={creators.map((creator) => creator.handle)}
          onClose={() => setDialogOpen(false)}
          onCreate={addCreator}
        />
      ) : null}
    </div>
  );
}
