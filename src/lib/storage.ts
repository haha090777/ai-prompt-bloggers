import { isTagId, sortTags, type TagId } from "@/lib/tags";
import type { Creator } from "@/lib/types";

const STORAGE_KEY = "prompt-atlas:v1";
const HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/;

export type LibraryState = {
  added: Creator[];
  overrides: Record<string, TagId[]>;
};

const EMPTY: LibraryState = { added: [], overrides: {} };

function inferLocale(name: string, bio: string): "en" | "zh" {
  return /[\u4e00-\u9fff]/.test(`${name}${bio}`) ? "zh" : "en";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseCreator(value: unknown): Creator | null {
  if (!isRecord(value)) return null;
  const { id, name, handle, bio, tags, sample } = value;
  if (typeof id !== "string" || typeof name !== "string" || typeof handle !== "string") {
    return null;
  }
  if (typeof bio !== "string" || !Array.isArray(tags)) return null;
  if (!HANDLE_PATTERN.test(handle)) return null;
  const parsedTags = tags.filter((tag): tag is TagId => typeof tag === "string" && isTagId(tag));
  if (parsedTags.length === 0 || name.trim().length === 0) return null;
  return {
    id,
    name: name.trim().slice(0, 40),
    handle,
    bio: bio.trim().slice(0, 500),
    tags: sortTags(parsedTags),
    sample: Boolean(sample),
    source: "local",
    locale: value.locale === "zh" || value.locale === "en" ? value.locale : inferLocale(name, bio),
    hot: value.hot === true,
  };
}

export function loadLibrary(): LibraryState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return EMPTY;

    const added = Array.isArray(parsed.added)
      ? parsed.added.flatMap((item) => {
          const creator = parseCreator(item);
          return creator ? [creator] : [];
        })
      : [];

    const overrides: Record<string, TagId[]> = {};
    if (isRecord(parsed.overrides)) {
      for (const [id, tags] of Object.entries(parsed.overrides)) {
        if (!Array.isArray(tags)) continue;
        const parsedTags = sortTags(
          tags.filter((tag): tag is TagId => typeof tag === "string" && isTagId(tag)),
        );
        if (parsedTags.length > 0) overrides[id] = parsedTags;
      }
    }

    return { added, overrides };
  } catch {
    return EMPTY;
  }
}

export function saveLibrary(state: LibraryState) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      added: state.added,
      overrides: state.overrides,
    }),
  );
}
