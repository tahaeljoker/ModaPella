const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();
const router = express.Router();

const generateToken = (user) => {
  return jwt.sign({ user: { id: user.id, role: user.role, email: user.email } }, process.env.JWT_SECRET || 'modapella-secret', {
    expiresIn: '12h'
  });
};

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    const user = new User({ name, email, password, role: 'customer', phone, address });
    await user.save();
    res.status(201).json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (user.active === false) {
      return res.status(403).json({ message: 'هذا الحساب معطّل. تواصل مع المدير.' });
    }

    res.json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

const auth = require('../middleware/auth');
router.put('/change-password', auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

    // Match old password
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: 'تم تغيير كلمة المرور بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'فشل تغيير كلمة المرور', error: error.message });
  }
});

module.exports = router;
