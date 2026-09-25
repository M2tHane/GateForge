#!/usr/bin/env bash
set -euo pipefail

# Start the web-console dev server (Stage 01 mock frontend).
cd "$(dirname "$0")/.."
pnpm install
pnpm --filter @gateforge/web-console dev
