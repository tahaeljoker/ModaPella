import { useState } from 'react';
import api from '../services/api';

const FEATURE_DEFINITIONS = [
  {
    id: 'outfitter',
    title: 'غرفة التنسيق (Outfitter Studio)',
    icon: '🎨',
    description: 'غرفة تنسيق الأطقم الذكية لتجربة واختيار اللبس مع بعضه. عند التعطيل، تختفي تماماً من شريط الموقع وروابط الموبايل.',
    location: 'القائمة العلوية ورابط /outfitter',
    badge: 'قيد التطوير',
    defaultVal: false
  },
  {
    id: 'lookbook',
    title: 'إطلالات الموديلز (Shop The Look / Lookbook)',
    icon: '📸',
    description: 'قسم إطلالات الموديلز والأطقم الكاملة على الموديل. عند التعطيل، يختفي القسم بالكامل من الصفحة الرئيسية ومن القائمة العلوية.',
    location: 'الصفحة الرئيسية + القائمة العلوية ورابط /lookbook',
    badge: 'قيد التجهيز',
    defaultVal: false
  },
  {
    id: 'mannequinComparison',
    title: 'مقارنة مانيكان المحل (Mannequin Slider)',
    icon: '👤',
    description: 'سلايدر المقارنة التفاعلي بين صورة القطعة فلات وصورتها على مانيكان المحل في صفحة تفاصيل المنتج.',
    location: 'صفحة تفاصيل المنتج',
    badge: 'جاهز ونشط',
    defaultVal: true
  },
  {
    id: 'productComparison',
    title: 'مقارنة الموديلات والقطع (Product Comparison)',
    icon: '⚖️',
    description: 'زر "مقارنة" على كروت الملابس وشريط مقارنة القطع جنباً إلى جنب في الموقع لمساعدة العميلة في الاختيار.',
    location: 'كروت المنتجات + القائمة العلوية',
    badge: 'جاهز ونشط',
    defaultVal: true
  },
  {
    id: 'coupons',
    title: 'كوبونات وأكواد الخصم (Promo Coupons)',
    icon: '🎟️',
    description: 'إتاحة حقل إدخال كوبون الخصم في سلة المشتريات ومودال الشراء السريع لتطبيق خصم مباشر للزبونة.',
    location: 'سلة المشتريات + شاشة الشراء السريع',
    badge: 'جاهز ونشط',
    defaultVal: true
  },
  {
    id: 'shareOutfit',
    title: 'شاركي اللوك مع صديقتكِ (Share Outfit)',
    icon: '👭',
    description: 'زر مشاركة الإطلالة ورابط المنتج مباشرة عبر واتساب مع الأصدقاء في صفحة تفاصيل المنتج.',
    location: 'صفحة تفاصيل المنتج',
    badge: 'جاهز ونشط',
    defaultVal: true
  },
  {
    id: 'bestSellers',
    title: 'شريط الأكثر مبيعاً (Best Sellers Carousel)',
    icon: '⭐',
    description: 'سلايدر عرض القطع الأكثر طلباً وإقبالاً داخل المحل في الصفحة الرئيسية للمتجر.',
    location: 'الصفحة الرئيسية',
    badge: 'جاهز ونشط',
    defaultVal: true
  },
  {
    id: 'socialProof',
    title: 'إشعارات الشراء المباشرة (Live Purchases Popup)',
    icon: '🔔',
    description: 'إشعار تفاعلي ينبثق أسفل شاشة المتجر بمبيعات المحل الحديثة لبث الثقة والحماس لدى الزائرات.',
    location: 'أسفل شاشة الموقع لجميع الزوار',
    badge: 'جاهز ونشط',
    defaultVal: true
  }
];

export default function AdminFeatureFlags({ config, onUpdateConfig, onToast }) {
  const [savingId, setSavingId] = useState(null);

  const currentFeatures = config?.features || {};

  const handleToggle = async (featureId, currentVal) => {
    const nextVal = !currentVal;
    const updatedFeatures = {
      ...currentFeatures,
      [featureId]: nextVal
    };

    setSavingId(featureId);
    try {
      const res = await api.put('/admin/site-config', {
        ...config,
        features: updatedFeatures
      });

      onUpdateConfig?.(res.data);
      const featDef = FEATURE_DEFINITIONS.find(f => f.id === featureId);
      const title = featDef ? featDef.title : featureId;

      if (nextVal) {
        onToast?.(`تم تفعيل (${title}) بنجاح وإظهارها بالموقع 🌐`);
      } else {
        onToast?.(`تم تعطيل (${title}) وإخفاؤها تماماً من واجهة العملاء 🚫`);
      }
    } catch (err) {
      console.error(err);
      onToast?.('فشل حفظ حالة الميزة، يرجى المحاولة مرة أخرى');
    } finally {
      setSavingId(null);
    }
  };

  const activeCount = FEATURE_DEFINITIONS.filter(f => (currentFeatures[f.id] ?? f.defaultVal)).length;
  const disabledCount = FEATURE_DEFINITIONS.length - activeCount;

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-[2.5rem] border border-burgundy/15 bg-gradient-to-r from-burgundy/5 via-white to-amber-50/50 p-6 sm:p-8 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-burgundy/60 flex items-center gap-1.5">
              <span>لوحة التحكم بالميزات ومفاتيح الموقع (Feature Flags)</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-burgundy mt-1">
              التحكم في ظهور أو إخفاء ميزات الموقع
            </h2>
            <p className="text-xs sm:text-sm text-burgundy/70 mt-1 max-w-2xl leading-relaxed">
              تقدر من هنا بنقرة واحدة تفعل أو تعطل أي ميزة في المتجر. الميزة اللي لسه مخلصتهاش أو مش حابب تعرضها للزبائن حالياً، تقدر تقفلها وهتختفي فوراً من القوائم والصفحات!
            </p>
          </div>

          {/* Quick Summary Badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{activeCount} ميزات نشطة للعملاء</span>
            </span>
            <span className="text-xs bg-stone-100 text-stone-700 border border-stone-300 px-3 py-1.5 rounded-2xl font-bold flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-stone-400" />
              <span>{disabledCount} ميزات معطلة ومخفية</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Feature Toggle Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURE_DEFINITIONS.map((feat) => {
          const isEnabled = currentFeatures[feat.id] ?? feat.defaultVal;
          const isSaving = savingId === feat.id;

          return (
            <div
              key={feat.id}
              className={`rounded-2xl border-2 p-5 transition-all duration-300 flex flex-col justify-between gap-4 shadow-xs ${
                isEnabled
                  ? 'border-emerald-300 bg-emerald-50/20 hover:bg-emerald-50/40 hover:border-emerald-400'
                  : 'border-stone-200 bg-stone-50/60 hover:bg-white hover:border-stone-300 opacity-90'
              }`}
            >
              <div>
                {/* Top Row: Icon + Title + Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-2xl bg-white border border-burgundy/10 flex items-center justify-center text-2xl shadow-xs shrink-0">
                      {feat.icon}
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-burgundy">
                        {feat.title}
                      </h3>
                      <span className="text-[10px] text-burgundy/50 font-mono mt-0.5 block">
                        الموقع: {feat.location}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-2xs whitespace-nowrap ${
                    isEnabled
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-stone-200 text-stone-700 border-stone-300'
                  }`}>
                    {isEnabled ? 'معروض للعملاء 🌐' : 'معطل ومخفي 🚫'}
                  </span>
                </div>

                {/* Description */}
                <p className="mt-3 text-xs text-burgundy/75 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              {/* Bottom Row: Toggle Switch & Status Label */}
              <div className="pt-3 border-t border-burgundy/10 flex items-center justify-between">
                <span className="text-xs font-bold text-burgundy/70">
                  {isSaving ? (
                    <span className="text-burgundy font-bold animate-pulse">جاري الحفظ...</span>
                  ) : isEnabled ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <span>✓ مفعلة حالياً في واجهة المتجر</span>
                    </span>
                  ) : (
                    <span className="text-stone-500 font-semibold">
                      ✕ معطلة (مخفية من الزبائن)
                    </span>
                  )}
                </span>

                {/* The Switch */}
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleToggle(feat.id, isEnabled)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-burgundy/30 ${
                    isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                  } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                  title={isEnabled ? 'اضغط للتعطيل والإخفاء من الموقع' : 'اضغط للتفعيل والإظهار في الموقع'}
                  aria-label={`تبديل حالة ${feat.title}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                      isEnabled ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

