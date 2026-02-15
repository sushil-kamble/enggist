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
      className="h-8 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
    >
      <FiArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
