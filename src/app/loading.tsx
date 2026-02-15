import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="border-b border-secondary/70 bg-card/45">
          <div className="container mx-auto px-4 py-4 md:px-6 md:py-5">
            <div className="rounded-xl border border-secondary/75 bg-background/75 p-4 shadow-sm">
              <Skeleton className="h-8 w-2/3 bg-muted/70 md:h-9 md:w-1/2" />
              <Skeleton className="mt-2 h-4 w-11/12 bg-muted/65 md:w-2/3" />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-6 md:px-6">
          <div className="space-y-6">
            <div className="rounded-2xl bg-card/70 p-2 shadow-sm ring-1 ring-secondary/70">
              <Skeleton className="h-11 w-full rounded-xl bg-muted/65" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`app-loading-card-${index}`}
                  className="rounded-xl border border-secondary/75 bg-card/75 p-5"
                >
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-2/5 bg-muted/65" />
                    <Skeleton className="h-6 w-11/12 bg-muted/70" />
                    <Skeleton className="h-6 w-8/12 bg-muted/70" />
                    <Skeleton className="h-16 w-full bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
