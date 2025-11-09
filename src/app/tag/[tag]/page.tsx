import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SearchablePosts } from "@/components/SearchablePosts";
import { getPaginatedPostsByTag } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { notFound, redirect } from "next/navigation";

const VALID_TAGS = ['sre', 'dist', 'data', 'mlp', 'finops', 'security', 'frontend', 'mobile', 'culture'];

export function generateStaticParams() {
  return VALID_TAGS.map((tag) => ({ tag }));
}

interface PageProps {
  params: Promise<{ tag: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TagPage({ params, searchParams }: PageProps) {
  const { tag } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rawPage = resolvedSearchParams?.page;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const parsedPage = pageValue ? parseInt(pageValue, 10) : 1;
  const currentPage = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1);
  const pageSize = 10;
  
  if (!VALID_TAGS.includes(tag)) {
    notFound();
  }

  const { posts, totalCount } = await getPaginatedPostsByTag(tag, currentPage, pageSize);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (currentPage > totalPages) {
    redirect(`/tag/${tag}?page=${totalPages}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        <section className="border-b border-secondary bg-card">
          <div className="container mx-auto px-4 py-12 md:px-6">
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-lg px-4 py-1">
                {tag}
              </Badge>
              <h1 className="text-3xl font-bold text-primary">
                Posts tagged with {tag}
              </h1>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-6">
          <SearchablePosts
            key={`${tag}-${currentPage}`}
            initialPosts={posts}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            basePath={`/tag/${tag}`}
            emptyMessage={`No posts found with the tag "${tag}". Check back later!`}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
