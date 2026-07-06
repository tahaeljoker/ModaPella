#!/usr/bin/env node
// Runner placed inside backend so local node_modules are resolved correctly.
const connectDB = require('./config/db');
const mongoose = require('mongoose');
const Transaction = require('./models/Transaction');
const Shift = require('./models/Shift');

async function run() {
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.log('WARNING: This will DELETE all Transaction and Shift documents.');
    console.log('If you are sure, re-run with: node backend/reset_transactions_runner.js --yes');
    process.exit(0);
  }

  await connectDB();

  try {
    const txRes = await Transaction.deleteMany({});
    console.log(`Deleted Transactions: ${txRes.deletedCount}`);
    const shiftRes = await Shift.deleteMany({});
    console.log(`Deleted Shifts: ${shiftRes.deletedCount}`);
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    try {
      await mongoose.connection.close();
    } catch (e) {
      // ignore
    }
    process.exit(0);
  }
}

run();
