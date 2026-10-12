/**
 * 스크립트 실행 시 Next.js 와 동일한 규칙(.env, .env.local, .env.[mode])으로 환경 변수를 로드합니다.
 * 반드시 다른 모듈보다 먼저 import 해야 합니다.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
