/**
 * fix_customer_debts.js — Phase 2: Recalculate all customer debt balances from scratch.
 *
 * Logic:
 *   customer.debt = sum of (order.debtAmount) for all their active debt orders
 *
 * Run: node backend/scripts/fix_customer_debts.js           (dry-run, shows changes)
 *      node backend/scripts/fix_customer_debts.js --apply   (actually saves)
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Order = require("../models/Order");

const applyChanges = process.argv.includes("--apply");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${applyChanges ? "APPLY" : "DRY-RUN"}`);

  const customers = await Customer.find({});
  console.log(`Processing ${customers.length} customers...`);

  let fixed = 0;
  let unchanged = 0;

  for (const customer of customers) {
    // Sum debtAmount across all non-returned debt orders
    const debtOrders = await Order.find({
      customer: customer._id,
      isDebt: true,
      status: { $ne: "Returned" }
    });

    const calculatedDebt = debtOrders.reduce((sum, o) => sum + (o.debtAmount || 0), 0);
    const currentDebt = customer.debt || 0;
    const diff = Math.abs(calculatedDebt - currentDebt);

    if (diff > 0.01) {
      console.log(`  [FIX] ${customer.name} (${customer.phone}): ${currentDebt} -> ${calculatedDebt}`);
      if (applyChanges) {
        customer.debt = Math.max(0, calculatedDebt);
        await customer.save();
      }
      fixed++;
    } else {
      unchanged++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}, Unchanged: ${unchanged}`);
  if (!applyChanges) console.log("Run with --apply to save the changes.");
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
