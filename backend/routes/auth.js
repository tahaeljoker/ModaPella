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

module.exports = router;
