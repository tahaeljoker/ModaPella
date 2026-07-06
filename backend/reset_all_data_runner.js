const dotenv = require('dotenv');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

dotenv.config();

const Product = require('./models/Product');
const Order = require('./models/Order');
const Transaction = require('./models/Transaction');
const Shift = require('./models/Shift');
const User = require('./models/User');
const SiteConfig = require('./models/SiteConfig');

async function confirmAndRun() {
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.log('This will permanently delete Products, Orders, Transactions, Shifts, Users, and SiteConfig.');
    console.log('If you are sure, re-run with the --yes flag.');
    process.exit(0);
  }

  await connectDB();

  try {
    const countsBefore = {
      products: await Product.countDocuments(),
      orders: await Order.countDocuments(),
      transactions: await Transaction.countDocuments(),
      shifts: await Shift.countDocuments(),
      users: await User.countDocuments(),
      siteconfigs: await SiteConfig.countDocuments()
    };

    console.log('Counts before deletion:', countsBefore);

    const r1 = await Product.deleteMany({});
    const r2 = await Order.deleteMany({});
    const r3 = await Transaction.deleteMany({});
    const r4 = await Shift.deleteMany({});
    const r5 = await User.deleteMany({});
    const r6 = await SiteConfig.deleteMany({});

    console.log('Deleted counts:');
    console.log('Products:', r1.deletedCount || 0);
    console.log('Orders:', r2.deletedCount || 0);
    console.log('Transactions:', r3.deletedCount || 0);
    console.log('Shifts:', r4.deletedCount || 0);
    console.log('Users:', r5.deletedCount || 0);
    console.log('SiteConfig:', r6.deletedCount || 0);
  } catch (err) {
    console.error('Error during deletion:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

confirmAndRun();
