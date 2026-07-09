require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../backend/models/Product');
const Supplier = require('../backend/models/Supplier');

async function migrate() {
  try {
    // We are running this from scripts/ folder, so .env is in ../frontend or we can hardcode for local
    await mongoose.connect('mongodb://localhost:27017/modapella');
    console.log('Connected to DB. Starting migration...');

    const suppliers = await Supplier.find();
    console.log(`Found ${suppliers.length} suppliers.`);

    let updatedCount = 0;
    for (const supplier of suppliers) {
      const result = await Product.updateMany(
        { 
          supplier: supplier.name, 
          supplierId: null 
        },
        { 
          $set: { supplierId: supplier._id } 
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`Updated ${result.modifiedCount} products for supplier: ${supplier.name}`);
        updatedCount += result.modifiedCount;
      }
    }

    console.log(`Migration completed. Total products updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
