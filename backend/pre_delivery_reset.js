#!/usr/bin/env node
/**
 * ModaPella — Pre-Delivery Reset
 * يحذف جميع بيانات الاختبار ويحتفظ بالمنتجات والموظفين الحقيقيين
 * يحذف: Orders, Transactions, Shifts, Employees (TEST), Suppliers (TEST), InventoryCounts
 */
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

dotenv.config();

const Order = require('./models/Order');
const Transaction = require('./models/Transaction');
const Shift = require('./models/Shift');
const Employee = require('./models/Employee');
const Supplier = require('./models/Supplier');
const SupplierTransaction = require('./models/SupplierTransaction');
const InventoryCount = require('./models/InventoryCount');
const Product = require('./models/Product');

async function run() {
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.log('⚠️  ModaPella Pre-Delivery Reset');
    console.log('سيحذف: Orders, Transactions, Shifts, TEST Products, TEST Employees, TEST Suppliers, InventoryCounts');
    console.log('إذا كنت متأكداً، أعد التشغيل مع: node pre_delivery_reset.js --yes');
    process.exit(0);
  }

  await connectDB();

  try {
    // Delete test products (contains 'اختبار TEST' in name)
    const testProds = await Product.deleteMany({ name: /اختبار TEST/i });
    console.log(`🗑  Test Products deleted: ${testProds.deletedCount}`);

    // Delete test employees
    const testEmps = await Employee.deleteMany({ name: /اختبار TEST/i });
    console.log(`🗑  Test Employees deleted: ${testEmps.deletedCount}`);

    // Delete test suppliers (and their transactions)
    const testSups = await Supplier.find({ name: /اختبار TEST/i });
    for (const s of testSups) {
      await SupplierTransaction.deleteMany({ supplier: s._id });
    }
    const testSupDel = await Supplier.deleteMany({ name: /اختبار TEST/i });
    console.log(`🗑  Test Suppliers deleted: ${testSupDel.deletedCount}`);

    // Delete all orders (test orders)
    const orders = await Order.deleteMany({});
    console.log(`🗑  Orders deleted: ${orders.deletedCount}`);

    // Delete all transactions
    const txs = await Transaction.deleteMany({});
    console.log(`🗑  Transactions deleted: ${txs.deletedCount}`);

    // Delete all shifts
    const shifts = await Shift.deleteMany({});
    console.log(`🗑  Shifts deleted: ${shifts.deletedCount}`);

    // Delete all inventory counts
    const counts = await InventoryCount.deleteMany({});
    console.log(`🗑  Inventory Counts deleted: ${counts.deletedCount}`);

    // Reset product sold counts & stock adjustments from test
    // (already handled via inventory count apply — just reset sold counter)
    await Product.updateMany({}, { $set: { sold: 0 } });
    console.log(`✅  Product sold counters reset to 0`);

    console.log('\n🎉 Pre-delivery reset complete! السيستم جاهز للتسليم.');
    console.log('📦 المنتجات الحقيقية، الموردين الحقيقيين، والموظفين الحقيقيين محتفظ بهم.');
    console.log('🧹 Orders, Transactions, Shifts, Inventory Counts تم حذفها بالكامل.');

  } catch (err) {
    console.error('❌ Reset failed:', err);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
