const Transaction = require('../models/Transaction');
const Shift = require('../models/Shift');

/**
 * Retrieves the current open shift for a user, or the most recent open shift in the system.
 */
const getOpenShift = async (userId = null, session = null) => {
  let openShift = null;
  if (userId) {
    openShift = await Shift.findOne({ user: userId, status: 'open' }).session(session);
  }
  if (!openShift) {
    openShift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 }).session(session);
  }
  return openShift;
};

/**
 * Creates and saves a new financial Transaction in the Safe/Drawer.
 */
const recordTransaction = async ({
  amount,
  type = 'IN',
  category = 'Sale',
  paymentMethod = 'Cash',
  description = '',
  referenceId = null,
  user = null,
  shift = null,
  session = null
}) => {
  const numericAmount = Math.max(0, Math.round(Number(amount || 0) * 100) / 100);
  if (numericAmount <= 0) return null;

  let activeShift = shift;
  if (!activeShift && user) {
    activeShift = await getOpenShift(user, session);
  }

  const transaction = new Transaction({
    amount: numericAmount,
    type,
    category,
    paymentMethod,
    description,
    referenceId,
    user,
    shift: activeShift?._id || null
  });

  await transaction.save({ session });
  return transaction;
};

/**
 * Safely transfers funds between methods (e.g., Cash to Instapay, Bank, etc.).
 * Creates paired OUT and IN transactions atomically.
 */
const transferSafeFunds = async ({
  fromMethod,
  toMethod,
  amount,
  description = '',
  userId = null,
  session = null
}) => {
  const numAmount = Math.max(0, Math.round(Number(amount || 0) * 100) / 100);
  if (numAmount <= 0) {
    throw new Error('المبلغ المطلوب تحويله يجب أن يكون أكبر من صفر');
  }
  if (!['Cash', 'Instapay'].includes(fromMethod) || !['Cash', 'Instapay'].includes(toMethod) || fromMethod === toMethod) {
    throw new Error('طريقة التحويل غير صحيحة (يجب التحويل بين الكاش وإنستاباي)');
  }

  const shift = await getOpenShift(userId, session);

  const isFromInstapay = fromMethod === 'Instapay';
  const directionKey = isFromInstapay ? 'INSTAPAY_TO_CASH' : 'CASH_TO_INSTAPAY';
  const noteText = description && description.trim() ? ` (${description.trim()})` : '';

  const outDesc = isFromInstapay
    ? `تحويل سيولة: سحب من إنستاباي لتغذية الخزنة النقدية${noteText}`
    : `تحويل سيولة: إخراج كاش من الخزنة للإيداع بإنستاباي${noteText}`;
  const inDesc = isFromInstapay
    ? `تحويل سيولة: إيداع بالخزنة النقدية محول من إنستاباي${noteText}`
    : `تحويل سيولة: إيداع بإنستاباي محول من كاش الخزنة${noteText}`;

  const outTx = new Transaction({
    amount: numAmount,
    type: 'OUT',
    category: 'Safe Transfer',
    paymentMethod: fromMethod,
    description: outDesc,
    user: userId,
    shift: shift?._id || null,
    metadata: {
      isTransfer: true,
      direction: directionKey,
      fromAccount: fromMethod,
      toAccount: toMethod,
      notes: description || ''
    }
  });

  const inTx = new Transaction({
    amount: numAmount,
    type: 'IN',
    category: 'Safe Transfer',
    paymentMethod: toMethod,
    description: inDesc,
    user: userId,
    shift: shift?._id || null,
    metadata: {
      isTransfer: true,
      direction: directionKey,
      fromAccount: fromMethod,
      toAccount: toMethod,
      notes: description || '',
      pairedTxId: outTx._id
    }
  });

  outTx.metadata.pairedTxId = inTx._id;

  await Promise.all([outTx.save({ session }), inTx.save({ session })]);

  const populatedOut = await Transaction.findById(outTx._id).populate('user', 'name').session(session);
  const populatedIn = await Transaction.findById(inTx._id).populate('user', 'name').session(session);

  return { outTransaction: populatedOut, inTransaction: populatedIn };
};

/**
 * Syncs online order income to the Safe/Treasury when completed, avoiding duplicates.
 */
const syncOnlineOrderRevenue = async (order, session = null) => {
  if (!order || order.status !== 'Completed') return null;

  const existingTx = await Transaction.findOne({
    referenceId: order._id,
    category: 'Sale'
  }).session(session);

  if (existingTx) return existingTx;

  const orderAmount = Number(order.totalAmount || 0);
  if (orderAmount <= 0) return null;

  const shift = await Shift.findOne({ status: 'open' }).sort({ createdAt: -1 }).session(session);
  const payMethod = order.paymentMethod === 'Instapay' ? 'Instapay' : 'Cash';
  const displayInv = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;

  const transaction = new Transaction({
    amount: orderAmount,
    type: 'IN',
    category: 'Sale',
    paymentMethod: payMethod,
    description: `تحصيل طلب أونلاين مكتمل ${displayInv} - العميل: ${order.customerName || order.customerPhone || 'أونلاين'}`,
    referenceId: order._id,
    user: order.seller || null,
    shift: shift?._id || null
  });

  await transaction.save({ session });
  return transaction;
};

module.exports = {
  getOpenShift,
  recordTransaction,
  transferSafeFunds,
  syncOnlineOrderRevenue
};
