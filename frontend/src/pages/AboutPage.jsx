import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Icon } from '../components/Icon';
import logoSrc from '../assets/logo.png';

const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/moda_pella?obrf=NTRsYWI3MXpuZXNm',
  facebook: 'https://www.facebook.com/share/1HdfNYn5QX/',
  tiktok: 'https://www.tiktok.com/@moda.pella?_r=1&_t=ZS-9AfaJHoDzJk',
  phone: '01090048832',
  whatsapp: '201090048832'
};

function AboutPage() {
  const [config, setConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  useEffect(() => {
    api.get('/admin/site-config')
      .then(res => setConfig(res.data))
      .catch(() => setConfig(null));
  }, []);

  const phone = config?.storePhone || SOCIAL_LINKS.phone;
  const address = config?.storeAddress || 'شارع الإعدادية بنات، بني مزار، المنيا';
  const about = config?.aboutText || 'محل أزياء نسائي في قلب بني مزار، بنقدم فيه أحدث الموديلات العصرية والقطع الأنيقة بأعلى جودة وأفضل سعر. تصفحي أونلاين واطلبي بسهولة، أو شرفينا في المحل وشوفي القطع على عينك.';
  const waPhone = config?.whatsappNumber ? config.whatsappNumber.replace(/[^0-9]/g, '') : SOCIAL_LINKS.whatsapp;

  const instagramUrl = config?.instagramUrl || SOCIAL_LINKS.instagram;
  const facebookUrl = config?.facebookUrl || SOCIAL_LINKS.facebook;
  const tiktokUrl = config?.tiktokUrl || SOCIAL_LINKS.tiktok;
  const mapUrl = config?.locationMapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('ModaPella شارع الاعدادية بنات بني مزار المنيا')}`;

  const currentUrl = typeof window !== 'undefined' ? (window.location.origin + '/about') : 'https://modapella.com/about';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ModaPella — تواصل معنا',
          text: 'جميع حسابات وموقع محل ModaPella للأزياء النسائية ببني مزار',
          url: currentUrl,
        });
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2500);
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 py-4 sm:py-8 text-burgundy" dir="rtl">

      {/* ━━━━━━━━━━━━ HERO BRAND HEADER ━━━━━━━━━━━━ */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-burgundy/10 bg-gradient-to-b from-white via-white to-beige/20 p-6 sm:p-10 lg:p-12 shadow-soft">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-burgundy/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-56 h-56 bg-burgundy/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center lg:flex-row lg:text-right lg:items-center lg:justify-between gap-8">
          
          {/* Logo visual */}
          <div className="flex-shrink-0">
            <div className="relative group">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-burgundy/20 via-beige to-burgundy/20 blur-md opacity-75 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white border border-burgundy/10 p-3 shadow-lg flex items-center justify-center">
                <img 
                  src={logoSrc} 
                  alt="ModaPella Logo" 
                  className="w-full h-full object-contain transform group-hover:scale-105 transition duration-300"
                />
              </div>
              <span className="absolute -bottom-2 -right-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-md">
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                مفتوح الآن
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-burgundy">
              <span>ModaPella Store</span>
              <span>•</span>
              <span>بني مزار، المنيا</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-burgundy tracking-tight">
              تواصل معنا
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-burgundy/80 font-normal">
              {about}
            </p>
          </div>

          {/* Quick share actions */}
          <div className="flex flex-row lg:flex-col gap-2.5 w-full sm:w-auto justify-center">
            <button
              onClick={handleShare}
              type="button"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-burgundy px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#650018] active:scale-95 transition"
            >
              <Icon name="share" className="w-4 h-4" />
              {shareSuccess ? 'تمت المشاركة!' : 'مشاركة الكارت'}
            </button>
            <button
              onClick={handleCopyLink}
              type="button"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-burgundy/20 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-burgundy shadow-sm hover:bg-burgundy/5 active:scale-95 transition"
            >
              <Icon name="copy" className="w-4 h-4" />
              {copied ? 'تم نسخ الرابط ✓' : 'نسخ الرابط'}
            </button>
          </div>

        </div>
      </div>

      {/* ━━━━━━━━━━━━ SOCIAL MEDIA CHANNELS ━━━━━━━━━━━━ */}
      <div>
        <div className="text-center sm:text-right mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-burgundy/60">حساباتنا الرسمية</span>
          <h2 className="text-xl sm:text-2xl font-black text-burgundy mt-1">تابعينا وتواصلي معنا</h2>
          <p className="text-xs sm:text-sm text-burgundy/70 mt-1">اختاري المنصة المفضلة ليكِ وشوفي أحدث الموديلات والعروض اليومية</p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">

          {/* Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-3xl border border-pink-100 bg-white p-6 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10 rounded-bl-full pointer-events-none" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-md shadow-pink-500/20 group-hover:scale-110 transition duration-300">
                  <Icon name="instagram" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-[#dc2743] bg-pink-50 px-2.5 py-1 rounded-full">
                  @moda_pella
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-burgundy group-hover:text-[#dc2743] transition">إنستجرام | Instagram</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  شوفي أحدث ريلز وستوريات وتنسيقات الأطقم أول بأول.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-burgundy/5 flex items-center justify-between text-xs font-bold text-[#dc2743]">
              <span>متابعة الصفحة</span>
              <span className="transform -translate-x-1 group-hover:translate-x-0 transition">←</span>
            </div>
          </a>

          {/* TikTok */}
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white p-6 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rounded-bl-full pointer-events-none" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-md shadow-black/20 group-hover:scale-110 transition duration-300">
                  <Icon name="tiktok" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-gray-800 bg-gray-100 px-2.5 py-1 rounded-full">
                  @moda.pella
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-burgundy group-hover:text-black transition">تيك توك | TikTok</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  فيديوهات اللبس على الطبيعة وخامات القطع والتريندات.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-burgundy/5 flex items-center justify-between text-xs font-bold text-black">
              <span>مشاهدة الفيديوهات</span>
              <span className="transform -translate-x-1 group-hover:translate-x-0 transition">←</span>
            </div>
          </a>

          {/* Facebook */}
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-white p-6 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#1877F2]/5 rounded-bl-full pointer-events-none" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-md shadow-blue-500/20 group-hover:scale-110 transition duration-300">
                  <Icon name="facebook" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-[#1877F2] bg-blue-50 px-2.5 py-1 rounded-full">
                  ModaPella
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-burgundy group-hover:text-[#1877F2] transition">فيسبوك | Facebook</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  ألبومات الصور، العروض، ومشاركات العميلات وآرائهم.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-burgundy/5 flex items-center justify-between text-xs font-bold text-[#1877F2]">
              <span>زيارة الصفحة</span>
              <span className="transform -translate-x-1 group-hover:translate-x-0 transition">←</span>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#25D366]/10 rounded-bl-full pointer-events-none" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md shadow-emerald-500/20 group-hover:scale-110 transition duration-300">
                  <Icon name="whatsapp" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
                  رد فوري ⚡
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-950 group-hover:text-emerald-700 transition">واتساب | WhatsApp</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  استفسري عن أي موديل، احجزي قطعتك، وتواصلي معنا مباشرة.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-emerald-200/50 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>بدء محادثة الآن</span>
              <span className="transform -translate-x-1 group-hover:translate-x-0 transition">←</span>
            </div>
          </a>

        </div>
      </div>

      {/* ━━━━━━━━━━━━ LOCATION & STORE DETAILS CARD ━━━━━━━━━━━━ */}
      <div className="rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-burgundy/8 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/10 px-3.5 py-1 text-xs font-bold text-burgundy">
              <Icon name="location" className="w-4 h-4" />
              موقع المحل على الخريطة
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-burgundy mt-2">
              شرفينا في المحل
            </h3>
            <p className="text-sm text-burgundy/75 mt-1 leading-relaxed">
              بنرحب بيكِ في أي وقت لتجربة ومعاينة أحدث الكولكشن على الطبيعة واختيار الأنسب ليكي.
            </p>
          </div>
          <div className="text-xs text-burgundy/70 bg-beige/20 border border-burgundy/10 rounded-2xl px-4 py-3 self-start sm:self-center">
            <span className="font-bold text-burgundy block">مواعيد العمل:</span>
            <span>يومياً من 11:00 ص حتى 11:00 م</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          
          {/* Info cards */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Address */}
            <div className="rounded-2xl border border-burgundy/10 bg-beige/10 p-5 space-y-2">
              <div className="flex items-center gap-2 text-burgundy font-bold text-xs">
                <Icon name="location" className="w-4 h-4 text-burgundy" />
                <span>العنوان بالتفصيل</span>
              </div>
              <p className="text-sm sm:text-base text-burgundy font-bold leading-relaxed">
                {address}
              </p>
            </div>

            {/* Phone */}
            <div className="rounded-2xl border border-burgundy/10 bg-white p-5 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 text-burgundy font-bold text-xs">
                <Icon name="phone" className="w-4 h-4 text-burgundy" />
                <span>الهاتف والاتصال السريع</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-base font-mono font-bold text-burgundy" dir="ltr">
                  {phone}
                </p>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-burgundy px-4 py-1.5 text-xs font-bold text-white hover:bg-[#650018] transition shadow"
                >
                  <Icon name="phone" className="w-3.5 h-3.5" />
                  اتصال الآن
                </a>
              </div>
            </div>

            {/* Quick WhatsApp support */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <Icon name="whatsapp" className="w-4 h-4 text-emerald-600" />
                <span>خدمة العملاء والطلبات</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-burgundy/75">
                  متاحين للرد على أي استفسار فوراً
                </p>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 transition shadow"
                >
                  واتساب
                </a>
              </div>
            </div>

          </div>

          {/* Google Maps Banner */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl border border-burgundy/10 bg-gradient-to-br from-beige/30 via-white to-burgundy/5 p-6 sm:p-8 flex flex-col justify-between text-center space-y-6">
            <div className="space-y-3">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-burgundy text-white shadow-lg">
                <Icon name="location" className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-burgundy">Google Maps اتجاهات الخريطة</h4>
                <p className="text-xs sm:text-sm text-burgundy/75 max-w-md mx-auto mt-1 leading-relaxed">
                  اضغطي لفتح اللوكيشن على خرائط جوجل واتباع المسار والوصول للمحل في شارع الإعدادية بنات بكل سهولة.
                </p>
              </div>
            </div>

            <div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-burgundy px-8 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#650018] active:scale-95 transition"
              >
                <Icon name="location" className="w-4 h-4" />
                فتح الاتجاهات على خرائط Google
              </a>
            </div>

            <div className="text-[11px] text-burgundy/60 border-t border-burgundy/8 pt-3">
              ModaPella • بني مزار، محافظة المنيا
            </div>
          </div>

        </div>

      </div>

      {/* ━━━━━━━━━━━━ BOTTOM CTA BANNER ━━━━━━━━━━━━ */}
      <div className="rounded-[2.5rem] border border-burgundy/10 bg-gradient-to-r from-burgundy via-[#650018] to-burgundy p-8 sm:p-12 text-white text-center shadow-lg space-y-5">
        <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-semibold backdrop-blur-sm">
          أناقة تليق بكِ
        </span>
        <h2 className="text-2xl sm:text-4xl font-black">
          جاهزة تكتشفي أحدث إطلالاتك؟
        </h2>
        <p className="text-xs sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed">
          تصفحي تشكيلتنا الكاملة أونلاين، واطلبي توصيل سريع لبيتك أو اختاري استلام مجاني من المحل.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-burgundy transition hover:bg-beige shadow"
          >
            تسوقي الآن
          </Link>
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/20 backdrop-blur-sm"
          >
            <Icon name="whatsapp" className="w-4 h-4 text-[#25D366]" />
            طلبات الواتساب
          </a>
        </div>
      </div>

    </div>
  );
}

export default AboutPage;
