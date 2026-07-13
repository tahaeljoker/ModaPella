const express = require('express');
const auth = require('../middleware/auth'); // assuming standard auth middleware
const SystemNotification = require('../models/SystemNotification');

const router = express.Router();

// Get all notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await SystemNotification.find().sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// Mark a specific notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await SystemNotification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

// Mark a specific notification as unread
router.patch('/:id/unread', auth, async (req, res) => {
  try {
    const notification = await SystemNotification.findByIdAndUpdate(
      req.params.id,
      { isRead: false },
      { new: true }
    );
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

// Delete a notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await SystemNotification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
});

// Mark all notifications as read
router.post('/read-all', auth, async (req, res) => {
  try {
    await SystemNotification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

// Secret hidden route for AI / Developer to post new notifications
router.post('/dev-push', async (req, res) => {
  try {
    const { title, message, type = 'feature' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }
    const notification = new SystemNotification({ title, message, type, isRead: false });
    await notification.save();
    
    // Attempt to emit via Socket.IO if available
    if (req.app.locals.io) {
      req.app.locals.io.emit('notification:new', notification);
    }
    
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Error pushing notification', error: error.message });
  }
});

module.exports = router;
