#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}======================================================${NC}"
echo -e "${CYAN}   DelivSaga: Smart Food Delivery App Setup Script   ${NC}"
echo -e "${CYAN}======================================================${NC}"

# Function to check if a command exists
check_cmd() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}[ERROR] Required tool '$1' is not installed.${NC}"
    return 1
  fi
  return 0
}

# 1. Prerequisite Checks
echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"

check_cmd "node" || { echo "Please install Node.js (v20+ recommended) before running this script."; exit 1; }
check_cmd "npm" || { echo "Please install npm before running this script."; exit 1; }
check_cmd "docker" || echo -e "${YELLOW}[WARNING] Docker is not installed. You will need a Kafka broker running on localhost:9092.${NC}"

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}[ERROR] Node.js version must be 18 or higher. Current version: $(node -v)${NC}"
  exit 1
else
  echo -e "${GREEN}[OK] Node.js version: $(node -v)${NC}"
fi

# 2. Installing Monorepo Dependencies
echo -e "\n${YELLOW}[2/5] Installing dependencies for all workspaces...${NC}"
npm install
echo -e "${GREEN}[OK] All dependencies installed successfully.${NC}"

# 3. Setting Up Kafka Topics
echo -e "\n${YELLOW}[3/5] Initializing Kafka topics...${NC}"
if docker info &> /dev/null; then
  echo -e "Starting Kafka broker via Docker Compose..."
  docker compose up -d
  echo -e "Waiting for Kafka to boot..."
  sleep 10
else
  echo -e "${YELLOW}[INFO] Skipping Docker Compose startup. Ensuring Kafka is active manually on port 9092...${NC}"
fi

# Run topic creation script
node shared/create-topics.mjs || echo -e "${YELLOW}[WARNING] Kafka topic setup finished with warnings. Ensure your Kafka broker is running.${NC}"

# 4. Seeding Databases
echo -e "\n${YELLOW}[4/5] Populating microservice SQLite databases...${NC}"
npm run seed
echo -e "${GREEN}[OK] Databases seeded successfully.${NC}"

# 5. Compiling TypeScript & Building Frontend
echo -e "\n${YELLOW}[5/5] Compiling services and packaging frontend dashboard...${NC}"
npm run build
echo -e "${GREEN}[OK] Project compilation and build completed successfully.${NC}"

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}✓ Setup completed successfully!                      ${NC}"
echo -e "${GREEN}======================================================${NC}"
echo -e "\nTo start the entire microservices ecosystem concurrently, run:"
echo -e "   ${CYAN}npm run dev${NC}\n"
echo -e "This will start:"
echo -e " - ${CYAN}API Gateway${NC} on http://localhost:3000"
echo -e " - ${CYAN}GraphQL Playground${NC} on http://localhost:3000/graphql"
echo -e " - ${CYAN}REST endpoints${NC} on http://localhost:3000/api"
echo -e " - ${CYAN}React Dashboard UI${NC} on http://localhost:5173"
echo -e " - ${CYAN}Restaurant, Order, & Delivery Microservices${NC}"
echo -e "======================================================"
