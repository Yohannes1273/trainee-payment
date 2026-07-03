import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { handleNaturalLanguageBotQuery } from '../services/botQueryParser.js';

const router = express.Router();

// Secure the route with token authentication
router.use(authenticateToken);

/**
 * Simulate or trigger natural language Telegram query execution
 */
router.post('/query', async (req, res) => {
  try {
    const { messageText, currentDate } = req.body;
    if (!messageText) {
      return res.status(400).json({ error: 'Please specify the messageText inquiry.' });
    }

    // Default current date context to 2026-07-01 as per project specs
    const currentDateStr = currentDate || "2026-07-01";
    const reply = await handleNaturalLanguageBotQuery(messageText, currentDateStr);

    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
