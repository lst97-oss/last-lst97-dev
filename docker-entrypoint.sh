#!/bin/sh
# Production entrypoint: run Payload migrations, then exec the server.
# Migrations are idempotent; re-running on every (re)start is safe.
# Set SKIP_MIGRATIONS=true to skip (e.g. read-only / scaled replicas).
set -eu

if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] SKIP_MIGRATIONS=true — skipping payload migrate"
else
  echo "[entrypoint] running payload migrations..."
  # `bunx --bun` keeps the Payload CLI on the Bun runtime;
  # --disable-transpile lets Bun load TS natively (tsx's loader breaks on Linux).
  if ! bunx --bun payload --disable-transpile migrate; then
    echo "[entrypoint] payload migrate failed" >&2
    exit 1
  fi
  echo "[entrypoint] migrations complete"
fi

echo "[entrypoint] starting: $*"
exec "$@"
