import express from 'express'
import whatsappService from '../services/whatsapp.js'

const router = express.Router()

// Send location message
router.post('/send-location', async (req, res) => {
  try {
    const { sessionId, to, latitude, longitude, address, name } = req.body

    if (!sessionId || !to || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, to, latitude, longitude'
      })
    }

    const result = await whatsappService.sendLocation(
      sessionId,
      to,
      latitude,
      longitude,
      {
        address,
        name
      }
    )
    
    res.json({ 
      success: true,
      message: 'Location sent successfully',
      messageId: result.messageId
    })
  } catch (error) {
    console.error('Send location error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
