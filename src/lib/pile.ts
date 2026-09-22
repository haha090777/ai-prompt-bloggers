export type TokenPose = {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
};

function mixer(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

export function layoutPile(ids: readonly string[], width: number, height: number, mobile: boolean): Map<string, TokenPose> {
  const size = mobile ? 52 : 68;
  const poses = new Map<string, TokenPose>();
  const center = width / 2;
  const floor = height - size * 0.42;
  const spread = Math.min(width * (mobile ? 0.86 : 0.62), mobile ? 360 : 640);
  const heap = height * (mobile ? 0.32 : 0.36);

  ids.forEach((id) => {
    const rand = mixer(id);
    const along = rand();
    const depth = Math.pow(rand(), 0.72);
    const rawX = center + (along - 0.5) * spread * (0.45 + depth * 0.7) - size / 2;
    const x = Math.min(width - size * 0.55, Math.max(-size * 0.2, rawX));
    const y = floor - (1 - depth) * heap + (rand() - 0.5) * 14 - size / 2;
    poses.set(id, {
      x,
      y,
      rotate: (rand() - 0.5) * (mobile ? 10 : 16),
      scale: 0.92 + rand() * 0.12,
      z: Math.round(depth * 24) + 1,
    });
  });

  return poses;
}

export function layoutFloat(
  ids: readonly string[],
  width: number,
  height: number,
  mobile: boolean,
): Map<string, TokenPose> {
  const poses = new Map<string, TokenPose>();
  const count = ids.length;
  if (count === 0) return poses;

  const size = mobile ? 52 : 68;
  const cols = Math.min(count, mobile ? 4 : Math.min(7, Math.max(3, Math.ceil(Math.sqrt(count * 1.6)))));
  const gapX = Math.min(mobile ? 76 : 96, (width * 0.78) / cols);
  const gapY = mobile ? 74 : 92;
  const bandTop = height * (mobile ? 0.46 : 0.43);

  ids.forEach((id, index) => {
    const rand = mixer(`${id}:up`);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowCount = Math.min(cols, count - row * cols);
    const start = width / 2 - ((rowCount - 1) * gapX) / 2;
    poses.set(id, {
      x: start + col * gapX + (rand() - 0.5) * 14 - size / 2,
      y: bandTop + row * gapY + (rand() - 0.5) * 10 - size / 2,
      rotate: (rand() - 0.5) * 8,
      scale: 1.05,
      z: 40 + index,
    });
  });

  return poses;
}
