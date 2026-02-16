#!/bin/bash

# WhatsApp Service Management Script
# Usage: ./scripts/whatsapp-service.sh [start|stop|restart|status|logs]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/whatsapp-service.log"
PID_FILE="$PROJECT_ROOT/whatsapp-service.pid"

case "$1" in
  start)
    echo "🚀 Starting WhatsApp Service..."
    
    # Check if already running
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️  Service already running (P    ID: $PID)"
        exit 1
      fi
    fi
    
    # Kill any process on port 3001
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
      echo "🔄 Clearing port 3001..."
      lsof -ti:3001 | xargs kill -9 2>/dev/null
      sleep 2
    fi
    
    # Start service
    cd "$PROJECT_ROOT"
    nohup node whatsapp-service/src/server.js > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    sleep 3
    
    # Check if started successfully
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
      echo "✅ Service started successfully (PID: $(cat $PID_FILE))"
      echo "📝 Logs: tail -f $LOG_FILE"
    else
      echo "❌ Service failed to start"
      echo "📝 Check logs: tail -f $LOG_FILE"
      exit 1
    fi
    ;;
    
  stop)
    echo "🛑 Stopping WhatsApp Service..."
    
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        kill $PID
        sleep 2
        
        # Force kill if still running
        if ps -p $PID > /dev/null 2>&1; then
          kill -9 $PID
        fi
        
        rm -f "$PID_FILE"
        echo "✅ Service stopped"
      else
        echo "⚠️  Service not running"
        rm -f "$PID_FILE"
      fi
    else
      # Try to kill by port
      if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        lsof -ti:3001 | xargs kill -9 2>/dev/null
        echo "✅ Service stopped (by port)"
      else
        echo "ℹ️  Service not running"
      fi
    fi
    ;;
    
  restart)
    echo "🔄 Restarting WhatsApp Service..."
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    echo "📊 WhatsApp Service Status"
    echo "=========================="
    
    # Check PID file
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if ps -p $PID > /dev/null 2>&1; then
        echo "✅ Service running (PID: $PID)"
      else
        echo "❌ Service not running (stale PID file)"
        rm -f "$PID_FILE"
      fi
    else
      echo "❌ Service not running (no PID file)"
    fi
    
    # Check port
    if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
      echo "✅ Port 3001 in use"
      lsof -i:3001 | grep LISTEN
    else
      echo "❌ Port 3001 not in use"
    fi
    
    # Check health endpoint
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
      echo "✅ Health endpoint responding"
      curl -s http://localhost:3001/health | jq '.'
    else
      echo "❌ Health endpoint not responding"
    fi
    ;;
    
  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "❌ Log file not found: $LOG_FILE"
      exit 1
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start WhatsApp service"
    echo "  stop    - Stop WhatsApp service"
    echo "  restart - Restart WhatsApp service"
    echo "  status  - Check service status"
    echo "  logs    - View service logs (tail -f)"
    exit 1
    ;;
esac
