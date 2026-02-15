import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function PostDetailLoading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <article className="container mx-auto px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto mb-2.5 max-w-5xl">
            <Skeleton className="h-8 w-36 rounded-full bg-muted/65" />
          </div>

          <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-secondary/75 bg-card/75 shadow-sm">
            <header className="space-y-2.5 px-5 py-5 md:px-6 md:py-6">
              <Skeleton className="h-8 w-11/12 bg-muted/70 md:h-10" />
              <Skeleton className="h-4 w-2/5 bg-muted/65" />
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Skeleton className="h-6 w-16 rounded-full bg-muted/65" />
                <Skeleton className="h-6 w-20 rounded-full bg-muted/65" />
                <Skeleton className="h-6 w-14 rounded-full bg-muted/65" />
              </div>
            </header>

            <div className="space-y-6 border-t border-secondary/60 px-5 py-5 md:px-6 md:py-6">
              <section className="space-y-2.5">
                <Skeleton className="h-5 w-32 bg-muted/65" />
                <Skeleton className="h-20 w-full rounded-lg bg-muted/60" />
              </section>

              <section className="space-y-2.5">
                <Skeleton className="h-5 w-28 bg-muted/65" />
                <div className="space-y-2.5">
                  <Skeleton className="h-4 w-11/12 bg-muted/60" />
                  <Skeleton className="h-4 w-10/12 bg-muted/60" />
                  <Skeleton className="h-4 w-9/12 bg-muted/60" />
                </div>
              </section>

              <section className="space-y-3">
                <Skeleton className="h-5 w-32 bg-muted/65" />
                <div className="overflow-hidden rounded-lg border border-secondary/65 bg-background/55 px-4 py-4 md:px-5">
                  <div className="space-y-2.5">
                    <Skeleton className="h-4 w-full bg-muted/60" />
                    <Skeleton className="h-4 w-11/12 bg-muted/60" />
                    <Skeleton className="h-4 w-10/12 bg-muted/60" />
                    <Skeleton className="h-4 w-8/12 bg-muted/60" />
                  </div>
                </div>
              </section>

              <section className="space-y-3 pt-1">
                <Skeleton className="h-5 w-32 bg-muted/65" />
                <div className="grid gap-2.5 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`related-post-skeleton-${index}`}
                      className="rounded-lg border border-secondary/65 bg-background/55 px-3.5 py-3"
                    >
                      <Skeleton className="h-3.5 w-3/5 bg-muted/60" />
                      <Skeleton className="mt-2 h-4 w-11/12 bg-muted/65" />
                      <Skeleton className="mt-2 h-3.5 w-full bg-muted/55" />
                      <Skeleton className="mt-1.5 h-3.5 w-9/12 bg-muted/55" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
