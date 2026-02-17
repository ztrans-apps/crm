#!/bin/bash

# Stop all services for WhatsApp CRM

echo "🛑 Stopping WhatsApp CRM Services..."
echo ""

# Stop Next.js
NEXTJS_PID=$(lsof -ti:3000)
if [ ! -z "$NEXTJS_PID" ]; then
    echo "⏹️  Stopping Next.js (PID: $NEXTJS_PID)..."
    kill $NEXTJS_PID
else
    echo "⚠️  Next.js not running"
fi

# Stop WhatsApp Service
WHATSAPP_PID=$(lsof -ti:3001)
if [ ! -z "$WHATSAPP_PID" ]; then
    echo "⏹️  Stopping WhatsApp Service (PID: $WHATSAPP_PID)..."
    kill $WHATSAPP_PID
else
    echo "⚠️  WhatsApp Service not running"
fi

# Stop Workers
WORKER_PID=$(ps aux | grep "start-workers" | grep -v grep | awk '{print $2}')
if [ ! -z "$WORKER_PID" ]; then
    echo "⏹️  Stopping Workers (PID: $WORKER_PID)..."
    kill $WORKER_PID
else
    echo "⚠️  Workers not running"
fi

echo ""
echo "✅ All services stopped!"
