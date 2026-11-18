const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { getNextInvoiceNumber } = require('../models/Counter');
const { recordTransaction } = require('./safeService');

/**
 * Calculates debt-first refund distribution when returning items from a debt order.
 * Strictly applies returned value to outstanding debt FIRST before paying any cash out of drawer.
 */
const calculateDebtReturn = ({ order, itemsToReturn }) => {
  const returnedItemsValue = itemsToReturn.reduce((sum, ri) => sum + (Number(ri.price) || 0) * (Number(ri.quantity) || 0), 0);
  const originalOrderTotal = (Number(order.totalAmount) || 0) + (Number(order.discount) || 0);

  const refundTotal = (originalOrderTotal > 0 && (order.discount || 0) > 0)
    ? Math.round((returnedItemsValue * (order.totalAmount / originalOrderTotal)) * 100) / 100
    : returnedItemsValue;

  let debtReduction = 0;
  let cashRefundAmount = 0;

  if (order.isDebt && (order.debtAmount || 0) > 0) {
    debtReduction = Math.min(refundTotal, order.debtAmount);
    debtReduction = Math.round(debtReduction * 100) / 100;

    const remainingAfterDebt = Math.max(0, Math.round((refundTotal - debtReduction) * 100) / 100);
    const maxCashRefundable = Math.max(0, (order.amountPaid || 0) - (order.returnedAmount || 0));
    cashRefundAmount = Math.min(remainingAfterDebt, maxCashRefundable);
    cashRefundAmount = Math.round(cashRefundAmount * 100) / 100;
  } else {
    const maxCashRefundable = Math.max(0, (order.amountPaid || order.totalAmount) - (order.returnedAmount || 0));
    cashRefundAmount = Math.min(refundTotal, maxCashRefundable);
    cashRefundAmount = Math.round(cashRefundAmount * 100) / 100;
  }

  return {
    refundTotal,
    debtReduction,
    cashRefundAmount
  };
};

/**
 * Strictly synchronizes Customer.debt with the sum of all remaining active Order.debtAmount records.
 * Acts as the Single Source of Truth for customer debt.
 */
const syncCustomerDebt = async (customerIdentifier, session = null) => {
  if (!customerIdentifier) return null;

  let customer = null;
  if (typeof customerIdentifier === 'object' && customerIdentifier._id) {
    customer = customerIdentifier;
  } else if (typeof customerIdentifier === 'string') {
    if (customerIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
      customer = await Customer.findById(customerIdentifier).session(session);
    }
    if (!customer) {
      customer = await Customer.findOne({ phone: customerIdentifier.trim() }).session(session);
    }
  }

  if (!customer) return null;

  const debtQuery = {
    status: { $ne: 'Returned' },
    $or: [
      { customer: customer._id },
      ...(customer.phone && customer.phone !== 'بدون هاتف' ? [{ customerPhone: customer.phone }] : [])
    ],
    isDebt: true,
    debtAmount: { $gt: 0 }
  };

  const remainingDebtOrders = await Order.find(debtQuery).session(session);
  const totalDebt = remainingDebtOrders.reduce((sum, o) => sum + (Number(o.debtAmount) || 0), 0);

  customer.debt = Math.max(0, Math.round(totalDebt * 100) / 100);
  if (customer.debt < 0.5) {
    customer.debt = 0;
  }

  await customer.save({ session });
  return customer;
};

/**
 * Allocates a debt payment across oldest unpaid debt orders (FIFO).
 */
const allocateDebtPayment = async ({
  customerPhone,
  customerName,
  amount,
  paymentMethod = 'Cash',
  userId = null,
  session = null
}) => {
  const numAmount = Math.max(0, Math.round(Number(amount || 0) * 100) / 100);
  if (numAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  const query = {
    status: { $ne: 'Returned' },
    $or: [
      { isDebt: true, debtAmount: { $gt: 0 } },
      { debtAmount: { $gt: 0 } }
    ]
  };

  if (customerPhone && customerPhone !== 'بدون هاتف') {
    query.customerPhone = customerPhone.trim();
  } else if (customerName) {
    query.customerName = customerName.trim();
  } else {
    throw new Error('Customer phone or name is required');
  }

  const orders = await Order.find(query).sort({ createdAt: 1 }).session(session);
  if (orders.length === 0) {
    const err = new Error('No active debts found for this customer');
    err.statusCode = 404;
    throw err;
  }

  let remainingPayment = numAmount;
  const updatedOrders = [];

  for (const order of orders) {
    if (remainingPayment <= 0) break;

    const debtToPay = Math.min(order.debtAmount, remainingPayment);
    order.debtAmount = Math.max(0, Math.round((order.debtAmount - debtToPay) * 100) / 100);
    order.amountPaid = Math.round(((order.amountPaid || 0) + debtToPay) * 100) / 100;
    remainingPayment = Math.max(0, Math.round((remainingPayment - debtToPay) * 100) / 100);

    if (order.debtAmount < 0.5) {
      order.debtAmount = 0;
      order.isDebt = false;
    }

    await order.save({ session });
    updatedOrders.push(order);

    const invDisplay = order.invoiceNumber || `#${order._id.toString().slice(-6).toUpperCase()}`;

    await recordTransaction({
      amount: debtToPay,
      type: 'IN',
      category: 'DebtPayment',
      paymentMethod,
      description: `سداد دين الفاتورة ${invDisplay} للعميل ${customerName || customerPhone}`,
      referenceId: order._id,
      user: userId,
      session
    });
  }

  // Synchronize customer record
  const custFilter = (customerPhone && customerPhone !== 'بدون هاتف')
    ? customerPhone.trim()
    : (customerName ? customerName.trim() : null);

  await syncCustomerDebt(custFilter, session);

  return {
    updatedOrders,
    change: remainingPayment
  };
};

/**
 * Creates a manual debt entry (pseudo-order) for a customer.
 */
const recordManualDebt = async ({
  customerName,
  customerPhone,
  amount,
  notes = '',
  userId = null,
  session = null
}) => {
  const debtAmount = Number(amount);
  if (isNaN(debtAmount) || debtAmount <= 0) {
    throw new Error('Invalid debt amount');
  }
  if (!customerPhone || !customerPhone.trim()) {
    throw new Error('Customer phone is required');
  }

  const cleanPhone = customerPhone.trim();
  const cleanName = customerName ? customerName.trim() : 'عميل غير معروف';

  let dbCustomer = await Customer.findOne({ phone: cleanPhone }).session(session);
  if (!dbCustomer) {
    dbCustomer = new Customer({
      name: cleanName,
      phone: cleanPhone,
      points: 0,
      debt: 0
    });
  } else if (customerName && customerName.trim() !== '') {
    dbCustomer.name = cleanName;
  }

  dbCustomer.debt = Math.max(0, Math.round(((dbCustomer.debt || 0) + debtAmount) * 100) / 100);
  await dbCustomer.save({ session });

  const invoiceNumber = await getNextInvoiceNumber();

  const order = new Order({
    invoiceNumber,
    customer: dbCustomer._id,
    customerName: dbCustomer.name,
    customerPhone: dbCustomer.phone,
    seller: userId,
    items: [],
    totalAmount: debtAmount,
    discount: 0,
    type: 'Offline',
    status: 'Completed',
    paymentMethod: 'Cash',
    notes: `تسجيل دين يدوي: ${notes || ''}`,
    isDebt: true,
    isManualDebt: true,
    amountPaid: 0,
    debtAmount
  });

  await order.save({ session });
  return { order, customer: dbCustomer };
};

module.exports = {
  calculateDebtReturn,
  syncCustomerDebt,
  allocateDebtPayment,
  recordManualDebt
};
