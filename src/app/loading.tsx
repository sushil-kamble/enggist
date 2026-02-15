import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-6 md:px-6">
      <div className="space-y-3 rounded-xl border border-secondary/70 bg-card/60 p-4">
        <Skeleton className="h-6 w-2/3 bg-muted/70" />
        <Skeleton className="h-4 w-1/2 bg-muted/65" />
      </div>

      <div className="mt-5 space-y-3">
        <Skeleton className="h-12 w-full rounded-2xl bg-muted/65" />
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
    </main>
  );
}
