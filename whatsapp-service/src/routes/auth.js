import express from 'express'
import whatsappService from '../services/whatsapp.js'
import fs from 'fs'
import path from 'path'

const router = express.Router()

// Initialize new session (simplified endpoint)
router.post('/init', async (req, res) => {
  try {
    const { sessionId, forceNew = true } = req.body

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: sessionId'
      })
    }

    console.log(`📱 Init request for session: ${sessionId}, forceNew: ${forceNew}`)

    // Initialize WhatsApp client (force new to generate QR)
    await whatsappService.initializeClient(sessionId, forceNew)
    
    res.json({ 
      success: true,
      message: 'Session initialization started',
      sessionId
    })
  } catch (error) {
    console.error('Init session error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Get QR code for session
router.get('/qr/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    const qr = await whatsappService.getQRCode(sessionId)
    const status = await whatsappService.getSessionStatus(sessionId)
    
    res.json({ 
      success: true,
      qr,
      status,
      sessionId 
    })
  } catch (error) {
    console.error('Get QR error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Generate QR Code (legacy endpoint)
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
    const { forceNew } = req.query // Support forceNew query param
    
    console.log(`🔄 Reconnect requested for session: ${sessionId}, forceNew: ${forceNew}`)
    
    // If forceNew=true, delete auth files first
    if (forceNew === 'true') {
      console.log(`🗑️ forceNew=true, deleting auth files for: ${sessionId}`)
      const authPath = path.join('.baileys_auth', sessionId)
      
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true })
        console.log(`✅ Auth files deleted: ${authPath}`)
      } else {
        console.log(`⚠️  No auth files found: ${authPath}`)
      }
      
      // Wait a bit for filesystem
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Try to initialize client again
    await whatsappService.initializeClient(sessionId, forceNew === 'true')
    
    res.json({ 
      success: true,
      message: 'Session reconnection initiated',
      sessionId,
      forceNew: forceNew === 'true'
    })
  } catch (error) {
    console.error('Reconnect error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

// Clean reconnect - delete auth files and reconnect
router.post('/clean-reconnect/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    
    console.log(`🧹 Clean reconnect requested for session: ${sessionId}`)
    
    // Step 1: Disconnect if connected
    try {
      await whatsappService.disconnectSession(sessionId)
      console.log(`✅ Session disconnected: ${sessionId}`)
    } catch (err) {
      console.log(`⚠️  Disconnect failed (may not be connected): ${err.message}`)
    }
    
    // Step 2: Delete auth files manually (don't delete from database)
    const authPath = path.join('.baileys_auth', sessionId)
    
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true })
      console.log(`✅ Auth files deleted: ${authPath}`)
    } else {
      console.log(`⚠️  No auth files found: ${authPath}`)
    }
    
    // Step 3: Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Step 4: Reinitialize with forceNew=true
    console.log(`🚀 Reinitializing session with forceNew=true: ${sessionId}`)
    await whatsappService.initializeClient(sessionId, true)
    
    res.json({ 
      success: true,
      message: 'Clean reconnection initiated - QR code will be generated',
      sessionId
    })
  } catch (error) {
    console.error('Clean reconnect error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
