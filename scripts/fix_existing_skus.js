const dotenv = require('../backend/node_modules/dotenv');
dotenv.config({ path: './backend/.env' });
const mongoose = require('../backend/node_modules/mongoose');
const Product = require('../backend/models/Product');

async function fixSkus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modapella');
    console.log('Connected to MongoDB. Migration starting...');

    const products = await Product.find({}).sort({ createdAt: 1 });
    console.log(`Found ${products.length} products.`);

    let currentSkuNumber = 1000;

    for (const p of products) {
      currentSkuNumber += 1;
      const oldSku = p.sku;
      const newSku = currentSkuNumber.toString();
      p.sku = newSku;
      await p.save();
      console.log(`Updated Product "${p.name}" (ID: ${p._id}): Old SKU [${oldSku}] -> New Pure Numeric SKU [${newSku}]`);
    }

    console.log('\n✅ All product SKUs updated to pure numeric sequential IDs successfully!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

fixSkus();
