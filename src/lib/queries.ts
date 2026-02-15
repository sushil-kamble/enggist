import { db } from '@/db';
import { posts, sources, summaries } from '@/db/schema';
import { asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { DEFAULT_POST_SORT, type PostSortOption } from '@/lib/post-sort';
import { unstable_cache } from 'next/cache';

export interface PostWithSummary {
  id: string;
  title: string;
  url: string;
  publishedAt: Date | null;
  excerpt: string | null;
  content: string | null;
  source: {
    id: string;
    name: string;
    site: string;
  };
  summary: {
    bullets: string[];
    whyItMatters: string | null;
    tags: string[];
    keywords: string[];
  } | null;
}

const POSTS_REVALIDATE_SECONDS = 60;

function getPostOrderBy(sortBy: PostSortOption): SQL[] {
  const publishedOrCreated = sql`COALESCE(${posts.publishedAt}, ${posts.createdAt})`;

  switch (sortBy) {
    case 'oldest':
      return [asc(publishedOrCreated), asc(posts.createdAt)];
    case 'title_asc':
      return [asc(sql`LOWER(${posts.title})`), desc(publishedOrCreated)];
    case 'source_asc':
      return [asc(sql`LOWER(${sources.name})`), desc(publishedOrCreated)];
    case 'newest':
    default:
      return [desc(publishedOrCreated), desc(posts.createdAt)];
  }
}

/**
 * Fetch latest posts with summaries
 */
export async function getLatestPosts(
  limit = 30,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<PostWithSummary[]> {
  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      publishedAt: posts.publishedAt,
      excerpt: posts.excerpt,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceSite: sources.site,
      summaryBullets: summaries.bulletsJson,
      summaryWhyItMatters: summaries.whyItMatters,
      summaryTags: summaries.tags,
      summaryKeywords: summaries.keywords,
    })
    .from(posts)
    .innerJoin(sources, eq(posts.sourceId, sources.id))
    .leftJoin(summaries, eq(summaries.postId, posts.id))
    .orderBy(...getPostOrderBy(sortBy))
    .limit(limit);

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt,
    excerpt: row.excerpt,
    content: null,
    source: {
      id: row.sourceId,
      name: row.sourceName,
      site: row.sourceSite,
    },
    summary: row.summaryBullets
      ? {
          bullets: row.summaryBullets as string[],
          whyItMatters: row.summaryWhyItMatters,
          tags: row.summaryTags || [],
          keywords: row.summaryKeywords || [],
        }
      : null,
  }));
}

const getPaginatedPostsCached = unstable_cache(
  async (
    pageNumber: number,
    pageSize: number,
    sortBy: PostSortOption
  ): Promise<{ posts: PostWithSummary[]; totalCount: number }> => {
    const offset = (pageNumber - 1) * pageSize;

    const [results, totalResult] = await Promise.all([
      db
        .select({
          id: posts.id,
          title: posts.title,
          url: posts.url,
          publishedAt: posts.publishedAt,
          excerpt: posts.excerpt,
          sourceId: sources.id,
          sourceName: sources.name,
          sourceSite: sources.site,
          summaryBullets: summaries.bulletsJson,
          summaryWhyItMatters: summaries.whyItMatters,
          summaryTags: summaries.tags,
          summaryKeywords: summaries.keywords,
        })
        .from(posts)
        .innerJoin(sources, eq(posts.sourceId, sources.id))
        .leftJoin(summaries, eq(summaries.postId, posts.id))
        .orderBy(...getPostOrderBy(sortBy))
        .limit(pageSize)
        .offset(offset),
      db.execute<{ count: string }>(sql`SELECT COUNT(*)::int AS count FROM posts`),
    ]);

    const formattedPosts = results.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: row.publishedAt,
      excerpt: row.excerpt,
      content: null,
      source: {
        id: row.sourceId,
        name: row.sourceName,
        site: row.sourceSite,
      },
      summary: row.summaryBullets
        ? {
            bullets: row.summaryBullets as string[],
            whyItMatters: row.summaryWhyItMatters,
            tags: row.summaryTags || [],
            keywords: row.summaryKeywords || [],
          }
        : null,
    }));

    const totalCount = Number(totalResult[0]?.count || 0);

    return { posts: formattedPosts, totalCount };
  },
  ['paginated-posts-v2'],
  {
    revalidate: POSTS_REVALIDATE_SECONDS,
    tags: ['posts'],
  }
);

export async function getPaginatedPosts(
  page = 1,
  limit = 30,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<{
  posts: PostWithSummary[];
  totalCount: number;
}> {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);

  return getPaginatedPostsCached(pageNumber, pageSize, sortBy);
}

const getPaginatedPostsBySourceCached = unstable_cache(
  async (
    sourceId: string,
    pageNumber: number,
    pageSize: number,
    sortBy: PostSortOption
  ): Promise<{ posts: PostWithSummary[]; totalCount: number }> => {
    const offset = (pageNumber - 1) * pageSize;

    const [results, totalResult] = await Promise.all([
      db
        .select({
          id: posts.id,
          title: posts.title,
          url: posts.url,
          publishedAt: posts.publishedAt,
          excerpt: posts.excerpt,
          sourceId: sources.id,
          sourceName: sources.name,
          sourceSite: sources.site,
          summaryBullets: summaries.bulletsJson,
          summaryWhyItMatters: summaries.whyItMatters,
          summaryTags: summaries.tags,
          summaryKeywords: summaries.keywords,
        })
        .from(posts)
        .innerJoin(sources, eq(posts.sourceId, sources.id))
        .leftJoin(summaries, eq(summaries.postId, posts.id))
        .where(eq(posts.sourceId, sourceId))
        .orderBy(...getPostOrderBy(sortBy))
        .limit(pageSize)
        .offset(offset),
      db.execute<{ count: string }>(
        sql`SELECT COUNT(*)::int AS count FROM posts WHERE source_id = ${sourceId}`
      ),
    ]);

    const formattedPosts = results.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: row.publishedAt,
      excerpt: row.excerpt,
      content: null,
      source: {
        id: row.sourceId,
        name: row.sourceName,
        site: row.sourceSite,
      },
      summary: row.summaryBullets
        ? {
            bullets: row.summaryBullets as string[],
            whyItMatters: row.summaryWhyItMatters,
            tags: row.summaryTags || [],
            keywords: row.summaryKeywords || [],
          }
        : null,
    }));

    const totalCount = Number(totalResult[0]?.count || 0);

    return { posts: formattedPosts, totalCount };
  },
  ['paginated-posts-by-source-v2'],
  {
    revalidate: POSTS_REVALIDATE_SECONDS,
    tags: ['posts', 'sources'],
  }
);

export async function getPaginatedPostsBySource(
  sourceId: string,
  page = 1,
  limit = 10,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<{ posts: PostWithSummary[]; totalCount: number }> {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);

  return getPaginatedPostsBySourceCached(sourceId, pageNumber, pageSize, sortBy);
}

const getPaginatedPostsByTagCached = unstable_cache(
  async (
    tag: string,
    pageNumber: number,
    pageSize: number,
    sortBy: PostSortOption
  ): Promise<{ posts: PostWithSummary[]; totalCount: number }> => {
    const offset = (pageNumber - 1) * pageSize;

    const [results, totalResult] = await Promise.all([
      db
        .select({
          id: posts.id,
          title: posts.title,
          url: posts.url,
          publishedAt: posts.publishedAt,
          excerpt: posts.excerpt,
          sourceId: sources.id,
          sourceName: sources.name,
          sourceSite: sources.site,
          summaryBullets: summaries.bulletsJson,
          summaryWhyItMatters: summaries.whyItMatters,
          summaryTags: summaries.tags,
          summaryKeywords: summaries.keywords,
        })
        .from(posts)
        .innerJoin(sources, eq(posts.sourceId, sources.id))
        .innerJoin(summaries, eq(summaries.postId, posts.id))
        .where(sql`${tag} = ANY(${summaries.tags})`)
        .orderBy(...getPostOrderBy(sortBy))
        .limit(pageSize)
        .offset(offset),
      db.execute<{ count: string }>(sql`
        SELECT COUNT(*)::int AS count
        FROM posts p
        INNER JOIN summaries su ON su.post_id = p.id
        WHERE ${tag} = ANY(su.tags)
      `),
    ]);

    const formattedPosts = results.map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: row.publishedAt,
      excerpt: row.excerpt,
      content: null,
      source: {
        id: row.sourceId,
        name: row.sourceName,
        site: row.sourceSite,
      },
      summary: {
        bullets: row.summaryBullets as string[],
        whyItMatters: row.summaryWhyItMatters,
        tags: row.summaryTags || [],
        keywords: row.summaryKeywords || [],
      },
    }));

    const totalCount = Number(totalResult[0]?.count || 0);

    return { posts: formattedPosts, totalCount };
  },
  ['paginated-posts-by-tag-v2'],
  {
    revalidate: POSTS_REVALIDATE_SECONDS,
    tags: ['posts', 'summaries'],
  }
);

export async function getPaginatedPostsByTag(
  tag: string,
  page = 1,
  limit = 10,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<{ posts: PostWithSummary[]; totalCount: number }> {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);

  return getPaginatedPostsByTagCached(tag, pageNumber, pageSize, sortBy);
}

/**
 * Fetch posts by tag
 */
export async function getPostsByTag(
  tag: string,
  limit = 50,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<PostWithSummary[]> {
  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      publishedAt: posts.publishedAt,
      excerpt: posts.excerpt,
      content: posts.content,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceSite: sources.site,
      summaryBullets: summaries.bulletsJson,
      summaryWhyItMatters: summaries.whyItMatters,
      summaryTags: summaries.tags,
      summaryKeywords: summaries.keywords,
    })
    .from(posts)
    .innerJoin(sources, eq(posts.sourceId, sources.id))
    .innerJoin(summaries, eq(summaries.postId, posts.id))
    .where(sql`${tag} = ANY(${summaries.tags})`)
    .orderBy(...getPostOrderBy(sortBy))
    .limit(limit);

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt,
    excerpt: row.excerpt,
    content: row.content,
    source: {
      id: row.sourceId,
      name: row.sourceName,
      site: row.sourceSite,
    },
    summary: {
      bullets: row.summaryBullets as string[],
      whyItMatters: row.summaryWhyItMatters,
      tags: row.summaryTags || [],
      keywords: row.summaryKeywords || [],
    },
  }));
}

/**
 * Fetch posts by source
 */
export async function getPostsBySource(
  sourceId: string,
  limit = 50,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<PostWithSummary[]> {
  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      publishedAt: posts.publishedAt,
      excerpt: posts.excerpt,
      content: posts.content,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceSite: sources.site,
      summaryBullets: summaries.bulletsJson,
      summaryWhyItMatters: summaries.whyItMatters,
      summaryTags: summaries.tags,
      summaryKeywords: summaries.keywords,
    })
    .from(posts)
    .innerJoin(sources, eq(posts.sourceId, sources.id))
    .leftJoin(summaries, eq(summaries.postId, posts.id))
    .where(eq(posts.sourceId, sourceId))
    .orderBy(...getPostOrderBy(sortBy))
    .limit(limit);

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt,
    excerpt: row.excerpt,
    content: row.content,
    source: {
      id: row.sourceId,
      name: row.sourceName,
      site: row.sourceSite,
    },
    summary: row.summaryBullets
      ? {
          bullets: row.summaryBullets as string[],
          whyItMatters: row.summaryWhyItMatters,
          tags: row.summaryTags || [],
          keywords: row.summaryKeywords || [],
        }
      : null,
  }));
}

const getLastIndexedAtCached = unstable_cache(
  async (): Promise<Date | null> => {
    const result = await db.execute<{ lastIndexedAt: Date | string | null }>(
      sql`SELECT MAX(${posts.createdAt}) AS "lastIndexedAt" FROM ${posts}`
    );

    const value = result[0]?.lastIndexedAt;
    return value ? new Date(value) : null;
  },
  ['last-indexed-at-v1'],
  {
    revalidate: POSTS_REVALIDATE_SECONDS,
    tags: ['posts'],
  }
);

export async function getLastIndexedAt(): Promise<Date | null> {
  return getLastIndexedAtCached();
}

/**
 * Fetch single post with summary
 */
export async function getPostById(postId: string): Promise<PostWithSummary | null> {
  const result = await db
    .select({
      id: posts.id,
      title: posts.title,
      url: posts.url,
      publishedAt: posts.publishedAt,
      excerpt: posts.excerpt,
      content: posts.content,
      sourceId: sources.id,
      sourceName: sources.name,
      sourceSite: sources.site,
      summaryBullets: summaries.bulletsJson,
      summaryWhyItMatters: summaries.whyItMatters,
      summaryTags: summaries.tags,
      summaryKeywords: summaries.keywords,
    })
    .from(posts)
    .innerJoin(sources, eq(posts.sourceId, sources.id))
    .leftJoin(summaries, eq(summaries.postId, posts.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    publishedAt: row.publishedAt,
    excerpt: row.excerpt,
    content: row.content,
    source: {
      id: row.sourceId,
      name: row.sourceName,
      site: row.sourceSite,
    },
    summary: row.summaryBullets
      ? {
          bullets: row.summaryBullets as string[],
          whyItMatters: row.summaryWhyItMatters,
          tags: row.summaryTags || [],
          keywords: row.summaryKeywords || [],
        }
      : null,
  };
}

const getRelatedPostsCached = unstable_cache(
  async (
    postId: string,
    sourceId: string,
    normalizedTags: string[],
    limit: number
  ): Promise<PostWithSummary[]> => {
    const safeLimit = Math.max(1, Math.min(limit, 8));
    const tags = Array.from(
      new Set(
        normalizedTags
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    );
    const tagsArraySql = tags.length
      ? sql`ARRAY[${sql.join(tags.map((tag) => sql`${tag}`), sql`, `)}]::text[]`
      : sql`ARRAY[]::text[]`;

    type RelatedPostRow = {
      id: string;
      title: string;
      url: string;
      published_at: Date | null;
      excerpt: string | null;
      source_id: string;
      source_name: string;
      source_site: string;
      summary_bullets: string[] | null;
      summary_why_it_matters: string | null;
      summary_tags: string[] | null;
      summary_keywords: string[] | null;
    };

    const rows = await db.execute<RelatedPostRow>(sql`
      WITH input AS (
        SELECT
          ${postId}::uuid AS post_id,
          ${sourceId}::uuid AS source_id,
          ${tagsArraySql} AS tags
      )
      SELECT
        p.id,
        p.title,
        p.url,
        p.published_at,
        p.excerpt,
        s.id AS source_id,
        s.name AS source_name,
        s.site AS source_site,
        su.bullets_json AS summary_bullets,
        su.why_it_matters AS summary_why_it_matters,
        su.tags AS summary_tags,
        su.keywords AS summary_keywords
      FROM posts p
      INNER JOIN sources s ON s.id = p.source_id
      LEFT JOIN summaries su ON su.post_id = p.id
      CROSS JOIN input i
      WHERE p.id <> i.post_id
        AND (
          p.source_id = i.source_id
          OR (
            cardinality(i.tags) > 0
            AND COALESCE(su.tags, '{}'::text[]) && i.tags
          )
        )
      ORDER BY
        (
          CASE WHEN p.source_id = i.source_id THEN 3 ELSE 0 END
          + CASE
            WHEN cardinality(i.tags) > 0 THEN COALESCE((
              SELECT COUNT(*)
              FROM unnest(COALESCE(su.tags, '{}'::text[])) AS current_tag
              WHERE current_tag = ANY(i.tags)
            ), 0)
            ELSE 0
          END
        ) DESC,
        COALESCE(p.published_at, p.created_at) DESC,
        p.created_at DESC
      LIMIT ${safeLimit}
    `);

    return Array.from(rows).map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: row.published_at,
      excerpt: row.excerpt,
      content: null,
      source: {
        id: row.source_id,
        name: row.source_name,
        site: row.source_site,
      },
      summary: row.summary_bullets
        ? {
            bullets: row.summary_bullets,
            whyItMatters: row.summary_why_it_matters,
            tags: row.summary_tags || [],
            keywords: row.summary_keywords || [],
          }
        : null,
    }));
  },
  ['related-posts-v1'],
  {
    revalidate: POSTS_REVALIDATE_SECONDS,
    tags: ['posts', 'summaries', 'sources'],
  }
);

export async function getRelatedPosts(
  postId: string,
  sourceId: string,
  tags: string[] = [],
  limit = 4
): Promise<PostWithSummary[]> {
  return getRelatedPostsCached(postId, sourceId, tags, limit);
}
