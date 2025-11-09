import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const sources = pgTable('sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  site: text('site').notNull(),
  feedUrl: text('feed_url').notNull().unique(),
  category: text('category').$type<
    'sre'|'dist'|'data'|'mlp'|'finops'|'security'|'frontend'|'mobile'|'culture'
  >().default('culture'),
  enabled: boolean('enabled').notNull().default(true),
  lastSeenItemHash: text('last_seen_item_hash'),
  lastEtag: text('last_etag'),
  lastModified: text('last_modified'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull().references(() => sources.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  url: text('url').notNull(),
  canonicalUrl: text('canonical_url'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  author: text('author'),
  excerpt: text('excerpt'),
  content: text('content'),
  contentHash: text('content_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  // search_tsv exists in DB; managed via SQL migration + trigger
});

export const summaries = pgTable('summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  bulletsJson: jsonb('bullets_json').notNull(),
  whyItMatters: text('why_it_matters'),
  tags: text('tags').array().default(sql`'{}'::text[]`),
  keywords: text('keywords').array().default(sql`'{}'::text[]`),
  model: text('model'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
