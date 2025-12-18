/**
 * Enggist Summarization Cron Worker
 *
 * Runs once per day at 2 AM UTC
 *
 * COST PROTECTION GUARDRAILS:
 * 1. Hard limit: Max 15 posts per run (API enforced)
 * 2. Daily frequency: Only runs once per day
 * 3. Idempotent: Never re-summarizes existing summaries
 * 4. Fail-safe: Stops on API errors (no retry loops)
 * 5. Monitoring: Logs all operations for cost tracking
 *
 * Estimated Cost per Run:
 * - 15 posts × ~2000 tokens each = ~30,000 tokens
 * - Gemini 3 Flash Preview: $0.075 per 1M input tokens
 * - Cost per run: ~$0.002 (0.2 cents)
 * - Monthly cost: ~$0.06 (30 runs)
 */

export interface Env {
  APP_URL: string;
  INGEST_SECRET: string;
  // Optional: Set to 'true' to disable summarization without redeploying
  SUMMARIZATION_DISABLED?: string;
}

const summarizationWorker = {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Summarization cron triggered`);

    // GUARDRAIL 1: Emergency kill switch
    if (env.SUMMARIZATION_DISABLED === "true") {
      console.log(`[${timestamp}] ⚠️  Summarization disabled via env var`);
      return;
    }

    // GUARDRAIL 2: Validate required env vars
    if (!env.APP_URL || !env.INGEST_SECRET) {
      console.error(`[${timestamp}] ❌ Missing required env vars`);
      return;
    }

    try {
      console.log(`[${timestamp}] Calling summarization API...`);

      const response = await fetch(`${env.APP_URL}/api/summarize/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.INGEST_SECRET}`,
          "Content-Type": "application/json",
        },
        // GUARDRAIL 3: Timeout to prevent hanging requests
        signal: AbortSignal.timeout(600000), // 10 minute timeout
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(
          `[${timestamp}] ❌ Summarization failed: ${response.status} ${response.statusText}`,
          text
        );
        // GUARDRAIL 4: Don't retry on failure - just log and exit
        return;
      }

      const data = (await response.json()) as { summarized?: number };
      console.log(`[${timestamp}] ✅ Summarization completed:`, data);

      // Log cost estimate
      const summarizedCount = data.summarized || 0;
      const estimatedTokens = summarizedCount * 2000;
      const estimatedCost = (estimatedTokens / 1_000_000) * 0.075;
      console.log(
        `[${timestamp}] 💰 Estimated cost: $${estimatedCost.toFixed(4)} ` +
          `(${summarizedCount} posts, ~${estimatedTokens.toLocaleString()} tokens)`
      );

      // GUARDRAIL 5: Alert if unexpectedly high usage
      if (summarizedCount > 15) {
        console.warn(
          `[${timestamp}] ⚠️  WARNING: Summarized ${summarizedCount} posts ` +
            `(expected max 15). Check API limits!`
        );
      }
    } catch (error: unknown) {
      // GUARDRAIL 6: Catch and log errors, but don't retry
      if (error instanceof Error && error.name === "TimeoutError") {
        console.error(`[${timestamp}] ❌ Request timeout after 10 minutes`);
      } else if (error instanceof Error) {
        console.error(`[${timestamp}] ❌ Summarization error:`, error.message);
      } else {
        console.error(`[${timestamp}] ❌ Summarization error:`, error);
      }
      // Exit gracefully - will retry next day
    }
  },
};

export default summarizationWorker;
