/**
 * Script: Update site config texts in MongoDB
 * Run: node update-site-config.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const SiteConfig = require('./models/SiteConfig');

const newConfig = {
  heroTitle: 'أزياء تليق بكِ',
  heroSubtitle: 'تصفحي أحدث الموديلات النسائية واطلبي بسهولة، أو زوري محلنا مباشرة في بني مزار.',
  heroCtaLabel: 'تسوقي الآن',
  heroCtaLink: '/shop',
  secondaryCtaLabel: 'شاهدي المجموعات',
  secondaryCtaLink: '/collections',
  featuredTitle: 'أحدث الموديلات',
  featuredSubtitle: 'قطع مختارة بعناية — شوفي اللي يعجبك واطلبيه.',
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const config = await SiteConfig.findOneAndUpdate(
    { key: 'default' },
    { $set: newConfig },
    { upsert: true, new: true }
  );

  console.log('✅ Site config updated successfully:');
  console.log('   heroTitle:', config.heroTitle);
  console.log('   heroSubtitle:', config.heroSubtitle);

  await mongoose.disconnect();
  console.log('✅ Done!');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
