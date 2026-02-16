/**
 * Delivery Status Tracker
 * Tracks message delivery status and updates database
 */

import { supabase } from '../config/supabase.js';

class DeliveryTracker {
  constructor() {
    this.pendingMessages = new Map(); // messageId -> { sessionId, attempts, lastAttempt }
    this.maxAttempts = 5;
    this.retryDelay = 30000; // 30 seconds
    this.cleanupInterval = 300000; // 5 minutes
    
    this.startCleanup();
  }

  /**
   * Track a sent message
   */
  async trackMessage(sessionId, messageId, dbMessageId, recipientPhone) {
    this.pendingMessages.set(messageId, {
      sessionId,
      dbMessageId,
      recipientPhone,
      attempts: 0,
      lastAttempt: Date.now(),
      status: 'sent',
    });
    
    // Schedule status check
    setTimeout(() => {
      this.checkMessageStatus(messageId);
    }, this.retryDelay);
  }

  /**
   * Update message status
   */
  async updateStatus(messageId, status, errorMessage = null) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;
    
    message.status = status;
    message.lastAttempt = Date.now();
    
    // Update database
    if (supabase && message.dbMessageId) {
      try {
        const updateData = { status };
        if (errorMessage) {
          updateData.error_message = errorMessage;
        }
        
        await supabase
          .from('messages')
          .update(updateData)
          .eq('id', message.dbMessageId);
        
        console.log(`✅ Message ${messageId} status updated to: ${status}`);
        
        // Emit socket event
        if (global.io) {
          global.io.emit('message_status', {
            sessionId: message.sessionId,
            messageId,
            status,
            recipientPhone: message.recipientPhone,
          });
        }
      } catch (error) {
        console.error('Error updating message status:', error);
      }
    }
    
    // Remove from pending if delivered, read, or failed
    if (['delivered', 'read', 'failed'].includes(status)) {
      this.pendingMessages.delete(messageId);
    }
  }

  /**
   * Check message status
   */
  async checkMessageStatus(messageId) {
    const message = this.pendingMessages.get(messageId);
    if (!message) return;
    
    message.attempts++;
    
    // Max attempts reached
    if (message.attempts >= this.maxAttempts) {
      console.log(`⏱️ Max attempts reached for message ${messageId}`);
      this.pendingMessages.delete(messageId);
      return;
    }
    
    // Try to get status from WhatsApp
    try {
      // This would call whatsappService.getMessageInfo()
      // For now, we'll schedule next check
      setTimeout(() => {
        this.checkMessageStatus(messageId);
      }, this.retryDelay * message.attempts); // Exponential backoff
    } catch (error) {
      console.error('Error checking message status:', error);
    }
  }

  /**
   * Handle delivery receipt
   */
  async handleDeliveryReceipt(sessionId, messageId) {
    await this.updateStatus(messageId, 'delivered');
  }

  /**
   * Handle read receipt
   */
  async handleReadReceipt(sessionId, messageId) {
    await this.updateStatus(messageId, 'read');
  }

  /**
   * Handle message failure
   */
  async handleMessageFailure(sessionId, messageId, error) {
    await this.updateStatus(messageId, 'failed', error.message);
  }

  /**
   * Track message delivery (alias for trackMessage)
   */
  trackDelivery(messageId, status, metadata = {}) {
    // Simple tracking - just store the status
    if (!this.pendingMessages.has(messageId)) {
      this.pendingMessages.set(messageId, {
        sessionId: metadata.sessionId,
        status,
        attempts: 0,
        lastAttempt: Date.now(),
        metadata
      });
    } else {
      const message = this.pendingMessages.get(messageId);
      message.status = status;
      message.lastAttempt = Date.now();
    }
  }

  /**
   * Get pending messages count
   */
  getPendingCount() {
    return this.pendingMessages.size;
  }

  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      pending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
    };
    
    for (const [, message] of this.pendingMessages) {
      stats[message.status]++;
    }
    
    return stats;
  }

  /**
   * Cleanup old pending messages
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    let cleaned = 0;
    
    for (const [messageId, message] of this.pendingMessages) {
      if (now - message.lastAttempt > maxAge) {
        this.pendingMessages.delete(messageId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Delivery tracker cleaned ${cleaned} old messages`);
    }
  }

  /**
   * Start cleanup job
   */
  startCleanup() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }
}

// Singleton instance
const deliveryTracker = new DeliveryTracker();

export default deliveryTracker;
