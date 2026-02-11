import express from 'express'
import whatsappService from '../services/whatsapp.js'

const router = express.Router()

// Generate QR Code
router.post('/generate-qr', async (req, res) => {
  try {
    const { sessionId, phoneNumber, userId } = req.body

    if (!sessionId || !phoneNumber || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, phoneNumber, userId'
      })
    }

    console.log('Generating QR for session:', sessionId)

    // Initialize WhatsApp client (frontend already saved to database)
    const client = await whatsappService.initializeClient(sessionId)
    
    res.json({ 
      success: true,
      message: 'QR generation started. Check Socket.IO for QR code.',
      sessionId
    })
  } catch (error) {
    console.error('Generate QR error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get all sessions
router.get('/sessions', async (req, res) => {
  try {
    const sessions = whatsappService.getAllSessions()
    
    res.json({ 
      success: true, 
      sessions,
      count: sessions.length
    })
  } catch (error) {
    console.error('Get sessions error:', error)
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
      status,
      sessionId 
    })
  } catch (error) {
    console.error('Get status error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Disconnect session
router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    console.log('Disconnecting session:', sessionId)
    
    await whatsappService.disconnectSession(sessionId)
    
    res.json({ 
      success: true,
      message: 'Session disconnected successfully',
      sessionId
    })
  } catch (error) {
    console.error('Disconnect error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
