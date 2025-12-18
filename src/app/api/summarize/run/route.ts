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
  whyItMatters: z.string().max(300).describe('1-2 sentences explaining why this article matters (STRICT MAX: 300 characters)'),
  tags: z.array(z.enum(VALID_TAGS)).min(1).max(3).describe('1-3 relevant tags from the controlled list'),
  keywords: z.array(z.string()).min(2).max(7).describe('2-7 key technical keywords (max 7 items)'),
});

type SummaryOutput = z.infer<typeof SummarySchema>;

// Helper to truncate text to max length while preserving sentence boundaries
function truncateToLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Try to truncate at last sentence boundary before maxLength
  const truncated = text.substring(0, maxLength);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastQuestion = truncated.lastIndexOf('?');
  const lastExclamation = truncated.lastIndexOf('!');
  
  const lastSentence = Math.max(lastPeriod, lastQuestion, lastExclamation);
  
  if (lastSentence > maxLength * 0.7) {
    // If we found a sentence boundary in the last 30% of text, use it
    return truncated.substring(0, lastSentence + 1).trim();
  }
  
  // Otherwise, truncate at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  return truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength - 3).trim() + '...';
}

// Helper function to process a single post with retry logic
async function processPost(
  post: {
    id: string;
    title: string;
    excerpt: string | null;
    content: string | null;
    url: string;
  },
  retryCount = 0
): Promise<{ success: boolean; postId: string; title: string; error?: string }> {
  const maxRetries = 1; // One retry allowed

  try {
    console.log(`[Summarize] Processing: ${post.title}`);

    // Prepare prompt with title, content, and excerpt
    const articleContent = post.content || post.excerpt || 'No content available.';
    
    // Truncate content if too long (keep first ~8000 chars to stay within token limits)
    const truncatedContent = articleContent.length > 8000 
      ? articleContent.substring(0, 8000) + '...'
      : articleContent;

    const content = `
Title: ${post.title}

Content:
${truncatedContent}

Analyze this engineering blog post and provide a structured summary.

IMPORTANT CONSTRAINTS:
- whyItMatters: MUST be 300 characters or less (strict limit)
- keywords: MUST be between 2-7 items only
- bullets: MUST be between 3-7 items
- tags: MUST be between 1-3 items from: ${VALID_TAGS.join(', ')}

Provide:
1. Between 3-7 concise bullet points summarizing key technical takeaways
2. A brief explanation (MAX 300 characters) of why this matters to engineers
3. Between 1-3 relevant category tags from the list above
4. Between 2-7 key technical keywords or concepts
`.trim();

    // Call Google Flash via Vercel AI SDK with structured output
    const result = await generateObject({
      model: google('gemini-3-flash-preview'),
      schema: SummarySchema as any,
      prompt: content,
      temperature: 0.3,
    });

    // Get the generated summary
    let summary = result.object as SummaryOutput;
    
    // FALLBACK: Truncate if LLM exceeded limits (defensive programming)
    if (summary.whyItMatters.length > 300) {
      console.warn(`[Summarize] whyItMatters exceeded 300 chars (${summary.whyItMatters.length}), truncating`);
      summary.whyItMatters = truncateToLength(summary.whyItMatters, 300);
    }
    
    // FALLBACK: Trim keywords if exceeded
    if (summary.keywords.length > 7) {
      console.warn(`[Summarize] keywords exceeded 7 items (${summary.keywords.length}), trimming`);
      summary.keywords = summary.keywords.slice(0, 7);
    }

    const { bullets, whyItMatters, tags, keywords } = summary;

    // Insert summary into database
    await db.insert(summaries).values({
      postId: post.id,
      bulletsJson: bullets,
      whyItMatters,
      tags,
      keywords,
      model: 'gemini-3-flash-preview',
    });

    console.log(`[Summarize] ✓ ${post.title}`);
    return { success: true, postId: post.id, title: post.title };

  } catch (error: any) {
    console.error(`[Summarize] Error processing post ${post.id}:`, error.message);
    
    // Log detailed error for debugging
    if (error.cause) {
      console.error(`[Summarize] Error cause:`, JSON.stringify({
        name: error.name,
        cause: error.cause,
        value: error.value,
      }, null, 2));
    }

    // Retry logic: retry once if not already retried
    if (retryCount < maxRetries) {
      console.log(`[Summarize] Retrying post ${post.id} (attempt ${retryCount + 2}/${maxRetries + 1})...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return processPost(post, retryCount + 1);
    }

    return {
      success: false,
      postId: post.id,
      title: post.title,
      error: error.message,
    };
  }
}

// Helper to process posts in batches (parallel processing with concurrency limit)
async function processBatch<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`[Summarize] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} posts)`);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

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

    // Process posts in batches of 3 (balance between speed and cost)
    const BATCH_SIZE = 3;
    const results = await processBatch(
      postsToSummarize,
      BATCH_SIZE,
      (post) => processPost(post)
    );

    // Count successes and failures
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`[Summarize] Complete: ${successful.length} posts summarized, ${failed.length} failed`);
    
    if (failed.length > 0) {
      console.error(`[Summarize] Failed posts:`, failed.map(f => f.title));
    }

    return NextResponse.json({
      success: true,
      summarized: successful.length,
      failed: failed.length,
      errors: failed.length > 0 ? failed.map(f => ({ postId: f.postId, title: f.title, error: f.error })) : undefined,
    });
  } catch (error: any) {
    console.error('[Summarize] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
