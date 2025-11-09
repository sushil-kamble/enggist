"use client";

import { useState } from "react";
import Link from "next/link";
import { FiSearch } from "react-icons/fi";

import { PostCard } from "@/components/PostCard";
import { PostWithSummary } from "@/lib/queries";

interface SearchablePostsProps {
  initialPosts: PostWithSummary[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  basePath?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function SearchablePosts({
  initialPosts,
  totalCount,
  currentPage,
  pageSize,
  basePath = "/",
  emptyMessage = "No posts available yet. Run the ingest job to fetch articles.",
  searchPlaceholder = "Search for Kafka, Kubernetes, React...",
}: SearchablePostsProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PostWithSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayPage = Math.min(currentPage, totalPages);
  const showingSearchResults = hasSearched && searchQuery.length > 0;

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      handleClear();
      return;
    }

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
  };

  const handleClear = () => {
    setQuery("");
    setSearchResults([]);
    setSearchQuery("");
    setHasSearched(false);
    setError(null);
    setLoading(false);
  };

  const renderPostsGrid = (posts: PostWithSummary[]) => (
    <div className="grid grid-cols-1 gap-6">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );

  const prevDisabled = displayPage === 1;
  const nextDisabled = displayPage === totalPages;

  return (
    <div className="space-y-10">
      <form onSubmit={handleSearch} className="w-full">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent md:flex-none"
            >
              Search
            </button>
            {showingSearchResults && (
              <button
                type="button"
                className="rounded-lg border border-input px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
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
            <div className="py-12 text-center text-muted-foreground">Searching...</div>
          ) : searchResults.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No results found for "{searchQuery}". Try different keywords.
            </div>
          ) : (
            renderPostsGrid(searchResults)
          )}
        </div>
      ) : initialPosts.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-8">
          {renderPostsGrid(initialPosts)}

          {totalCount > pageSize && (
            <div className="flex flex-col items-center justify-between gap-4 border-t border-secondary pt-6 text-sm text-muted-foreground md:flex-row">
              <span>
                Page {displayPage} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                {prevDisabled ? (
                  <span className="rounded-lg border border-muted px-4 py-2 text-muted">
                    Previous
                  </span>
                ) : (
                  <Link
                    href={`${basePath}?page=${Math.max(displayPage - 1, 1)}`}
                    className="rounded-lg border border-input px-4 py-2 text-foreground transition-colors hover:bg-muted"
                  >
                    Previous
                  </Link>
                )}
                {nextDisabled ? (
                  <span className="rounded-lg border border-muted px-4 py-2 text-muted">
                    Next
                  </span>
                ) : (
                  <Link
                    href={`${basePath}?page=${Math.min(displayPage + 1, totalPages)}`}
                    className="rounded-lg border border-input px-4 py-2 text-foreground transition-colors hover:bg-muted"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
