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
      <div className="anim-fade-in-up anim-delay-1 relative overflow-hidden rounded-[2.5rem] border border-burgundy/10 bg-gradient-to-b from-white via-white to-beige/25 p-6 sm:p-10 lg:p-12 shadow-soft hover:shadow-xl transition-shadow duration-500">
        
        {/* Animated decorative ambient orbs */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-56 h-56 bg-gradient-to-br from-burgundy/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-64 h-64 bg-gradient-to-tr from-burgundy/10 to-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

        <div className="relative flex flex-col items-center text-center lg:flex-row lg:text-right lg:items-center lg:justify-between gap-8">
          
          {/* Logo visual with gentle float */}
          <div className="flex-shrink-0">
            <div className="relative group float-gentle">
              <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-r from-burgundy/25 via-amber-200 to-burgundy/25 blur-md opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />
              <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-white border border-burgundy/10 p-3 shadow-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                <img 
                  src={logoSrc} 
                  alt="ModaPella Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="absolute -bottom-2.5 -right-2.5 inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1 text-[11px] font-bold text-white shadow-lg border-2 border-white">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                مفتوح الآن
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 max-w-2xl space-y-3.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-burgundy shadow-sm">
              <span>ModaPella Store</span>
              <span className="text-burgundy/40">•</span>
              <span>بني مزار، المنيا</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-burgundy tracking-tight leading-tight">
              تواصل معنا
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-burgundy/80 font-normal">
              {about}
            </p>
          </div>

          {/* Quick share actions */}
          <div className="flex flex-row lg:flex-col gap-3 w-full sm:w-auto justify-center">
            <button
              onClick={handleShare}
              type="button"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-burgundy px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#650018] hover:shadow-lg active:scale-95 transition-all duration-200"
            >
              <Icon name="share" className="w-4 h-4 transition-transform duration-200 hover:rotate-12" />
              {shareSuccess ? 'تمت المشاركة!' : 'مشاركة الكارت'}
            </button>
            <button
              onClick={handleCopyLink}
              type="button"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-burgundy/20 bg-white px-5 py-3 text-xs sm:text-sm font-bold text-burgundy shadow-sm hover:bg-burgundy/5 hover:border-burgundy/40 active:scale-95 transition-all duration-200"
            >
              <Icon name="copy" className="w-4 h-4" />
              {copied ? 'تم نسخ الرابط ✓' : 'نسخ الرابط'}
            </button>
          </div>

        </div>
      </div>

      {/* ━━━━━━━━━━━━ SOCIAL MEDIA CHANNELS ━━━━━━━━━━━━ */}
      <div>
        <div className="anim-fade-in-up anim-delay-2 text-center sm:text-right mb-6">
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
            className="anim-fade-in-up anim-delay-2 card-sheen interactive-card group relative overflow-hidden rounded-3xl border border-pink-100/80 bg-white p-6 shadow-soft hover:shadow-2xl hover:border-pink-300 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/15 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white shadow-lg shadow-pink-500/25 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Icon name="instagram" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-[#dc2743] bg-pink-50 border border-pink-100 px-3 py-1 rounded-full group-hover:bg-[#dc2743] group-hover:text-white transition-colors duration-300">
                  @moda_pella
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-burgundy group-hover:text-[#dc2743] transition-colors duration-300">إنستجرام | Instagram</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  شوفي أحدث ريلز وستوريات وتنسيقات الأطقم أول بأول.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-burgundy/5 flex items-center justify-between text-xs font-bold text-[#dc2743]">
              <span className="group-hover:underline">متابعة الصفحة</span>
              <span className="transform group-hover:-translate-x-2 transition-transform duration-300 font-black text-sm">←</span>
            </div>
          </a>

          {/* TikTok */}
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="anim-fade-in-up anim-delay-3 card-sheen interactive-card group relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white p-6 shadow-soft hover:shadow-2xl hover:border-gray-900 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-black/5 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-lg shadow-black/25 group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-[0_0_20px_rgba(255,0,80,0.35)] transition-all duration-300">
                  <Icon name="tiktok" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-gray-800 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full group-hover:bg-black group-hover:text-white transition-colors duration-300">
                  @moda.pella
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-burgundy group-hover:text-black transition-colors duration-300">تيك توك | TikTok</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  فيديوهات اللبس على الطبيعة وخامات القطع والتريندات.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-burgundy/5 flex items-center justify-between text-xs font-bold text-black">
              <span className="group-hover:underline">مشاهدة الفيديوهات</span>
              <span className="transform group-hover:-translate-x-2 transition-transform duration-300 font-black text-sm">←</span>
            </div>
          </a>

          {/* Facebook */}
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="anim-fade-in-up anim-delay-4 card-sheen interactive-card group relative overflow-hidden rounded-3xl border border-blue-100/80 bg-white p-6 shadow-soft hover:shadow-2xl hover:border-blue-400 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#1877F2]/10 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1877F2] text-white shadow-lg shadow-blue-500/25 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Icon name="facebook" className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-[#1877F2] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full group-hover:bg-[#1877F2] group-hover:text-white transition-colors duration-300">
                  ModaPella
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-burgundy group-hover:text-[#1877F2] transition-colors duration-300">فيسبوك | Facebook</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  ألبومات الصور، العروض، ومشاركات العميلات وآرائهم.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-burgundy/5 flex items-center justify-between text-xs font-bold text-[#1877F2]">
              <span className="group-hover:underline">زيارة الصفحة</span>
              <span className="transform group-hover:-translate-x-2 transition-transform duration-300 font-black text-sm">←</span>
            </div>
          </a>

          {/* WhatsApp */}
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="anim-fade-in-up anim-delay-5 card-sheen interactive-card group relative overflow-hidden rounded-3xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/60 to-white p-6 shadow-soft hover:shadow-2xl hover:border-emerald-400 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-[#25D366]/15 rounded-bl-full pointer-events-none group-hover:scale-125 transition-transform duration-500" />
            <div className="space-y-4 relative">
              <div className="flex items-center justify-between">
                <div className="ring-pulse-wa flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Icon name="whatsapp" className="w-7 h-7" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full group-hover:bg-[#25D366] group-hover:text-white transition-colors duration-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping group-hover:bg-white" />
                  رد فوري ⚡
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-emerald-950 group-hover:text-emerald-700 transition-colors duration-300">واتساب | WhatsApp</h3>
                <p className="text-xs text-burgundy/70 leading-relaxed mt-1">
                  استفسري عن أي موديل، احجزي قطعتك، وتواصلي معنا مباشرة.
                </p>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-emerald-200/60 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span className="group-hover:underline">بدء محادثة الآن</span>
              <span className="transform group-hover:-translate-x-2 transition-transform duration-300 font-black text-sm">←</span>
            </div>
          </a>

        </div>
      </div>

      {/* ━━━━━━━━━━━━ LOCATION & STORE DETAILS CARD ━━━━━━━━━━━━ */}
      <div className="anim-fade-in-up anim-delay-4 rounded-[2.5rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft hover:shadow-xl transition-shadow duration-500 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-burgundy/8 pb-6">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy/10 px-3.5 py-1 text-xs font-bold text-burgundy shadow-sm">
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
          <div className="text-xs text-burgundy/80 bg-gradient-to-r from-beige/30 to-amber-50/50 border border-burgundy/10 rounded-2xl px-5 py-3.5 self-start sm:self-center shadow-sm">
            <span className="font-bold text-burgundy block text-sm">مواعيد العمل الرسمية:</span>
            <span className="mt-0.5 inline-block">يومياً من 11:00 صباحاً حتى 11:00 مساءً</span>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          
          {/* Info cards */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            {/* Address */}
            <div className="rounded-2xl border border-burgundy/10 bg-beige/10 p-5 space-y-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 text-burgundy font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-burgundy/10">
                  <Icon name="location" className="w-3.5 h-3.5 text-burgundy" />
                </span>
                <span>العنوان بالتفصيل</span>
              </div>
              <p className="text-sm sm:text-base text-burgundy font-bold leading-relaxed">
                {address}
              </p>
            </div>

            {/* Phone */}
            <div className="rounded-2xl border border-burgundy/10 bg-white p-5 space-y-2 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 text-burgundy font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-burgundy/10">
                  <Icon name="phone" className="w-3.5 h-3.5 text-burgundy" />
                </span>
                <span>الهاتف والاتصال السريع</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <p className="text-base font-mono font-bold text-burgundy" dir="ltr">
                  {phone}
                </p>
                <a
                  href={`tel:${phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-burgundy px-4 py-1.5 text-xs font-bold text-white hover:bg-[#650018] active:scale-95 transition-all duration-200 shadow"
                >
                  <Icon name="phone" className="w-3.5 h-3.5" />
                  اتصال الآن
                </a>
              </div>
            </div>

            {/* Quick WhatsApp support */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-2 hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
                  <Icon name="whatsapp" className="w-3.5 h-3.5 text-emerald-600" />
                </span>
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
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 active:scale-95 transition-all duration-200 shadow"
                >
                  واتساب
                </a>
              </div>
            </div>

          </div>

          {/* Google Maps Banner */}
          <div className="lg:col-span-7 relative overflow-hidden rounded-3xl border border-burgundy/10 bg-gradient-to-br from-beige/30 via-white to-burgundy/5 p-6 sm:p-8 flex flex-col justify-between text-center space-y-6 group">
            
            <div className="space-y-4">
              <div className="relative inline-flex items-center justify-center">
                <span className="radar-ping absolute inline-flex h-16 w-16 rounded-full bg-burgundy/20" />
                <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-burgundy text-white shadow-xl group-hover:scale-110 transition-transform duration-300">
                  <Icon name="location" className="w-8 h-8 animate-bounce" />
                </div>
              </div>
              <div>
                <h4 className="text-xl font-black text-burgundy">Google Maps اتجاهات الخريطة</h4>
                <p className="text-xs sm:text-sm text-burgundy/75 max-w-md mx-auto mt-1.5 leading-relaxed">
                  اضغطي لفتح اللوكيشن على خرائط جوجل واتباع المسار والوصول للمحل في شارع الإعدادية بنات بكل سهولة.
                </p>
              </div>
            </div>

            <div>
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-burgundy px-8 py-4 text-xs sm:text-sm font-bold text-white shadow-lg shadow-burgundy/20 hover:bg-[#650018] hover:shadow-xl active:scale-95 transition-all duration-300"
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
      <div className="anim-fade-in-up anim-delay-5 relative overflow-hidden rounded-[2.5rem] border border-burgundy/10 bg-gradient-to-r from-burgundy via-[#650018] to-burgundy p-8 sm:p-12 text-white text-center shadow-xl space-y-5">
        <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/15">
          أناقة تليق بكِ ✨
        </span>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
          جاهزة تكتشفي أحدث إطلالاتك؟
        </h2>
        <p className="text-xs sm:text-base text-white/80 max-w-lg mx-auto leading-relaxed">
          تصفحي تشكيلتنا الكاملة أونلاين، واطلبي توصيل سريع لبيتك أو اختاري استلام مجاني من المحل.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 relative">
          <Link
            to="/shop"
            className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-burgundy transition-all duration-200 hover:bg-beige hover:shadow-lg active:scale-95 shadow"
          >
            تسوقي الآن
          </Link>
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:bg-white/20 active:scale-95 backdrop-blur-sm"
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
