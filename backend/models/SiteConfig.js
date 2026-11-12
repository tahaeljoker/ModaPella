const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'default' },
  published: { type: Boolean, default: true },
  websiteSeason: { type: String, enum: ['winter', 'summer', 'all'], default: 'winter' },
  enforceWebsiteSeason: { type: Boolean, default: true },
  heroTitle: { type: String, default: 'أشيك استايلات الموسم.. تليق بيكي وبجمال تفاصيلك' },
  heroSubtitle: { type: String, default: 'كل قطعة في كولكشن مودة بيلا بنختارها على الفرازة، خامات ناعمة ومريحة وتفصيل مظبوط بدون تنازلات. اطلبي اللي يعجبك أونلاين وتعايني وتقيسي مع المندوب قبل ما تدفعي مليم، أو شرفينا في صالة العرض ببني مزار.' },
  heroBadge: { type: String, default: 'ModaPella ✦ كولكشن الموسم الجديد' },
  heroImages: {
    type: [String],
    default: [
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85',
      'https://i.postimg.cc/NFz9t4fC/Elegant-fashion-website-hero-banner-women-s-clothing-rack-background-soft-burgundy-overlay-modern.jpg'
    ]
  },
  heroAutoplaySpeed: { type: Number, default: 4.5 },
  heroCtaLabel: { type: String, default: 'تصفحي أحدث الموديلات' },
  heroCtaLink: { type: String, default: '/shop' },
  secondaryCtaLabel: { type: String, default: 'استشيرينا على واتساب' },
  secondaryCtaLink: { type: String, default: 'https://wa.me/201090048832?text=أهلاً%20ModaPella،%20عايزة%20استشارة%20لتنسيق%20طقم%20مناسب' },
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
  defaultPlaceholderImage: { type: String, default: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80' },
  freeShippingThreshold: { type: Number, default: 1000 },
  customColors: { type: Map, of: String, default: {} },
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
