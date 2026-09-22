"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AvatarToken } from "@/components/avatar-token";
import { ClassifyDialog } from "@/components/classify-dialog";
import { CreatorDetail } from "@/components/creator-detail";
import { cx } from "@/lib/cx";
import { matchCreatorsLocally } from "@/lib/match";
import { layoutFloat, layoutPile } from "@/lib/pile";
import { loadLibrary, saveLibrary } from "@/lib/storage";
import { isTagId, sortTags, TAGS, type TagId } from "@/lib/tags";
import type { Creator, DirectoryCreator } from "@/lib/types";

const EXAMPLES = ["有爆款", "英文博主", "中文博主", "今天最热", "海报提示词", "UI 设计", "代码提示词"];

type SearchPhase = "idle" | "local" | "jev";

function sameTags(left: readonly TagId[], right: readonly TagId[]) {
  if (left.length !== right.length) return false;
  const a = sortTags(left);
  const b = sortTags(right);
  return a.every((tag, index) => tag === b[index]);
}

export function Directory({ seed }: { seed: Creator[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const [added, setAdded] = useState<Creator[]>([]);
  const [overrides, setOverrides] = useState<Record<string, TagId[]>>({});
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<TagId[]>([]);
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [view, setView] = useState<"pile" | "list">("pile");
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [mobile, setMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<SearchPhase>("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const stored = loadLibrary();
    setAdded(stored.added);
    setOverrides(stored.overrides);
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get("q") ?? "";
    const initialTags = (params.get("tags") ?? "")
      .split(",")
      .filter((tag): tag is TagId => isTagId(tag));
    if (initialQuery) setQuery(initialQuery);
    if (initialTags.length) setSelected(initialTags);
    setReady(true);
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveLibrary({ added, overrides });
  }, [added, overrides, ready]);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (selected.length) params.set("tags", selected.join(","));
    const next = params.size ? `/?${params.toString()}` : "/";
    window.history.replaceState(null, "", next);
  }, [query, selected, urlReady]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => {
      setSize({ width: node.clientWidth, height: node.clientHeight });
      setMobile(window.matchMedia("(max-width: 720px)").matches);
      setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (query.trim()) return;
    const timer = window.setInterval(() => setPlaceholderIndex((index) => index + 1), 2600);
    return () => window.clearInterval(timer);
  }, [query]);

  const creators = useMemo<DirectoryCreator[]>(() => {
    const locals = added.map((creator) => ({ ...creator, overridden: false }));
    const seeded = seed.map((creator) => {
      const tags = overrides[creator.id];
      return tags ? { ...creator, tags, overridden: true } : { ...creator, overridden: false };
    });
    return [...locals, ...seeded];
  }, [added, overrides, seed]);

  const filtering = query.trim().length > 0 || selected.length > 0;

  useEffect(() => {
    const localIds = filtering ? matchCreatorsLocally(creators, query, selected) : [];
    setMatchedIds(localIds);
    if (!query.trim()) {
      setPhase(selected.length ? "local" : "idle");
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const timer = window.setTimeout(() => {
      setPhase("local");
      fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          selectedTags: selected,
          creators: creators.map((creator) => ({
            id: creator.id,
            name: creator.name,
            handle: creator.handle,
            bio: creator.bio,
            tags: creator.tags,
            locale: creator.locale,
            hot: creator.hot,
            sample: creator.sample,
          })),
        }),
      })
        .then((response) => response.json())
        .then((data: { ok?: boolean; fallback?: boolean; matchedIds?: string[] }) => {
          if (requestRef.current !== requestId) return;
          if (data.ok && data.fallback === false && Array.isArray(data.matchedIds)) {
            setMatchedIds(data.matchedIds);
            setPhase("jev");
          }
        })
        .catch(() => {
          if (requestRef.current === requestId) setPhase("local");
        });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [creators, filtering, query, selected]);

  const liftedIds = useMemo(
    () => creators.filter((creator) => matchedIds.includes(creator.id)).map((creator) => creator.id),
    [creators, matchedIds],
  );

  const pile = useMemo(
    () => layoutPile(creators.map((creator) => creator.id), size.width, size.height, mobile),
    [creators, mobile, size.height, size.width],
  );
  const floated = useMemo(
    () => (filtering ? layoutFloat(liftedIds, size.width, size.height, mobile) : new Map()),
    [filtering, liftedIds, mobile, size.height, size.width],
  );

  const active = creators.find((creator) => creator.id === activeId) ?? null;

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
    setActiveId(null);
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
      locale: /[\u4e00-\u9fff]/.test(`${input.name}${input.bio}`) ? "zh" : "en",
      hot: false,
    };
    setAdded((current) => [creator, ...current.filter((item) => item.id !== creator.id)]);
    setQuery("");
    setSelected([]);
    setView("pile");
    setActiveId(creator.id);
    setDialogOpen(false);
  }

  const statusText = !filtering
    ? `${creators.length} 位博主堆在下面`
    : liftedIds.length === 0
      ? "没有对上的博主，都还在堆里"
      : phase === "jev"
        ? `Jev 挑出 ${liftedIds.length} 位`
        : `浮上 ${liftedIds.length} 位`;

  return (
    <div className={cx("relative bg-[#f3f4f6] text-[#1c1c1e]", view === "pile" ? "h-dvh overflow-hidden" : "min-h-dvh")}>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-4 sm:px-6">
        <div className="pointer-events-auto">
          <p className="font-display text-[11px] tracking-[0.18em] text-black/35">PROMPT ATLAS</p>
          <p className="text-sm font-semibold">提示词星图</p>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => setView((current) => (current === "pile" ? "list" : "pile"))}
            className="rounded-full bg-white px-3 py-1.5 text-sm shadow-sm"
          >
            {view === "pile" ? "列表视图" : "回到堆里"}
          </button>
          <button
            type="button"
            data-testid="open-classify"
            onClick={() => setDialogOpen(true)}
            className="rounded-full bg-[#1c1c1e] px-3 py-1.5 text-sm text-white"
          >
            收录
          </button>
        </div>
      </header>

      <div
        className={cx(
          "z-30 mx-auto w-[min(34rem,calc(100%-2rem))]",
          view === "pile" ? "absolute left-1/2 top-[15%] -translate-x-1/2" : "relative px-0 pt-24",
        )}
      >
        <label className="relative block">
          <span className="sr-only">搜索博主</span>
          <input
            data-testid="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={EXAMPLES[placeholderIndex % EXAMPLES.length]}
            className="w-full rounded-2xl border border-black/8 bg-white px-5 py-3.5 pr-12 text-center text-base shadow-[0_10px_40px_rgba(20,20,20,0.06)] outline-none placeholder:text-black/28 focus:border-black/20"
          />
          {query ? (
            <button
              type="button"
              aria-label="清除搜索"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-black/40 hover:bg-black/5"
            >
              ×
            </button>
          ) : null}
        </label>

        <div className="tag-scroll mt-3 flex justify-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            data-testid="tag-all"
            aria-pressed={selected.length === 0 && !/中文|华语|国内/.test(query)}
            onClick={() => {
              setSelected([]);
              if (/中文|华语|国内/.test(query)) setQuery("");
            }}
            className={cx(
              "shrink-0 rounded-full px-3 py-1 text-sm",
              selected.length === 0 && !/中文|华语|国内/.test(query)
                ? "bg-[#1c1c1e] text-white"
                : "bg-white text-black/70 shadow-sm",
            )}
          >
            全部
          </button>
          <button
            type="button"
            data-testid="chip-zh"
            aria-pressed={/中文|华语|国内/.test(query)}
            onClick={() => setQuery((current) => (/中文|华语|国内/.test(current) ? "" : "中文博主"))}
            className={cx(
              "shrink-0 rounded-full px-3 py-1 text-sm",
              /中文|华语|国内/.test(query) ? "bg-[#1c1c1e] text-white" : "bg-white text-black/70 shadow-sm",
            )}
          >
            中文
          </button>
          {TAGS.map((tag) => {
            const on = selected.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                data-testid={`tag-${tag.id}`}
                aria-pressed={on}
                onClick={() => toggleTag(tag.id)}
                className={cx(
                  "shrink-0 rounded-full px-3 py-1 text-sm",
                  on ? "bg-[#1c1c1e] text-white" : "bg-white text-black/70 shadow-sm",
                )}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
        <p data-testid="result-count" className="mt-2 text-center text-xs text-black/40">
          {statusText}
          {filtering ? " · 点头像看简介" : " · 输入或点标签，对上的人会浮上来"}
        </p>
      </div>

      {view === "pile" ? (
        <div ref={stageRef} className="absolute inset-0 z-10" data-testid="pile-stage">
          {size.width > 0
            ? creators.map((creator) => {
                const lifted = filtering && liftedIds.includes(creator.id);
                const pose = (lifted ? floated.get(creator.id) : pile.get(creator.id)) ?? pile.get(creator.id);
                if (!pose) return null;
                return (
                  <button
                    key={creator.id}
                    type="button"
                    data-testid="avatar-token"
                    data-handle={creator.handle}
                    data-lifted={lifted ? "true" : "false"}
                    aria-label={`${creator.name} @${creator.handle}`}
                    onClick={() => setActiveId(creator.id)}
                    className={cx(
                      "absolute top-0 left-0 overflow-hidden rounded-full border-2 border-white shadow-[0_10px_18px_rgba(0,0,0,0.16)]",
                      filtering && !lifted && "opacity-40 saturate-50",
                    )}
                    style={{
                      width: mobile ? 52 : 68,
                      height: mobile ? 52 : 68,
                      transform: `translate3d(${pose.x}px, ${pose.y}px, 0) rotate(${pose.rotate}deg) scale(${pose.scale})`,
                      zIndex: pose.z,
                      transition: reducedMotion ? "none" : "transform 720ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease",
                    }}
                  >
                    <AvatarToken name={creator.name} handle={creator.handle} />
                  </button>
                );
              })
            : null}
        </div>
      ) : (
        <ul className="mx-auto grid max-w-3xl gap-2 px-4 pt-4 pb-16">
          {(filtering ? creators.filter((creator) => liftedIds.includes(creator.id)) : creators).map((creator) => (
            <li key={creator.id}>
              <button
                type="button"
                onClick={() => setActiveId(creator.id)}
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left shadow-sm"
              >
                <span className="h-11 w-11 overflow-hidden rounded-full">
                  <AvatarToken name={creator.name} handle={creator.handle} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{creator.name}</span>
                  <span className="block truncate text-sm text-black/45">
                    @{creator.handle} · {creator.sample ? "示例" : "真实账号"}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {filtering && liftedIds.length === 0 ? (
            <li className="py-16 text-center text-sm text-black/45">没有对上的博主</li>
          ) : null}
        </ul>
      )}

      {active ? (
        <CreatorDetail
          creator={active}
          onClose={() => setActiveId(null)}
          onSaveTags={saveTags}
          onResetTags={resetTags}
          onRemove={removeCreator}
        />
      ) : null}
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
