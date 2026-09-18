#!/bin/bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Same value as ecosystem.config.js: .env points at the docker-only `postgres` host, which does
# not resolve when the app runs directly on the box.
export DATABASE_URL="${DATABASE_URL:-postgresql://app:app@localhost:5432/app?schema=public}"

echo -e "${YELLOW}========== MY-TOOL DEPLOYMENT ==========${NC}"

echo -e "\n${BLUE}[1/4] Installing dependencies...${NC}"
npm ci

echo -e "\n${BLUE}[2/4] Applying migrations...${NC}"
npx prisma migrate deploy

echo -e "\n${BLUE}[3/4] Building...${NC}"
npm run build

echo -e "\n${BLUE}[4/4] Restarting pm2...${NC}"
pm2 startOrReload "$ROOT/ecosystem.config.js" --update-env
pm2 save

echo -e "\n${GREEN}========== DEPLOYMENT COMPLETED ==========${NC}"
pm2 list
