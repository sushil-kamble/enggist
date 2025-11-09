import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { db } from '@/db';
import { sources, posts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateAuthHeader, unauthorizedResponse } from '@/lib/auth';
import { generateContentHash } from '@/lib/hash';
import https from 'https';

// Create HTTPS agent that accepts self-signed certificates
// This is needed for some RSS feeds like Netflix that may have cert issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const parser = new Parser({
  timeout: 10000, // 10 second timeout
  headers: {
    'User-Agent': 'Enggist/1.0 (RSS Reader)',
  },
  customFields: {
    item: ['content:encoded', 'content'],
  },
  requestOptions: {
    agent: httpsAgent,
  },
});

interface IngestResult {
  name: string;
  new: number;
  skipped: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  // Validate authorization
  if (!validateAuthHeader(request)) {
    return unauthorizedResponse();
  }

  console.log(`[${new Date().toISOString()}] Starting ingest...`);

  try {
    // Fetch all enabled sources
    const enabledSources = await db
      .select()
      .from(sources)
      .where(eq(sources.enabled, true));

    console.log(`[Ingest] Found ${enabledSources.length} enabled sources`);

    const results: IngestResult[] = [];
    let totalNew = 0;

    // Process each source
    for (const source of enabledSources) {
      const result: IngestResult = {
        name: source.name,
        new: 0,
        skipped: 0,
      };

      try {
        console.log(`[Ingest] Fetching ${source.name}: ${source.feedUrl}`);

        // Fetch RSS feed with conditional headers
        const fetchOptions: any = {
          headers: {
            'User-Agent': 'Enggist/1.0 (RSS Reader)',
          },
        };

        if (source.lastEtag) {
          fetchOptions.headers['If-None-Match'] = source.lastEtag;
        }
        if (source.lastModified) {
          fetchOptions.headers['If-Modified-Since'] = source.lastModified;
        }

        const feed = await parser.parseURL(source.feedUrl);

        // Get latest ~50 items
        const items = feed.items.slice(0, 50);

        for (const item of items) {
          if (!item.title || !item.link) {
            result.skipped++;
            continue;
          }

          // Parse published date
          let publishedAt: Date | null = null;
          if (item.pubDate) {
            publishedAt = new Date(item.pubDate);
            if (isNaN(publishedAt.getTime())) {
              publishedAt = null;
            }
          }

          // Generate content hash for deduplication
          const contentHash = generateContentHash(
            item.link,
            item.title,
            publishedAt
          );

          // Extract full content from RSS feed
          // Try content:encoded first (full HTML), then content, then contentSnippet
          const fullContent = (item as any)['content:encoded'] || 
                             item.content || 
                             item.contentSnippet || 
                             '';

          // Extract excerpt from content or contentSnippet
          let excerpt = item.contentSnippet || item.content || '';
          if (excerpt.length > 500) {
            excerpt = excerpt.substring(0, 497) + '...';
          }

          // Try to insert (will skip if hash already exists due to unique constraint)
          try {
            await db.insert(posts).values({
              sourceId: source.id,
              title: item.title,
              url: item.link,
              canonicalUrl: item.link, // Use link as canonical for now
              publishedAt,
              author: (item as any).creator || (item as any).author || null,
              excerpt,
              content: fullContent,
              contentHash,
            });

            result.new++;
            totalNew++;
          } catch (error: any) {
            // If unique constraint violation, it's a duplicate (skip silently)
            if (error?.code === '23505' || error?.message?.includes('unique')) {
              result.skipped++;
            } else {
              // Log other errors but continue
              console.error(`[Ingest] Error inserting post: ${error.message}`);
              result.skipped++;
            }
          }
        }

        // Update source metadata (ETag and Last-Modified headers)
        // Note: rss-parser doesn't expose response headers, so we skip for now
        // In production, you'd want to use a lower-level fetch to capture these

        console.log(
          `[Ingest] ${source.name}: ${result.new} new, ${result.skipped} skipped`
        );
      } catch (error: any) {
        console.error(`[Ingest] Error fetching ${source.name}:`, error.message);
        result.error = error.message;
      }

      results.push(result);
    }

    console.log(`[Ingest] Complete: ${totalNew} total new posts`);

    return NextResponse.json({
      success: true,
      sources: results,
      totalNew,
    });
  } catch (error: any) {
    console.error('[Ingest] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
