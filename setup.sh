#!/bin/bash

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════╗"
echo "║       DocChat — Local RAG Setup      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org (v18+)${NC}"
  exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js v18+ required. Found: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Check Ollama
if ! command -v ollama &> /dev/null; then
  echo -e "${YELLOW}⚠ Ollama not found. Install from https://ollama.com${NC}"
  echo "  After installing, run: ollama serve"
else
  echo -e "${GREEN}✓ Ollama found${NC}"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Create .env.local
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo -e "${GREEN}✓ Created .env.local${NC}"
else
  echo -e "${YELLOW}  .env.local already exists, skipping${NC}"
fi

# Create data directory
mkdir -p data
echo -e "${GREEN}✓ Data directory ready${NC}"

# Pull Ollama models
echo ""
echo "Pulling required Ollama models..."
echo "(This may take a few minutes on first run)"
echo ""

if command -v ollama &> /dev/null; then
  if ! pgrep -x "ollama" > /dev/null; then
    echo -e "${YELLOW}Starting Ollama server...${NC}"
    ollama serve &
    sleep 3
  fi

  echo "Pulling llama3 (LLM)..."
  ollama pull llama3

  echo "Pulling nomic-embed-text (Embeddings)..."
  ollama pull nomic-embed-text

  echo -e "${GREEN}✓ Models ready${NC}"
else
  echo -e "${YELLOW}⚠ Skipping model pull — Ollama not installed${NC}"
  echo "  Manually run:"
  echo "    ollama pull llama3"
  echo "    ollama pull nomic-embed-text"
fi

echo ""
echo "══════════════════════════════════════"
echo -e "${GREEN}  Setup complete!${NC}"
echo ""
echo "  Start the app:"
echo "    npm run dev"
echo ""
echo "  Then open: http://localhost:3000"
echo "══════════════════════════════════════"
echo ""
