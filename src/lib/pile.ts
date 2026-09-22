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

/** Resting constellation: mid-lower stage, readable rings, mild overlap. */
export function layoutPile(
  ids: readonly string[],
  width: number,
  height: number,
  mobile: boolean,
): Map<string, TokenPose> {
  const size = mobile ? 56 : 72;
  const poses = new Map<string, TokenPose>();
  const center = width / 2;
  // Rise into the mid stage so the search column and pile share one vertical rhythm.
  const floor = height - size * (mobile ? 0.45 : 0.5);
  const spread = Math.min(width * (mobile ? 0.9 : 0.74), mobile ? 360 : 740);
  const heap = height * (mobile ? 0.55 : 0.62);

  ids.forEach((id) => {
    const rand = mixer(id);
    const along = rand();
    const depth = Math.pow(rand(), 0.85);
    const rawX = center + (along - 0.5) * spread * (0.55 + depth * 0.55) - size / 2;
    const x = Math.min(width - size * 0.7, Math.max(size * 0.05, rawX));
    const y = floor - (1 - depth) * heap + (rand() - 0.5) * 18 - size / 2;
    poses.set(id, {
      x,
      y,
      rotate: (rand() - 0.5) * (mobile ? 6 : 10),
      scale: 0.94 + rand() * 0.1,
      z: Math.round(depth * 20) + 1,
    });
  });

  return poses;
}

/** Floated matches: looser even cloud under the search, less overlap. */
export function layoutFloat(
  ids: readonly string[],
  width: number,
  height: number,
  mobile: boolean,
): Map<string, TokenPose> {
  const poses = new Map<string, TokenPose>();
  const count = ids.length;
  if (count === 0) return poses;

  const size = mobile ? 56 : 72;
  const cols = Math.min(
    count,
    mobile ? 3 : Math.min(6, Math.max(3, Math.ceil(Math.sqrt(count * 1.35)))),
  );
  const gapX = Math.min(mobile ? 96 : 124, (width * 0.86) / Math.max(cols, 1));
  const gapY = mobile ? 100 : 118;
  // Sit just under the search column, fill the mid stage.
  const bandTop = height * (mobile ? 0.04 : 0.02);

  ids.forEach((id, index) => {
    const rand = mixer(`${id}:up`);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const rowCount = Math.min(cols, count - row * cols);
    const start = width / 2 - ((rowCount - 1) * gapX) / 2;
    poses.set(id, {
      x: start + col * gapX + (rand() - 0.5) * 10 - size / 2,
      y: bandTop + row * gapY + (rand() - 0.5) * 8 - size / 2,
      rotate: (rand() - 0.5) * 4,
      scale: mobile ? 1.06 : 1.12,
      z: 40 + index,
    });
  });

  return poses;
}

/** Non-matches sink lower and shrink when filtering. */
export function layoutDimmedPile(
  ids: readonly string[],
  width: number,
  height: number,
  mobile: boolean,
): Map<string, TokenPose> {
  const base = layoutPile(ids, width, height, mobile);
  const size = mobile ? 56 : 72;
  for (const [id, pose] of base) {
    base.set(id, {
      ...pose,
      y: Math.min(height - size * 0.35, pose.y + height * 0.08),
      scale: pose.scale * 0.78,
      z: Math.max(1, pose.z - 8),
    });
  }
  return base;
}
