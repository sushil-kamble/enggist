import { db } from '@/db';
import { posts, sources, summaries } from '@/db/schema';
import { asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { DEFAULT_POST_SORT, type PostSortOption } from '@/lib/post-sort';

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
  const offset = (pageNumber - 1) * pageSize;

  const [results, totalResult] = await Promise.all([
    db
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

  const totalCount = Number(totalResult[0]?.count || 0);

  return { posts: formattedPosts, totalCount };
}

export async function getPaginatedPostsBySource(
  sourceId: string,
  page = 1,
  limit = 10,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<{ posts: PostWithSummary[]; totalCount: number }> {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);
  const offset = (pageNumber - 1) * pageSize;

  const [results, totalResult] = await Promise.all([
    db
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

  const totalCount = Number(totalResult[0]?.count || 0);

  return { posts: formattedPosts, totalCount };
}

export async function getPaginatedPostsByTag(
  tag: string,
  page = 1,
  limit = 10,
  sortBy: PostSortOption = DEFAULT_POST_SORT
): Promise<{ posts: PostWithSummary[]; totalCount: number }> {
  const pageNumber = Math.max(page, 1);
  const pageSize = Math.max(limit, 1);
  const offset = (pageNumber - 1) * pageSize;

  const [results, totalResult] = await Promise.all([
    db
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

  const totalCount = Number(totalResult[0]?.count || 0);

  return { posts: formattedPosts, totalCount };
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
