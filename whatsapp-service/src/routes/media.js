import express from 'express'
import multer from 'multer'
import whatsappService from '../services/whatsapp.js'

const router = express.Router()

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024, // 16MB
  },
})

// Send media message
router.post('/send-media', upload.single('media'), async (req, res) => {
  try {
    const { sessionId, to, caption, mimetype } = req.body
    const mediaFile = req.file

    if (!sessionId || !to || !mediaFile) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sessionId, to, media'
      })
    }

    const result = await whatsappService.sendMedia(
      sessionId,
      to,
      mediaFile.buffer,
      {
        mimetype: mimetype || mediaFile.mimetype,
        caption: caption || '',
        filename: mediaFile.originalname
      }
    )
    
    res.json({ 
      success: true,
      message: 'Media sent successfully',
      messageId: result.messageId
    })
  } catch (error) {
    console.error('Send media error:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
