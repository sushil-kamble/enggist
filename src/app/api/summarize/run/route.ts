import { NextRequest, NextResponse } from 'next/server';
import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { db } from '@/db';
import { posts, summaries } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { validateAuthHeader, unauthorizedResponse } from '@/lib/auth';

// Controlled tags list
const VALID_TAGS = [
  'sre',
  'dist',
  'data',
  'mlp',
  'finops',
  'security',
  'frontend',
  'mobile',
  'culture',
] as const;

// Schema for structured output from LLM
const SummarySchema = z.object({
  bullets: z.array(z.string()).min(3).max(7).describe('3-7 bullet points summarizing the article (max 150 words total)'),
  whyItMatters: z.string().max(300).describe('1-2 sentences explaining why this article matters'),
  tags: z.array(z.enum(VALID_TAGS)).min(1).max(3).describe('1-3 relevant tags from the controlled list'),
  keywords: z.array(z.string()).min(2).max(7).describe('2-7 key technical keywords'),
});

type SummaryOutput = z.infer<typeof SummarySchema>;

export async function POST(request: NextRequest) {
  // Validate authorization
  if (!validateAuthHeader(request)) {
    return unauthorizedResponse();
  }

  console.log(`[${new Date().toISOString()}] Starting summarization...`);

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('[Summarize] GOOGLE_GENERATIVE_AI_API_KEY not configured');
    return NextResponse.json(
      { error: 'API key not configured' },
      { status: 500 }
    );
  }

  try {
    // Find posts without summaries (limit 15)
    const postsWithoutSummaries = await db.execute<{
      id: string;
      title: string;
      excerpt: string | null;
      content: string | null;
      url: string;
    }>(sql`
      SELECT p.id, p.title, p.excerpt, p.content, p.url
      FROM posts p
      LEFT JOIN summaries s ON s.post_id = p.id
      WHERE s.id IS NULL
      ORDER BY p.created_at DESC
      LIMIT 15
    `);

    const postsToSummarize = Array.from(postsWithoutSummaries);

    console.log(`[Summarize] Found ${postsToSummarize.length} posts to summarize`);

    if (postsToSummarize.length === 0) {
      return NextResponse.json({
        success: true,
        summarized: 0,
        message: 'No posts need summarization',
      });
    }

    let summarized = 0;

    // Process each post
    for (const post of postsToSummarize) {
      try {
        console.log(`[Summarize] Processing: ${post.title}`);

        // Prepare prompt with title, content, and excerpt
        // Use content if available, otherwise fall back to excerpt
        const articleContent = post.content || post.excerpt || 'No content available.';
        
        // Truncate content if too long (keep first ~8000 chars to stay within token limits)
        const truncatedContent = articleContent.length > 8000 
          ? articleContent.substring(0, 8000) + '...'
          : articleContent;

        const content = `
Title: ${post.title}

Content:
${truncatedContent}

Analyze this engineering blog post and provide a structured summary with:
1. Between 3-7 concise bullet points summarizing the key takeaways
2. A brief explanation (1-2 sentences) of why this matters to engineers
3. Between 1-3 relevant category tags from this list: ${VALID_TAGS.join(', ')}
4. Between 2-7 key technical keywords or concepts mentioned in the article
`.trim();

        // Call Google Flash via Vercel AI SDK with structured output
        const result = await generateObject({
          model: google('gemini-2.5-flash'),
          schema: SummarySchema as any, // Type assertion for Zod v4 compatibility
          prompt: content,
          temperature: 0.3, // Lower temperature for more consistent structured output
        });

        // Validate and insert summary
        const summary = result.object as SummaryOutput;
        const { bullets, whyItMatters, tags, keywords } = summary;

        await db.insert(summaries).values({
          postId: post.id,
          bulletsJson: bullets,
          whyItMatters,
          tags,
          keywords,
          model: 'gemini-2.5-flash',
        });

        summarized++;
        console.log(`[Summarize] ✓ ${post.title}`);
      } catch (error: any) {
        console.error(`[Summarize] Error processing post ${post.id}:`, error.message);
        if (error.cause) {
          console.error(`[Summarize] Error cause:`, JSON.stringify(error.cause, null, 2));
        }
        // Continue with next post
      }
    }

    console.log(`[Summarize] Complete: ${summarized} posts summarized`);

    return NextResponse.json({
      success: true,
      summarized,
    });
  } catch (error: any) {
    console.error('[Summarize] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
