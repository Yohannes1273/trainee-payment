import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import notificationService from '../services/notificationService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'polytechnic-college-secret-key-1029384756';

/**
 * SSE Real-time Notification Stream
 * Open connection, authenticate via query parameter token, and register connection.
 */
router.get('/stream', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: 'Authorization query token is required for streaming.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token is invalid or expired.' });
    }

    const { id: userId, role: userRole } = user;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(': sse connection opened\n\n');

    // Register active connection
    const client = notificationService.registerClient(userId, userRole, res);

    // Clean up on connection close
    req.on('close', () => {
      client.cleanup();
    });
  });
});

/**
 * GET /api/notifications
 * Fetch historic notifications matching user and/or role
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;
    const list = await notificationService.getNotificationsForUser(userId, userRole);
    res.json({ success: true, notifications: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const { id: userId, role: userRole } = req.user;
    await notificationService.markAllAsRead(userId, userRole);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a single notification as read
 */
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { id: notificationId } = req.params;
    const updated = await notificationService.markAsRead(notificationId, userId);
    if (!updated) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json({ success: true, notification: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/announce
 * Allows administrative staff to trigger custom System Announcements
 */
router.post('/announce', authenticateToken, async (req, res) => {
  try {
    const { role } = req.user;
    // Clearance check: Only Registrar, Finance, HR, or Night Controller can send announcements
    const allowed = ['Registrar', 'Finance', 'HR', 'Night Controller', 'Department Head'];
    if (!allowed.includes(role)) {
      return res.status(403).json({ error: 'Access Denied. You do not have clearance to broadcast announcements.' });
    }

    const { title, message, type = 'info', targetRole = null } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required fields.' });
    }

    const notif = await notificationService.sendNotification({
      userRole: targetRole || null, // null means global to all users
      title,
      message,
      type,
      userId: null
    });

    res.json({ success: true, message: 'System Announcement broadcasted successfully!', notification: notif });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
