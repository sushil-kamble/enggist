import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SearchablePosts } from "@/components/SearchablePosts";
import { getPaginatedPostsBySource } from "@/lib/queries";
import { parsePostSort } from "@/lib/post-sort";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  const source = await db
    .select()
    .from(sources)
    .where(eq(sources.id, id))
    .limit(1);

  if (source.length === 0) {
    return {
      title: "Company Not Found",
      description: "The requested company could not be found.",
    };
  }

  const company = source[0];
  const title = `${company.name} Engineering Blog Summaries`;
  const description = `Read AI-powered summaries of engineering blog posts from ${company.name}. Stay updated with their latest technical insights and best practices.`;

  return {
    title,
    description,
    keywords: [
      company.name,
      "engineering blog",
      "tech blog",
      "AI summaries",
      "software engineering",
    ],
    openGraph: {
      type: "website",
      url: `/company/${id}`,
      title,
      description,
      siteName: "Enggist",
      images: [
        {
          url: "/logo/android-chrome-512x512.png",
          width: 512,
          height: 512,
          alt: `${company.name} on Enggist`,
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
      canonical: `/company/${id}`,
    },
  };
}

export default async function CompanyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawPage = resolvedSearchParams?.page;
  const sortBy = parsePostSort(resolvedSearchParams?.sort);
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsedPage = pageValue ? parseInt(pageValue, 10) : 1;
  const currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1);
  const pageSize = 10;

  // Fetch source details
  const source = await db
    .select()
    .from(sources)
    .where(eq(sources.id, id))
    .limit(1);

  if (source.length === 0) {
    notFound();
  }

  const company = source[0];
  const { posts, totalCount } = await getPaginatedPostsBySource(id, currentPage, pageSize, sortBy);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (currentPage > totalPages) {
    redirect(`/company/${id}?page=${totalPages}&sort=${sortBy}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b border-secondary/70 bg-card/45">
          <div className="container mx-auto px-4 py-4 md:px-6 md:py-5">
            <div className="rounded-xl border border-secondary/75 bg-background/75 p-4 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Company feed
              </p>
              <div className="mt-2">
                <h1 className="text-2xl font-semibold leading-tight text-primary md:text-3xl">
                {company.name}
                </h1>
              </div>
              <a
                href={company.site}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground hover:underline"
              >
                {company.site}
              </a>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6 md:px-6">
          <SearchablePosts
            key={`${id}-${currentPage}-${sortBy}`}
            initialPosts={posts}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            basePath={`/company/${id}`}
            emptyMessage={`No posts available from ${company.name} yet.`}
            sortBy={sortBy}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
