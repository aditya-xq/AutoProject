FROM oven/bun:1-slim AS production

RUN apt-get update \
 && apt-get install -y --no-install-recommends adduser \
 && rm -rf /var/lib/apt/lists/*

RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./

RUN bun install --production --no-progress

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

USER appuser
EXPOSE 3000

CMD ["bun", "build/index.js"]
