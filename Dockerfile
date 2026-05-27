# ----------- Backend Build Stage -----------
FROM oven/bun:1.2 AS backend-builder

WORKDIR /build/backend

COPY backend/package.json backend/bun.lockb* ./
RUN bun install --frozen-lockfile --no-progress

COPY backend/ ./
RUN bun run build \
 && cp src/workflow-engine/prompts.json dist/ \
 && cp -r src/workflow-engine/templates dist/templates

# ----------- Web Build Stage -----------
FROM oven/bun:1.2 AS web-builder

WORKDIR /build/autoproject

COPY autoproject/package.json autoproject/bun.lockb* ./
RUN bun install --frozen-lockfile --no-progress

COPY autoproject/ ./
RUN bun run build

# ----------- Production Stage -----------
FROM oven/bun:1.2-slim AS production

RUN apt-get update \
 && apt-get upgrade -y --no-install-recommends \
 && apt-get install -y --no-install-recommends adduser wget \
 && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" appuser \
 && mkdir -p /app /data \
 && chown -R appuser:appuser /app /data

WORKDIR /app

COPY --chown=appuser:appuser autoproject/package.json autoproject/bun.lockb* ./web/
COPY --chown=appuser:appuser --from=web-builder /build/autoproject/build ./web/build

COPY --chown=appuser:appuser --from=backend-builder /build/backend/dist ./backend/dist

COPY --chown=appuser:appuser docker-entrypoint.sh ./docker-entrypoint.sh

RUN cd /app/web \
 && bun install --production --frozen-lockfile --no-progress \
 && chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV DOCKER_ENV=true
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BACKEND_HOST=127.0.0.1
ENV BACKEND_PORT=3001
ENV AUTOPROJECT_ROOT=/data
VOLUME ["/data"]

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
 CMD ["bun", "-e", "const web='http://127.0.0.1:'+(process.env.PORT||'3000')+'/'; const api='http://127.0.0.1:'+(process.env.BACKEND_PORT||'3001')+'/health'; Promise.all([fetch(web), fetch(api)]).then((responses)=>process.exit(responses.every((response)=>response.ok)?0:1)).catch(()=>process.exit(1))"]

CMD ["/app/docker-entrypoint.sh"]
