/**
 * Chatbot Handler
 * Handles incoming messages and triggers appropriate chatbots
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: string;
  is_from_me: boolean;
}

interface Conversation {
  id: string;
  contact_id: string;
  tenant_id: string;
}

interface Chatbot {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: any;
  priority: number;
  tenant_id: string;
}

interface ChatbotFlow {
  id: string;
  chatbot_id: string;
  step_order: number;
  step_type: string;
  content: string;
  options: any[];
}

export class ChatbotHandler {
  /**
   * Process incoming message and trigger chatbot if applicable
   */
  static async processMessage(message: Message, conversation: Conversation) {
    try {
      // Skip if message is from us
      if (message.is_from_me) {
        return;
      }

      // Get active chatbots for this tenant
      const { data: chatbots, error: chatbotsError } = await supabase
        .from('chatbots')
        .select('*')
        .eq('tenant_id', conversation.tenant_id)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (chatbotsError || !chatbots || chatbots.length === 0) {
        console.log('No active chatbots found');
        return;
      }

      // Find matching chatbot
      const matchedChatbot = this.findMatchingChatbot(chatbots, message);

      if (!matchedChatbot) {
        console.log('No chatbot matched the message');
        return;
      }

      console.log(`Chatbot matched: ${matchedChatbot.name}`);

      // Check if there's already an active session
      const { data: existingSession } = await supabase
        .from('chatbot_sessions')
        .select('*')
        .eq('conversation_id', conversation.id)
        .eq('status', 'active')
        .single();

      if (existingSession) {
        console.log('Active session already exists');
        return;
      }

      // Create new session
      const { data: session, error: sessionError } = await supabase
        .from('chatbot_sessions')
        .insert({
          chatbot_id: matchedChatbot.id,
          conversation_id: conversation.id,
          contact_id: conversation.contact_id,
          status: 'active',
          session_data: { triggered_by: message.content }
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Failed to create session:', sessionError);
        return;
      }

      // Get first flow step
      const { data: flows, error: flowsError } = await supabase
        .from('chatbot_flows')
        .select('*')
        .eq('chatbot_id', matchedChatbot.id)
        .order('step_order', { ascending: true })
        .limit(1);

      if (flowsError || !flows || flows.length === 0) {
        console.log('No flows found for chatbot');
        return;
      }

      const firstStep = flows[0];

      // Send chatbot response
      await this.sendChatbotResponse(conversation, firstStep);

      // Log analytics
      await supabase.from('chatbot_analytics').insert({
        chatbot_id: matchedChatbot.id,
        session_id: session.id,
        event_type: 'triggered',
        event_data: { message: message.content }
      });

      console.log('Chatbot response sent successfully');

    } catch (error) {
      console.error('Error processing chatbot:', error);
    }
  }

  /**
   * Find chatbot that matches the message
   */
  private static findMatchingChatbot(chatbots: Chatbot[], message: Message): Chatbot | null {
    const messageContent = message.content.toLowerCase().trim();

    for (const chatbot of chatbots) {
      switch (chatbot.trigger_type) {
        case 'keyword':
          const keywords = chatbot.trigger_config?.keywords || [];
          const matched = keywords.some((keyword: string) => 
            messageContent.includes(keyword.toLowerCase())
          );
          if (matched) return chatbot;
          break;

        case 'greeting':
          const greetings = ['hi', 'hello', 'hey', 'halo', 'hai'];
          if (greetings.some(g => messageContent.startsWith(g))) {
            return chatbot;
          }
          break;

        case 'always':
          return chatbot;

        default:
          break;
      }
    }

    return null;
  }

  /**
   * Send chatbot response via WhatsApp (Meta Cloud API)
   */
  private static async sendChatbotResponse(conversation: Conversation, flow: ChatbotFlow) {
    try {
      // Get conversation details
      const { data: conv } = await supabase
        .from('conversations')
        .select('whatsapp_session_id, contact_id')
        .eq('id', conversation.id)
        .single();

      if (!conv) return;

      // Get contact phone number
      const { data: contact } = await supabase
        .from('contacts')
        .select('phone_number')
        .eq('id', conv.contact_id)
        .single();

      if (!contact) return;

      // Send message via Meta Cloud API
      const { getMetaCloudAPIForSession } = await import('@/lib/whatsapp/meta-api');
      const api = await getMetaCloudAPIForSession(conv.whatsapp_session_id, supabase);
      
      await api.sendTextMessage(contact.phone_number, flow.content);

    } catch (error) {
      console.error('Error sending chatbot response:', error);
    }
  }
}
