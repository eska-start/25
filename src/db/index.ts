import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * 배포 환경에서도 빌드가 깨지지 않도록 연결은 "처음 쓸 때" 만든다.
 * (빌드 중에 DATABASE_URL이 없어도 import 단계에서 예외가 나지 않는다.)
 */
const globalForDb = globalThis as typeof globalThis & {
  __jrPool?: Pool;
  __jrDb?: NodePgDatabase;
};

export function getPool(): Pool {
  if (!globalForDb.__jrPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    globalForDb.__jrPool = new Pool({
      connectionString: url,
      max: 8,
      idleTimeoutMillis: 20_000,
      ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return globalForDb.__jrPool;
}

export function getDb(): NodePgDatabase {
  if (!globalForDb.__jrDb) globalForDb.__jrDb = drizzle(getPool());
  return globalForDb.__jrDb;
}

export const db = new Proxy({} as NodePgDatabase, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});

export const pool = new Proxy({} as Pool, {
  get(_t, prop) {
    const real = getPool() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(real) : value;
  },
});
