import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { parseStringPromise } from 'xml2js';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { sources } from '@/db/schema';

const envFile = process.env.ENV_FILE ?? path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envFile)) {
  loadEnv({ path: envFile, override: true });
}

async function upsertSource(name: string, site: string, feed: string) {
  const existing = await db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.feedUrl, feed))
    .limit(1);

  if (existing.length) return;

  await db.insert(sources).values({
    name,
    site,
    feedUrl: feed,
    enabled: true,
  });
}

async function main() {
  const opmlPath = path.resolve(process.cwd(), 'engineering-blogs.opml');
  if (!fs.existsSync(opmlPath)) {
    throw new Error(`OPML file not found at ${opmlPath}`);
  }

  const xml = fs.readFileSync(opmlPath, 'utf8');
  const parsed = await parseStringPromise(xml);

  const outlines =
    parsed?.opml?.body?.[0]?.outline?.flatMap((outline: any) => outline?.outline ?? []) ?? [];

  for (const outline of outlines) {
    const metadata = outline?.$ ?? {};
    const name = metadata.title || metadata.text;
    const feed = metadata.xmlUrl || metadata.url;
    const site = metadata.htmlUrl || metadata.url;
    if (!feed || !name || !site) continue;
    await upsertSource(name, site, feed);
  }

}

(async () => {
  try {
    await main();
    console.log('Imported sources');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
