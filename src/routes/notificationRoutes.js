import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';

const router = express.Router();

// Get all notifications for current user
router.get('/', authenticateToken, getNotifications);

// Mark notification as read
router.put('/:id/read', authenticateToken, markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', authenticateToken, markAllAsRead);

export default router;
