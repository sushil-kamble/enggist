import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SearchablePosts } from "@/components/SearchablePosts";
import { getLastIndexedAt, getPaginatedPosts } from "@/lib/queries";
import { parsePostSort } from "@/lib/post-sort";
import { redirect } from "next/navigation";

interface HomeProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const pageSize = 10;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawPage = resolvedSearchParams?.page;
  const sortBy = parsePostSort(resolvedSearchParams?.sort);
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsedPage = pageValue ? parseInt(pageValue, 10) : 1;
  const currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1);

  const [{ posts, totalCount }, lastIndexedAt] = await Promise.all([
    getPaginatedPosts(currentPage, pageSize, sortBy),
    getLastIndexedAt(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const lastIndexedLabel = lastIndexedAt
    ? new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(lastIndexedAt))
    : "Not indexed yet";

  if (currentPage > totalPages) {
    redirect(`/?page=${totalPages}&sort=${sortBy}`);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enggist.com';

  // JSON-LD structured data for WebSite with search action
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Enggist',
    description: 'Engineering blog summaries powered by AI. Stay current with the latest from top engineering teams.',
    url: baseUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
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
        <section className="border-b border-secondary/70 bg-card/45">
          <div className="container mx-auto px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-xl font-semibold leading-tight text-primary md:text-2xl">
                  Explore the latest engineering posts and summaries
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Search by topic, company, or concept and scan results quickly.
                </p>
              </div>

              <div className="w-full px-0 py-0 md:w-auto md:min-w-[240px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Posts indexed
                  </span>
                  <span className="text-xl font-semibold leading-none text-primary/90">
                    {totalCount.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    Last indexed
                  </span>
                  <span className="text-sm font-medium text-foreground/85">
                    {lastIndexedLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Posts */}
        <section className="container mx-auto px-4 py-6 md:px-6">
          <SearchablePosts
            key={`${currentPage}-${sortBy}`}
            initialPosts={posts}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            sortBy={sortBy}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
