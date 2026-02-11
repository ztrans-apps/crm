#!/bin/bash

# Restart Services Script
# This script will restart all development services

echo "🔄 Restarting all services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Stop any running Next.js dev server
echo "1. Stopping Next.js development server..."
pkill -f "next dev" 2>/dev/null
if [ $? -eq 0 ]; then
    print_status "Next.js dev server stopped"
else
    print_warning "No Next.js dev server was running"
fi
echo ""

# 2. Clear Next.js cache
echo "2. Clearing Next.js cache..."
rm -rf .next
if [ $? -eq 0 ]; then
    print_status "Next.js cache cleared"
else
    print_error "Failed to clear Next.js cache"
fi
echo ""

# 3. Clear node_modules cache (optional - uncomment if needed)
# echo "3. Clearing node_modules cache..."
# rm -rf node_modules/.cache
# print_status "Node modules cache cleared"
# echo ""

# 4. Reinstall dependencies (optional - uncomment if needed)
# echo "4. Reinstalling dependencies..."
# npm install
# print_status "Dependencies reinstalled"
# echo ""

# 5. Start Next.js dev server
echo "3. Starting Next.js development server..."
echo ""
print_status "Starting server on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the dev server
npm run dev
