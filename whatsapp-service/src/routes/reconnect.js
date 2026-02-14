import express from 'express';
import reconnectManager from '../services/reconnect-manager.js';

const router = express.Router();

/**
 * Get reconnect status for a session
 */
router.get('/reconnect-status/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const status = reconnectManager.getStatus(sessionId);
    
    res.json({
      success: true,
      sessionId,
      ...status
    });
  } catch (error) {
    console.error('Error getting reconnect status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get all active reconnections
 */
router.get('/reconnect-status', (req, res) => {
  try {
    const active = reconnectManager.getAllActive();
    
    res.json({
      success: true,
      count: active.length,
      reconnections: active
    });
  } catch (error) {
    console.error('Error getting all reconnect status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cancel reconnection attempts for a session
 */
router.post('/reconnect-cancel/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    
    reconnectManager.cancelReconnect(sessionId);
    
    res.json({
      success: true,
      message: `Reconnection cancelled for session ${sessionId}`
    });
  } catch (error) {
    console.error('Error cancelling reconnect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
