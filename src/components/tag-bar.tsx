import { TAGS, TAG_TONE, type TagId } from "@/lib/tags";
import { cx } from "@/lib/cx";

export function TagBar({
  selected,
  counts,
  onToggle,
  onClear,
}: {
  selected: TagId[];
  counts: Record<TagId, number>;
  onToggle: (tag: TagId) => void;
  onClear: () => void;
}) {
  const allActive = selected.length === 0;

  return (
    <div className="tag-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <button
        type="button"
        data-testid="tag-all"
        aria-pressed={allActive}
        onClick={onClear}
        className={cx(
          "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
          allActive
            ? "border-lime bg-lime text-[#17190c]"
            : "border-white/12 bg-white/5 text-paper/85 hover:bg-white/10",
        )}
      >
        全部
      </button>
      {TAGS.map((tag) => {
        const active = selected.includes(tag.id);
        const tone = TAG_TONE[tag.id];
        return (
          <button
            key={tag.id}
            type="button"
            data-testid={`tag-${tag.id}`}
            aria-pressed={active}
            onClick={() => onToggle(tag.id)}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              active ? tone.on : `${tone.idle} hover:brightness-110`,
            )}
          >
            <span className={cx("h-1.5 w-1.5 rounded-full", active ? "bg-current" : tone.dot)} />
            {tag.label}
            <span className={cx("tabular-nums", active ? "opacity-70" : "opacity-60")}>{counts[tag.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
