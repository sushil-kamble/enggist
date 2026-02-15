import { drizzle } from 'drizzle-orm/postgres-js';
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  loadEnv({ path: '.env.local' });
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

type PostgresClient = ReturnType<typeof postgres>;

const globalForDb = globalThis as typeof globalThis & {
  __enggistPostgresClient?: PostgresClient;
};

const maxConnections = Number(process.env.DATABASE_MAX_CONNECTIONS ?? '10');

// Use a shared client in development to avoid connection churn during HMR.
const client =
  globalForDb.__enggistPostgresClient ??
  postgres(process.env.DATABASE_URL, {
    max: Number.isNaN(maxConnections) ? 10 : maxConnections,
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.__enggistPostgresClient = client;
}

// Create drizzle instance
export const db = drizzle(client, { schema });
