"use client";

import { useState } from "react";

function hueFromHandle(handle: string) {
  let hash = 0;
  for (const char of handle) hash = (hash * 33 + char.charCodeAt(0)) % 360;
  return hash;
}

export function AvatarToken({ name, handle }: { name: string; handle: string }) {
  const initial = Array.from(name)[0] ?? handle.slice(0, 1).toUpperCase();
  const hue = hueFromHandle(handle);
  const [stage, setStage] = useState<"x" | "dice" | "letter">("x");

  if (stage === "letter") {
    return (
      <span
        className="grid h-full w-full place-items-center text-lg font-semibold text-[#1a140c]"
        style={{
          background: `linear-gradient(145deg, hsl(${hue} 86% 74%), hsl(${(hue + 36) % 360} 72% 52%))`,
        }}
      >
        {initial}
      </span>
    );
  }

  const src =
    stage === "x"
      ? `https://unavatar.io/x/${encodeURIComponent(handle)}`
      : `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(handle)}&backgroundColor=d6ff4a,b6e3ff,ffd5dc`;

  return (
    <img
      src={src}
      alt=""
      draggable={false}
      referrerPolicy="no-referrer"
      className="h-full w-full object-cover"
      onError={() => setStage((current) => (current === "x" ? "dice" : "letter"))}
    />
  );
}
