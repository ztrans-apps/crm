#!/bin/bash

# WhatsApp Service Cleanup Script
# Kills Chrome processes, Node processes, and removes lock files

echo "🧹 Cleaning up WhatsApp service..."
echo ""

# Kill Node.js processes for WhatsApp service
echo "1. Killing WhatsApp service processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ Port 3001 freed"
else
    echo "   ℹ Port 3001 already free"
fi
sleep 1

# Kill Chrome/Chromium processes
echo ""
echo "2. Killing Chrome/Chromium processes..."
pkill -f chrome 2>/dev/null
pkill -f chromium 2>/dev/null
sleep 2

if [ $? -eq 0 ]; then
    echo "   ✓ Chrome processes killed"
else
    echo "   ℹ No Chrome processes found"
fi

# Remove lock files
echo ""
echo "3. Removing lock files..."
cd whatsapp-service 2>/dev/null || cd ../whatsapp-service 2>/dev/null

if [ -d ".wwebjs_auth" ]; then
    rm -rf .wwebjs_auth/session-*/SingletonLock 2>/dev/null
    rm -rf .wwebjs_auth/session-*/SingletonSocket 2>/dev/null
    rm -rf .wwebjs_auth/session-*/SingletonCookie 2>/dev/null
    echo "   ✓ Lock files removed"
else
    echo "   ⚠ .wwebjs_auth directory not found"
fi

# Optional: Remove all session cache
echo ""
read -p "Remove all session cache? This will require QR scan again (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "4. Removing session cache..."
    rm -rf .wwebjs_auth/* 2>/dev/null
    rm -rf .wwebjs_cache/* 2>/dev/null
    echo "   ✓ Session cache removed"
    echo "   ⚠ You will need to scan QR code again"
else
    echo "4. Keeping session cache"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. cd whatsapp-service"
echo "2. npm run dev"
echo "3. Scan QR code (if cache was removed)"
echo "4. Wait 30 seconds"
echo "5. Test send message"
