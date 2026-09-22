import type { TagId } from "@/lib/tags";

export type CreatorSource = "seed" | "local";

export type CreatorLocale = "en" | "zh";

export type Creator = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  tags: TagId[];
  sample: boolean;
  source: CreatorSource;
  /** 公开资料里的主要写作语言，用来回答「英文博主」这类查询。 */
  locale: CreatorLocale;
  /** 公开资料里受众较广、近期仍活跃。用来回答「有爆款 / 今天最热」。 */
  hot: boolean;
};

export type DirectoryCreator = Creator & {
  overridden: boolean;
};
