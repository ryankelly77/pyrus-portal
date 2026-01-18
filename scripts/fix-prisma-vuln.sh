#!/usr/bin/env bash
set -euo pipefail

echo "This script attempts to upgrade prisma packages and run npm audit fix."
echo "Run locally where npm can reach the registry."

# Example upgrade (adjust versions after testing):
# npm install @prisma/client@latest prisma@latest --save

echo "Installing latest prisma packages..."
npm install @prisma/client@latest prisma@latest --save

echo "Running npm audit fix..."
npm audit fix || true

echo "Run your tests and review changes before pushing."
