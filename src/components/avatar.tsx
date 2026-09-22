function hueFromHandle(handle: string) {
  let hash = 0;
  for (const char of handle) hash = (hash * 33 + char.charCodeAt(0)) % 360;
  return hash;
}

export function Avatar({ name, handle }: { name: string; handle: string }) {
  const hue = hueFromHandle(handle);
  const initial = Array.from(name)[0] ?? handle.slice(0, 1).toUpperCase();

  return (
    <div
      aria-hidden
      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg font-semibold text-[#1a140c] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 86% 74%), hsl(${(hue + 36) % 360} 72% 52%))`,
      }}
    >
      {initial}
    </div>
  );
}
