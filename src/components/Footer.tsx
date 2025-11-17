import { BrandMark } from "@/components/BrandMark";

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-background">
      {/* Bottom Bar */}
      <div className="mt-12 border-t border-secondary p-8">
        <div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
          <p className="text-sm text-muted-foreground">
            © {currentYear}{" "}
            <BrandMark
              className="inline-flex items-center gap-2 align-middle"
              labelClassName="text-sm text-muted-foreground font-semibold"
              imageClassName="w-5"
              size={20}
            />
            . All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with ❤️ for engineers
          </p>
        </div>
      </div>
    </footer>
  );
}
