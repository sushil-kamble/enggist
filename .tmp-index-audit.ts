import { db } from './src/db/index.ts';
import { sql } from 'drizzle-orm';

async function main() {
  const defs = await db.execute<{
    schemaname: string;
    tablename: string;
    indexname: string;
    indexdef: string;
  }>(sql`
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename IN ('posts', 'sources', 'summaries')
    ORDER BY tablename, indexname
  `);

  const stats = await db.execute<{
    schemaname: string;
    tablename: string;
    indexname: string;
    idx_scan: string | null;
    idx_tup_read: string | null;
    idx_tup_fetch: string | null;
    index_size: string;
  }>(sql`
    SELECT
      s.schemaname,
      s.relname AS tablename,
      s.indexrelname AS indexname,
      s.idx_scan::text,
      s.idx_tup_read::text,
      s.idx_tup_fetch::text,
      pg_size_pretty(pg_relation_size(s.indexrelid)) AS index_size
    FROM pg_stat_user_indexes s
    WHERE s.schemaname = 'public'
      AND s.relname IN ('posts', 'sources', 'summaries')
    ORDER BY s.relname, s.indexrelname
  `);

  console.log('--- DEFINITIONS ---');
  for (const row of defs) {
    console.log(`${row.tablename}.${row.indexname}`);
    console.log(`  ${row.indexdef}`);
  }

  console.log('\n--- USAGE ---');
  for (const row of stats) {
    console.log(
      `${row.tablename}.${row.indexname} scans=${row.idx_scan ?? '0'} read=${row.idx_tup_read ?? '0'} fetch=${row.idx_tup_fetch ?? '0'} size=${row.index_size}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
