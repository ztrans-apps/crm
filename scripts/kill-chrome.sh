#!/bin/bash

# Kill Chrome/Chromium processes and free port 3001
# Use this when you get "browser already running" or "port in use" error

echo "🔪 Killing processes..."

# Kill process on port 3001
echo "1. Freeing port 3001..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ Port 3001 freed"
else
    echo "   ℹ Port 3001 already free"
fi
sleep 1

# Kill Puppeteer Chrome (more specific)
echo "2. Killing Puppeteer Chrome..."
pkill -9 -f "Google Chrome for Testing" 2>/dev/null
pkill -9 -f "puppeteer" 2>/dev/null
sleep 1

# Kill all Chrome processes
echo "3. Killing all Chrome/Chromium..."
pkill -9 -f chrome 2>/dev/null
pkill -9 -f chromium 2>/dev/null
sleep 2

# Check if any Chrome processes are still running
if pgrep -f chrome > /dev/null; then
    echo "   ⚠️ Some Chrome processes still running, forcing kill..."
    ps aux | grep -i chrome | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
    sleep 1
fi

# Remove lock files
echo "4. Removing lock files..."
cd whatsapp-service 2>/dev/null || cd ../whatsapp-service 2>/dev/null

if [ -d ".wwebjs_auth" ]; then
    find .wwebjs_auth -name "Singleton*" -delete 2>/dev/null
    echo "   ✓ Lock files removed"
fi

echo ""
echo "✅ Done! All processes killed and lock files removed."
echo ""
echo "Now you can start WhatsApp service:"
echo "  cd whatsapp-service"
echo "  npm run dev"
