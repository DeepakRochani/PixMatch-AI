#!/bin/bash

# ==============================================================================
# PixMatch AI — Single Click macOS Launcher
# Double-click this file in macOS Finder to start PixMatch AI!
# ==============================================================================

# Change working directory to the project root where this script resides
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT" || exit 1

# Color formatting
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear

echo -e "${CYAN}${BOLD}"
echo "  ██████╗ ██╗██╗  ██╗███╗   ███╗ █████╗ ████████╗ ██████╗██╗  ██╗"
echo "  ██╔══██╗██║╚██╗██╔╝████╗ ████║██╔══██╗╚══██╔══╝██╔════╝██║  ██║"
echo "  ██████╔╝██║ ╚███╔╝ ██╔████╔██║███████║   ██║   ██║     ███████║"
echo "  ██╔═══╝ ██║ ██╔██╗ ██║╚██╔╝██║██╔══██║   ██║   ██║     ██╔══██║"
echo "  ██║     ██║██╔╝ ██╗██║ ╚═╝ ██║██║  ██║   ██║   ╚██████╗██║  ██║"
echo "  ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝"
echo "                          A I   E N G I N E                      "
echo -e "${NC}"
echo -e "${BOLD}🚀 Starting PixMatch AI Platform...${NC}\n"

# 1. Environment file check
if [ ! -f .env ]; then
  echo -e "${YELLOW}⚠️  No .env file found. Creating one from .env.example...${NC}"
  cp .env.example .env
  echo -e "${GREEN}✅ .env file initialized.${NC}"
fi

# 2. Check Node.js and npm
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Node.js is not installed. Please install Node.js (>=20) from https://nodejs.org/${NC}"
  read -p "Press Enter to exit..."
  exit 1
fi

echo -e "📦 Node.js version: ${BOLD}$(node -v)${NC}"

# 3. Check node_modules and Prisma client
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}📦 Installing dependencies (npm install)...${NC}"
  npm install
fi

echo -e "${CYAN}🔧 Verifying Database Client (@pixmatch/database)...${NC}"
npm run db:generate >/dev/null 2>&1

# 4. Background cleanup trap on exit
PIDS=()
cleanup() {
  echo -e "\n${YELLOW}🛑 Shutting down PixMatch AI services...${NC}"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null
    fi
  done
  # Kill any stray child node/python processes started in this session
  pkill -P $$ 2>/dev/null
  echo -e "${GREEN}✅ All services stopped successfully.${NC}"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 5. Start Python AI Service if Python 3 is available
AI_PID=""
if [ -d "apps/ai-service" ] && command -v python3 >/dev/null 2>&1; then
  echo -e "${CYAN}🤖 Starting AI Face Recognition Service (Port 8000)...${NC}"
  (
    cd apps/ai-service
    if command -v uvicorn >/dev/null 2>&1; then
      uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning
    elif python3 -m uvicorn --version >/dev/null 2>&1; then
      python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --log-level warning
    else
      echo -e "${YELLOW}⚠️  Uvicorn not installed in system Python. AI Service will start when pip requirements are installed.${NC}"
    fi
  ) >/dev/null 2>&1 &
  AI_PID=$!
  PIDS+=("$AI_PID")
fi

# 6. Start Web UI, API, and Worker via Turbo Dev
echo -e "${GREEN}⚡ Starting PixMatch Web (Port 3000), API (Port 4000), and Worker...${NC}\n"

# Open browser automatically after 3 seconds
(
  sleep 3
  echo -e "${BOLD}${GREEN}🌐 Opening Web UI in default browser: http://localhost:3000${NC}\n"
  open "http://localhost:3000" 2>/dev/null || true
) &

# Run turbo dev in foreground so logs stream directly to the Terminal window
npm run dev
