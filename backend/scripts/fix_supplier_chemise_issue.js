const mongoose = require('mongoose');
require('dotenv').config();

const normalizeArabic = (str) => {
  if (!str) return '';
  return str.trim()
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ةه]/g, 'ه')
    .replace(/[ىي]/g, 'ي')
    .replace(/\s+/g, ' ');
};

async function healDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');

    const Supplier = require('../models/Supplier');
    const SupplierTransaction = require('../models/SupplierTransaction');
    const Product = require('../models/Product');
    const Transaction = require('../models/Transaction');

    // 1. Find all suppliers and detect duplicates
    const allSuppliers = await Supplier.find().sort({ createdAt: 1 });
    console.log(`📋 Found ${allSuppliers.length} supplier records in DB.`);

    const suppliersByNormalizedName = new Map();

    for (const sup of allSuppliers) {
      const norm = normalizeArabic(sup.name);
      if (!suppliersByNormalizedName.has(norm)) {
        suppliersByNormalizedName.set(norm, [sup]);
      } else {
        suppliersByNormalizedName.get(norm).push(sup);
      }
    }

    let mergedCount = 0;
    for (const [normName, list] of suppliersByNormalizedName.entries()) {
      if (list.length > 1) {
        console.log(`⚠️ Found duplicate suppliers for: "${normName}" (${list.length} records)`);
        // Primary is the earliest or the one with phone/address
        const primary = list.find(s => s.phone || s.address) || list[0];
        const duplicates = list.filter(s => s._id.toString() !== primary._id.toString());

        for (const dup of duplicates) {
          console.log(`  🔄 Merging duplicate supplier "${dup.name}" (${dup._id}) -> Primary "${primary.name}" (${primary._id})`);
          
          // Re-link transactions
          const txRes = await SupplierTransaction.updateMany(
            { supplier: dup._id },
            { $set: { supplier: primary._id } }
          );
          console.log(`    ↳ Updated ${txRes.modifiedCount} supplier transactions.`);

          // Re-link products
          const prodRes = await Product.updateMany(
            { supplierId: dup._id },
            { $set: { supplierId: primary._id, supplier: primary.name } }
          );
          console.log(`    ↳ Updated ${prodRes.modifiedCount} products.`);

          // Delete the duplicate supplier
          await Supplier.findByIdAndDelete(dup._id);
          mergedCount++;
        }
      }
    }

    if (mergedCount === 0) {
      console.log('✓ No duplicate suppliers needed merging.');
    }

    // 2. Find any Chemise / 148 product and ensure it is active and properly linked
    const chemiseProducts = await Product.find({
      $or: [
        { name: { $regex: 'شميز', $options: 'i' } },
        { name: { $regex: '148', $options: 'i' } },
        { sku: { $regex: '148', $options: 'i' } },
        { oldSku: { $regex: '148', $options: 'i' } }
      ]
    });

    console.log(`👕 Found ${chemiseProducts.length} Chemise / 148 products.`);

    for (const p of chemiseProducts) {
      console.log(`  • Product: "${p.name}" (SKU: ${p.sku}) | isSeasonArchived: ${p.isSeasonArchived} | supplier: "${p.supplier}"`);
      
      let changed = false;
      if (p.isSeasonArchived) {
        p.isSeasonArchived = false;
        changed = true;
        console.log(`    ↳ Un-archived product (now active in showroom & POS).`);
      }

      // Check supplier link
      if (p.supplier && !p.supplierId) {
        const norm = normalizeArabic(p.supplier);
        const matchSup = allSuppliers.find(s => normalizeArabic(s.name) === norm);
        if (matchSup) {
          p.supplierId = matchSup._id;
          p.supplier = matchSup.name;
          changed = true;
          console.log(`    ↳ Linked to supplier "${matchSup.name}".`);
        }
      }

      if (changed) {
        await p.save();
      }
    }

    // 3. Check for any transactions mentioning Chemise or 148
    const chemiseTxs = await SupplierTransaction.find({
      $or: [
        { description: { $regex: 'شميز', $options: 'i' } },
        { description: { $regex: '148', $options: 'i' } },
        { 'items.name': { $regex: 'شميز', $options: 'i' } }
      ]
    });

    console.log(`📦 Found ${chemiseTxs.length} supplier transactions related to Chemise.`);
    for (const tx of chemiseTxs) {
      console.log(`  • Tx ID: ${tx._id} | Type: ${tx.type} | Amount: ${tx.amount} | Supplier: ${tx.supplier} | Source: ${tx.paymentSource}`);
    }

    console.log('\n✨ Database healing finished successfully.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error during healing:', err);
    process.exit(1);
  }
}

healDatabase();
