import { MetadataRoute } from 'next';
import { db } from '@/db';
import { posts, sources } from '@/db/schema';

const VALID_TAGS = ['sre', 'dist', 'data', 'mlp', 'finops', 'security', 'frontend', 'mobile', 'culture'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://enggist.com';

    // Fetch all post IDs with their last modified dates
    const allPosts = await db
        .select({
            id: posts.id,
            publishedAt: posts.publishedAt,
            createdAt: posts.createdAt,
        })
        .from(posts)
        .orderBy(posts.createdAt);

    // Fetch all source IDs
    const allSources = await db
        .select({
            id: sources.id,
            createdAt: sources.createdAt,
        })
        .from(sources);

    // Home page
    const homeEntry: MetadataRoute.Sitemap[0] = {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'hourly',
        priority: 1.0,
    };

    // Post pages
    const postEntries: MetadataRoute.Sitemap = allPosts.map((post) => ({
        url: `${baseUrl}/post/${post.id}`,
        lastModified: post.publishedAt || post.createdAt,
        changeFrequency: 'weekly',
        priority: 0.8,
    }));

    // Company pages
    const companyEntries: MetadataRoute.Sitemap = allSources.map((source) => ({
        url: `${baseUrl}/company/${source.id}`,
        lastModified: source.createdAt,
        changeFrequency: 'daily',
        priority: 0.7,
    }));

    // Tag pages
    const tagEntries: MetadataRoute.Sitemap = VALID_TAGS.map((tag) => ({
        url: `${baseUrl}/tag/${tag}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.6,
    }));

    return [homeEntry, ...postEntries, ...companyEntries, ...tagEntries];
}
