const express = require('express');
const router = express.Router();
const Look = require('../models/Look');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /api/looks — public storefront active looks
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { active: true };
    if (category && category !== 'الكل') {
      filter.category = category;
    }

    const looks = await Look.find(filter)
      .populate({
        path: 'items.product',
        select: 'name onlineName price discountPrice allowDiscount images sizes colors variants stock category mannequinImage'
      })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    // Filter out items whose product was deleted
    const sanitizedLooks = looks.map(look => ({
      ...look,
      items: (look.items || []).filter(item => item && item.product)
    }));

    res.json(sanitizedLooks);
  } catch (error) {
    console.error('Error fetching looks:', error);
    res.status(500).json({ message: 'فشل جلب إطلالات الموديلز', error: error.message });
  }
});

// GET /api/looks/:id — get a single look
router.get('/:id', async (req, res) => {
  try {
    const look = await Look.findById(req.params.id)
      .populate({
        path: 'items.product',
        select: 'name onlineName price discountPrice allowDiscount images sizes colors variants stock category mannequinImage'
      })
      .lean();

    if (!look) {
      return res.status(404).json({ message: 'الإطلالة غير موجودة' });
    }

    look.items = (look.items || []).filter(item => item && item.product);
    res.json(look);
  } catch (error) {
    res.status(500).json({ message: 'فشل جلب الإطلالة', error: error.message });
  }
});

// ==================== ADMIN ROUTES ====================

// GET /api/looks/admin/all — get all looks (active & inactive)
router.get('/admin/all', auth, requireRole(['admin', 'manager', 'developer']), async (req, res) => {
  try {
    const looks = await Look.find()
      .populate({
        path: 'items.product',
        select: 'name onlineName price images stock category'
      })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    res.json(looks);
  } catch (error) {
    res.status(500).json({ message: 'فشل جلب الإطلالات للإدارة', error: error.message });
  }
});

// POST /api/looks/admin — create a new look
router.post('/admin', auth, requireRole(['admin', 'manager', 'developer']), async (req, res) => {
  try {
    const {
      title,
      description,
      category = 'كاجوال',
      mediaType = 'image',
      mediaUrl,
      videoThumbnail = '',
      bundleDiscountPercent = 10,
      items = [],
      active = true,
      order = 0
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'يرجى كتابة عنوان الإطلالة' });
    }
    if (!mediaUrl || !mediaUrl.trim()) {
      return res.status(400).json({ message: 'يرجى رفع أو وضع رابط صورة أو فيديو الموديل' });
    }

    const look = new Look({
      title: title.trim(),
      description: (description || '').trim(),
      category: category.trim(),
      mediaType,
      mediaUrl: mediaUrl.trim(),
      videoThumbnail: (videoThumbnail || '').trim(),
      bundleDiscountPercent: Number(bundleDiscountPercent) || 0,
      items: Array.isArray(items) ? items : [],
      active: Boolean(active),
      order: Number(order) || 0
    });

    await look.save();

    const populated = await Look.findById(look._id)
      .populate('items.product', 'name onlineName price images stock category')
      .lean();

    res.status(201).json({ message: 'تم حفظ إطلالة الموديل بنجاح', look: populated });
  } catch (error) {
    console.error('Error creating look:', error);
    res.status(500).json({ message: 'فشل حفظ الإطلالة', error: error.message });
  }
});

// PUT /api/looks/admin/:id — update a look
router.put('/admin/:id', auth, requireRole(['admin', 'manager', 'developer']), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      mediaType,
      mediaUrl,
      videoThumbnail,
      bundleDiscountPercent,
      items,
      active,
      order
    } = req.body;

    const look = await Look.findById(req.params.id);
    if (!look) {
      return res.status(404).json({ message: 'الإطلالة غير موجودة' });
    }

    if (title !== undefined) look.title = title.trim();
    if (description !== undefined) look.description = description.trim();
    if (category !== undefined) look.category = category.trim();
    if (mediaType !== undefined) look.mediaType = mediaType;
    if (mediaUrl !== undefined) look.mediaUrl = mediaUrl.trim();
    if (videoThumbnail !== undefined) look.videoThumbnail = videoThumbnail.trim();
    if (bundleDiscountPercent !== undefined) look.bundleDiscountPercent = Number(bundleDiscountPercent) || 0;
    if (items !== undefined && Array.isArray(items)) look.items = items;
    if (active !== undefined) look.active = Boolean(active);
    if (order !== undefined) look.order = Number(order) || 0;

    await look.save();

    const populated = await Look.findById(look._id)
      .populate('items.product', 'name onlineName price images stock category')
      .lean();

    res.json({ message: 'تم تعديل الإطلالة بنجاح', look: populated });
  } catch (error) {
    res.status(500).json({ message: 'فشل تعديل الإطلالة', error: error.message });
  }
});

// DELETE /api/looks/admin/:id — delete a look
router.delete('/admin/:id', auth, requireRole(['admin', 'manager', 'developer']), async (req, res) => {
  try {
    const look = await Look.findByIdAndDelete(req.params.id);
    if (!look) {
      return res.status(404).json({ message: 'الإطلالة غير موجودة' });
    }
    res.json({ message: 'تم حذف الإطلالة بنجاح' });
  } catch (error) {
    res.status(500).json({ message: 'فشل حذف الإطلالة', error: error.message });
  }
});

module.exports = router;

