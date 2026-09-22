export const TAGS = [
  {
    id: "poster",
    label: "海报提示词",
    questionId: "is_poster_prompts",
    instruction: "这位博主是否主要分享海报/平面 AI 提示词？",
    criteria: {
      true: "简介或示例以海报、平面设计、主视觉、KV、海报文案等 AI 提示词为主。",
      false: "不以海报或平面提示词为主要内容。",
    },
    accent: "#ff8d70",
  },
  {
    id: "video",
    label: "视频提示词",
    questionId: "is_video_prompts",
    instruction: "这位博主是否主要分享短视频 AI 提示词？",
    criteria: {
      true: "简介或示例以短视频、运镜、分镜节奏、竖屏短片等 AI 提示词为主。",
      false: "不以短视频提示词为主要内容。",
    },
    accent: "#f5c16c",
  },
  {
    id: "ui",
    label: "UI 提示词",
    questionId: "is_ui_prompts",
    instruction: "这位博主是否主要分享 UI/界面设计 AI 提示词？",
    criteria: {
      true: "简介或示例以界面、组件、设计系统、网页或 App 视觉等 AI 提示词为主。",
      false: "不以 UI 或界面设计提示词为主要内容。",
    },
    accent: "#8eb6ff",
  },
  {
    id: "long_video",
    label: "长视频提示词",
    questionId: "is_long_video_prompts",
    instruction: "这位博主是否主要分享长视频/影视 AI 提示词？",
    criteria: {
      true: "简介或示例以长视频、电影、剧集、角色连续性或影视镜头语言等 AI 提示词为主。",
      false: "不以长视频或影视提示词为主要内容。",
    },
    accent: "#c9b0ff",
  },
  {
    id: "code",
    label: "代码",
    questionId: "is_code",
    instruction: "这位博主是否主要分享代码/编程相关 AI 提示词或工作流？",
    criteria: {
      true: "简介或示例以编程、代码生成、重构、调试或开发者 AI 工作流为主。",
      false: "不以代码或编程提示词为主要内容。",
    },
    accent: "#7dffb3",
  },
  {
    id: "other",
    label: "其他",
    questionId: "is_other",
    instruction:
      "这位博主分享的 AI 内容，是否主要落在海报、短视频、UI、长视频和代码之外的其他方向？",
    criteria: {
      true: "主要内容不是海报/平面、短视频、UI/界面、长视频/影视，也不是代码/编程工作流。",
      false: "主要内容可以归入海报、短视频、UI、长视频或代码中的某一类，或信息不足。",
    },
    accent: "#c8c2b6",
  },
] as const;

export type TagId = (typeof TAGS)[number]["id"];
export type TagDefinition = (typeof TAGS)[number];

const TAG_IDS = new Set<string>(TAGS.map((tag) => tag.id));

export function isTagId(value: string): value is TagId {
  return TAG_IDS.has(value);
}

export function tagById(id: TagId): TagDefinition {
  const tag = TAGS.find((item) => item.id === id);
  if (!tag) {
    throw new Error(`Unknown tag: ${id}`);
  }
  return tag;
}

export function sortTags(tags: readonly TagId[]): TagId[] {
  const selected = new Set(tags);
  return TAGS.map((tag) => tag.id).filter((id) => selected.has(id));
}

export const TAG_TONE: Record<TagId, { idle: string; on: string; dot: string }> = {
  poster: {
    idle: "border-[#ff8d70]/40 bg-[#ff8d70]/15 text-[#ffd0c4]",
    on: "border-[#ff8d70] bg-[#ff8d70] text-[#2b110c]",
    dot: "bg-[#ff8d70]",
  },
  video: {
    idle: "border-[#f5c16c]/40 bg-[#f5c16c]/15 text-[#ffe3b0]",
    on: "border-[#f5c16c] bg-[#f5c16c] text-[#2a1c08]",
    dot: "bg-[#f5c16c]",
  },
  ui: {
    idle: "border-[#8eb6ff]/40 bg-[#8eb6ff]/15 text-[#d5e4ff]",
    on: "border-[#8eb6ff] bg-[#8eb6ff] text-[#10182e]",
    dot: "bg-[#8eb6ff]",
  },
  long_video: {
    idle: "border-[#c9b0ff]/40 bg-[#c9b0ff]/15 text-[#e6dcff]",
    on: "border-[#c9b0ff] bg-[#c9b0ff] text-[#1c1430]",
    dot: "bg-[#c9b0ff]",
  },
  code: {
    idle: "border-[#7dffb3]/40 bg-[#7dffb3]/15 text-[#d6ffe8]",
    on: "border-[#7dffb3] bg-[#7dffb3] text-[#062216]",
    dot: "bg-[#7dffb3]",
  },
  other: {
    idle: "border-[#c8c2b6]/35 bg-white/5 text-[#e6e1d6]",
    on: "border-[#e7e1d4] bg-[#e7e1d4] text-[#221e18]",
    dot: "bg-[#c8c2b6]",
  },
};
