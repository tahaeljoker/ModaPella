const dotenv = require('../backend/node_modules/dotenv');
dotenv.config({ path: './backend/.env' });
const mongoose = require('../backend/node_modules/mongoose');
const Product = require('../backend/models/Product');

const OLD_SKU_MAP = {
  "6a484f554ead2d7806334242": "BLO-1001",
  "6a49a6a820ca1c50b4cf6bad": "BLO-1002",
  "6a49a6ed20ca1c50b4cf6bb3": "CHE-1001",
  "6a4c26c2fa5da769070150ed": "DRE-1001",
  "6a4c26defa5da769070150f2": "DRE-1002",
  "6a4c26fdbec274cf690ab547": "DRE-1003",
  "6a4c32ce2edbd172d89fe8d2": "DRE-1004",
  "6a4c33d02edbd172d89fe8ed": "DRE-1005",
  "6a5171eb679ee1eb094eadb0": "BAG-1001",
  "6a5171eb679ee1eb094eadb3": "CAR-1001",
  "6a5176905a25afc9a77fb88f": "BAG-1002",
  "6a5176905a25afc9a77fb892": "CAR-1002",
  "6a517abebfec27b0d2ec6ce3": "BAG-1003",
  "6a517abebfec27b0d2ec6ce6": "CAR-1003",
  "6a517b9e48ef0a9f41f179f9": "BAG-1004",
  "6a517b9e48ef0a9f41f179fc": "CAR-1004",
  "6a517cf07325e31739b9abb7": "BAG-1005",
  "6a517cf07325e31739b9abba": "CAR-1005"
};

async function fixSkus() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modapella');
    console.log('Connected to MongoDB. Preserving old SKUs...');

    const products = await Product.find({}).sort({ createdAt: 1 });
    console.log(`Found ${products.length} products.`);

    let currentSkuNumber = 1000;

    for (const p of products) {
      currentSkuNumber += 1;
      const legacySku = OLD_SKU_MAP[p._id.toString()] || p.sku || '';
      const newSku = currentSkuNumber.toString();
      p.sku = newSku;
      p.oldSku = legacySku;
      await p.save();
      console.log(`Updated Product "${p.name}": SKU = [${newSku}], oldSku = [${legacySku}]`);
    }

    console.log('\n✅ All product SKUs updated with oldSku preserved!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

fixSkus();
