import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PostWithSummary } from '@/lib/queries';
import { FiArrowUpRight, FiCalendar, FiGlobe } from 'react-icons/fi';

interface PostCardProps {
  post: PostWithSummary;
}

export function PostCard({ post }: PostCardProps) {
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : null;

  return (
    <Card className="group relative flex h-full flex-col gap-0 overflow-hidden border-secondary/80 bg-card/90 py-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="pt-6 pb-3">
        <div className="space-y-2">
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <Link
              href={`/company/${post.source.id}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-secondary/80 bg-muted/50 px-3 py-1 font-medium text-foreground transition-colors hover:bg-muted"
            >
              <FiGlobe className="h-3.5 w-3.5" />
              {post.source.name}
            </Link>
            {formattedDate && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/80 bg-background/70 px-3 py-1">
                <FiCalendar className="h-3.5 w-3.5" />
                {formattedDate}
              </span>
            )}
          </CardDescription>

          <CardTitle className="text-2xl leading-snug">
            <Link href={`/post/${post.id}`} className="transition-colors hover:text-accent">
              {post.title}
            </Link>
          </CardTitle>
        </div>
      </CardHeader>

      {post.summary && (
        <CardContent className="flex-1 space-y-3 pb-5">
          {post.summary.whyItMatters && (
            <div className="rounded-lg border border-secondary/70 bg-muted/70 p-4">
              <p className="text-sm font-medium text-muted-foreground md:text-base">
                <span className="font-semibold text-foreground">Why it matters:</span>{" "}
                {post.summary.whyItMatters}
              </p>
            </div>
          )}

          {post.summary.bullets.length > 0 && (
            <ul className="space-y-2.5 text-sm text-foreground md:text-base">
              {post.summary.bullets.map((bullet, idx) => (
                <li key={idx} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}

      {!post.summary && post.excerpt && (
        <CardContent className="flex-1 pb-5">
          <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{post.excerpt}</p>
        </CardContent>
      )}

      <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-2 !pt-1.5 pb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {post.summary?.tags.map((tag) => (
            <Link key={tag} href={`/tag/${tag}`}>
              <Badge
                variant="outline"
                className="cursor-pointer border-primary/30 bg-primary/10 px-2 py-0.5 text-xs leading-5 text-primary/90 transition-colors hover:bg-primary/15 hover:text-primary"
              >
                #{tag}
              </Badge>
            </Link>
          ))}
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex items-center gap-0.5 text-xs font-semibold text-primary transition-colors hover:text-accent hover:underline md:text-sm"
        >
          Read original
          <FiArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </CardFooter>
    </Card>
  );
}
