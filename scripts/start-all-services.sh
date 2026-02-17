#!/bin/bash

# Start all services for WhatsApp CRM

echo "🚀 Starting WhatsApp CRM Services..."
echo ""

# Check if services are already running
NEXTJS_PID=$(lsof -ti:3000)
WHATSAPP_PID=$(lsof -ti:3001)
WORKER_PID=$(ps aux | grep "start-workers" | grep -v grep | awk '{print $2}')

# Start Next.js (if not running)
if [ -z "$NEXTJS_PID" ]; then
    echo "▶️  Starting Next.js (port 3000)..."
    npm run dev > logs/nextjs.log 2>&1 &
    echo "   PID: $!"
else
    echo "✅ Next.js already running (PID: $NEXTJS_PID)"
fi

# Start WhatsApp Service (if not running)
if [ -z "$WHATSAPP_PID" ]; then
    echo "▶️  Starting WhatsApp Service (port 3001)..."
    cd whatsapp-service && npm start > ../logs/whatsapp-service.log 2>&1 &
    echo "   PID: $!"
    cd ..
else
    echo "✅ WhatsApp Service already running (PID: $WHATSAPP_PID)"
fi

# Start Workers (if not running)
if [ -z "$WORKER_PID" ]; then
    echo "▶️  Starting Queue Workers..."
    npm run workers > logs/workers.log 2>&1 &
    echo "   PID: $!"
else
    echo "✅ Workers already running (PID: $WORKER_PID)"
fi

echo ""
echo "✅ All services started!"
echo ""
echo "📊 Service Status:"
echo "   Next.js:          http://localhost:3000"
echo "   WhatsApp Service: http://localhost:3001"
echo "   Workers:          Running in background"
echo ""
echo "📝 Logs:"
echo "   Next.js:          logs/nextjs.log"
echo "   WhatsApp Service: logs/whatsapp-service.log"
echo "   Workers:          logs/workers.log"
echo ""
echo "To stop all services, run: ./scripts/stop-all-services.sh"
