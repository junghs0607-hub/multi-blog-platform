import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // 업로드 시 서버에서 썸네일/중간 크기 이미지를 직접 생성하므로 next/image 최적화 대신 <img> 를 사용합니다.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "storage/**", "drizzle/**", "next-env.d.ts"]),
]);
