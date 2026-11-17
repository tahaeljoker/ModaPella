const express = require('express');
const mongoose = require('mongoose');
const auth = require('../../middleware/auth');
const requireRole = require('../../middleware/requireRole');
const Product = require('../../models/Product');
const Supplier = require('../../models/Supplier');
const SupplierTransaction = require('../../models/SupplierTransaction');
const Shift = require('../../models/Shift');
const Transaction = require('../../models/Transaction');

const router = express.Router();

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const sanitizeSku = (str) => {
  if (!str || typeof str !== 'string') return '';
  let s = str.trim();
  for (let i = 0; i < 10; i++) {
    s = s.replaceAll(ARABIC_DIGITS[i], String(i)).replaceAll(PERSIAN_DIGITS[i], String(i));
  }
  return s.replace(/[^a-zA-Z0-9_-]/g, '').toUpperCase();
};

const generateSku = async () => {
  const products = await Product.find({}, { sku: 1 }).lean();
  let maxNum = 1000;

  for (const p of products) {
    if (p.sku) {
      const digits = p.sku.replace(/[^0-9]/g, '');
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > maxNum && num <= 99999) {
        maxNum = num;
      }
    }
  }

  return (maxNum + 1).toString();
};

const handleSupplierProductBilling = async ({ supplierId, supplierName, product, quantity, costPrice, option, invoiceRef, userId }) => {
  if (!option || option === 'none') return;
  const qty = Number(quantity || product?.stock || 0);
  const cost = Number(costPrice || product?.costPrice || 0);
  if (qty <= 0 || cost <= 0) return;

  let supplierDoc = null;
  if (supplierId && mongoose.Types.ObjectId.isValid(supplierId)) {
    supplierDoc = await Supplier.findById(supplierId);
  }
  if (!supplierDoc && supplierName && supplierName.trim()) {
    const rawName = supplierName.trim();
    supplierDoc = await Supplier.findOne({ name: rawName });
    if (!supplierDoc) {
      const escaped = rawName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
        .replace(/[أإآا]/g, '[أإآا]')
        .replace(/[ةه]/g, '[ةه]')
        .replace(/[ىي]/g, '[ىي]')
        .replace(/\s+/g, '\\s+');
      supplierDoc = await Supplier.findOne({ name: { $regex: new RegExp(`^${escaped}$`, 'i') } });
    }
    if (!supplierDoc) {
      supplierDoc = new Supplier({ name: rawName });
      await supplierDoc.save();
    }
  }
  if (!supplierDoc) return;

  // Ensure product is explicitly linked to this supplier
  if (product && (!product.supplierId || product.supplierId.toString() !== supplierDoc._id.toString() || product.supplier !== supplierDoc.name)) {
    product.supplierId = supplierDoc._id;
    product.supplier = supplierDoc.name;
    await product.save();
  }

  const totalAmount = qty * cost;

  // Anti-duplicate safeguard: check if a purchase for the exact same product and amount was created within last 15 minutes
  const recentProductTx = await SupplierTransaction.findOne({
    supplier: supplierDoc._id,
    type: 'purchase',
    amount: totalAmount,
    createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    'items.product': product._id
  });
  if (recentProductTx) {
    console.warn(`[SafeGuard] Prevented duplicate supplier billing for product ${product.name} (Amount: ${totalAmount})`);
    return;
  }

  if (option === 'credit') {
    // آجل على المحل (دين للمورد)
    const tx = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'purchase',
      amount: totalAmount,
      description: `فاتورة بضاعة (شراء آجل) - ${product.name} (${qty} قطعة × ${cost} ج.م)`,
      reference: invoiceRef || '',
      paymentSource: 'PersonalPocket',
      items: [{ product: product._id, name: product.name, quantity: qty, unitPrice: cost }],
      date: new Date()
    });
    await tx.save();
  } else if (option === 'cash_safe') {
    // شراء نقدي فوري مسدد من درج الخزنة
    const txPurchase = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'purchase',
      amount: totalAmount,
      description: `فاتورة بضاعة (شراء نقدي) - ${product.name} (${qty} قطعة × ${cost} ج.م)`,
      reference: invoiceRef || '',
      paymentSource: 'StoreSafe',
      items: [{ product: product._id, name: product.name, quantity: qty, unitPrice: cost }],
      date: new Date()
    });
    await txPurchase.save();

    const txPayment = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'payment',
      amount: totalAmount,
      description: `سداد فاتورة بضاعة من درج الخزنة - ${product.name}`,
      reference: invoiceRef || '',
      paymentSource: 'StoreSafe',
      date: new Date()
    });
    await txPayment.save();

    const openShift = await Shift.findOne({ user: userId, status: 'open' });
    const safeTx = new Transaction({
      amount: totalAmount,
      type: 'OUT',
      category: 'Expense',
      description: `سداد بضاعة مورد (كاش الخزنة) - ${supplierDoc.name} | ${product.name} (${qty} قطعة)`,
      paymentMethod: 'Cash',
      user: userId,
      shift: openShift?._id,
      referenceId: txPayment._id
    });
    await safeTx.save();
  } else if (option === 'cash_personal') {
    // مسدد كاش من جيب شخصي
    const txPurchase = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'purchase',
      amount: totalAmount,
      description: `فاتورة بضاعة (مسددة جيب شخصي) - ${product.name} (${qty} قطعة × ${cost} ج.م)`,
      reference: invoiceRef || '',
      paymentSource: 'PersonalPocket',
      items: [{ product: product._id, name: product.name, quantity: qty, unitPrice: cost }],
      date: new Date()
    });
    await txPurchase.save();

    const txPayment = new SupplierTransaction({
      supplier: supplierDoc._id,
      type: 'payment',
      amount: totalAmount,
      description: `سداد فاتورة بضاعة (جيب شخصي) - ${product.name}`,
      reference: invoiceRef || '',
      paymentSource: 'PersonalPocket',
      date: new Date()
    });
    await txPayment.save();
  }
};

const formatVariantSku = (prodSku, size, color, explicitSku) => {
  if (explicitSku && String(explicitSku).trim()) {
    return String(explicitSku).trim().toUpperCase();
  }
  if (!prodSku) return '';
  const cleanSize = String(size || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const cleanColor = String(color || '').trim().replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
  return `${prodSku}-${cleanSize || 'STD'}-${cleanColor || 'VAR'}`;
};

router.post('/products', auth, requireRole(['admin']), async (req, res) => {
  try {
    const productData = req.body;
    const cleanedSku = sanitizeSku(productData.sku);
    if (cleanedSku) {
      productData.sku = cleanedSku;
    } else {
      productData.sku = await generateSku();
    }

    if (productData.variants && Array.isArray(productData.variants)) {
      productData.variants = productData.variants.map(v => ({
        ...v,
        sku: formatVariantSku(productData.sku, v.size, v.color, v.sku)
      }));
    }
    const product = new Product(productData);
    await product.save();
    
    // Create Initial Stock History
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.stock > 0) {
          await StockHistory.create({
            product: product._id,
            productName: product.name,
            size: v.size,
            color: v.color,
            variantKey: `${v.size}_${v.color}`,
            changeType: 'Initial Stock',
            quantityChanged: v.stock,
            previousStock: 0,
            newStock: v.stock,
            performedBy: req.user.id,
            performedByName: req.user.name
          });
        }
      }
    } else if (product.stock > 0) {
      await StockHistory.create({
        product: product._id,
        productName: product.name,
        changeType: 'Initial Stock',
        quantityChanged: product.stock,
        previousStock: 0,
        newStock: product.stock,
        performedBy: req.user.id,
        performedByName: req.user.name
      });
    }

    // Process Supplier Billing if selected
    if (productData.supplierBillOption && productData.supplierBillOption !== 'none') {
      await handleSupplierProductBilling({
        supplierId: productData.supplierId || product.supplierId,
        supplierName: productData.supplier || product.supplier,
        product,
        quantity: product.stock,
        costPrice: product.costPrice,
        option: productData.supplierBillOption,
        invoiceRef: productData.supplierInvoiceRef,
        userId: req.user.id
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({ message: 'Unable to create product', error: error.message });
  }
});

router.put('/products/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) return res.status(404).json({ message: 'Product not found' });

    const cleanedInputSku = sanitizeSku(req.body.sku);

    if (cleanedInputSku) {
      req.body.sku = cleanedInputSku;
    } else if (existingProduct.sku && existingProduct.sku.trim()) {
      // Retain existing SKU unconditionally
      req.body.sku = existingProduct.sku.trim();
    } else {
      // If product has no SKU at all in DB, generate one now
      req.body.sku = await generateSku();
    }

    if (existingProduct.sku && existingProduct.sku !== req.body.sku) {
      if (!req.body.oldSku) {
        req.body.oldSku = existingProduct.sku;
      }
      const existingHistory = Array.isArray(existingProduct.oldSkus) ? existingProduct.oldSkus : [];
      const historySet = new Set([
        ...existingHistory,
        existingProduct.sku,
        existingProduct.oldSku,
        req.body.oldSku
      ].filter(Boolean));
      historySet.delete(req.body.sku);
      req.body.oldSkus = Array.from(historySet);
    } else if (existingProduct.oldSkus && !req.body.oldSkus) {
      req.body.oldSkus = existingProduct.oldSkus;
    }

    if (req.body.variants && Array.isArray(req.body.variants) && req.body.variants.length > 0) {
      // Fix race condition: frontend sends originalVariants (snapshot at modal-open time).
      // We compute the delta the admin intended, then apply it on top of the *live* DB stock
      // so any sales that occurred while the modal was open are NOT erased.
      const originalVariants = req.body.originalVariants || [];
      const originalMap = {};
      originalVariants.forEach(ov => {
        const key = `${ov.size || ''}_${ov.color || ''}`;
        originalMap[key] = Number(ov.stock || 0);
      });

      req.body.variants = req.body.variants.map(v => {
        const key = `${v.size || ''}_${v.color || ''}`;
        const originalStock = originalMap.hasOwnProperty(key) ? originalMap[key] : Number(v.stock || 0);
        const intendedStock = Number(v.stock || 0);
        const delta = intendedStock - originalStock; // positive = admin added, negative = admin removed

        // Find the current live DB stock for this variant
        const dbVariant = existingProduct.variants
          ? existingProduct.variants.find(dv => dv.size === v.size && dv.color === v.color)
          : null;
        const liveStock = dbVariant != null ? (dbVariant.stock || 0) : intendedStock;

        // Apply delta on top of live stock (never go below 0)
        const correctedStock = Math.max(0, liveStock + delta);
        const variantSku = v.sku || dbVariant?.sku || formatVariantSku(req.body.sku, v.size, v.color);
        return { ...v, stock: correctedStock, sku: variantSku };
      });

      delete req.body.originalVariants; // don't persist this helper field
      req.body.stock = req.body.variants.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    }

    const currentSold = existingProduct.sold || 0;
    const incomingStock = Number(req.body.stock ?? existingProduct.stock ?? 0);
    if (req.body.totalReceived !== undefined && !isNaN(Number(req.body.totalReceived))) {
      req.body.totalReceived = Math.max(Number(req.body.totalReceived), incomingStock + currentSold);
    } else if ((incomingStock + currentSold) > (existingProduct.totalReceived || 0)) {
      req.body.totalReceived = incomingStock + currentSold;
    }

    const prevStock = existingProduct.stock || 0;
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    // Log stock change in StockHistory if stock changed during edit
    const newStock = product.stock || 0;
    if (prevStock !== newStock) {
      await StockHistory.create({
        product: product._id,
        productName: product.name,
        changeType: 'Product Edit',
        quantityChanged: newStock - prevStock,
        previousStock: prevStock,
        newStock: newStock,
        performedBy: req.user.id,
        performedByName: req.user.name || '',
        notes: `تعديل يدوي للمخزون عبر شاشة المنتجات (${prevStock} ➔ ${newStock})`
      });
    }

    // Process Supplier Billing if selected during edit
    if (req.body.supplierBillOption && req.body.supplierBillOption !== 'none') {
      await handleSupplierProductBilling({
        supplierId: req.body.supplierId || product.supplierId,
        supplierName: req.body.supplier || product.supplier,
        product,
        quantity: Number(product.stock || 0),
        costPrice: Number(product.costPrice || 0),
        option: req.body.supplierBillOption,
        invoiceRef: req.body.supplierInvoiceRef,
        userId: req.user.id
      });
    }

    req.app.locals.io?.emit('inventory:update', product);
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Unable to update product', error: error.message });
  }
});

// POST /api/admin/products/bulk-season — Bulk update seasons or switch active season
router.post('/products/bulk-season', auth, requireRole(['admin']), async (req, res) => {
  try {
    const { action, productIds = [], season, targetSeason, showOnWebsite, updateWebsiteSeason } = req.body;

    if (action === 'setSeason') {
      if (!['summer', 'winter', 'all'].includes(season)) {
        return res.status(400).json({ message: 'الموسم المحدد غير صالح (يجب أن يكون صيفي أو شتوي أو طوال العام)' });
      }
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تعديل موسمها' });
      }
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { season } }
      );
      req.app.locals.io?.emit('inventory:update');
      return res.json({ message: `تم تحديث موسم ${productIds.length} منتج إلى ${season === 'summer' ? 'صيفي' : season === 'winter' ? 'شتوي' : 'طوال العام'}` });
    }

    if (action === 'setShowOnWebsite') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تعديل ظهورها على الموقع' });
      }
      const val = Boolean(showOnWebsite);
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { showOnWebsite: val } }
      );
      req.app.locals.io?.emit('inventory:update');
      return res.json({ message: `تم ${val ? 'إتاحة وعرض' : 'إخفاء'} ${productIds.length} منتج على الموقع أونلاين بنجاح` });
    }

    if (action === 'setWebsiteSeason') {
      if (!['summer', 'winter', 'all'].includes(season)) {
        return res.status(400).json({ message: 'الموسم المحدد غير صالح' });
      }
      const siteConfig = await getSiteConfig();
      siteConfig.websiteSeason = season;
      await siteConfig.save();
      req.app.locals.io?.emit('siteConfig:update', siteConfig);
      return res.json({
        message: `تم ضبط موسم المتجر الإلكتروني بنجاح على: ${season === 'winter' ? 'الموسم الشتوي ❄️' : season === 'summer' ? 'الموسم الصيفي ☀️' : 'جميع المواسم 🔄'}`,
        websiteSeason: season
      });
    }

    if (action === 'archiveSeason') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تخزينها' });
      }
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isSeasonArchived: true } }
      );
      req.app.locals.io?.emit('inventory:update');
      return res.json({ message: `تم تخزين وإخفاء ${productIds.length} منتج من الكاشير والجرد` });
    }

    if (action === 'activateSeason') {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: 'يرجى تحديد المنتجات المراد تنشيطها' });
      }
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isSeasonArchived: false } }
      );
      req.app.locals.io?.emit('inventory:update');
      return res.json({ message: `تم تنشيط وإتاحة ${productIds.length} منتج في المحل والجرد` });
    }

    if (action === 'switchActiveSeason') {
      if (!['summer', 'winter'].includes(targetSeason)) {
        return res.status(400).json({ message: 'يرجى تحديد الموسم المستهدف (شتوي أو صيفي)' });
      }

      let archivedCount = 0;
      let activatedCount = 0;

      if (targetSeason === 'winter') {
        const resArch = await Product.updateMany(
          { season: 'summer', isSeasonArchived: { $ne: true } },
          { $set: { isSeasonArchived: true } }
        );
        archivedCount = resArch.modifiedCount || 0;

        const resAct = await Product.updateMany(
          { season: { $in: ['winter', 'all'] }, isSeasonArchived: true },
          { $set: { isSeasonArchived: false } }
        );
        activatedCount = resAct.modifiedCount || 0;
      } else if (targetSeason === 'summer') {
        const resArch = await Product.updateMany(
          { season: 'winter', isSeasonArchived: { $ne: true } },
          { $set: { isSeasonArchived: true } }
        );
        archivedCount = resArch.modifiedCount || 0;

        const resAct = await Product.updateMany(
          { season: { $in: ['summer', 'all'] }, isSeasonArchived: true },
          { $set: { isSeasonArchived: false } }
        );
        activatedCount = resAct.modifiedCount || 0;
      }

      // Also sync website season by default
      if (updateWebsiteSeason !== false) {
        const siteConfig = await getSiteConfig();
        siteConfig.websiteSeason = targetSeason;
        await siteConfig.save();
      }

      req.app.locals.io?.emit('inventory:update');
      return res.json({
        message: `تم التحويل إلى الموسم ${targetSeason === 'winter' ? 'الشتوي' : 'الصيفي'} بنجاح (تم تخزين ${archivedCount} منتج وتنشيط ${activatedCount} منتج وتحديث موسم المتجر أونلاين)`,
        archivedCount,
        activatedCount,
        websiteSeason: targetSeason
      });
    }

    return res.status(400).json({ message: 'إجراء غير معروف' });
  } catch (error) {
    console.error('Bulk season action failed:', error);
    res.status(500).json({ message: 'فشل تنفيذ الإجراء الموسمي', error: error.message });
  }
});

// POST /api/admin/products/:id/restock — Restock a product (add new incoming shipment)
router.post('/products/:id/restock', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

    const { additions = [], quantity = 0, costPrice, supplier, supplierId, notes = '', supplierBillOption, supplierInvoiceRef } = req.body;

    let totalAdded = 0;
    const prevStock = product.stock || 0;

    if (product.variants && product.variants.length > 0 && Array.isArray(additions) && additions.length > 0) {
      additions.forEach(add => {
        const qty = Number(add.quantity || 0);
        if (qty <= 0) return;
        const v = product.variants.find(item => item.size === add.size && item.color === add.color);
        if (v) {
          v.stock = (v.stock || 0) + qty;
          totalAdded += qty;
        } else {
          product.variants.push({ size: add.size, color: add.color, stock: qty });
          totalAdded += qty;
        }
      });
      product.stock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    } else {
      const qty = Number(quantity || 0);
      if (qty > 0) {
        product.stock = (product.stock || 0) + qty;
        totalAdded = qty;
      }
    }

    if (totalAdded <= 0) {
      return res.status(400).json({ message: 'يرجى إدخال كمية موجبة لتزويد المخزون' });
    }

    product.totalReceived = (product.totalReceived || 0) + totalAdded;

    if (costPrice && Number(costPrice) > 0) {
      product.costPrice = Number(costPrice);
    }
    if (supplier && supplier.trim()) {
      product.supplier = supplier.trim();
    }
    if (product.active === false) {
      product.active = true;
    }

    await product.save();

    // Log Stock History
    await StockHistory.create({
      product: product._id,
      productName: product.name,
      changeType: 'Restock',
      quantityChanged: totalAdded,
      previousStock: prevStock,
      newStock: product.stock,
      performedBy: req.user.id,
      performedByName: req.user.name || '',
      notes: notes ? `تزويد شحنة جديدة (+${totalAdded} قطعة) - ${notes}` : `تزويد شحنة جديدة (+${totalAdded} قطعة)`
    });

    // Process Supplier Billing if selected
    if (supplierBillOption && supplierBillOption !== 'none') {
      await handleSupplierProductBilling({
        supplierId: supplierId || product.supplierId,
        supplierName: supplier || product.supplier,
        product,
        quantity: totalAdded,
        costPrice: Number(costPrice ?? product.costPrice ?? 0),
        option: supplierBillOption,
        invoiceRef: supplierInvoiceRef,
        userId: req.user.id
      });
    }

    req.app.locals.io?.emit('inventory:update', product);
    res.json({ message: 'تم تزويد المخزون بنجاح', product });
  } catch (error) {
    console.error('Restock error:', error);
    res.status(500).json({ message: 'فشل تزويد المخزون', error: error.message });
  }
});

router.delete('/products/:id', auth, requireRole(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    product.active = false;
    await product.save();
    req.app.locals.io?.emit('inventory:update', product);
    res.json({ message: 'Product archived' });
  } catch (error) {
    res.status(500).json({ message: 'Unable to archive product', error: error.message });
  }
});


module.exports = router;
