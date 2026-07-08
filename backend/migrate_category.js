#!/usr/bin/env node
// Migrate Portefeuille → Bag in existing products
const connectDB = require('./config/db');
const mongoose = require('mongoose');

async function run() {
  await connectDB();
  const db = mongoose.connection.db;
  const result = await db.collection('products').updateMany(
    { category: 'Portefeuille' },
    { $set: { category: 'Bag' } }
  );
  console.log(`Migrated ${result.modifiedCount} products from Portefeuille → Bag`);
  await mongoose.connection.close();
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
