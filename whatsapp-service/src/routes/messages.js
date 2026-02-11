import express from 'express'
import whatsappService from '../services/whatsapp.js'

const router = express.Router()

// Send single message
router.post('/send', async (req, res) => {
  try {
    const { sessionId, to, message } = req.body

    if (!sessionId || !to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, to, message'
      })
    }

    console.log('Sending message:', { sessionId, to })

    const result = await whatsappService.sendMessage(sessionId, to, message)
    
    res.json({ 
      success: true,
      message: 'Message sent successfully',
      messageId: result.messageId // Return messageId for status tracking
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Send bulk messages
router.post('/send-bulk', async (req, res) => {
  try {
    const { sessionId, recipients, message } = req.body

    if (!sessionId || !recipients || !message || !Array.isArray(recipients)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields or invalid recipients array'
      })
    }

    console.log('Sending bulk messages:', { sessionId, count: recipients.length })

    const results = []
    
    for (const recipient of recipients) {
      try {
        await whatsappService.sendMessage(sessionId, recipient.phone_number, message)
        results.push({ 
          phone: recipient.phone_number, 
          success: true 
        })
        
        // Rate limiting: 1 message per second
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        results.push({ 
          phone: recipient.phone_number, 
          success: false, 
          error: error.message 
        })
      }
    }
    
    res.json({ 
      success: true,
      message: 'Bulk messages sent',
      results
    })
  } catch (error) {
    console.error('Send bulk error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Reconnect/reload a session
router.post('/reconnect/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params

    console.log('Reconnecting session:', sessionId)

    // Check if session already exists
    const status = whatsappService.getSessionStatus(sessionId)
    
    if (status === 'connected') {
      return res.json({
        success: true,
        message: 'Session already connected',
        status
      })
    }

    // Initialize/reconnect the session
    await whatsappService.initializeClient(sessionId)
    
    res.json({
      success: true,
      message: 'Session reconnection initiated',
      status: 'connecting'
    })
  } catch (error) {
    console.error('Reconnect error:', error)
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

// Get message status
router.get('/message-status/:sessionId/:messageId', async (req, res) => {
  try {
    const { sessionId, messageId } = req.params
    
    console.log('Checking message status:', { sessionId, messageId })
    
    const info = await whatsappService.getMessageInfo(sessionId, messageId)
    
    res.json({
      success: true,
      ...info
    })
  } catch (error) {
    console.error('Message status check error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
