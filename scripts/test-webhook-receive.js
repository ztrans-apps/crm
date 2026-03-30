/**
 * Script to simulate a webhook message from WhatsApp
 * This helps test if your webhook handler is working correctly
 */

const webhookPayload = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "1076318681349820",
      changes: [
        {
          value: {
            messaging_product: "whatsapp",
            metadata: {
              display_phone_number: "6281320191193",
              phone_number_id: "767106306484271"
            },
            contacts: [
              {
                profile: {
                  name: "Test User"
                },
                wa_id: "6281234567890"
              }
            ],
            messages: [
              {
                from: "6281234567890",
                id: "wamid.test123",
                timestamp: Math.floor(Date.now() / 1000).toString(),
                text: {
                  body: "Test message from webhook"
                },
                type: "text"
              }
            ]
          },
          field: "messages"
        }
      ]
    }
  ]
};

async function testWebhook() {
  try {
    console.log('Sending test webhook to production...\n');
    
    const response = await fetch('https://voxentra-crm.com/api/whatsapp/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Webhook test successful!');
      console.log('Check your CRM to see if the message appeared.');
    } else {
      console.log('\n❌ Webhook test failed!');
    }
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

testWebhook();
