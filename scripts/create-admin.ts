/**
 * 관리자 계정 생성/승격
 *   기존 사용자 승격:  npm run admin:create -- <이메일 또는 아이디>
 *   새 관리자 생성:    npm run admin:create -- --email ops@example.com --username ops --password 'secret123' [--name 운영자]
 */
import "./load-env";
import { eq, or } from "drizzle-orm";
import { db, pool } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/server/auth/password";
import { emailSchema, passwordSchema, usernameSchema } from "@/server/validation";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  if (email) {
    const username = usernameSchema.parse(arg("username") ?? email.split("@")[0]);
    const password = passwordSchema.parse(arg("password"));
    const [u] = await db
      .insert(users)
      .values({
        email: emailSchema.parse(email),
        username,
        displayName: arg("name") ?? username,
        passwordHash: await hashPassword(password),
        role: "admin",
      })
      .returning({ id: users.id, username: users.username });
    console.log(`✅ 관리자 생성: @${u!.username} (id=${u!.id})`);
    return;
  }

  const identifier = process.argv.slice(2).find((a) => !a.startsWith("--"))?.toLowerCase();
  if (!identifier) {
    console.log("사용법: npm run admin:create -- <이메일|아이디>  또는  --email --username --password");
    process.exitCode = 1;
    return;
  }
  const updated = await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(or(eq(users.email, identifier), eq(users.username, identifier)))
    .returning({ id: users.id, username: users.username });
  if (!updated.length) {
    console.log(`❌ 사용자를 찾을 수 없습니다: ${identifier}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✅ @${updated[0]!.username} 님을 관리자로 승격했습니다.`);
}

main()
  .catch((err) => {
    console.error("❌ 실패:", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
