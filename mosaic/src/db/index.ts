import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/server/env";
import * as schema from "./schema";

/**
 * 개발 모드의 HMR 로 모듈이 재평가되어도 커넥션 풀이 중복 생성되지 않도록 globalThis 에 보관합니다.
 */
const globalForDb = globalThis as unknown as { __mosaicPool?: Pool };

export const pool =
  globalForDb.__mosaicPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__mosaicPool = pool;

export const db = drizzle(pool, { schema });

export type Database = NodePgDatabase<typeof schema>;
/** 트랜잭션 객체와 db 를 동일하게 다루기 위한 타입 */
export type DbOrTx = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

export { schema };
