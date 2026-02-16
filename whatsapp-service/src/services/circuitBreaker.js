/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests to failing services
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute
    this.resetTimeout = options.resetTimeout || 30000; // 30 seconds
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        console.log('⚡ Circuit breaker is OPEN, request rejected');
        if (fallback) {
          return fallback();
        }
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Try to recover
      this.state = 'HALF_OPEN';
      console.log('🔄 Circuit breaker entering HALF_OPEN state');
    }
    
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), this.timeout)
        ),
      ]);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        return fallback();
      }
      
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('✅ Circuit breaker CLOSED (recovered)');
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      this.successCount = 0;
      console.log('❌ Circuit breaker OPEN (recovery failed)');
      return;
    }
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log(`❌ Circuit breaker OPEN (${this.failureCount} failures)`);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      lastFailureTime: this.lastFailureTime,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    this.lastFailureTime = null;
    console.log('🔄 Circuit breaker manually reset');
  }
}

// Create circuit breakers for different operations
const circuitBreakers = {
  whatsapp: new CircuitBreaker({
    failureThreshold: 10, // Increased from 5 to 10 - allow more failures before opening
    successThreshold: 2,
    timeout: 30000,
    resetTimeout: 30000, // Reduced from 60s to 30s - faster recovery
  }),
  database: new CircuitBreaker({
    failureThreshold: 5, // Increased from 3 to 5
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 20000, // Reduced from 30s to 20s
  }),
};

export default circuitBreakers;
export { CircuitBreaker };
