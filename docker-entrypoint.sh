#!/bin/sh
set -eu

# ------------------------------------------------------------------
# Environment defaults
# ------------------------------------------------------------------
export NODE_ENV="${NODE_ENV:-production}"
export HOST="${HOST:-0.0.0.0}"
export PORT="${PORT:-3000}"
export BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
export BACKEND_PORT="${BACKEND_PORT:-3001}"
export AUTOPROJECT_ROOT="${AUTOPROJECT_ROOT:-/data}"
export AUTOPROJECT_BACKEND_URL="${AUTOPROJECT_BACKEND_URL:-http://${BACKEND_HOST}:${BACKEND_PORT}}"

# ------------------------------------------------------------------
# LLM_BASE_URL: smart fallback for Docker environments
# - Prefer explicit LLM_BASE_URL if set
# - Then check LLM_BASE_URL_DOCKER for backward compat
# - Then auto-detect host.docker.internal (Docker Desktop / --add-host)
# - Fall back to 127.0.0.1 with a warning
# ------------------------------------------------------------------
if [ -z "${LLM_BASE_URL:-}" ]; then
  if [ -n "${LLM_BASE_URL_DOCKER:-}" ]; then
    LLM_BASE_URL="$LLM_BASE_URL_DOCKER"
  elif grep -qi 'host.docker.internal' /etc/hosts 2>/dev/null || (command -v getent >/dev/null 2>&1 && getent hosts host.docker.internal >/dev/null 2>&1); then
    LLM_BASE_URL="http://host.docker.internal:1234/v1"
  else
    echo >&2 "Warning: host.docker.internal not resolvable."
    echo >&2 "Defaulting LLM_BASE_URL to http://127.0.0.1:1234/v1"
    echo >&2 "Set the LLM_BASE_URL environment variable to override."
    LLM_BASE_URL="http://127.0.0.1:1234/v1"
  fi
fi
export LLM_BASE_URL

# ------------------------------------------------------------------
# Startup validation — fail fast if build artifacts are missing
# ------------------------------------------------------------------
BACKEND_DIST="/app/backend/dist/index.js"
WEB_DIST="/app/web/build/index.js"

for f in "$BACKEND_DIST" "$WEB_DIST"; do
  if [ ! -f "$f" ]; then
    echo >&2 "FATAL: $f not found. The Docker image build may be incomplete."
    exit 1
  fi
done

# ------------------------------------------------------------------
# Detect health check tool (wget or curl)
# ------------------------------------------------------------------
if command -v wget >/dev/null 2>&1; then
  _health() { wget -q -O /dev/null -T 2 "$1" 2>/dev/null; }
elif command -v curl >/dev/null 2>&1; then
  _health() { curl -sf -o /dev/null --max-time 2 "$1" 2>/dev/null; }
else
  echo >&2 "FATAL: Neither wget nor curl found. Cannot perform health checks."
  exit 1
fi

# ------------------------------------------------------------------
# Start backend
# ------------------------------------------------------------------
echo "Starting backend..."
bun "$BACKEND_DIST" &
backend_pid=$!

# ------------------------------------------------------------------
# Graceful shutdown handler (installed early so SIGTERM during health check is handled)
# ------------------------------------------------------------------
shutdown() {
  trap - INT TERM
  [ -n "${backend_pid:-}" ] && kill -TERM "$backend_pid" 2>/dev/null || true
  [ -n "${web_pid:-}" ] && kill -TERM "$web_pid" 2>/dev/null || true
  wait "$backend_pid" 2>/dev/null || true
  wait "$web_pid" 2>/dev/null || true
  exit 0
}
trap shutdown INT TERM

# ------------------------------------------------------------------
# Wait for backend to accept connections (up to ~90s)
# Prevents race where web server starts before backend is listening
# ------------------------------------------------------------------
echo "Waiting for backend..."
_waited=30
while [ $_waited -gt 0 ]; do
  if _health "http://${BACKEND_HOST}:${BACKEND_PORT}/health"; then
    echo "Backend is ready."
    break
  fi
  sleep 1
  _waited=$((_waited - 1))
done
if [ $_waited -eq 0 ]; then
  echo >&2 "Warning: Backend did not become ready within 90 seconds."
  echo >&2 "Starting web server anyway."
fi

# ------------------------------------------------------------------
# Start web server
# ------------------------------------------------------------------
echo "Starting web server..."
bun "$WEB_DIST" &
web_pid=$!

# ------------------------------------------------------------------
# Monitor: exit if either child dies, propagating its exit code
# ------------------------------------------------------------------
while true; do
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    _status=0
    wait "$backend_pid" || _status=$?
    kill -TERM "$web_pid" 2>/dev/null || true
    exit "$_status"
  fi

  if ! kill -0 "$web_pid" 2>/dev/null; then
    _status=0
    wait "$web_pid" || _status=$?
    kill -TERM "$backend_pid" 2>/dev/null || true
    exit "$_status"
  fi

  sleep 1
done
