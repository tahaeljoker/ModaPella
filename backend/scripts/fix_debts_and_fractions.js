require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Order = require("../models/Order");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // 1. Fix orders with dust/fractional debts (< 1 EGP)
  const dustOrders = await Order.find({
    isDebt: true,
    debtAmount: { $gt: 0, $lt: 1.0 }
  });

  console.log(`Found ${dustOrders.length} orders with fractional dust debt (< 1.00 EGP):`);
  for (const o of dustOrders) {
    console.log(`  - Order #${o._id.toString().slice(-6)}: Customer="${o.customerName}" (phone: ${o.customerPhone}) debtAmount=${o.debtAmount} -> ZEROED OUT`);
    o.debtAmount = 0;
    o.isDebt = false;
    await o.save();
  }

  // 2. Also check if any order has negative debtAmount
  const negativeOrders = await Order.find({
    isDebt: true,
    debtAmount: { $lte: 0 }
  });
  for (const o of negativeOrders) {
    o.debtAmount = 0;
    o.isDebt = false;
    await o.save();
  }

  // 3. Recalculate customer.debt across all customers
  const customers = await Customer.find({});
  let fixedCust = 0;

  for (const cust of customers) {
    const activeDebtOrders = await Order.find({
      $or: [
        { customer: cust._id },
        { customerPhone: cust.phone }
      ],
      isDebt: true,
      debtAmount: { $gte: 0.5 },
      status: { $ne: 'Returned' }
    });

    const realDebt = Math.round(activeDebtOrders.reduce((sum, o) => sum + (o.debtAmount || 0), 0) * 100) / 100;
    const oldDebt = cust.debt || 0;

    if (Math.abs(realDebt - oldDebt) > 0.01) {
      console.log(`  - Customer "${cust.name}" (${cust.phone}): debt ${oldDebt} -> ${realDebt}`);
      cust.debt = realDebt < 0.5 ? 0 : realDebt;
      await cust.save();
      fixedCust++;
    }
  }

  console.log(`\nCleanup complete. Dust orders cleared: ${dustOrders.length}, Customers recalculated: ${fixedCust}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("Error running debt cleanup:", err);
  process.exit(1);
});
