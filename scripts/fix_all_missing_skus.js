const path = require('path');
const backendDir = 'd:/programming/projects/work/ModaPella/backend';
const mongoose = require(path.join(backendDir, 'node_modules/mongoose'));
require(path.join(backendDir, 'node_modules/dotenv')).config({ path: path.join(backendDir, '.env') });

const Product = require(path.join(backendDir, 'models/Product'));

async function fixAllSkus() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/modapella';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    const products = await Product.find({}).sort({ createdAt: 1 });
    console.log(`Total Products in DB: ${products.length}`);

    let maxNum = 1000;
    products.forEach(p => {
      if (p.sku) {
        const digits = p.sku.replace(/[^0-9]/g, '');
        const num = parseInt(digits, 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    let fixedCount = 0;
    for (const p of products) {
      const hasSku = p.sku && typeof p.sku === 'string' && p.sku.trim().length > 0;
      if (!hasSku) {
        maxNum += 1;
        p.sku = maxNum.toString();
        await p.save();
        console.log(`Fixed missing SKU for Product "${p.name}" (_id: ${p._id}) -> Generated SKU: ${p.sku}`);
        fixedCount += 1;
      }
    }

    console.log(`\n======================================================`);
    console.log(`✅ ALL SKUs AUDITED: ${products.length} total products verified.`);
    console.log(`✅ Products fixed with new SKUs: ${fixedCount}`);
    console.log(`======================================================\n`);

    mongoose.disconnect();
  } catch (err) {
    console.error('Error fixing SKUs:', err);
    mongoose.disconnect();
  }
}

fixAllSkus();
