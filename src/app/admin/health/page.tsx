import { headers } from 'next/headers';
import { db } from '@/db';
import { posts, sources, summaries } from '@/db/schema';
import { eq, sql, gte } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

async function validateAuth() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  const expectedSecret = process.env.INGEST_SECRET;

  if (!expectedSecret || !authHeader) {
    return false;
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  return token === expectedSecret;
}

interface SourceStats {
  id: string;
  name: string;
  enabled: boolean;
  postsLast24h: number;
  postsLast7d: number;
  totalPosts: number;
  latestPostDate: Date | null;
}

export default async function AdminHealthPage() {
  // For server components, we'll use a simple message if auth fails
  // In production, you'd want a proper auth middleware
  const isAuthed = await validateAuth();
  
  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              This page requires authorization. Include the Bearer token in your request headers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Example: <code className="bg-muted px-2 py-1 rounded">Authorization: Bearer YOUR_SECRET</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch health metrics
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get all sources with stats
  const allSources = await db.select().from(sources);
  
  const sourceStats: SourceStats[] = await Promise.all(
    allSources.map(async (source) => {
      const [postsLast24h] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(
          sql`${posts.sourceId} = ${source.id} AND ${posts.createdAt} >= ${oneDayAgo.toISOString()}`
        );

      const [postsLast7d] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(
          sql`${posts.sourceId} = ${source.id} AND ${posts.createdAt} >= ${sevenDaysAgo.toISOString()}`
        );

      const [totalPosts] = await db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(eq(posts.sourceId, source.id));

      const latestPost = await db
        .select({ publishedAt: posts.publishedAt })
        .from(posts)
        .where(eq(posts.sourceId, source.id))
        .orderBy(sql`${posts.publishedAt} DESC NULLS LAST`)
        .limit(1);

      return {
        id: source.id,
        name: source.name,
        enabled: source.enabled,
        postsLast24h: Number(postsLast24h?.count || 0),
        postsLast7d: Number(postsLast7d?.count || 0),
        totalPosts: Number(totalPosts?.count || 0),
        latestPostDate: latestPost[0]?.publishedAt || null,
      };
    })
  );

  // Overall stats
  const [totalPostsCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts);

  const [postsLast24hCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(posts)
    .where(gte(posts.createdAt, oneDayAgo));

  const [totalSummariesCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(summaries);

  const postsWithoutSummariesResult = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*) as count
    FROM posts p
    LEFT JOIN summaries s ON s.post_id = p.id
    WHERE s.id IS NULL
  `);
  
  const postsWithoutSummariesCount = postsWithoutSummariesResult[0]?.count
    ? parseInt(postsWithoutSummariesResult[0].count)
    : 0;

  const staleFeeds = sourceStats.filter(
    (s) => s.enabled && s.postsLast7d === 0 && s.totalPosts > 0
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            System Health Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor ingestion, summarization, and feed health
          </p>
        </header>

        {/* Overall Stats */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Posts</CardDescription>
              <CardTitle className="text-3xl">{totalPostsCount.count}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Posts (24h)</CardDescription>
              <CardTitle className="text-3xl">{postsLast24hCount.count}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Summaries</CardDescription>
              <CardTitle className="text-3xl">{totalSummariesCount.count}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Pending Summaries</CardDescription>
              <CardTitle className="text-3xl">
                {postsWithoutSummariesCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Stale Feeds Alert */}
        {staleFeeds.length > 0 && (
          <Card className="mb-8 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">⚠️ Stale Feeds</CardTitle>
              <CardDescription>
                These feeds haven't received new posts in 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {staleFeeds.map((feed) => (
                  <li key={feed.id} className="flex items-center gap-2">
                    <Badge variant="destructive">{feed.name}</Badge>
                    <span className="text-sm text-muted-foreground">
                      Last post:{' '}
                      {feed.latestPostDate
                        ? new Date(feed.latestPostDate).toLocaleDateString()
                        : 'Never'}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Per-Source Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Source Breakdown</CardTitle>
            <CardDescription>Posts ingested per source</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sourceStats.map((source) => (
                <div key={source.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{source.name}</span>
                      {!source.enabled && (
                        <Badge variant="outline">Disabled</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground">
                      <span>24h: <strong>{source.postsLast24h}</strong></span>
                      <span>7d: <strong>{source.postsLast7d}</strong></span>
                      <span>Total: <strong>{source.totalPosts}</strong></span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(source.totalPosts / Number(totalPostsCount.count)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
