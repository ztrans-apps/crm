#!/bin/bash

# Test webhook by sending a POST request
curl -X POST "https://voxentra-crm.com/api/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "1605051657497017",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "6281994036462",
            "phone_number_id": "1019383614596994"
          },
          "contacts": [{
            "profile": { "name": "Test User" },
            "wa_id": "6281234567890"
          }],
          "messages": [{
            "from": "6281234567890",
            "id": "wamid.test123456",
            "timestamp": "1711800000",
            "text": { "body": "Test message from script" },
            "type": "text"
          }]
        },
        "field": "messages"
      }]
    }]
  }'
