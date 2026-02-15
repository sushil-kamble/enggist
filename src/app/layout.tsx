import type { Metadata } from "next";
import { Bungee, Work_Sans } from "next/font/google";
import "./globals.css";
import { TopLoaderProvider } from "@/components/TopLoaderProvider";
import ScrollToTopOnPathChange from "@/components/ScrollToTopOnPathChange";

const bungee = Bungee({
  weight: "400",
  variable: "--font-bungee",
  subsets: ["latin"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://enggist.com"
  ),
  title: {
    default: "Enggist - Engineering Blog Summaries Powered by AI",
    template: "%s - Enggist",
  },
  description:
    "Stay current with the latest engineering insights from top tech companies. AI-powered summaries of engineering blogs covering SRE, distributed systems, data engineering, ML, security, and more.",
  keywords: [
    "engineering blogs",
    "tech blogs",
    "AI summaries",
    "software engineering",
    "SRE",
    "distributed systems",
    "data engineering",
    "machine learning",
    "DevOps",
    "cloud computing",
    "system design",
  ],
  authors: [{ name: "Enggist" }],
  creator: "Enggist",
  publisher: "Enggist",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Enggist",
    title: "Enggist - Engineering Blog Summaries Powered by AI",
    description:
      "Stay current with the latest engineering insights from top tech companies. AI-powered summaries of engineering blogs.",
    images: [
      {
        url: "/logo/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Enggist Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Enggist - Engineering Blog Summaries Powered by AI",
    description:
      "Stay current with the latest engineering insights from top tech companies. AI-powered summaries of engineering blogs.",
    images: ["/logo/android-chrome-512x512.png"],
    creator: "@enggist",
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [
      {
        url: "/logo/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${workSans.variable} ${bungee.variable} antialiased font-sans`}
      >
        <TopLoaderProvider />
        <ScrollToTopOnPathChange />
        {children}
      </body>
    </html>
  );
}
