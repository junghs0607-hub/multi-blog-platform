// Safe database adapter that works gracefully in all environments
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

let pool: Pool | null = null;
let db: any = null;

if (databaseUrl) {
  try {
    pool = new Pool({
      connectionString: databaseUrl,
    });
    db = drizzle(pool);
  } catch (err) {
    console.warn("PostgreSQL connection initialization deferred:", err);
  }
}

export { pool, db };
