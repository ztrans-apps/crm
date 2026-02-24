#!/bin/bash

# Git commit script for message tracking feature

echo "📝 Staging files..."
git add .

echo ""
echo "📋 Commit message:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat << 'EOF'


- Added message tracking columns (sent_at, delivered_at, read_at, failed_at)
- Implemented WhatsApp messages.update event handler with status priority
- Created useMessageTracking hook for Socket.IO real-time updates
- Updated broadcast worker to save messages with whatsapp_message_id
- Added status icons in chat and broadcast UI (⏰✓✓✓✗)
- Fixed database triggers to use correct column names
- Fixed UUID validation error in message.service.ts
- Removed all debug console.log statements
- Updated README.md with message tracking documentation

Status priority system prevents regression (read > delivered > sent).
Real-time updates via Socket.IO with automatic reconnection.
Works for both chat messages and broadcast campaigns.

Bug Fix: Added UUID validation before querying by id to prevent
PostgreSQL error when quoted_message_id is WhatsApp message ID.

Breaking Changes: None
Migration Required: Yes (add tracking columns to messages table)
EOF
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "🤔 Commit dengan pesan ini? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]
then
    git commit -m "feat: Implement real-time message tracking system

- Added message tracking columns (sent_at, delivered_at, read_at, failed_at)
- Implemented WhatsApp messages.update event handler with status priority
- Created useMessageTracking hook for Socket.IO real-time updates
- Updated broadcast worker to save messages with whatsapp_message_id
- Added status icons in chat and broadcast UI (⏰✓✓✓✗)
- Fixed database triggers to use correct column names
- Fixed UUID validation error in message.service.ts
- Removed all debug console.log statements
- Updated README.md with message tracking documentation

Status priority system prevents regression (read > delivered > sent).
Real-time updates via Socket.IO with automatic reconnection.
Works for both chat messages and broadcast campaigns.

Bug Fix: Added UUID validation before querying by id to prevent
PostgreSQL error when quoted_message_id is WhatsApp message ID.

Breaking Changes: None
Migration Required: Yes (add tracking columns to messages table)"
    
    echo ""
    echo "✅ Commit berhasil!"
    echo ""
    echo "📤 Untuk push ke remote:"
    echo "   git push origin main"
    echo ""
    echo "📋 Untuk melihat commit:"
    echo "   git log -1"
else
    echo ""
    echo "❌ Commit dibatalkan"
    echo ""
    echo "💡 Untuk commit manual:"
    echo "   git commit -F COMMIT_MESSAGE.md"
fi
