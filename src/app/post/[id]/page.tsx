import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getPostById } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
        <article className="container mx-auto px-4 py-12 md:px-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
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
            </div>

            {post.summary?.tags && post.summary.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.summary.tags.map((tag) => (
                  <Link key={tag} href={`/tag/${tag}`}>
                    <Badge variant="secondary" className="hover:bg-accent cursor-pointer">
                      {tag}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </header>

          <Separator className="my-8" />

          {post.summary ? (
            <div className="space-y-8">
              {post.summary.whyItMatters && (
                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">
                    Why It Matters
                  </h2>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-foreground leading-relaxed">
                      {post.summary.whyItMatters}
                    </p>
                  </div>
                </section>
              )}

              {post.summary.bullets.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">
                    Key Takeaways
                  </h2>
                  <ul className="space-y-3">
                    {post.summary.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="text-primary font-bold text-lg flex-shrink-0">
                          •
                        </span>
                        <span className="text-foreground leading-relaxed">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {post.summary.keywords && post.summary.keywords.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold text-primary mb-3">
                    Keywords
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {post.summary.keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Summary not available yet. The post is being processed.
              </p>
            </div>
          )}

          {post.content && (
            <>
              <Separator className="my-8" />

              <section className="relative">
                <h2 className="text-xl font-semibold text-primary mb-4">
                  Content Preview
                </h2>
                <div className="relative">
                  {/* Content container with max height and overflow hidden */}
                  <div className="max-h-[500px] overflow-hidden">
                    <div className="prose prose-slate dark:prose-invert max-w-none">
                      <div
                        className="text-foreground leading-relaxed [&>p]:mb-4 [&>h1]:mb-4 [&>h2]:mb-3 [&>h3]:mb-2 [&>ul]:mb-4 [&>ol]:mb-4 [&>pre]:mb-4"
                        dangerouslySetInnerHTML={{ __html: post.content }}
                      />
                    </div>
                  </div>

                  {/* Elongated gradient overlay with brand colors */}
                  <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background via-background/98 to-transparent pointer-events-none z-0" />
                  <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-accent/30 via-accent/15 to-transparent pointer-events-none z-0" />
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-primary/20 via-primary/10 to-transparent pointer-events-none z-0" />

                  {/* Call to action floating inside gradient */}
                  <div className="absolute inset-x-0 bottom-8 flex justify-center z-10">
                    <div className="pointer-events-auto rounded-2xl border border-primary/10 bg-background/95 px-8 py-6 text-center shadow-xl backdrop-blur">
                      <p className="text-sm text-muted-foreground mb-4">
                        Continue reading on the original blog to support the author
                      </p>
                      <Button
                        asChild
                        size="lg"
                        className="relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                          <span className="relative">Read Full Article</span>
                          <FiExternalLink className="h-5 w-5 relative" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {!post.content && (
            <div className="flex justify-center mt-8">
              <Button
                asChild
                size="lg"
                className="relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <a
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-accent via-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                  <span className="relative">Read Full Article</span>
                  <FiExternalLink className="h-5 w-5 relative" />
                </a>
              </Button>
            </div>
          )}
        </article>
      </main>

      <Footer />
    </div>
  );
}
