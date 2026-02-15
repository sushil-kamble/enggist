export const POST_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "title_asc", label: "Title (A-Z)" },
  { value: "source_asc", label: "Source (A-Z)" },
] as const;

export type PostSortOption = (typeof POST_SORT_OPTIONS)[number]["value"];

export const DEFAULT_POST_SORT: PostSortOption = "newest";

export function parsePostSort(
  rawSort: string | string[] | undefined
): PostSortOption {
  const value = Array.isArray(rawSort) ? rawSort[0] : rawSort;

  if (!value) {
    return DEFAULT_POST_SORT;
  }

  const match = POST_SORT_OPTIONS.find((option) => option.value === value);
  return match ? match.value : DEFAULT_POST_SORT;
}
