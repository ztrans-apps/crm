/**
 * Script to check WhatsApp webhook configuration
 * Run: node scripts/check-webhook.js
 */

const WHATSAPP_BUSINESS_ACCOUNT_ID = '1076318681349820'; // From your screenshot
const ACCESS_TOKEN = 'EAAWxu4DFjykBRONG3fbbZBNW4yK2yMavXI0QZChvEAjRf3NrBibJCEjUaLR2LLpYsRRMwnhUQmZCsEOw9rsnr27izBoMZACFgIORqWeIyJYvvX6XJjEGY6AsKfFuoQs1AMkOjZAe7YlaGK76ZBEZBHHlomWZBV0iZBWTG7pxixkt3YJa14jASvql40xQ6XYGagB4ypabDWGIyZCj92h0suCIzUsyhw09Gv731l3uIHqA9eSyO5IfXxElcZCXLm8H3ROVzzUqGXEBZCyUWQDRbCFoOHMf4r1T';

async function checkWebhookSubscription() {
  try {
    const url = `https://graph.facebook.com/v22.0/${WHATSAPP_BUSINESS_ACCOUNT_ID}/subscribed_apps?access_token=${ACCESS_TOKEN}`;
    
    console.log('Checking webhook subscription...\n');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('❌ Error:', data.error.message);
      return;
    }
    
    console.log('✅ Webhook subscription status:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data && data.data.length > 0) {
      console.log('\n✅ Webhook is subscribed!');
      console.log('Subscribed fields:', data.data[0].subscribed_fields || []);
    } else {
      console.log('\n❌ No webhook subscription found!');
      console.log('\nYou need to subscribe the webhook in Meta Dashboard:');
      console.log('1. Go to Meta for Developers → Your App → WhatsApp → Configuration');
      console.log('2. Set Callback URL: https://voxentra-crm.com/api/whatsapp/webhook');
      console.log('3. Set Verify Token: voxentraCRM_secure_verify_9Xk21LmP');
      console.log('4. Subscribe to webhook fields: messages, message_status');
    }
  } catch (error) {
    console.error('❌ Error checking webhook:', error.message);
  }
}

checkWebhookSubscription();
