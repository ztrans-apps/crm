#!/bin/bash

# Check Queue Status Script
# Quick way to check BullMQ queue status via Redis

echo "📊 BullMQ Queue Status"
echo "====================="
echo ""

QUEUES=("whatsapp-send" "whatsapp-receive" "broadcast-send" "webhook-deliver")

for queue in "${QUEUES[@]}"; do
  echo "📋 Queue: $queue"
  echo "   Waiting:    $(redis-cli LLEN bull:$queue:wait 2>/dev/null || echo '0')"
  echo "   Active:     $(redis-cli LLEN bull:$queue:active 2>/dev/null || echo '0')"
  echo "   Completed:  $(redis-cli ZCARD bull:$queue:completed 2>/dev/null || echo '0')"
  echo "   Failed:     $(redis-cli ZCARD bull:$queue:failed 2>/dev/null || echo '0')"
  echo "   Delayed:    $(redis-cli ZCARD bull:$queue:delayed 2>/dev/null || echo '0')"
  echo ""
done

echo "✅ Done"
