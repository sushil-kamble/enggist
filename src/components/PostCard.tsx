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
            <CardTitle className="text-xl leading-tight mb-2">
              <Link href={`/post/${post.id}`} className="hover:underline">
                {post.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-4 text-sm">
              <Link
                href={`/company/${post.source.id}`}
                className="font-medium hover:underline"
              >
                {post.source.name}
              </Link>
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <FiCalendar className="h-3 w-3" />
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
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium text-muted-foreground">
                <span className="font-semibold text-foreground">Why it matters:</span>{' '}
                {post.summary.whyItMatters}
              </p>
            </div>
          )}

          {post.summary.bullets.length > 0 && (
            <ul className="space-y-2 text-sm">
              {post.summary.bullets.map((bullet, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-primary font-bold">•</span>
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
              <Badge variant="secondary" className="hover:bg-accent cursor-pointer">
                {tag}
              </Badge>
            </Link>
          ))}
        </div>
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1"
        >
          Read original
          <FiExternalLink className="h-3 w-3" />
        </a>
      </CardFooter>
    </Card>
  );
}
