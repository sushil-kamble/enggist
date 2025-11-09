import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [], count: 0 });
  }

  try {
    // Full-text search using search_tsv with ranking
    const results = await db.execute<{
      id: string;
      title: string;
      url: string;
      published_at: string | null;
      excerpt: string | null;
      source_name: string;
      source_id: string;
      source_site: string;
      bullets_json: string[] | null;
      why_it_matters: string | null;
      tags: string[] | null;
      keywords: string[] | null;
      rank: number;
    }>(sql`
      SELECT 
        p.id,
        p.title,
        p.url,
        p.published_at,
        p.excerpt,
        s.name as source_name,
        s.id as source_id,
        s.site as source_site,
        su.bullets_json,
        su.why_it_matters,
        su.tags,
        su.keywords,
        ts_rank(p.search_tsv, plainto_tsquery('english', ${query})) as rank
      FROM posts p
      JOIN sources s ON s.id = p.source_id
      LEFT JOIN summaries su ON su.post_id = p.id
      WHERE p.search_tsv @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC, p.published_at DESC NULLS LAST
      LIMIT 50
    `);

    const searchResults = Array.from(results).map((row) => ({
      id: row.id,
      title: row.title,
      url: row.url,
      publishedAt: row.published_at,
      excerpt: row.excerpt,
      source: {
        id: row.source_id,
        name: row.source_name,
        site: row.source_site,
      },
      summary: row.bullets_json
        ? {
            bullets: row.bullets_json,
            whyItMatters: row.why_it_matters,
            tags: row.tags || [],
            keywords: row.keywords || [],
          }
        : null,
    }));

    return NextResponse.json({
      results: searchResults,
      count: searchResults.length,
    });
  } catch (error: any) {
    console.error('[Search] Error:', error);
    return NextResponse.json(
      { error: 'Search failed', message: error.message },
      { status: 500 }
    );
  }
}
