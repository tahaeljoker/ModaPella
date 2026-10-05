const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// POST /api/coupons/validate — Public endpoint for checking and calculating coupon discount
router.post('/validate', async (req, res) => {
  try {
    const { code, orderTotal = 0 } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ message: 'يرجى إدخال كود الخصم' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: normalizedCode });

    if (!coupon) {
      return res.status(404).json({ message: 'كود الخصم غير صحيح أو غير موجود' });
    }

    if (!coupon.active) {
      return res.status(400).json({ message: 'هذا الكود غير مفعّل حالياً' });
    }

    const now = new Date();
    if (coupon.expiryDate && new Date(coupon.expiryDate) < now) {
      return res.status(400).json({ message: 'عذراً، انتهت فترة صلاحية هذا الكود' });
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      return res.status(400).json({ message: 'عذراً، اكتمل الحد الأقصى لاستخدام هذا الكود' });
    }

    const total = Number(orderTotal) || 0;
    if (coupon.minOrderAmount && total < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `الحد الأدنى للطلب لتفعيل هذا الكود هو ${coupon.minOrderAmount} ج.م`
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((total * coupon.discountValue) / 100);
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      // Fixed discount
      discountAmount = Math.min(coupon.discountValue, total);
    }

    const newTotal = Math.max(0, total - discountAmount);

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      newTotal,
      message: `تم تطبيق خصم ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `${coupon.discountValue} ج.م`} بنجاح!`
    });
  } catch (err) {
    console.error('Error validating coupon:', err);
    res.status(500).json({ message: 'حدث خطأ أثناء فحص كود الخصم' });
  }
});

// GET /api/coupons — Get all coupons (Admin/Developer)
router.get('/', auth, requireRole(['admin', 'developer']), async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ message: 'فشل تحميل كوبونات الخصم' });
  }
});

// POST /api/coupons — Create a new coupon (Admin/Developer)
router.post('/', auth, requireRole(['admin', 'developer']), async (req, res) => {
  try {
    const {
      code,
      discountType = 'percentage',
      discountValue,
      minOrderAmount = 0,
      maxDiscount = null,
      expiryDate = null,
      usageLimit = null,
      description = ''
    } = req.body;

    if (!code || !discountValue || discountValue <= 0) {
      return res.status(400).json({ message: 'يرجى إدخال كود وقيمة خصم صحيحة' });
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: normalizedCode });
    if (existing) {
      return res.status(400).json({ message: 'هذا الكود مسجل بالفعل، يرجى اختيار كود آخر' });
    }

    const coupon = new Coupon({
      code: normalizedCode,
      discountType,
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: maxDiscount ? Number(maxDiscount) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      usageLimit: usageLimit ? Number(usageLimit) : null,
      description: description.trim()
    });

    await coupon.save();
    res.status(201).json({ message: 'تم إنشاء كود الخصم بنجاح', coupon });
  } catch (err) {
    console.error('Error creating coupon:', err);
    res.status(500).json({ message: err.message || 'فشل إنشاء كود الخصم' });
  }
});

// PUT /api/coupons/:id — Update coupon (Admin/Developer)
router.put('/:id', auth, requireRole(['admin', 'developer']), async (req, res) => {
  try {
    const {
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      expiryDate,
      usageLimit,
      active,
      description
    } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'الكوبون غير موجود' });
    }

    if (discountType !== undefined) coupon.discountType = discountType;
    if (discountValue !== undefined) coupon.discountValue = Number(discountValue);
    if (minOrderAmount !== undefined) coupon.minOrderAmount = Number(minOrderAmount);
    if (maxDiscount !== undefined) coupon.maxDiscount = maxDiscount ? Number(maxDiscount) : null;
    if (expiryDate !== undefined) coupon.expiryDate = expiryDate ? new Date(expiryDate) : null;
    if (usageLimit !== undefined) coupon.usageLimit = usageLimit ? Number(usageLimit) : null;
    if (active !== undefined) coupon.active = Boolean(active);
    if (description !== undefined) coupon.description = description.trim();

    await coupon.save();
    res.json({ message: 'تم تحديث الكوبون بنجاح', coupon });
  } catch (err) {
    console.error('Error updating coupon:', err);
    res.status(500).json({ message: 'فشل تحديث الكوبون' });
  }
});

// DELETE /api/coupons/:id — Delete coupon (Admin/Developer)
router.delete('/:id', auth, requireRole(['admin', 'developer']), async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'الكوبون غير موجود' });
    }
    res.json({ message: 'تم حذف كود الخصم بنجاح' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ message: 'فشل حذف الكوبون' });
  }
});

module.exports = router;
