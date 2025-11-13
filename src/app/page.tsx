import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SearchablePosts } from "@/components/SearchablePosts";
import { getPaginatedPosts } from "@/lib/queries";
import { redirect } from "next/navigation";

interface HomeProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const pageSize = 10;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawPage = resolvedSearchParams?.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsedPage = pageValue ? parseInt(pageValue, 10) : 1;
  const currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1);

  const { posts, totalCount } = await getPaginatedPosts(currentPage, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (currentPage > totalPages) {
    redirect(`/?page=${totalPages}`);
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
        {/* Hero Section */}
        <section className="border-b border-secondary bg-card">
          <div className="container mx-auto px-4 py-12 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="font-display text-4xl font-bold text-primary md:text-5xl">
                Enggist
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Engineering blog summaries powered by AI. Stay current with the latest from top engineering teams.
              </p>
            </div>
          </div>
        </section>

        {/* Latest Posts */}
        <section className="container mx-auto px-4 py-12 md:px-6">
          <SearchablePosts
            key={currentPage}
            initialPosts={posts}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
