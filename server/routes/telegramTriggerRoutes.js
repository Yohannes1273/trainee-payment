import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import telegramTriggerService from '../services/telegramTriggerService.js';
import botService from '../services/botService.js';

const router = express.Router();

router.use(authenticateToken);

// Restrict these settings to staff roles
const authorizedRoles = ['Finance', 'Night Controller', 'HR', 'Registrar'];

/**
 * GET /api/telegram-triggers
 * Retrieve current trigger configurations
 */
router.get('/', requireRole(authorizedRoles), (req, res) => {
  try {
    const config = telegramTriggerService.getTriggers();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/telegram-triggers/save
 * Update entire trigger configuration
 */
router.post('/save', requireRole(authorizedRoles), (req, res) => {
  try {
    const { config } = req.body;
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Invalid configuration payload.' });
    }

    const saved = telegramTriggerService.saveTriggers(config);
    if (!saved) {
      return res.status(500).json({ error: 'Failed to write configurations to disk.' });
    }

    res.json({ success: true, message: 'Telegram notification trigger templates updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/telegram-triggers/test
 * Simulate and dispatch a test alert with dummy variables to verify connectivity
 */
router.post('/test', requireRole(authorizedRoles), async (req, res) => {
  try {
    const { event, testDirectChatId, testGroupChatId } = req.body;
    if (!event) {
      return res.status(400).json({ error: 'Please specify the target event type to test.' });
    }

    const triggers = telegramTriggerService.getTriggers();
    const config = triggers[event];
    if (!config) {
      return res.status(404).json({ error: `Event trigger template '${event}' not found.` });
    }

    const mockVariables = {
      traineeName: 'Abebe Bekele',
      rollNumber: 'TVET-9021',
      programName: 'Weekend',
      levelNumber: '4',
      amountPaid: '1,200',
      dueDate: '2026-07-15',
      penaltyAmount: '150',
      receiptNumber: 'REC-9921',
      routedTo: 'Night Controller Stream',
      rejectionReason: 'The uploaded bank receipt slip is blurry. Please re-upload.',
      aiReferenceNumber: 'TXN-9021-X',
      aiReason: 'AI Confidence: High (Extracted: 1200 ETB)'
    };

    const directMsg = telegramTriggerService.formatMessage(config.traineeTemplate, mockVariables);
    const staffMsg = telegramTriggerService.formatMessage(config.staffTemplate, mockVariables);

    let directSuccess = false;
    let groupSuccess = false;

    // Send direct test message
    if (directMsg && testDirectChatId) {
      directSuccess = await botService.sendDirectMessage(testDirectChatId, `🧪 <b>[TEST]</b>\n\n` + directMsg);
    }

    // Send group test message
    if (staffMsg && testGroupChatId) {
      groupSuccess = await botService.sendDirectMessage(testGroupChatId, `🧪 <b>[TEST]</b>\n\n` + staffMsg);
    } else if (staffMsg) {
      // Broadcast to default group chat if configured
      groupSuccess = await botService.broadcastToGroup(`🧪 <b>[TEST]</b>\n\n` + staffMsg);
    }

    res.json({
      success: true,
      message: 'Mock notification event dispatched!',
      details: {
        event,
        directSuccess,
        groupSuccess,
        testDirectChatIdUsed: testDirectChatId || 'None',
        testGroupChatIdUsed: testGroupChatId || 'Default Group'
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
