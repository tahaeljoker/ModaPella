#!/usr/bin/env node
// Script to delete all Transaction and Shift documents from the database.
// Usage: node scripts/reset_transactions.js --yes

const connectDB = require('../backend/config/db');
const mongoose = require('mongoose');
const Transaction = require('../backend/models/Transaction');
const Shift = require('../backend/models/Shift');

async function run() {
  const args = process.argv.slice(2);
  if (!args.includes('--yes')) {
    console.log('WARNING: This will DELETE all Transaction and Shift documents.');
    console.log('If you are sure, re-run with: node scripts/reset_transactions.js --yes');
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
