#!/bin/bash
# Deployment setup script for Slacklak application
# Run this on the remote server after uploading the files

echo "🚀 Starting Slacklak deployment setup..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Installing dependencies...${NC}"
npm install

echo -e "${BLUE}2. Building the application...${NC}"
npm run build

echo -e "${BLUE}3. Running database migrations...${NC}"
npm run db:push

echo -e "${GREEN}✅ Deployment setup completed!${NC}"
echo -e "${GREEN}To start the application, run: npm start${NC}"
echo -e "${GREEN}The app will be available on port 5000${NC}"
