import express from 'express'
import whatsappService from '../services/whatsapp.js'
import rateLimiterInstance, { rateLimiterMiddleware } from '../middleware/rateLimiter.js'
import circuitBreakers from '../services/circuitBreaker.js'
import messageDeduplicator from '../services/messageDeduplicator.js'
import deliveryTracker from '../services/deliveryTracker.js'
import healthMonitor from '../services/healthMonitor.js'

const router = express.Router()

// Send single message (with rate limiting, circuit breaker, and deduplication)
router.post('/send', rateLimiterMiddleware, async (req, res) => {
  try {
    const { sessionId, to, message, quotedMessageId } = req.body

    if (!sessionId || !to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, to, message'
      })
    }

    // Check for duplicate message
    const messageHash = messageDeduplicator.generateHash(sessionId, to, message)
    if (messageDeduplicator.isDuplicate(messageHash)) {
      return res.status(409).json({
        success: false,
        message: 'Duplicate message detected',
        isDuplicate: true
      })
    }

    // Execute with circuit breaker protection
    const result = await circuitBreakers.whatsapp.execute(
      async () => {
        const sendResult = await whatsappService.sendMessage(sessionId, to, message, quotedMessageId)
        
        // Track delivery
        if (sendResult.messageId) {
          deliveryTracker.trackDelivery(sendResult.messageId, 'sent', {
            sessionId,
            to,
            timestamp: Date.now()
          })
        }
        
        // Mark message as sent (not duplicate)
        messageDeduplicator.markAsSent(messageHash)
        
        // Record successful operation
        healthMonitor.recordOperation('send_message', true)
        
        return sendResult
      }
    )
    
    res.json({ 
      success: true,
      message: 'Message sent successfully',
      messageId: result.messageId
    })
  } catch (error) {
    console.error('Send message error:', error)
    healthMonitor.recordOperation('send_message', false)
    
    // Check if circuit breaker is open
    if (error.message?.includes('Circuit breaker is OPEN')) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        circuitBreakerOpen: true
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Send bulk messages (with rate limiting and circuit breaker)
router.post('/send-bulk', rateLimiterMiddleware, async (req, res) => {
  try {
    const { sessionId, recipients, message } = req.body

    if (!sessionId || !recipients || !message || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields or invalid recipients array'
      })
    }

    const results = []
    let successCount = 0
    let failureCount = 0
    
    for (const recipient of recipients) {
      try {
        // Check for duplicate
        const messageHash = messageDeduplicator.generateHash(sessionId, recipient.phone_number, message)
        if (messageDeduplicator.isDuplicate(messageHash)) {
          results.push({ 
            phone: recipient.phone_number, 
            success: false,
            error: 'Duplicate message',
            isDuplicate: true
          })
          failureCount++
          continue
        }

        // Execute with circuit breaker
        const breaker = getCircuitBreaker(sessionId)
        await breaker.execute(
          async () => {
            const result = await whatsappService.sendMessage(sessionId, recipient.phone_number, message)
            
            // Track delivery
            if (result.messageId) {
              deliveryTracker.trackDelivery(result.messageId, 'sent', {
                sessionId,
                to: recipient.phone_number,
                timestamp: Date.now()
              })
            }
            
            messageDeduplicator.markAsSent(messageHash)
            return result
          }
        )
        
        results.push({ 
          phone: recipient.phone_number, 
          success: true 
        })
        successCount++
        
        // Rate limiting: 1 message per second
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        results.push({ 
          phone: recipient.phone_number, 
          success: false, 
          error: error.message 
        })
        failureCount++
      }
    }
    
    // Record bulk operation
    healthMonitor.recordOperation('send_bulk', successCount > 0)
    
    res.json({ 
      success: true,
      message: 'Bulk messages sent',
      summary: {
        total: recipients.length,
        success: successCount,
        failed: failureCount
      },
      results
    })
  } catch (error) {
    console.error('Send bulk error:', error)
    healthMonitor.recordOperation('send_bulk', false)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Reconnect/reload a session (with circuit breaker)
router.post('/reconnect/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    // Check if session already exists
    const status = whatsappService.getSessionStatus(sessionId)
    
    if (status === 'connected') {
      healthMonitor.recordSessionStatus(sessionId, 'connected')
      return res.json({
        success: true,
        message: 'Session already connected',
        status
      })
    }

    // Initialize/reconnect with circuit breaker
    const breaker = getCircuitBreaker(sessionId)
    await breaker.execute(
      async () => {
        await whatsappService.initializeClient(sessionId)
        healthMonitor.recordSessionStatus(sessionId, 'connecting')
      }
    )
    
    res.json({
      success: true,
      message: 'Session reconnection initiated',
      status: 'connecting'
    })
  } catch (error) {
    console.error('Reconnect error:', error)
    healthMonitor.recordSessionStatus(req.params.sessionId, 'disconnected')
    
    if (error.message?.includes('Circuit breaker is OPEN')) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        circuitBreakerOpen: true
      })
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get session status
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const status = whatsappService.getSessionStatus(sessionId)
    
    res.json({
      success: true,
      sessionId,
      status
    })
  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get message status - TODO: Implement for Baileys
// router.get('/message-status/:sessionId/:messageId', async (req, res) => {
//   try {
//     const { sessionId, messageId } = req.params
//     
//     console.log('Checking message status:', { sessionId, messageId })
//     
//     const info = await whatsappService.getMessageInfo(sessionId, messageId)
//     
//     res.json({
//       success: true,
//       ...info
//     })
//   } catch (error) {
//     console.error('Message status check error:', error)
//     res.status(500).json({
//       success: false,
//       error: error.message
//     })
//   }
// })

export default router
