import Notification from '../models/Notification.js';

// List of active Server-Sent Events (SSE) connections
let clients = [];

/**
 * Registers an active SSE connection for a user
 */
export function registerClient(userId, userRole, res) {
  const clientId = 'client_' + Math.random().toString(36).substr(2, 9);
  const clientObj = { id: clientId, userId, userRole, res };
  clients.push(clientObj);

  console.log(`[Notification Service] SSE Client registered. User: ${userId} (${userRole}). Active connections: ${clients.length}`);

  // Heartbeat to prevent timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      console.error('[Notification Service] Error sending heartbeat, cleaning up.');
      clearInterval(heartbeat);
    }
  }, 30000);

  return {
    id: clientId,
    cleanup: () => {
      clearInterval(heartbeat);
      clients = clients.filter(c => c.id !== clientId);
      console.log(`[Notification Service] SSE Client disconnected. User: ${userId}. Active connections: ${clients.length}`);
    }
  };
}

/**
 * Creates, saves, and broadcasts an in-app notification in real-time
 */
export async function sendNotification({ userId = null, userRole = null, title, message, type = 'info', paymentId = null }) {
  try {
    const notif = await Notification.create({
      userId,
      userRole,
      title,
      message,
      type,
      paymentId,
      readBy: [],
      isRead: false
    });

    console.log(`[Notification Service] New notification created: "${title}". Broadcasting to target...`);

    // Find and broadcast to matching SSE clients
    const payload = JSON.stringify(notif);
    let matchedCount = 0;

    clients.forEach(client => {
      let isMatch = false;

      // Match 1: Personal notification
      if (userId && client.userId === userId) {
        isMatch = true;
      }
      // Match 2: Role-based notification
      else if (userRole && client.userRole === userRole) {
        isMatch = true;
      }
      // Match 3: Global notification
      else if (!userId && !userRole) {
        isMatch = true;
      }

      if (isMatch) {
        try {
          client.res.write(`event: notification\ndata: ${payload}\n\n`);
          matchedCount++;
        } catch (e) {
          console.error(`[Notification Service] Failed to write to client ${client.id}:`, e);
        }
      }
    });

    console.log(`[Notification Service] Broadcasted to ${matchedCount} active connections.`);
    return notif;
  } catch (err) {
    console.error('[Notification Service] Error creating/broadcasting notification:', err);
    throw err;
  }
}

/**
 * Fetches notifications relevant to a user or their role
 */
export async function getNotificationsForUser(userId, userRole) {
  try {
    // 1. Fetch global announcements
    const globalNotifs = await Notification.find({ userId: null, userRole: null });
    
    // 2. Fetch role-based notifications
    const roleNotifs = userRole ? await Notification.find({ userRole }) : [];
    
    // 3. Fetch user-specific notifications
    const userNotifs = userId ? await Notification.find({ userId }) : [];

    // Combine them
    const all = [...globalNotifs, ...roleNotifs, ...userNotifs];

    // Filter out duplicates (should be unique by _id)
    const seen = new Set();
    const unique = all.filter(n => {
      if (seen.has(n._id)) return false;
      seen.add(n._id);
      return true;
    });

    // Sort by createdAt descending
    unique.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Format the notifications to include correct "read" status for the user
    return unique.map(n => {
      const data = n.toJSON ? n.toJSON() : n;
      // If it's a personal notification, use the isRead flag
      if (data.userId) {
        return { ...data, isRead: !!data.isRead };
      }
      // If it's global or role-based, check if userId is in the readBy array
      const readByArr = data.readBy || [];
      return {
        ...data,
        isRead: readByArr.includes(userId)
      };
    });
  } catch (err) {
    console.error('[Notification Service] Error fetching notifications:', err);
    throw err;
  }
}

/**
 * Marks a notification as read for a specific user
 */
export async function markAsRead(notificationId, userId) {
  try {
    const notif = await Notification.findById(notificationId);
    if (!notif) return null;

    if (notif.userId) {
      // User-specific notification
      notif.isRead = true;
    } else {
      // Global or role-based
      const currentReadBy = notif.readBy || [];
      if (!currentReadBy.includes(userId)) {
        notif.readBy = [...currentReadBy, userId];
      }
    }

    await notif.save();
    return notif;
  } catch (err) {
    console.error('[Notification Service] Error marking notification as read:', err);
    throw err;
  }
}

/**
 * Marks all notifications as read for a specific user and role
 */
export async function markAllAsRead(userId, userRole) {
  try {
    const list = await getNotificationsForUser(userId, userRole);
    const unread = list.filter(n => !n.isRead);

    for (const item of unread) {
      await markAsRead(item._id, userId);
    }
    return true;
  } catch (err) {
    console.error('[Notification Service] Error marking all notifications as read:', err);
    throw err;
  }
}

const notificationService = {
  registerClient,
  sendNotification,
  getNotificationsForUser,
  markAsRead,
  markAllAsRead
};

export default notificationService;
