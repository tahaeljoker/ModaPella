const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const InventoryTask = require('../models/InventoryTask');
const InventoryCount = require('../models/InventoryCount');
const SystemNotification = require('../models/SystemNotification');
const User = require('../models/User');

const router = express.Router();

// GET /api/inventory-tasks — list tasks
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      query.employee = req.user.id;
    }
    const tasks = await InventoryTask.find(query)
      .populate('employee assignedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch inventory tasks', error: error.message });
  }
});

// GET /api/inventory-tasks/:id — get details
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await InventoryTask.findById(req.params.id)
      .populate('employee assignedBy', 'name email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    // Authorization check
    if (req.user.role === 'employee' && task.employee._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch task details', error: error.message });
  }
});

// POST /api/inventory-tasks — create a task (Admin/Manager)
router.post('/', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { title, employee, items } = req.body;
    if (!title || !employee || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const task = new InventoryTask({
      title,
      employee,
      assignedBy: req.user.id,
      items,
      status: 'pending'
    });
    await task.save();

    // Create system notification for employee
    const notification = new SystemNotification({
      title: 'تكليف جرد جديد 📦',
      message: `تم تكليفك بمهمة جرد جديدة: "${title}"`,
      recipient: employee,
      type: 'info'
    });
    await notification.save();
    
    // Emit real-time notification
    req.app.locals.io?.emit('notification:new', notification);

    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Unable to create task', error: error.message });
  }
});

// PUT /api/inventory-tasks/:id/submit — submit counts (Employee)
router.put('/:id/submit', auth, requireRole(['employee']), async (req, res) => {
  try {
    const { items } = req.body;
    const task = await InventoryTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.employee.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (task.status === 'accepted') {
      return res.status(400).json({ message: 'Task already accepted and cannot be modified' });
    }

    // Update counted stocks
    items.forEach(incoming => {
      const found = task.items.id(incoming._id);
      if (found) {
        found.countedStock = incoming.countedStock === '' ? null : Number(incoming.countedStock);
      }
    });

    task.status = 'submitted';
    task.submittedAt = new Date();
    await task.save();

    // Create system notification for admin
    const notification = new SystemNotification({
      title: 'تسليم جرد جديد 📋',
      message: `قام الموظف "${req.user.name}" بتسليم الجرد المكلف به: "${task.title}"`,
      recipient: null, // target admins
      type: 'info'
    });
    await notification.save();
    req.app.locals.io?.emit('notification:new', notification);

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Unable to submit task', error: error.message });
  }
});

// PUT /api/inventory-tasks/:id/review — Accept/Reject task (Admin/Manager)
router.put('/:id/review', auth, requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await InventoryTask.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'submitted') {
      return res.status(400).json({ message: 'Task must be submitted before review' });
    }

    if (status === 'accepted') {
      // Find active draft inventory session
      const activeCount = await InventoryCount.findOne({ status: 'draft' }).sort({ createdAt: -1 });
      if (!activeCount) {
        return res.status(400).json({
          message: 'لا توجد جلسة جرد رئيسية (مسودة) مفتوحة حالياً. يرجى إنشاء جلسة جرد رئيسية أولاً لإدراج هذه الكميات فيها.'
        });
      }

      // Merge employee counts into main session
      task.items.forEach(taskItem => {
        if (taskItem.countedStock === null) return;
        
        // Find matching item in activeCount
        const countItem = activeCount.items.find(ci => 
          ci.product.toString() === taskItem.product.toString() &&
          ci.size === taskItem.size &&
          ci.color === taskItem.color
        );
        if (countItem) {
          countItem.countedStock = taskItem.countedStock;
          countItem.variance = taskItem.countedStock - countItem.systemStock;
        }
      });

      await activeCount.save();

      // Notify employee of acceptance
      const notification = new SystemNotification({
        title: 'قبول مهمة الجرد ✅',
        message: `تم قبول واعتماد مهمة الجرد الخاصة بك: "${task.title}"`,
        recipient: task.employee,
        type: 'info'
      });
      await notification.save();
      req.app.locals.io?.emit('notification:new', notification);
    } else {
      // Notify employee of rejection
      const notification = new SystemNotification({
        title: 'رفض مهمة الجرد ❌',
        message: `تم رفض مهمة الجرد الخاصة بك: "${task.title}". ملاحظات المدير: ${adminNotes || 'يرجى مراجعة الكميات المجرودة.'}`,
        recipient: task.employee,
        type: 'info'
      });
      await notification.save();
      req.app.locals.io?.emit('notification:new', notification);
    }

    task.status = status;
    task.adminNotes = adminNotes || '';
    task.reviewedAt = new Date();
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Unable to review task', error: error.message });
  }
});

module.exports = router;
