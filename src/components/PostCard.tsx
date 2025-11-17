import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PostWithSummary } from '@/lib/queries';
import { FiExternalLink, FiCalendar } from 'react-icons/fi';

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
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="mb-3 text-2xl leading-snug">
              <Link href={`/post/${post.id}`} className="hover:underline">
                {post.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-base">
              <Link
                href={`/company/${post.source.id}`}
                className="font-medium hover:underline"
              >
                {post.source.name}
              </Link>
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <FiCalendar className="h-4 w-4" />
                  {formattedDate}
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      {post.summary && (
        <CardContent className="flex-1 space-y-4">
          {post.summary.whyItMatters && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-base font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">Why it matters:</span>{' '}
                {post.summary.whyItMatters}
              </p>
            </div>
          )}

          {post.summary.bullets.length > 0 && (
            <ul className="space-y-2 text-base">
              {post.summary.bullets.map((bullet, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="font-bold text-primary">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}

      <CardFooter className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {post.summary?.tags.map((tag) => (
            <Link key={tag} href={`/tag/${tag}`}>
              <Badge
                variant="outline"
                className="cursor-pointer px-3 py-1 text-sm hover:bg-accent hover:text-white"
              >
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-base font-medium text-primary hover:underline"
        >
          Read original
          <FiExternalLink className="h-4 w-4" />
        </a>
      </CardFooter>
    </Card>
  );
}
