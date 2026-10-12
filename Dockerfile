# syntax=docker/dockerfile:1
# Mosaic 프로덕션 이미지
#   docker build -t mosaic .
#   docker run -p 3000:3000 -e DATABASE_URL=... -v mosaic-storage:/app/storage mosaic

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/next.config.ts ./next.config.ts
RUN mkdir -p /app/storage
EXPOSE 3000
# 컨테이너 시작 시 마이그레이션 적용 후 서버 실행
CMD ["sh", "-c", "npm run db:migrate && npm start"]
