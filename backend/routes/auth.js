const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();
const router = express.Router();

const { sendWhatsAppOTP, formatPhone } = require('../services/whatsappService');

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
      return res.status(400).json({ message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
    }
    if (user.active === false) {
      return res.status(403).json({ message: 'هذا الحساب معطّل. تواصل مع المدير.' });
    }

    // Check if user is Admin -> Requires WhatsApp OTP Verification
    if (user.role === 'admin') {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      user.loginOtp = otpCode;
      user.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
      await user.save();

      // Send OTP via WhatsApp
      const rawPhone = user.whatsappPhone || user.phone || process.env.ADMIN_WHATSAPP_NUMBER || '201112556672';
      await sendWhatsAppOTP(rawPhone, otpCode);

      const maskedPhone = rawPhone ? `***${rawPhone.slice(-4)}` : 'الواتساب الخاص بك';

      return res.json({
        requireOtp: true,
        message: `تم إرسال رمز التحقق (OTP) إلى ${maskedPhone} عبر الواتساب`,
        email: user.email
      });
    }

    res.json({ token: generateToken(user), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'فشل تسجيل الدخول', error: error.message });
  }
});

// Verify WhatsApp OTP Endpoint
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'البريد الإلكتروني ورمز التحقق مطلوبان' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.loginOtp || !user.loginOtpExpires) {
      return res.status(400).json({ message: 'لم يتم طلب رمز تحقق لهذا الحساب' });
    }

    if (user.loginOtpExpires < new Date()) {
      return res.status(400).json({ message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.' });
    }

    if (user.loginOtp !== otp.toString().trim()) {
      return res.status(400).json({ message: 'رمز التحقق غير صحيح' });
    }

    // Clear OTP upon successful verification
    user.loginOtp = undefined;
    user.loginOtpExpires = undefined;
    await user.save();

    res.json({
      token: generateToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ message: 'فشل التحقق من كود الواتساب', error: error.message });
  }
});

// Resend WhatsApp OTP Endpoint
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'البريد الإلكتروني مطلوب' });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.role !== 'admin') {
      return res.status(400).json({ message: 'الحساب غير متاح لإعادة الإرسال' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.loginOtp = otpCode;
    user.loginOtpExpires = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    const rawPhone = user.whatsappPhone || user.phone || process.env.ADMIN_WHATSAPP_NUMBER || '201112556672';
    const formattedPhone = formatPhone(rawPhone);
    await sendWhatsAppOTP(rawPhone, otpCode);

    const messageText = `🔑 رمز التحقق الخاص بدخول لوحة تحكم ModaPella هو: *${otpCode}*`;
    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;

    res.json({ message: 'تم إرسال/تحديث رمز جديد للواتساب بنجاح', whatsappLink });
  } catch (error) {
    res.status(500).json({ message: 'فشل إعادة إرسال الرمز', error: error.message });
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
