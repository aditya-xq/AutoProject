# ----------- Build Stage -----------
FROM oven/bun:1 AS build

WORKDIR /app

# Copy only the lockfile and package manifest first for better caching
COPY autoproject/package.json autoproject/bun.lockb* ./

# Install dependencies with strict lockfile
RUN bun install --frozen-lockfile --no-progress

# Copy the rest of the source code
COPY . .

# Build your app
RUN bun run build

# ----------- Production Stage -----------
FROM oven/bun:1-slim AS production

# Create a non-root user
RUN adduser --disabled-password --gecos "" appuser

WORKDIR /app

# Copy only the necessary artifacts
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Switch to non-root user
USER appuser

# Expose the port
EXPOSE 3000

# Optional: health check (uncomment and customize if needed)
# HEALTHCHECK --interval=30s --timeout=5s --start-period=5s CMD curl -f http://localhost:3000/health || exit 1

# Start the app
CMD ["bun", "build/index.js"]
