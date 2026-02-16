/**
 * Message Deduplication Service
 * Prevents duplicate message processing
 */

class MessageDeduplicator {
  constructor() {
    this.processedMessages = new Map(); // messageId -> timestamp
    this.maxAge = 3600000; // 1 hour
    this.cleanupInterval = 300000; // 5 minutes
    
    this.startCleanup();
  }

  /**
   * Check if message was already processed
   */
  isDuplicate(messageId) {
    if (!messageId) return false;
    
    const timestamp = this.processedMessages.get(messageId);
    
    if (!timestamp) {
      return false;
    }
    
    // Check if still valid
    if (Date.now() - timestamp > this.maxAge) {
      this.processedMessages.delete(messageId);
      return false;
    }
    
    return true;
  }

  /**
   * Generate hash for message deduplication
   * Creates a unique hash based on sessionId, recipient, and message content
   */
  generateHash(sessionId, to, message) {
    // Simple hash: combine sessionId, recipient, and first 100 chars of message
    const content = message.substring(0, 100);
    return `${sessionId}:${to}:${content}`;
  }

  /**
   * Mark message as processed
   */
  markAsProcessed(messageId) {
    if (!messageId) return;
    
    this.processedMessages.set(messageId, Date.now());
  }

  /**
   * Mark message as sent (alias for markAsProcessed)
   */
  markAsSent(messageId) {
    this.markAsProcessed(messageId);
  }

  /**
   * Process message with deduplication
   */
  async processMessage(messageId, processFn) {
    // Check for duplicate
    if (this.isDuplicate(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId}`);
      return {
        success: false,
        duplicate: true,
        message: 'Message already processed',
      };
    }
    
    // Mark as processed
    this.markAsProcessed(messageId);
    
    // Process message
    try {
      const result = await processFn();
      return {
        success: true,
        duplicate: false,
        result,
      };
    } catch (error) {
      // Remove from processed if failed
      this.processedMessages.delete(messageId);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalProcessed: this.processedMessages.size,
      oldestTimestamp: this.getOldestTimestamp(),
      newestTimestamp: this.getNewestTimestamp(),
    };
  }

  /**
   * Get oldest timestamp
   */
  getOldestTimestamp() {
    if (this.processedMessages.size === 0) return null;
    
    let oldest = Date.now();
    for (const timestamp of this.processedMessages.values()) {
      if (timestamp < oldest) {
        oldest = timestamp;
      }
    }
    
    return oldest;
  }

  /**
   * Get newest timestamp
   */
  getNewestTimestamp() {
    if (this.processedMessages.size === 0) return null;
    
    let newest = 0;
    for (const timestamp of this.processedMessages.values()) {
      if (timestamp > newest) {
        newest = timestamp;
      }
    }
    
    return newest;
  }

  /**
   * Cleanup old entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [messageId, timestamp] of this.processedMessages.entries()) {
      if (now - timestamp > this.maxAge) {
        this.processedMessages.delete(messageId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Message deduplicator cleaned ${cleaned} old entries`);
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

  /**
   * Clear all processed messages
   */
  clear() {
    this.processedMessages.clear();
  }
}

// Singleton instance
const messageDeduplicator = new MessageDeduplicator();

export default messageDeduplicator;
