import { BrandMark } from "@/components/BrandMark";
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 w-full border-t border-secondary/80 bg-card/65">
      <div className="container mx-auto px-4 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <BrandMark
              className="items-center gap-2"
              labelClassName="text-lg text-primary"
              imageClassName="w-6"
              size={24}
            />
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              AI-powered summaries of engineering blogs from teams building at scale.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-1.5 text-xs md:justify-end">
            <Link
              href="/"
              className="rounded-full border border-secondary/80 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Latest
            </Link>
            <Link
              href="/tag/frontend"
              className="rounded-full border border-secondary/80 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Frontend
            </Link>
            <Link
              href="/tag/data"
              className="rounded-full border border-secondary/80 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Data
            </Link>
            <Link
              href="/tag/security"
              className="rounded-full border border-secondary/80 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Security
            </Link>
          </nav>
        </div>

        <div className="mt-4 flex flex-col gap-1.5 border-t border-secondary/70 pt-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {currentYear} Enggist. All rights reserved.</p>
          <p>Curated for engineers who want signal, not noise.</p>
        </div>
      </div>
    </footer>
  );
}
