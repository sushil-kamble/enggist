import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SearchablePosts } from "@/components/SearchablePosts";
import { getPaginatedPostsByTag } from "@/lib/queries";
import { parsePostSort } from "@/lib/post-sort";
import { Badge } from "@/components/ui/badge";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

const VALID_TAGS = ['sre', 'dist', 'data', 'mlp', 'finops', 'security', 'frontend', 'mobile', 'culture'];

const TAG_DESCRIPTIONS: Record<string, string> = {
  sre: "Site Reliability Engineering posts covering monitoring, incident response, and system reliability",
  dist: "Distributed systems architecture, scalability, and design patterns",
  data: "Data engineering, pipelines, analytics, and data infrastructure",
  mlp: "Machine learning in production, MLOps, and AI engineering",
  finops: "Cloud cost optimization, financial operations, and infrastructure efficiency",
  security: "Security best practices, vulnerability management, and secure development",
  frontend: "Frontend development, UI/UX, and modern web frameworks",
  mobile: "Mobile app development, iOS, Android, and cross-platform solutions",
  culture: "Engineering culture, team practices, and organizational insights",
};

export function generateStaticParams() {
  return VALID_TAGS.map((tag) => ({ tag }));
}

interface PageProps {
  params: Promise<{ tag: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tag } = await params;

  if (!VALID_TAGS.includes(tag)) {
    return {
      title: "Tag Not Found",
      description: "The requested tag could not be found.",
    };
  }

  const title = `${tag.toUpperCase()} Engineering Posts`;
  const description = TAG_DESCRIPTIONS[tag] || `Engineering blog posts tagged with ${tag}`;

  return {
    title,
    description,
    keywords: [
      tag,
      "engineering blog",
      "tech blog",
      "AI summaries",
      "software engineering",
    ],
    openGraph: {
      type: "website",
      url: `/tag/${tag}`,
      title,
      description,
      siteName: "Enggist",
      images: [
        {
          url: "/logo/android-chrome-512x512.png",
          width: 512,
          height: 512,
          alt: `${tag} posts on Enggist`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/logo/android-chrome-512x512.png"],
    },
    alternates: {
      canonical: `/tag/${tag}`,
    },
  };
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { tag } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawPage = resolvedSearchParams?.page;
  const sortBy = parsePostSort(resolvedSearchParams?.sort);
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsedPage = pageValue ? parseInt(pageValue, 10) : 1;
  const currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1);
  const pageSize = 10;

  if (!VALID_TAGS.includes(tag)) {
    notFound();
  }

  const { posts, totalCount } = await getPaginatedPostsByTag(tag, currentPage, pageSize, sortBy);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (currentPage > totalPages) {
    redirect(`/tag/${tag}?page=${totalPages}&sort=${sortBy}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b border-secondary/70 bg-card/45">
          <div className="container mx-auto px-4 py-4 md:px-6 md:py-5">
            <div className="rounded-xl border border-secondary/75 bg-background/75 p-4 shadow-sm">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Curated topic
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default" className="px-3 py-0.5 text-sm font-semibold">
                  {tag}
                </Badge>
                <h1 className="text-2xl font-semibold leading-tight text-primary md:text-3xl">
                  Posts tagged with {tag}
                </h1>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6 md:px-6">
          <SearchablePosts
            key={`${tag}-${currentPage}-${sortBy}`}
            initialPosts={posts}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            basePath={`/tag/${tag}`}
            emptyMessage={`No posts found with the tag "${tag}". Check back later!`}
            sortBy={sortBy}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
