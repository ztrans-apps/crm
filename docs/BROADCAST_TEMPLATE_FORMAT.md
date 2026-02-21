# Broadcast dengan Format Template Lengkap

## Overview

Sistem broadcast sekarang mengirim pesan sesuai dengan format template lengkap, termasuk:
- Header (TEXT, IMAGE, VIDEO, DOCUMENT)
- Body text
- Footer text
- Buttons (CALL_TO_ACTION, QUICK_REPLY)

## Changes Made

### 1. Campaign API (`app/api/broadcast/campaigns/route.ts`)

**Menyimpan Template Data**:
- Menerima `template_id` dari request
- Load full template data dari database
- Simpan template data di `campaign.metadata.template_data`

```typescript
// Get template data if template_id provided
let templateData = null;
if (template_id) {
  const { data: template } = await supabase
    .from('broadcast_templates')
    .select('*')
    .eq('id', template_id)
    .single();
  
  templateData = template;
}

// Store in campaign metadata
metadata: {
  whatsapp_account: whatsapp_account,
  sender_id: sender_id,
  template_id: template_id,
  template_data: templateData, // Full template data
}
```

### 2. Create Campaign Component (`modules/broadcast/components/CreateCampaign.tsx`)

**Mengirim Template ID**:
```typescript
body: JSON.stringify({
  name: formData.name,
  message_template: formData.message_content,
  scheduled_at: scheduledAtUTC,
  send_now: !schedule,
  recipient_list_id: formData.recipient_list_id,
  sender_id: formData.sender_id,
  whatsapp_account: formData.whatsapp_account,
  template_id: formData.template_id, // Send template ID
}),
```

### 3. Broadcast Worker (`lib/queue/workers/broadcast-send.worker.ts`)

**Mengirim Pesan dengan Format Lengkap**:

#### A. Interface Update
```typescript
interface BroadcastJob {
  campaignId: string;
  recipientId: string;
  phoneNumber: string;
  message: string;
  sessionId?: string;
  templateData?: any; // Full template data
}
```

#### B. Message Sending Logic

**Untuk Template dengan Header IMAGE/VIDEO/DOCUMENT**:
1. Download media dari Supabase Storage URL
2. Prepare caption dengan body + footer + buttons
3. Send via `/api/whatsapp/media/send-media` endpoint
4. Format buttons dalam caption:
   - QUICK_REPLY: `1. Button Text`
   - URL: `🔗 Button Text: https://url.com`
   - PHONE_NUMBER: `📞 Button Text: +6281234567890`

**Untuk Template dengan Header TEXT atau NONE**:
1. Prepare full message dengan header + body + footer + buttons
2. Send via `/api/whatsapp/send` endpoint
3. Format:
   - Header TEXT: `*Header Text*\n\n`
   - Body: `Body text`
   - Footer: `\n\n_Footer text_`
   - Buttons: Same format as above

#### C. Helper Function

```typescript
async function sendTextMessage(
  whatsappServiceUrl: string, 
  sessionId: string | undefined, 
  phoneNumber: string, 
  message: string,
  templateData: any
) {
  let fullMessage = message;
  
  // Add header if TEXT
  if (templateData?.header_format === 'TEXT' && templateData?.header_text) {
    fullMessage = `*${templateData.header_text}*\n\n${fullMessage}`;
  }
  
  // Add footer
  if (templateData?.footer_text) {
    fullMessage += `\n\n_${templateData.footer_text}_`;
  }
  
  // Add buttons
  if (templateData?.buttons && templateData.buttons.length > 0) {
    fullMessage += '\n\n';
    templateData.buttons.forEach((btn: any, idx: number) => {
      if (btn.type === 'QUICK_REPLY') {
        fullMessage += `\n${idx + 1}. ${btn.text}`;
      } else if (btn.type === 'URL') {
        fullMessage += `\n🔗 ${btn.text}: ${btn.value}`;
      } else if (btn.type === 'PHONE_NUMBER') {
        fullMessage += `\n📞 ${btn.text}: ${btn.value}`;
      }
    });
  }
  
  // Send message
  const response = await fetch(`${whatsappServiceUrl}/api/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId || 'default',
      to: phoneNumber,
      message: fullMessage,
    }),
  });
  
  return await response.json();
}
```

## Message Format Examples

### Example 1: Template with IMAGE Header

**Template**:
- Header: IMAGE (product.jpg)
- Body: "Hello {{1}}, check out our new product!"
- Footer: "Reply STOP to unsubscribe"
- Buttons: 
  - URL: "Shop Now" → https://shop.com
  - QUICK_REPLY: "More Info"

**Sent Message**:
```
[IMAGE: product.jpg]

Hello John, check out our new product!

_Reply STOP to unsubscribe_

🔗 Shop Now: https://shop.com
1. More Info
```

### Example 2: Template with TEXT Header

**Template**:
- Header: TEXT "Special Offer!"
- Body: "Get 50% off today only"
- Footer: "Terms apply"
- Buttons:
  - PHONE_NUMBER: "Call Us" → +6281234567890

**Sent Message**:
```
*Special Offer!*

Get 50% off today only

_Terms apply_

📞 Call Us: +6281234567890
```

### Example 3: Template with VIDEO Header

**Template**:
- Header: VIDEO (promo.mp4)
- Body: "Watch our latest video"
- Buttons:
  - URL: "Subscribe" → https://youtube.com/channel

**Sent Message**:
```
[VIDEO: promo.mp4]

Watch our latest video

🔗 Subscribe: https://youtube.com/channel
```

### Example 4: Template without Header

**Template**:
- Header: NONE
- Body: "Your order #12345 is ready"
- Footer: "Thank you for shopping"
- Buttons:
  - QUICK_REPLY: "Track Order"
  - QUICK_REPLY: "Contact Support"

**Sent Message**:
```
Your order #12345 is ready

_Thank you for shopping_

1. Track Order
2. Contact Support
```

## Flow Diagram

```
Create Campaign
    ↓
Select Template → Load template_id
    ↓
Submit Campaign → Save template_data in metadata
    ↓
Queue Broadcast → Pass templateData to worker
    ↓
Worker Process Message
    ↓
Check Template Format
    ↓
┌─────────────────┬─────────────────┐
│ Has Media       │ Text Only       │
│ (IMAGE/VIDEO)   │ (TEXT/NONE)     │
├─────────────────┼─────────────────┤
│ Download Media  │ Format Message  │
│ Prepare Caption │ - Header (bold) │
│ - Body          │ - Body          │
│ - Footer        │ - Footer (italic)│
│ - Buttons       │ - Buttons       │
│ Send via        │ Send via        │
│ /media/send     │ /send           │
└─────────────────┴─────────────────┘
    ↓
Message Sent to WhatsApp
    ↓
Create Message Record
    ↓
Update Recipient Status
```

## Testing

### Test Case 1: Broadcast with Image Template
1. Create template with IMAGE header
2. Upload image
3. Add body, footer, buttons
4. Create campaign with this template
5. Send broadcast
6. ✅ Verify recipient receives:
   - Image
   - Body text
   - Footer text (italic)
   - Buttons formatted correctly

### Test Case 2: Broadcast with Text Header
1. Create template with TEXT header
2. Add body, footer, buttons
3. Create campaign
4. Send broadcast
5. ✅ Verify recipient receives:
   - Header text (bold)
   - Body text
   - Footer text (italic)
   - Buttons formatted correctly

### Test Case 3: Broadcast with Video
1. Create template with VIDEO header
2. Upload video
3. Add body and buttons
4. Create campaign
5. Send broadcast
6. ✅ Verify recipient receives:
   - Video
   - Body text as caption
   - Buttons in caption

### Test Case 4: Broadcast without Header
1. Create template with NONE header
2. Add body, footer, buttons
3. Create campaign
4. Send broadcast
5. ✅ Verify recipient receives:
   - Body text
   - Footer text (italic)
   - Buttons formatted correctly

## Troubleshooting

### Issue: Image/Video Not Sent

**Possible Causes**:
1. Media URL is placeholder (not uploaded to storage)
2. Media file too large
3. Network error downloading media

**Solution**:
1. Check `header_media_url` in template
2. Verify file uploaded to Supabase Storage
3. Check worker logs for download errors
4. System will fallback to text message if media fails

### Issue: Buttons Not Showing

**Possible Causes**:
1. Template doesn't have buttons
2. Button data not saved in template
3. Worker not formatting buttons

**Solution**:
1. Check template has `buttons` array in database
2. Verify buttons saved when creating template
3. Check worker logs for button formatting

### Issue: Footer Not Showing

**Possible Causes**:
1. Template doesn't have footer
2. Footer text empty

**Solution**:
1. Check template has `footer_text` in database
2. Add footer text when creating template

## Files Modified

1. `app/api/broadcast/campaigns/route.ts`
   - Accept `template_id` parameter
   - Load and store full template data

2. `modules/broadcast/components/CreateCampaign.tsx`
   - Send `template_id` in request

3. `lib/queue/workers/broadcast-send.worker.ts`
   - Accept `templateData` in job interface
   - Implement media message sending
   - Implement text message formatting
   - Add helper function `sendTextMessage`
   - Format buttons in message

## Benefits

1. ✅ Pesan broadcast sesuai dengan template
2. ✅ Support header image/video/document
3. ✅ Support footer text
4. ✅ Support buttons (URL, Phone, Quick Reply)
5. ✅ Consistent formatting across all messages
6. ✅ Better user experience
7. ✅ Professional looking messages

## Next Steps

1. Test dengan real WhatsApp account
2. Monitor delivery rates
3. Collect user feedback
4. Add support for interactive buttons (native WhatsApp buttons)
5. Add support for template variables replacement
