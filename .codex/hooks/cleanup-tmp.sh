#!/usr/bin/env sh
set -eu

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
TMP_DIR="$ROOT/.tmp"
PLANS_DIR="$TMP_DIR/plans"
MAX_AGE_DAYS="${AGENT_TMP_MAX_AGE_DAYS:-14}"

mkdir -p "$PLANS_DIR"
touch "$PLANS_DIR/.gitkeep"

if command -v find >/dev/null 2>&1; then
  find "$PLANS_DIR" -type f ! -name ".gitkeep" -mtime +"$MAX_AGE_DAYS" -exec rm -f {} +
  find "$TMP_DIR" -mindepth 1 -maxdepth 1 -type f -mtime +"$MAX_AGE_DAYS" -exec rm -f {} +
fi

