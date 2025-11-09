"use client";

import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-start px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center">
          <BrandMark
            className="gap-3"
            labelClassName="text-2xl text-primary transition-colors group-hover:text-accent"
            imageClassName="w-9"
            priority
          />
        </Link>
      </div>
    </header>
  );
}
