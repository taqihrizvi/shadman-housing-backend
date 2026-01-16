import prisma from '../config/database.js';

// Get all notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to last 50 notifications
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message,
    });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify notification belongs to user
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message,
    });
  }
};

// Helper function to create notification
export const createNotification = async (userId, type, title, message, relatedId = null, relatedType = null) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        relatedId,
        relatedType,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};
