import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SearchablePosts } from "@/components/SearchablePosts";
import { getPaginatedPostsBySource } from "@/lib/queries";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CompanyPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawPage = resolvedSearchParams?.page;
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
  const { posts, totalCount } = await getPaginatedPostsBySource(id, currentPage, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (currentPage > totalPages) {
    redirect(`/company/${id}?page=${totalPages}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="border-b border-secondary bg-card">
          <div className="container mx-auto px-4 py-12 md:px-6">
            <div>
              <h1 className="text-3xl font-bold text-primary">
                {company.name}
              </h1>
              <a
                href={company.site}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:underline mt-2 inline-block"
              >
                {company.site}
              </a>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-6">
          <h2 className="text-2xl font-bold text-primary mb-8">
            Blogs from {company.name}
          </h2>

          <SearchablePosts
            key={`${id}-${currentPage}`}
            initialPosts={posts}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            basePath={`/company/${id}`}
            emptyMessage={`No posts available from ${company.name} yet.`}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
