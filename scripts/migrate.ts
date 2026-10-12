import "./load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/db";

async function main() {
  console.log("⏳ 마이그레이션 적용 중...");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✅ 마이그레이션 완료");
}

main()
  .catch((err) => {
    console.error("❌ 마이그레이션 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
