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

// Force delete session (including auth files) - MUST BE BEFORE generic delete
router.delete('/sessions/:sessionId/force', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    await whatsappService.forceDeleteSession(sessionId)
    
    res.json({ 
      success: true,
      message: 'Session and auth files deleted successfully',
      sessionId
    })
  } catch (error) {
    console.error('Force delete error:', error)
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

// Reconnect session
router.post('/reconnect/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    // Try to initialize client again
    await whatsappService.initializeClient(sessionId)
    
    res.json({ 
      success: true,
      message: 'Session reconnection initiated',
      sessionId
    })
  } catch (error) {
    console.error('Reconnect error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
