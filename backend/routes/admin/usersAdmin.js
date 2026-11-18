const express = require('express');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const User = require('../../models/User');
const Employee = require('../../models/Employee');

const router = express.Router();

// ─── User Management (admin only) ─────────────────────────────────────────

// GET /api/admin/users — list all staff users
router.get('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ['admin', 'cashier', 'manager', 'employee'] } })
      .select('-password')
      .sort({ createdAt: -1 });
    
    // Self-healing: Resolve and sync phone number from linked Employee if user.phone is missing or incorrect
    const enrichedUsers = await Promise.all(users.map(async (u) => {
      if (u.role === 'employee') {
        let emp = await Employee.findOne({ user: u._id });
        if (!emp) {
          emp = await Employee.findOne({ name: u.name });
          if (emp && !emp.user) {
            emp.user = u._id;
            await emp.save();
          }
        }
        if (emp && emp.phone && u.phone !== emp.phone) {
          u.phone = emp.phone;
          await u.save();
        }
      }
      return u;
    }));

    res.json(enrichedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Unable to load users', error: error.message });
  }
});

// POST /api/admin/users — create a new cashier/manager/employee account
router.post('/users', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, password, role = 'cashier', phone, employeeId } = req.body;
    if (!['cashier', 'manager', 'admin', 'employee'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: 'Email already in use' });
    const user = new User({ name, email, password, role, phone: phone || '' });
    await user.save();

    // Link employee to this User
    if (role === 'employee' && employeeId) {
      const emp = await Employee.findById(employeeId);
      if (emp) {
        emp.user = user._id;
        if (phone) {
          emp.phone = phone;
        } else if (emp.phone) {
          user.phone = emp.phone;
          await user.save();
        }
        await emp.save();
      }
    }

    res.status(201).json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Unable to create user', error: error.message });
  }
});

// PATCH /api/admin/users/:id — update user role, name, email, phone, active
router.patch('/users/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { name, email, role, phone, active } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    if (name) user.name = name.trim();
    if (email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: user._id } });
      if (existing) return res.status(400).json({ message: 'البريد الإلكتروني مستخدم بالفعل بحساب آخر' });
      user.email = email.toLowerCase().trim();
    }
    if (role) {
      if (!['admin', 'cashier', 'manager', 'employee'].includes(role)) {
        return res.status(400).json({ message: 'الصلاحية المحددة غير صحيحة' });
      }
      user.role = role;
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (active !== undefined) user.active = Boolean(active);

    await user.save();

    // If Employee model exists and is linked, sync name and phone
    const linkedEmp = await Employee.findOne({ user: user._id });
    if (linkedEmp) {
      linkedEmp.name = user.name;
      if (user.phone) linkedEmp.phone = user.phone;
      await linkedEmp.save();
    }

    res.json({
      message: 'تم تحديث بيانات المستخدم وصلاحياته بنجاح',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'تعذر تعديل بيانات المستخدم', error: error.message });
  }
});

// PATCH /api/admin/users/:id/toggle — enable/disable a user account
router.patch('/users/:id/toggle', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = user.active === false ? true : false;
    await user.save();
    res.json({ id: user.id, active: user.active });
  } catch (error) {
    res.status(500).json({ message: 'Unable to toggle user', error: error.message });
  }
});

// PATCH /api/admin/users/:id/password — reset a user's password (Admin only)
router.patch('/users/:id/password', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = password; // will be hashed by pre-save hook
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to change password', error: error.message });
  }
});

// DELETE /api/admin/users/:id — remove a cashier account
router.delete('/users/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin user' });
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to delete user', error: error.message });
  }
});

// POST /api/admin/reset-transactions-prod — secure production reset

module.exports = router;
