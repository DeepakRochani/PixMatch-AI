#!/bin/bash

# ==============================================================================
# PixMatch AI — Single Click Stop Script
# Double-click this file in macOS Finder to stop all PixMatch AI services!
# ==============================================================================

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

clear
echo -e "${CYAN}${BOLD}🛑 PixMatch AI Service Shutdown${NC}\n"

echo -e "Terminating processes on ports 3000 (Web), 4000 (API), 8000 (AI)..."

# Find and kill processes on ports 3000, 4000, 8000
for port in 3000 4000 8000; do
  PID=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$PID" ]; then
    echo -e "${YELLOW}Killing process on port $port (PID: $PID)...${NC}"
    kill -9 $PID 2>/dev/null || true
  else
    echo -e "Port $port is free."
  fi
done

echo -e "\n${GREEN}${BOLD}✅ All PixMatch AI processes stopped.${NC}"
read -p "Press Enter to close window..."
