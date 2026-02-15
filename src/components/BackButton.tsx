"use client";

import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

import { Button } from "@/components/ui/button";

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
}

export default function BackButton({
  fallbackHref = "/",
  label = "Back to posts",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push(fallbackHref);
      }}
      className="h-8 cursor-pointer rounded-full bg-transparent px-3 text-sm text-muted-foreground transition-opacity hover:bg-transparent hover:text-foreground/90 hover:opacity-80 active:bg-transparent"
    >
      <FiArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
