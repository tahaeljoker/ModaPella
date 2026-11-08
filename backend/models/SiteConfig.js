const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default' },
  published: { type: Boolean, default: true },
  websiteSeason: { type: String, enum: ['winter', 'summer', 'all'], default: 'winter' },
  enforceWebsiteSeason: { type: Boolean, default: true },
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
  announcementBar: { type: String, default: 'شحن سريع لجميع المحافظات | تسوقي أحدث الموديلات الآن' },
  announcementBarActive: { type: Boolean, default: true },
  announcementBarLink: { type: String, default: '/shop' },
  announcementBarBg: { type: String, default: 'burgundy' },
  outfitterBannerActive: { type: Boolean, default: true },
  outfitterBannerBadge: { type: String, default: 'ميزة حصرية جديدة في مودة بيلا' },
  outfitterBannerTitle: { type: String, default: 'غرفة تنسيق وتبديل الملابس على المانيكان' },
  outfitterBannerDesc: { type: String, default: 'اختاري البلوزة مع البنطلون وبدّلي الألوان وشوفي التناسق فوراً بدون انتظار. واحصلي على خصم 15% فوري عند شراء الطقم كاملاً!' },
  outfitterBannerCtaText: { type: String, default: 'ادخلي غرفة التنسيق الآن' },
  outfitterBannerCtaLink: { type: String, default: '/outfitter' },
  socialProofActive: { type: Boolean, default: true },
  storeAddress: { type: String, default: 'شارع الإعدادية بنات، بني مزار، المنيا' },
  storePhone: { type: String, default: '01090048832' },
  baseMannequinPhoto: { type: String, default: '' },
  aboutText: { type: String, default: 'محل أزياء نسائي في قلب بني مزار، بنقدم فيه أحدث الموديلات العصرية بأسعار كويسة.' },
  instagramUrl: { type: String, default: 'https://www.instagram.com/moda_pella?obrf=NTRsYWI3MXpuZXNm' },
  facebookUrl: { type: String, default: 'https://www.facebook.com/share/1HdfNYn5QX/' },
  tiktokUrl: { type: String, default: 'https://www.tiktok.com/@moda.pella?_r=1&_t=ZS-9AfaJHoDzJk' },
  locationMapUrl: { type: String, default: '' },
  whatsappMessageTemplate: { type: String, default: 'أهلاً بكِ يا أ/ *{{name}}* في ModaPella \n\nتم تسجيل طلبكِ رقم *#{{id}}* بنجاح بقيمة *{{amount}} ج.م*.\n\nمن فضلكِ قومي بتحويل المبلغ عبر Instapay لتأكيد الطلب! ' },
  features: {
    outfitter: { type: Boolean, default: false }, // غرفة التنسيق
    lookbook: { type: Boolean, default: false }, // إطلالات الموديلز
    mannequinComparison: { type: Boolean, default: true }, // مانيكان المحل
    productComparison: { type: Boolean, default: true }, // مقارنة الموديلات
    coupons: { type: Boolean, default: true }, // كوبونات الخصم
    shareOutfit: { type: Boolean, default: true }, // شير اللوك
    bestSellers: { type: Boolean, default: true }, // الأكثر مبيعاً
    socialProof: { type: Boolean, default: true } // إشعارات الشراء المباشرة
  },
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
