import Image from "next/image";

import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  labelClassName?: string;
  imageClassName?: string;
  size?: number;
  priority?: boolean;
};

export function BrandMark({
  className,
  labelClassName,
  imageClassName,
  size = 32,
  priority,
}: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo/android-chrome-192x192.png"
        alt="Enggist logo"
        width={size}
        height={size}
        priority={priority}
        className={cn("h-auto w-8", imageClassName)}
      />
      <span className={cn("font-display font-bold text-primary", labelClassName)}>
        Enggist
      </span>
    </span>
  );
}
