#!/bin/bash

# Verify Setup Script
# Checks if all services are configured correctly

echo "🔍 Verifying WhatsApp CRM Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: WhatsApp Service
echo "1. Checking WhatsApp Service..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} WhatsApp service is running on port 3001"
else
    echo -e "${RED}✗${NC} WhatsApp service is NOT running"
    echo -e "${YELLOW}  → Run: cd whatsapp-service && npm run dev${NC}"
fi
echo ""

# Check 2: Next.js
echo "2. Checking Next.js..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Next.js is running on port 3000"
else
    echo -e "${RED}✗${NC} Next.js is NOT running"
    echo -e "${YELLOW}  → Run: npm run dev${NC}"
fi
echo ""

# Check 3: Environment Variables
echo "3. Checking Environment Variables..."
if [ -f .env.local ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL is set"
    else
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL is missing"
    fi
    
    if grep -q "WHATSAPP_SERVICE_URL" .env.local; then
        echo -e "${GREEN}✓${NC} WHATSAPP_SERVICE_URL is set"
    else
        echo -e "${RED}✗${NC} WHATSAPP_SERVICE_URL is missing"
    fi
else
    echo -e "${RED}✗${NC} .env.local does not exist"
    echo -e "${YELLOW}  → Copy from .env.example${NC}"
fi
echo ""

# Check 4: WhatsApp Service Environment
echo "4. Checking WhatsApp Service Environment..."
if [ -f whatsapp-service/.env ]; then
    echo -e "${GREEN}✓${NC} whatsapp-service/.env exists"
else
    echo -e "${RED}✗${NC} whatsapp-service/.env does not exist"
    echo -e "${YELLOW}  → Copy from whatsapp-service/.env.example${NC}"
fi
echo ""

# Check 5: Node Modules
echo "5. Checking Dependencies..."
if [ -d node_modules ]; then
    echo -e "${GREEN}✓${NC} Next.js dependencies installed"
else
    echo -e "${RED}✗${NC} Next.js dependencies NOT installed"
    echo -e "${YELLOW}  → Run: npm install${NC}"
fi

if [ -d whatsapp-service/node_modules ]; then
    echo -e "${GREEN}✓${NC} WhatsApp service dependencies installed"
else
    echo -e "${RED}✗${NC} WhatsApp service dependencies NOT installed"
    echo -e "${YELLOW}  → Run: cd whatsapp-service && npm install${NC}"
fi
echo ""

# Check 6: API Endpoint
echo "6. Checking API Endpoints..."
if [ -f app/api/send-message/route.ts ]; then
    echo -e "${GREEN}✓${NC} Send message API route exists"
    
    if grep -q "/api/whatsapp/send" app/api/send-message/route.ts; then
        echo -e "${GREEN}✓${NC} Correct endpoint configured"
    else
        echo -e "${RED}✗${NC} Wrong endpoint in API route"
    fi
else
    echo -e "${RED}✗${NC} Send message API route does not exist"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo ""
echo "If all checks pass (✓), you can test send message."
echo "If any checks fail (✗), follow the suggestions above."
echo ""
echo "To test send message:"
echo "1. Open http://localhost:3000"
echo "2. Login as owner or agent"
echo "3. Select a conversation"
echo "4. Type and send a message"
echo ""
echo "For troubleshooting, see: TROUBLESHOOTING.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
