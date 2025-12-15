# ----------- Build Stage -----------
FROM oven/bun:1 AS builder

WORKDIR /app

COPY autoproject/package.json autoproject/bun.lockb* ./
RUN bun install --frozen-lockfile --no-progress

COPY autoproject/ ./
RUN bun run build

# ----------- Production Stage -----------
FROM oven/bun:1-slim AS production

RUN apt-get update \
 && apt-get install -y --no-install-recommends adduser \
 && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./

RUN bun install --production --no-progress

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

USER appuser
EXPOSE 3000

CMD ["bun", "build/index.js"]
