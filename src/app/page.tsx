import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:px-6 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="font-display text-5xl font-bold text-primary md:text-6xl lg:text-7xl">
              Welcome to Enggist
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Your go-to platform for engineering insights, stories, and knowledge.
              Join our community of passionate engineers building the future.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/get-started"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-accent transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/blog"
                className="inline-flex items-center justify-center rounded-lg border-2 border-primary px-8 py-3 text-base font-semibold text-primary hover:bg-muted transition-colors"
              >
                Read Blog
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t border-secondary bg-card py-20 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-center font-display text-3xl font-bold text-primary md:text-4xl">
              Why Choose Enggist?
            </h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Expert Content",
                  description: "Access high-quality engineering articles written by industry experts.",
                },
                {
                  title: "Community Driven",
                  description: "Connect with fellow engineers and share your knowledge.",
                },
                {
                  title: "Always Learning",
                  description: "Stay updated with the latest trends and technologies.",
                },
              ].map((feature, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-secondary bg-background p-6 transition-shadow hover:shadow-lg"
                >
                  <h3 className="text-xl font-semibold text-primary">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20 md:px-6 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-bold text-primary md:text-4xl">
              Ready to Get Started?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Join thousands of engineers who are already part of our community.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground hover:bg-accent transition-colors"
            >
              Sign Up Now
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
