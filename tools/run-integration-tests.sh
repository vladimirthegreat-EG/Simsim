#!/bin/bash
# Run integration tests with SQLite schema
# This script:
# 1. Backs up the current schema.prisma
# 2. Switches to SQLite schema
# 3. Generates Prisma client
# 4. Runs integration tests
# 5. Restores original schema + regenerates

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$ROOT/prisma/schema.prisma"
BACKUP="$ROOT/prisma/schema.prisma.integration-bak"
SQLITE_SCHEMA="$ROOT/prisma/schema.sqlite.prisma"

# Cleanup function
cleanup() {
  if [ -f "$BACKUP" ]; then
    echo "Restoring original schema..."
    cp "$BACKUP" "$SCHEMA"
    rm -f "$BACKUP"
    npx prisma generate --schema="$SCHEMA" 2>/dev/null
  fi
  # Clean up any test databases
  rm -f "$ROOT"/prisma/test-*.db "$ROOT"/prisma/test-*.db-journal "$ROOT"/prisma/test-*.db-wal "$ROOT"/prisma/test-*.db-shm
}
trap cleanup EXIT

echo "=== Integration Test Runner ==="

# 1. Backup current schema
cp "$SCHEMA" "$BACKUP"

# 2. Switch to SQLite
echo "Switching to SQLite schema..."
cp "$SQLITE_SCHEMA" "$SCHEMA"

# 3. Generate client
echo "Generating Prisma client..."
npx prisma generate --schema="$SCHEMA" 2>/dev/null

# 4. Run tests
echo "Running integration tests..."
npx vitest run __tests__/integration/ "$@"
TEST_EXIT=$?

exit $TEST_EXIT
