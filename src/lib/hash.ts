import { createHash } from 'crypto';

/**
 * Generate a SHA-256 content hash for deduplication
 * Hash is based on url + title + published_at
 */
export function generateContentHash(
  url: string,
  title: string,
  publishedAt?: Date | null
): string {
  const content = [
    url.trim().toLowerCase(),
    title.trim().toLowerCase(),
    publishedAt ? publishedAt.toISOString() : '',
  ].join('|');

  return createHash('sha256').update(content).digest('hex');
}
