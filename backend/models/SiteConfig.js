const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default' },
  published: { type: Boolean, default: true },
  heroTitle: { type: String, default: 'مودا بيلا جاهزة الآن للإطلاق.' },
  heroSubtitle: { type: String, default: 'واجهة جاهزة للاستخدام، متجر حديث، وتصفح فوري للألوان والمقاسات.' },
  heroCtaLabel: { type: String, default: 'ابدأي التسوق' },
  heroCtaLink: { type: String, default: '/shop' },
  secondaryCtaLabel: { type: String, default: 'شاهد المجموعات' },
  secondaryCtaLink: { type: String, default: '/collections' },
  featuredTitle: { type: String, default: 'أحدث المنتجات' },
  featuredSubtitle: { type: String, default: 'منتجاتنا المميزة الآن، مع عرض سريع لكل قطعة.' },
  maintenanceMessage: { type: String, default: 'الموقع غير متاح حالياً، سنعود قريباً.' },
  categories: {
    type: [{ key: String, nameAr: String }],
    default: [
      { key: 'Blazer', nameAr: 'بليزر' },
      { key: 'Blouse', nameAr: 'بلوزة' },
      { key: 'Chemise', nameAr: 'شميز' },
      { key: 'Skirt', nameAr: 'جيبة' },
      { key: 'Dress', nameAr: 'فستان' },
      { key: 'Pantalon', nameAr: 'بنطلون' },
      { key: 'T-shirt', nameAr: 'تيشيرت' },
      { key: 'Bag', nameAr: 'شنطة' },
      { key: 'Cardigan', nameAr: 'كاردن' },
      { key: 'Suit', nameAr: 'سوت' },
      { key: 'Tonic', nameAr: 'تونيك' },
      { key: 'Takem', nameAr: 'طقم' }
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('SiteConfig', SiteConfigSchema);
