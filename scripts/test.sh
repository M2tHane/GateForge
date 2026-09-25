#!/usr/bin/env bash
set -euo pipefail

# Run lint + typecheck + tests for the whole monorepo (used by CI and Stage Gates).
cd "$(dirname "$0")/.."
pnpm install
pnpm -r lint
pnpm -r typecheck
pnpm -r test
