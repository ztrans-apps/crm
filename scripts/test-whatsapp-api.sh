#!/bin/bash

# WhatsApp Business API Test Script
# Usage: ./scripts/test-whatsapp-api.sh

# Configuration
PHONE_NUMBER_ID="999729856555092"
ACCESS_TOKEN="EAAUQkua5NuoBQ2CiB4rFsKThdNaIkZCfXPBRY86taKb39ibhXH4TmtzUWTutV0UIhwv0NaEcs3XukA2EtPmOgZBzX4VCJ97sNJWntZBHGCFX9VoqZCXKasfr6XJuT6ZCXRfw02vqbUY9kAQLuZASFsFFs3zIIUWeFQ5GgJ2IBe56tnFNwMPlWQajiTCWGBENUagZBsfCRf8jvksKZBdlf3ZB5XFYKX9svii9y0ziS8zzbRsImSdIJ5UbB38PdZBmiavqXjPTt8bZCG3rMMB43jXV0arfLmts8Us5obPxAZDZD"
TO_NUMBER="6282165443164"
API_VERSION="v22.0"

echo "🚀 Testing WhatsApp Business API..."
echo "=================================="
echo "Phone Number ID: $PHONE_NUMBER_ID"
echo "To: $TO_NUMBER"
echo ""

# Test 1: Send Template Message
echo "📤 Test 1: Sending template message..."
RESPONSE=$(curl -s -X POST \
  "https://graph.facebook.com/$API_VERSION/$PHONE_NUMBER_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messaging_product\": \"whatsapp\",
    \"to\": \"$TO_NUMBER\",
    \"type\": \"template\",
    \"template\": {
      \"name\": \"hello_world\",
      \"language\": {
        \"code\": \"en_US\"
      }
    }
  }")

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check if successful
if echo "$RESPONSE" | jq -e '.messages[0].id' > /dev/null 2>&1; then
  MESSAGE_ID=$(echo "$RESPONSE" | jq -r '.messages[0].id')
  echo ""
  echo "✅ SUCCESS! Message sent!"
  echo "Message ID: $MESSAGE_ID"
  echo ""
  echo "📱 Check your WhatsApp on $TO_NUMBER"
else
  echo ""
  echo "❌ FAILED!"
  
  # Check for specific errors
  ERROR_CODE=$(echo "$RESPONSE" | jq -r '.error.code // empty')
  ERROR_MESSAGE=$(echo "$RESPONSE" | jq -r '.error.message // empty')
  
  if [ "$ERROR_CODE" = "131030" ]; then
    echo ""
    echo "⚠️  Error 131030: Recipient not in allowed list"
    echo ""
    echo "Solutions:"
    echo "1. Add $TO_NUMBER to test recipients:"
    echo "   → Meta Dashboard > WhatsApp > API Setup"
    echo "   → Manage phone number list"
    echo "   → Add and verify $TO_NUMBER"
    echo ""
    echo "2. Or request Production Access:"
    echo "   → Meta Dashboard > WhatsApp > API Setup"
    echo "   → Request Production Access"
  elif [ "$ERROR_CODE" = "190" ]; then
    echo ""
    echo "⚠️  Error 190: Invalid Access Token"
    echo ""
    echo "Solutions:"
    echo "1. Generate new access token from Meta Dashboard"
    echo "2. Update ACCESS_TOKEN in this script"
  else
    echo "Error Code: $ERROR_CODE"
    echo "Error Message: $ERROR_MESSAGE"
  fi
fi

echo ""
echo "=================================="
echo "Test completed!"
