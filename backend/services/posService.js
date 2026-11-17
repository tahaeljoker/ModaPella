const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Employee = require('../models/Employee');
const { getNextInvoiceNumber } = require('../models/Counter');
const { runInTransaction } = require('../config/db');
const { deductStock, restoreStock } = require('./inventoryService');
const { recordTransaction } = require('./safeService');
const { calculateDebtReturn, syncCustomerDebt } = require('./debtService');

/**
 * Handles the complete transactional flow for an in-store POS sale.
 */
const processSale = async ({
  customerId,
  customerName,
  customerPhone,
  sellerId,
  employeeId,
  items,
  type = 'Offline',
  paymentMethod = 'Cash',
  discount = 0,
  showDiscountInInvoice = true,
  notes = '',
  isDebt = false,
  amountPaid = 0,
  user
}) => {
  if (!items || items.length === 0) {
    throw new Error('لا توجد منتجات في الفاتورة');
  }

  let employeeName = '';
  if (employeeId) {
    const empDb = await Employee.findById(employeeId);
    if (empDb) employeeName = empDb.name;
  }

  const rawTotal = items.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  const totalAmount = Math.max(0, rawTotal - Number(discount));
  const finalAmountPaid = isDebt ? Math.min(totalAmount, Math.max(0, Number(amountPaid))) : totalAmount;
  const debtAmount = isDebt ? Math.max(0, totalAmount - finalAmountPaid) : 0;

  return await runInTransaction(async (session) => {
    // 1. Customer points and debt tracking
    let dbCustomer = null;
    const cleanPhone = (customerPhone || '').trim();
    const cleanName = (customerName || '').trim();

    if (cleanPhone || cleanName) {
      if (cleanPhone) {
        dbCustomer = await Customer.findOne({ phone: cleanPhone }).session(session);
      } else if (cleanName) {
        dbCustomer = await Customer.findOne({ name: cleanName }).session(session);
      }

      if (!dbCustomer) {
        dbCustomer = new Customer({
          name: cleanName || 'عميل غير معروف',
          phone: cleanPhone || 'بدون هاتف',
          points: 0,
          debt: 0
        });
      } else if (cleanName) {
        dbCustomer.name = cleanName;
      }

      dbCustomer.points += Math.floor(totalAmount / 100);
      if (isDebt && debtAmount > 0) {
        dbCustomer.debt = Math.max(0, (dbCustomer.debt || 0) + debtAmount);
      }
      await dbCustomer.save({ session });
    }

    // 2. Generate sequential invoice number
    const invoiceNumber = await getNextInvoiceNumber();

    // 3. Atomically deduct stock for all items
    const orderItems = [];
    const updatedProducts = [];

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);

      const { product, variant } = await deductStock({
        productId: item.product,
        variantId: item.variantId,
        size: item.size,
        color: item.color,
        quantity: qty,
        changeType: 'POS Sale',
        notes: `مبيعات فاتورة ${invoiceNumber}`,
        performedBy: user.id,
        session
      });

      updatedProducts.push(product);

      orderItems.push({
        product: product._id,
        name: item.name || product.name,
        category: item.category || product.category,
        quantity: qty,
        price: Number(item.price),
        originalPrice: item.originalPrice || product.price || item.price,
        size: item.size || '',
        color: item.color || '',
        costPrice: product.costPrice || 0,
        variantId: variant?._id || null
      });
    }

    // 4. Create and persist Order
    const order = new Order({
      invoiceNumber,
      customer: dbCustomer ? dbCustomer._id : (customerId || null),
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      seller: sellerId || user.id,
      employee: employeeId || null,
      employeeName,
      items: orderItems,
      totalAmount,
      discount: Number(discount),
      showDiscountInInvoice: showDiscountInInvoice !== false,
      type,
      status: 'Completed',
      paymentMethod,
      notes: notes || '',
      isDebt,
      amountPaid: finalAmountPaid,
      debtAmount
    });
    await order.save({ session });

    // 5. Record Safe Transaction if cash/instapay was paid
    if (finalAmountPaid > 0) {
      await recordTransaction({
        amount: finalAmountPaid,
        type: 'IN',
        category: 'Sale',
        paymentMethod: order.paymentMethod,
        description: `مبيعات طلب ${invoiceNumber}${isDebt ? ' (دفع جزئي - آجل)' : ''}`,
        referenceId: order._id,
        user: sellerId || user.id,
        session
      });
    }

    return { order, updatedProducts };
  });
};

/**
 * Handles the complete transactional flow for an in-store POS return.
 */
const processReturn = async ({
  orderId,
  reason = '',
  returnItems = [],
  refundPaymentMethod = null,
  user
}) => {
  return await runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      throw err;
    }
    if (order.recovered) {
      throw new Error('Order already recovered');
    }

    let itemsToReturn = [];
    const isFullReturn = !returnItems || returnItems.length === 0;

    if (isFullReturn) {
      order.items.forEach(item => {
        const remainingQty = item.quantity - (item.returnedQuantity || 0);
        if (remainingQty > 0) {
          itemsToReturn.push({
            itemId: item._id,
            product: item.product,
            name: item.name,
            size: item.size,
            color: item.color,
            quantity: remainingQty,
            price: item.price
          });
          item.returnedQuantity = item.quantity;
        }
      });
    } else {
      for (const ri of returnItems) {
        const item = order.items.id(ri.itemId);
        if (!item) throw new Error(`صنف الفاتورة #${ri.itemId} غير موجود`);
        const remainingQty = item.quantity - (item.returnedQuantity || 0);
        if (ri.quantity > remainingQty) {
          throw new Error(`الكمية المرتجعة للـ ${item.name} (${ri.quantity}) أكبر من الكمية المتاحة للإرجاع (${remainingQty})`);
        }
        item.returnedQuantity = (item.returnedQuantity || 0) + ri.quantity;
        itemsToReturn.push({
          itemId: item._id,
          product: item.product,
          name: item.name,
          size: item.size,
          color: item.color,
          quantity: ri.quantity,
          price: item.price
        });
      }
    }

    if (itemsToReturn.length === 0) {
      throw new Error('لا توجد قطع متبقية للإرجاع في هذا الطلب');
    }

    const fullyRecovered = order.items.every(item => (item.returnedQuantity || 0) === item.quantity);
    if (fullyRecovered) {
      order.status = 'Returned';
      order.recovered = true;
    }

    const displayInvoice = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;
    const updatedProducts = [];

    // Atomically restore returned stock
    for (const item of itemsToReturn) {
      const { product } = await restoreStock({
        productId: item.product,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        referenceId: order._id,
        changeType: 'Refund',
        notes: `مرتجع فاتورة ${displayInvoice} - السبب: ${reason || 'غير محدد'}`,
        performedBy: user.id,
        session
      });
      if (product) updatedProducts.push(product);
    }

    // Debt-first return calculations
    const { refundTotal, debtReduction, cashRefundAmount } = calculateDebtReturn({ order, itemsToReturn });

    if (debtReduction > 0) {
      order.debtAmount = Math.max(0, Math.round(((order.debtAmount || 0) - debtReduction) * 100) / 100);
      if (order.debtAmount < 0.5) {
        order.debtAmount = 0;
        order.isDebt = false;
      }
      if (order.customer) {
        await syncCustomerDebt(order.customer, session);
      }
    }

    order.returnedAmount = Math.round(((order.returnedAmount || 0) + cashRefundAmount) * 100) / 100;
    await order.save({ session });

    // Record Safe Transaction OUT if cash was refunded
    if (cashRefundAmount > 0) {
      const effectivePaymentMethod = refundPaymentMethod || order.paymentMethod || 'Cash';
      await recordTransaction({
        amount: cashRefundAmount,
        type: 'OUT',
        category: 'Refund',
        paymentMethod: effectivePaymentMethod,
        description: `مرتجع ${fullyRecovered ? 'كامل' : 'جزئي'} طلب ${displayInvoice} - السبب: ${reason || 'غير محدد'} (${effectivePaymentMethod === 'Cash' ? 'كاش' : 'إنستاباي'})`,
        referenceId: order._id,
        user: user.id,
        session
      });
    }

    return {
      order,
      refundAmount: cashRefundAmount,
      debtReduction,
      returnedItems: itemsToReturn,
      fullyRecovered,
      updatedProducts
    };
  });
};

/**
 * Handles the complete transactional flow for an in-store POS exchange (Return + Sale atomically).
 */
const processExchange = async ({
  originalOrderId,
  returnItems,
  newItems,
  discount = 0,
  paymentMethod = 'Cash',
  reason = '',
  notes = '',
  employeeId = null,
  user
}) => {
  if (!returnItems || returnItems.length === 0) {
    throw new Error('يجب اختيار صنف واحد على الأقل لإرجاعه في الاستبدال');
  }
  if (!newItems || newItems.length === 0) {
    throw new Error('يجب اختيار صنف جديد واحد على الأقل للشراء في الاستبدال');
  }

  let employeeName = '';
  if (employeeId) {
    const empDb = await Employee.findById(employeeId);
    if (empDb) employeeName = empDb.name;
  }

  return await runInTransaction(async (session) => {
    const originalOrder = await Order.findById(originalOrderId).session(session);
    if (!originalOrder) {
      const err = new Error('الفاتورة الأصلية غير موجودة');
      err.statusCode = 404;
      throw err;
    }
    if (originalOrder.recovered) {
      throw new Error('الفاتورة تم استردادها بالكامل مسبقاً');
    }

    const itemsToReturn = [];
    for (const ri of returnItems) {
      const item = originalOrder.items.id(ri.itemId);
      if (!item) throw new Error(`صنف الفاتورة #${ri.itemId} غير موجود`);
      const remainingQty = item.quantity - (item.returnedQuantity || 0);
      if (ri.quantity > remainingQty) {
        throw new Error(`الكمية المرتجعة للـ ${item.name} أكبر من المتاحة (${remainingQty})`);
      }
      item.returnedQuantity = (item.returnedQuantity || 0) + ri.quantity;
      itemsToReturn.push({
        itemId: item._id,
        product: item.product,
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: ri.quantity,
        price: item.price
      });
    }

    const fullyRecovered = originalOrder.items.every(item => (item.returnedQuantity || 0) === item.quantity);
    if (fullyRecovered) {
      originalOrder.status = 'Returned';
      originalOrder.recovered = true;
    }

    const origDisplayInvoice = originalOrder.invoiceNumber || `#${originalOrder._id.toString().slice(-6).toUpperCase()}`;
    const updatedProducts = [];

    // 1. Restock returned items
    for (const item of itemsToReturn) {
      const { product } = await restoreStock({
        productId: item.product,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        referenceId: originalOrder._id,
        changeType: 'Refund',
        notes: `مرتجع استبدال فاتورة ${origDisplayInvoice} - السبب: ${reason || 'استبدال'}`,
        performedBy: user.id,
        session
      });
      if (product) updatedProducts.push(product);
    }

    // 2. Deduct stock for new items atomically
    const newOrderItems = [];
    for (const item of newItems) {
      const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
      const { product, variant } = await deductStock({
        productId: item.product,
        variantId: item.variantId,
        size: item.size,
        color: item.color,
        quantity: qty,
        changeType: 'POS Sale',
        performedBy: user.id,
        session
      });

      updatedProducts.push(product);

      newOrderItems.push({
        product: product._id,
        name: item.name || product.name,
        category: item.category || product.category,
        quantity: qty,
        price: Number(item.price),
        size: item.size || '',
        color: item.color || '',
        costPrice: product.costPrice || 0,
        variantId: variant?._id || null
      });
    }

    // 3. Financial calculations
    const returnedValue = itemsToReturn.reduce((sum, ri) => sum + ri.price * ri.quantity, 0);
    const originalOrderTotal = (originalOrder.totalAmount || 0) + (originalOrder.discount || 0);
    const returnedItemsProportionalValue = (originalOrderTotal > 0 && (originalOrder.discount || 0) > 0)
      ? Math.round((returnedValue * (originalOrder.totalAmount / originalOrderTotal)) * 100) / 100
      : returnedValue;

    let debtReduction = 0;
    let returnCreditValue = 0;

    if (originalOrder.isDebt && (originalOrder.debtAmount || 0) > 0) {
      debtReduction = Math.min(returnedItemsProportionalValue, originalOrder.debtAmount);
      debtReduction = Math.round(debtReduction * 100) / 100;
      originalOrder.debtAmount = Math.max(0, Math.round((originalOrder.debtAmount - debtReduction) * 100) / 100);
      if (originalOrder.debtAmount < 0.5) {
        originalOrder.debtAmount = 0;
        originalOrder.isDebt = false;
      }
      if (originalOrder.customer) {
        await syncCustomerDebt(originalOrder.customer, session);
      }
      returnCreditValue = Math.max(0, Math.round((returnedItemsProportionalValue - debtReduction) * 100) / 100);
    } else {
      returnCreditValue = returnedItemsProportionalValue;
    }

    const rawNewTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const newTotalAmount = Math.max(0, rawNewTotal - Number(discount));
    const netDifference = newTotalAmount - returnCreditValue;

    const invoiceNumber = await getNextInvoiceNumber();

    const newOrder = new Order({
      invoiceNumber,
      customer: originalOrder.customer || null,
      customerName: originalOrder.customerName || '',
      customerPhone: originalOrder.customerPhone || '',
      seller: user.id,
      employee: employeeId || null,
      employeeName,
      items: newOrderItems,
      totalAmount: newTotalAmount,
      discount: Number(discount),
      type: 'Offline',
      status: 'Completed',
      paymentMethod,
      notes: `استبدال مباشر عن الفاتورة ${origDisplayInvoice} ${notes ? `(${notes})` : ''}`
    });

    originalOrder.returnedAmount = Math.round(((originalOrder.returnedAmount || 0) + returnCreditValue) * 100) / 100;
    await originalOrder.save({ session });
    await newOrder.save({ session });

    // Safe transactions
    if (returnCreditValue > 0) {
      await recordTransaction({
        amount: returnCreditValue,
        type: 'OUT',
        category: 'Refund',
        paymentMethod,
        description: `مرتجع استبدال عن الفاتورة ${origDisplayInvoice} (استبدلت بطلب ${newOrder.invoiceNumber})`,
        referenceId: originalOrder._id,
        user: user.id,
        session
      });
    }

    if (newTotalAmount > 0) {
      await recordTransaction({
        amount: newTotalAmount,
        type: 'IN',
        category: 'Sale',
        paymentMethod,
        description: `مبيعات استبدال فاتورة جديدة ${newOrder.invoiceNumber} (عن الفاتورة ${origDisplayInvoice})`,
        referenceId: newOrder._id,
        user: user.id,
        session
      });
    }

    return {
      newOrder,
      returnCreditValue,
      newTotalAmount,
      netDifference,
      updatedProducts
    };
  });
};

/**
 * Fulfills an online reservation upon store pickup.
 */
const fulfillOnlineReservation = async ({
  orderId,
  employeeId = null,
  paymentMethod = 'Cash',
  amountPaid = undefined,
  notes = '',
  user
}) => {
  const order = await Order.findById(orderId);
  if (!order) {
    const err = new Error('طلب الحجز غير موجود');
    err.statusCode = 404;
    throw err;
  }
  if (order.status === 'Completed') {
    throw new Error('تم تسليم هذا الطلب بالفعل مسبقاً');
  }

  order.status = 'Completed';
  order.seller = user.id;
  if (employeeId) order.employee = employeeId;
  if (paymentMethod) order.paymentMethod = paymentMethod;
  if (notes) order.notes = order.notes ? `${order.notes} | ${notes}` : notes;

  const finalAmount = amountPaid !== undefined ? Number(amountPaid) : order.totalAmount;
  order.amountPaid = finalAmount;
  await order.save();

  if (finalAmount > 0) {
    const resDisplayInv = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;
    await recordTransaction({
      amount: finalAmount,
      type: 'IN',
      category: 'Sale',
      paymentMethod: order.paymentMethod,
      description: `تسليم حجز أونلاين بالمحل ${resDisplayInv} - العميل: ${order.customerName || order.customerPhone}`,
      referenceId: order._id,
      user: user.id
    });
  }

  return order;
};

/**
 * Cancels an online reservation and restores inventory stock atomically.
 */
const cancelOnlineReservation = async ({
  orderId,
  reason = 'إلغاء حجز من قبل الكاشير',
  user
}) => {
  return await runInTransaction(async (session) => {
    const order = await Order.findById(orderId).session(session);
    if (!order) {
      const err = new Error('طلب الحجز غير موجود');
      err.statusCode = 404;
      throw err;
    }
    if (order.status !== 'Pending') {
      throw new Error('لا يمكن إلغاء طلب غير معلق');
    }

    order.status = 'Returned';
    order.notes = order.notes ? `${order.notes} | تم الإلغاء: ${reason}` : `تم الإلغاء: ${reason}`;
    const updatedProducts = [];

    if (!order.recovered) {
      for (const item of order.items) {
        const qty = Number(item.quantity) || 1;
        const { product } = await restoreStock({
          productId: item.product,
          size: item.size,
          color: item.color,
          quantity: qty,
          referenceId: order._id,
          changeType: 'Refund',
          notes: `إلغاء حجز أونلاين #${order.invoiceNumber || order._id.toString().slice(-6).toUpperCase()} - ${reason}`,
          performedBy: user.id,
          session
        });
        if (product) updatedProducts.push(product);
      }
      order.recovered = true;
    }

    await order.save({ session });
    return { order, updatedProducts };
  });
};

module.exports = {
  processSale,
  processReturn,
  processExchange,
  fulfillOnlineReservation,
  cancelOnlineReservation
};
