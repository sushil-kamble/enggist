"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FiChevronLeft, FiChevronRight, FiSearch, FiSliders } from "react-icons/fi";

import { PostCard } from "@/components/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { PostWithSummary } from "@/lib/queries";
import {
  DEFAULT_POST_SORT,
  POST_SORT_OPTIONS,
  type PostSortOption,
} from "@/lib/post-sort";

interface SearchablePostsProps {
  initialPosts: PostWithSummary[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  basePath?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  sortBy?: PostSortOption;
}

export function SearchablePosts({
  initialPosts,
  totalCount,
  currentPage,
  pageSize,
  basePath = "/",
  emptyMessage = "No posts available yet. Run the ingest job to fetch articles.",
  searchPlaceholder = "Search for Kafka, Kubernetes, React...",
  sortBy = DEFAULT_POST_SORT,
}: SearchablePostsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PostWithSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState<PostSortOption>(sortBy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isRoutePending, startRouteTransition] = useTransition();

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayPage = Math.min(currentPage, totalPages);
  const showingSearchResults = hasSearched && searchQuery.length > 0;
  const postsForPage = useMemo(
    () => sortPosts(initialPosts, selectedSort),
    [initialPosts, selectedSort]
  );
  const postsForSearch = useMemo(
    () => sortPosts(searchResults, selectedSort),
    [searchResults, selectedSort]
  );
  const skeletonCount = Math.min(6, Math.max(2, pageSize));
  const showRouteSkeleton = !showingSearchResults && isRoutePending;

  const runSearch = useCallback(async (trimmedQuery: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    setSearchQuery(trimmedQuery);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || "Search failed");
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Search failed";
      setError(message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const urlQuery = (searchParams.get("q") || "").trim();
    setQuery(urlQuery);

    if (!urlQuery) {
      setSearchResults([]);
      setSearchQuery("");
      setHasSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    if (hasSearched && urlQuery === searchQuery) {
      return;
    }

    void runSearch(urlQuery);
  }, [hasSearched, runSearch, searchParams, searchQuery]);

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    const currentUrlQuery = (searchParams.get("q") || "").trim();

    if (!trimmedQuery) {
      handleClear();
      return;
    }

    if (trimmedQuery === currentUrlQuery) {
      await runSearch(trimmedQuery);
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("q", trimmedQuery);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSort = event.target.value as PostSortOption;
    setSelectedSort(nextSort);

    if (showingSearchResults) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    if (nextSort === DEFAULT_POST_SORT) {
      params.delete("sort");
    } else {
      params.set("sort", nextSort);
    }
    params.set("page", "1");
    startRouteTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleClear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);

    setQuery("");
    setSearchResults([]);
    setSearchQuery("");
    setHasSearched(false);
    setError(null);
    setLoading(false);
  };

  const createPageHref = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));

    if (selectedSort !== DEFAULT_POST_SORT) {
      params.set("sort", selectedSort);
    }

    return `${basePath}?${params.toString()}`;
  };

  const renderPostsGrid = (posts: PostWithSummary[]) => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );

  const renderSkeletonGrid = (count: number) => (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <SearchSkeletonCard key={`search-skeleton-${index}`} />
      ))}
    </div>
  );

  const createPaginationRange = () => {
    const pages: (number | "dots")[] = [];
    const delta = 2;
    const left = Math.max(2, displayPage - delta);
    const right = Math.min(totalPages - 1, displayPage + delta);

    pages.push(1);

    if (left > 2) {
      pages.push("dots");
    }

    for (let page = left; page <= right; page++) {
      pages.push(page);
    }

    if (right < totalPages - 1) {
      pages.push("dots");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const prevDisabled = displayPage === 1;
  const nextDisabled = displayPage === totalPages;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="w-full">
        <div className="flex flex-col gap-2 rounded-2xl bg-card/70 p-2 shadow-sm ring-1 ring-secondary/70 backdrop-blur transition-all duration-200 focus-within:ring-primary/40 md:flex-row md:items-center md:gap-1 md:rounded-3xl">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl bg-transparent py-3 pl-10 pr-3 text-[15px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
            />
          </div>

          <div className="hidden h-7 w-px bg-secondary/70 md:block" />

          <div className="flex items-center gap-1">
            <div className="relative min-w-40">
              <FiSliders className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={selectedSort}
                onChange={handleSortChange}
                aria-label="Sort posts"
                className="h-9 w-full appearance-none rounded-lg bg-transparent py-2 pl-8 pr-8 text-sm text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {POST_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent"
            >
              Search
            </button>

            {showingSearchResults && (
              <button
                type="button"
                className="h-9 rounded-lg px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {showingSearchResults ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {loading
              ? `Searching for "${searchQuery}"...`
              : `Found ${searchResults.length} result${searchResults.length === 1 ? "" : "s"} for "${searchQuery}"`}
          </p>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            renderSkeletonGrid(skeletonCount)
          ) : postsForSearch.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No results found for &quot;{searchQuery}&quot;. Try different keywords.
            </div>
          ) : (
            renderPostsGrid(postsForSearch)
          )}
        </div>
      ) : showRouteSkeleton ? (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">Updating posts...</p>
          {renderSkeletonGrid(skeletonCount)}
        </div>
      ) : initialPosts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-8">
          {renderPostsGrid(postsForPage)}

          {totalCount > pageSize && (
            <div className="rounded-2xl border border-secondary/75 bg-card/70 px-3 py-3 md:px-4 md:py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm font-medium text-foreground/90 md:text-base">
                  Page <span className="font-semibold text-primary">{displayPage}</span> of{" "}
                  <span className="font-semibold text-primary">{totalPages}</span>
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                {prevDisabled ? (
                  <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-secondary/70 bg-background/45 px-3 text-muted-foreground/60">
                    <FiChevronLeft className="h-4 w-4" />
                    Prev
                  </span>
                ) : (
                  <Link
                    href={createPageHref(Math.max(displayPage - 1, 1))}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-secondary/80 bg-background/70 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    <FiChevronLeft className="h-4 w-4" />
                    Prev
                  </Link>
                )}
                {createPaginationRange().map((item, index) =>
                  item === "dots" ? (
                    <span
                      key={`dots-${index}`}
                      className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground/70"
                    >
                      ...
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={createPageHref(item)}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors ${item === displayPage
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "border border-secondary/80 bg-background/70 text-foreground/90 hover:bg-muted"
                        }`}
                    >
                      {item}
                    </Link>
                  )
                )}
                {nextDisabled ? (
                  <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-secondary/70 bg-background/45 px-3 text-muted-foreground/60">
                    Next
                    <FiChevronRight className="h-4 w-4" />
                  </span>
                ) : (
                  <Link
                    href={createPageHref(Math.min(displayPage + 1, totalPages))}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-secondary/80 bg-background/70 px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    Next
                    <FiChevronRight className="h-4 w-4" />
                  </Link>
                )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function sortPosts(posts: PostWithSummary[], sortBy: PostSortOption): PostWithSummary[] {
  return [...posts].sort((left, right) => {
    const titleComparison = left.title.localeCompare(right.title, undefined, {
      sensitivity: "base",
    });
    const sourceComparison = left.source.name.localeCompare(right.source.name, undefined, {
      sensitivity: "base",
    });
    const dateComparison = compareDates(left.publishedAt, right.publishedAt);

    switch (sortBy) {
      case "oldest":
        return -dateComparison || titleComparison;
      case "title_asc":
        return titleComparison || dateComparison;
      case "source_asc":
        return sourceComparison || dateComparison;
      case "newest":
      default:
        return dateComparison || titleComparison;
    }
  });
}

function compareDates(
  leftDate: Date | string | null,
  rightDate: Date | string | null
): number {
  if (!leftDate && !rightDate) {
    return 0;
  }

  if (!leftDate) {
    return 1;
  }

  if (!rightDate) {
    return -1;
  }

  return new Date(rightDate).getTime() - new Date(leftDate).getTime();
}

function SearchSkeletonCard() {
  return (
    <div className="relative flex h-full flex-col gap-0 overflow-hidden rounded-xl border border-secondary/80 bg-card/90 py-0 shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary/40 via-accent/40 to-primary/40" />

      <div className="space-y-3 px-6 pb-3 pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-28 rounded-full bg-muted/70" />
          <Skeleton className="h-6 w-24 rounded-full bg-muted/60" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-6 w-11/12 bg-muted/75" />
          <Skeleton className="h-6 w-8/12 bg-muted/70" />
        </div>
      </div>

      <div className="flex-1 space-y-3 px-6 pb-5">
        <div className="rounded-lg border border-secondary/70 bg-muted/50 p-4">
          <Skeleton className="h-3.5 w-full bg-muted/70" />
          <Skeleton className="mt-2 h-3.5 w-9/12 bg-muted/70" />
        </div>

        <div className="space-y-2.5">
          <Skeleton className="h-3.5 w-full bg-muted/65" />
          <Skeleton className="h-3.5 w-10/12 bg-muted/65" />
          <Skeleton className="h-3.5 w-8/12 bg-muted/65" />
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-secondary/60 px-6 pb-1.5 pt-1.5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full bg-primary/15" />
          <Skeleton className="h-5 w-16 rounded-full bg-primary/15" />
          <Skeleton className="h-5 w-12 rounded-full bg-primary/15" />
        </div>
        <Skeleton className="h-4 w-20 bg-muted/70" />
      </div>
    </div>
  );
}
