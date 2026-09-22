import type { TagId } from "@/lib/tags";

export type CreatorSource = "seed" | "local";

export type Creator = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  tags: TagId[];
  sample: boolean;
  source: CreatorSource;
};

export type DirectoryCreator = Creator & {
  overridden: boolean;
};
