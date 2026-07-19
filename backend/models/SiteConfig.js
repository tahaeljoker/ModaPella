const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default' },
  published: { type: Boolean, default: true },
  heroTitle: { type: String, default: 'أزياء تليق بكِ' },
  heroSubtitle: { type: String, default: 'تصفحي أحدث الموديلات النسائية واطلبي بسهولة، أو زوري محلنا مباشرة في بني مزار.' },
  heroCtaLabel: { type: String, default: 'تسوقي الآن' },
  heroCtaLink: { type: String, default: '/shop' },
  secondaryCtaLabel: { type: String, default: 'شاهدي المجموعات' },
  secondaryCtaLink: { type: String, default: '/collections' },
  featuredTitle: { type: String, default: 'أحدث الموديلات' },
  featuredSubtitle: { type: String, default: 'قطع مختارة بعناية — شوفي اللي يعجبك واطلبيه.' },
  maintenanceMessage: { type: String, default: 'الموقع غير متاح حالياً، سنعود قريباً.' },
  whatsappNumber: { type: String, default: '201090048832' },
  // New fields
  announcementBar: { type: String, default: '' },
  storeAddress: { type: String, default: 'شارع الإعدادية بنات، بني مزار، المنيا' },
  storePhone: { type: String, default: '01090048832' },
  aboutText: { type: String, default: 'محل أزياء نسائي في قلب بني مزار، بنقدم فيه أحدث الموديلات العصرية بأسعار كويسة.' },
  whatsappMessageTemplate: { type: String, default: 'أهلاً بكِ يا أ/ *{{name}}* في ModaPella 🎠✨\n\nتم تسجيل طلبكِ رقم *#{{id}}* بنجاح بقيمة *{{amount}} ج.م*.\n\nمن فضلكِ قومي بتحويل المبلغ عبر Instapay لتأكيد الطلب! 🌸' },
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
