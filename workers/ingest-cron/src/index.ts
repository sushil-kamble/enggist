/**
 * Enggist Ingest Cron Worker
 * Triggers RSS feed ingestion once daily
 */

export interface Env {
  APP_URL: string;
  INGEST_SECRET: string;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    console.log(`[${new Date().toISOString()}] Triggering ingest...`);

    try {
      const response = await fetch(`${env.APP_URL}/api/ingest/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.INGEST_SECRET}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`Ingest failed: ${response.status} ${response.statusText}`, text);
        return;
      }

      const data = await response.json();
      console.log(`Ingest completed:`, data);
    } catch (error) {
      console.error('Ingest error:', error);
    }
  },
};
