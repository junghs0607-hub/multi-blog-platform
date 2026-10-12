import type { NextConfig } from "next";
import path from "node:path";

/**
 * 개발 서버에 접근을 허용할 추가 Origin (터널/원격 개발 환경용).
 * 예) ALLOWED_DEV_ORIGINS="*.ngrok.app,*.e2b.app"
 */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker 이미지 빌드 시 NEXT_OUTPUT=standalone 으로 경량 서버 번들을 생성할 수 있습니다.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // sharp(libvips 네이티브 바이너리)는 번들링하지 않고 런타임에 require 합니다.
  serverExternalPackages: ["sharp", "pg"],
  allowedDevOrigins,
  // 상위 디렉터리에 다른 lockfile 이 있어도 이 프로젝트를 루트로 사용합니다.
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
