import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Next.js 와 동일한 규칙으로 .env / .env.local 을 읽습니다.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://mosaic:mosaic@localhost:5432/mosaic",
  },
  strict: true,
  verbose: true,
});
