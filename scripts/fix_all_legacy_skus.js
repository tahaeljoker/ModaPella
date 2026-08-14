const dotenv = require('../backend/node_modules/dotenv');
dotenv.config({ path: './backend/.env' });
const mongoose = require('../backend/node_modules/mongoose');
const Product = require('../backend/models/Product');

const CATEGORY_PREFIXES = {
  Blouse: 'BLO',
  Chemise: 'CHE',
  Dress: 'DRE',
  Bag: 'BAG',
  Cardigan: 'CAR',
  Skirt: 'SKR',
  Pantalon: 'PNT',
  'T-shirt': 'TSH',
  Suit: 'SUI',
  Takem: 'TAK',
  Tonic: 'TON',
  Blazer: 'BLZ'
};

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

async function runMigration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/modapella');
    console.log('Connected to MongoDB for legacy SKU migration...');

    const products = await Product.find({}).sort({ createdAt: 1 });
    console.log(`Found ${products.length} products.`);

    let updatedCount = 0;

    for (const p of products) {
      let modified = false;

      // 1. Reactivate archived products so they are available in POS
      if (p.active === false) {
        p.active = true;
        modified = true;
      }

      // 2. Ensure oldSku is populated for legacy barcodes
      const mappedOldSku = OLD_SKU_MAP[p._id.toString()];
      if (mappedOldSku && p.oldSku !== mappedOldSku) {
        p.oldSku = mappedOldSku;
        modified = true;
      } else if (!p.oldSku && p.category && p.sku) {
        const prefix = CATEGORY_PREFIXES[p.category] || p.category.substring(0, 3).toUpperCase();
        const categoryOldSku = `${prefix}-${p.sku}`;
        p.oldSku = categoryOldSku;
        modified = true;
      }

      if (modified) {
        await p.save();
        updatedCount++;
        console.log(`Updated Product "${p.name}": SKU = [${p.sku}], oldSku = [${p.oldSku}], active = [${p.active}]`);
      }
    }

    console.log(`\n✅ Migration complete! Updated ${updatedCount} products.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
