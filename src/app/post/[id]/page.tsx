import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getPostById } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FiExternalLink, FiCalendar } from "react-icons/fi";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    return {
      title: "Post Not Found",
      description: "The requested post could not be found.",
    };
  }

  const description = post.summary?.whyItMatters
    ? post.summary.whyItMatters.slice(0, 160)
    : `Read AI-powered summary of "${post.title}" from ${post.source.name}`;

  const keywords = [
    ...(post.summary?.keywords || []),
    ...(post.summary?.tags || []),
    post.source.name,
    "engineering blog",
    "tech blog summary",
  ];

  return {
    title: post.title,
    description,
    keywords,
    authors: [{ name: post.source.name }],
    openGraph: {
      type: "article",
      url: `/post/${id}`,
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.source.name],
      tags: post.summary?.tags || [],
      images: [
        {
          url: "/logo/android-chrome-512x512.png",
          width: 512,
          height: 512,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: ["/logo/android-chrome-512x512.png"],
    },
    alternates: {
      canonical: `/post/${id}`,
    },
  };
}

export default async function PostDetailPage({ params }: PageProps) {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    notFound();
  }

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : null;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enggist.com';

  // JSON-LD structured data for Article
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary?.whyItMatters || post.excerpt || `Read AI-powered summary of "${post.title}"`,
    url: `${baseUrl}/post/${id}`,
    datePublished: post.publishedAt?.toISOString(),
    author: {
      '@type': 'Organization',
      name: post.source.name,
      url: post.source.site,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Enggist',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo/android-chrome-512x512.png`,
      },
    },
    keywords: [
      ...(post.summary?.keywords || []),
      ...(post.summary?.tags || []),
    ].join(', '),
    articleSection: post.summary?.tags?.[0] || 'Engineering',
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Header />

      <main className="flex-1">
        <article className="container mx-auto px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-secondary/75 bg-card/75 shadow-sm">
            <header className="space-y-2.5 px-5 py-5 md:px-6 md:py-6">
              <h1 className="text-2xl font-semibold leading-tight text-primary md:text-3xl">
                {post.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                <Link
                  href={`/company/${post.source.id}`}
                  className="font-medium transition-colors hover:text-foreground hover:underline"
                >
                  {post.source.name}
                </Link>
                {formattedDate && (
                  <span className="inline-flex items-center gap-1.5">
                    <FiCalendar className="h-4 w-4" />
                    {formattedDate}
                  </span>
                )}
              </div>

              {post.summary?.tags && post.summary.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {post.summary.tags.map((tag) => (
                    <Link key={tag} href={`/tag/${tag}`}>
                      <Badge
                        variant="outline"
                        className="border-primary/25 bg-primary/10 text-primary/90 transition-colors hover:bg-primary/15 hover:text-primary"
                      >
                        #{tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </header>

            <div className="space-y-6 border-t border-secondary/60 px-5 py-5 md:px-6 md:py-6">
              {post.summary ? (
                <>
                  {post.summary.whyItMatters && (
                    <section className="space-y-2">
                      <h2 className="text-base font-semibold text-primary md:text-lg">
                        Why it matters
                      </h2>
                      <p className="rounded-lg bg-muted/60 px-4 py-3 text-sm leading-relaxed text-foreground md:text-base">
                        {post.summary.whyItMatters}
                      </p>
                    </section>
                  )}

                  {post.summary.bullets.length > 0 && (
                    <section className="space-y-2.5">
                      <h2 className="text-base font-semibold text-primary md:text-lg">
                        Key takeaways
                      </h2>
                      <ul className="space-y-2.5 text-sm text-foreground md:text-base">
                        {post.summary.bullets.map((bullet, idx) => (
                          <li key={idx} className="flex gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                            <span className="leading-relaxed">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {post.summary.keywords && post.summary.keywords.length > 0 && (
                    <section className="space-y-2">
                      <h2 className="text-base font-semibold text-primary md:text-lg">
                        Keywords
                      </h2>
                      <div className="flex flex-wrap gap-1.5">
                        {post.summary.keywords.map((keyword) => (
                          <Badge
                            key={keyword}
                            variant="outline"
                            className="border-secondary/80 bg-background/65 text-muted-foreground"
                          >
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Summary is not available yet. This post is still being processed.
                </p>
              )}

              {post.content ? (
                <section className="space-y-3">
                  <h2 className="text-base font-semibold text-primary md:text-lg">
                    Content preview
                  </h2>
                  <div className="relative overflow-hidden rounded-lg border border-secondary/65 bg-background/55">
                    <div className="max-h-[520px] overflow-hidden px-4 pb-28 pt-4 md:px-5">
                      <div className="prose prose-slate dark:prose-invert max-w-none">
                        <div
                          className="text-sm leading-relaxed text-foreground md:text-base [&>h1]:mb-3 [&>h2]:mb-2.5 [&>h3]:mb-2 [&>ol]:mb-3 [&>p]:mb-3 [&>pre]:mb-3 [&>ul]:mb-3"
                          dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-background via-background/92 to-transparent" />

                    <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
                      <div className="pointer-events-auto w-full max-w-md rounded-xl border border-secondary/70 bg-background/92 px-4 py-3 text-center shadow-lg backdrop-blur">
                        <p className="mb-2 text-sm text-muted-foreground">
                          Continue reading on the original blog to support the author
                        </p>
                        <Button asChild className="h-9 px-4 text-sm">
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Read full article
                            <FiExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="pt-1">
                  <Button asChild className="h-9 px-4 text-sm">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Read full article
                      <FiExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
