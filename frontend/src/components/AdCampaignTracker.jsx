import { useState, useMemo } from 'react';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const PLATFORM_CONFIG = {
  Instagram: {
    nameAr: 'إعلانات إنستغرام',
    icon: '✦',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    borderClass: 'border-pink-300',
    bgClass: 'bg-pink-50/50'
  },
  TikTok: {
    nameAr: 'إعلانات تيك توك',
    icon: '✦',
    badgeClass: 'bg-black text-white',
    borderClass: 'border-slate-800',
    bgClass: 'bg-slate-50'
  },
  Facebook: {
    nameAr: 'إعلانات فيسبوك',
    icon: '✦',
    badgeClass: 'bg-blue-600 text-white',
    borderClass: 'border-blue-300',
    bgClass: 'bg-blue-50/50'
  },
  'WhatsApp / Share': {
    nameAr: 'مشاركة الأصدقاء وواتساب',
    icon: '✦',
    badgeClass: 'bg-emerald-600 text-white',
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50/50'
  },
  WhatsApp: {
    nameAr: 'واتساب مباشر',
    icon: '✦',
    badgeClass: 'bg-emerald-600 text-white',
    borderClass: 'border-emerald-300',
    bgClass: 'bg-emerald-50/50'
  },
  Direct: {
    nameAr: 'زيارات مباشرة / بحث',
    icon: '✦',
    badgeClass: 'bg-slate-600 text-white',
    borderClass: 'border-slate-300',
    bgClass: 'bg-gray-50'
  }
};

export default function AdCampaignTracker({ orders = [] }) {
  // Campaign URL builder state
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [campaignName, setCampaignName] = useState('summer_collection');
  const [targetPath, setTargetPath] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Analyze orders by traffic source
  const stats = useMemo(() => {
    const onlineOrders = orders.filter((o) => o.type === 'Online');
    const totalRevenue = onlineOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const breakdown = {
      Instagram: { count: 0, revenue: 0 },
      TikTok: { count: 0, revenue: 0 },
      Facebook: { count: 0, revenue: 0 },
      'WhatsApp / Share': { count: 0, revenue: 0 },
      Direct: { count: 0, revenue: 0 },
    };

    const campaignList = {};

    onlineOrders.forEach((order) => {
      let src = order.trafficSource?.source || 'Direct';
      if (src === 'WhatsApp') src = 'WhatsApp / Share';
      if (!breakdown[src]) {
        breakdown[src] = { count: 0, revenue: 0 };
      }
      breakdown[src].count += 1;
      breakdown[src].revenue += order.totalAmount || 0;

      // Campaign aggregation
      const cmp = order.trafficSource?.campaign;
      if (cmp) {
        if (!campaignList[cmp]) {
          campaignList[cmp] = { name: cmp, source: src, count: 0, revenue: 0 };
        }
        campaignList[cmp].count += 1;
        campaignList[cmp].revenue += order.totalAmount || 0;
      }
    });

    return {
      totalOrders: onlineOrders.length,
      totalRevenue,
      breakdown,
      campaigns: Object.values(campaignList).sort((a, b) => b.revenue - a.revenue),
    };
  }, [orders]);

  // Generate tracking URL
  const generatedUrl = useMemo(() => {
    const origin = window.location.origin;
    const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const cleanCampaign = encodeURIComponent(campaignName.trim().replace(/\s+/g, '_').toLowerCase() || 'promo');
    return `${origin}${targetPath ? cleanPath : ''}?utm_source=${selectedPlatform}&utm_medium=paid_ad&utm_campaign=${cleanCampaign}`;
  }, [selectedPlatform, campaignName, targetPath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top Summary Header ── */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-gradient-to-r from-burgundy via-[#680A20] to-burgundy text-white p-6 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
              وحدة التحليلات التسويقية الذكية
            </span>
            <h3 className="text-2xl font-black mt-2 text-white">
              تتبع مصادر الإعلانات والمبيعات (Ad Attribution)
            </h3>
            <p className="text-xs text-white/80 mt-1">
              معرفة المنصة الإعلانية التي جلبت كل طلب لحساب عائد الاستثمار (ROAS) بدقة
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/10">
            <div>
              <p className="text-[11px] text-white/70">إجمالي مبيعات الأونلاين</p>
              <p className="text-xl font-black text-amber-300">{EGP(stats.totalRevenue)}</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div>
              <p className="text-[11px] text-white/70">إجمالي الطلبات</p>
              <p className="text-xl font-black text-white">{stats.totalOrders} طلب</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Platform Attribution Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats.breakdown).map(([platformKey, data]) => {
          const cfg = PLATFORM_CONFIG[platformKey] || PLATFORM_CONFIG.Direct;
          const percentage = stats.totalRevenue > 0 ? Math.round((data.revenue / stats.totalRevenue) * 100) : 0;
          const aov = data.count > 0 ? Math.round(data.revenue / data.count) : 0;

          return (
            <div
              key={platformKey}
              className={`rounded-2xl border ${cfg.borderClass} ${cfg.bgClass} p-5 shadow-sm space-y-3 transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${cfg.badgeClass}`}>
                  <span>{cfg.icon}</span>
                  <span>{cfg.nameAr}</span>
                </span>
                <span className="text-xs font-extrabold text-burgundy">{percentage}%</span>
              </div>

              <div>
                <p className="text-2xl font-black text-burgundy">{EGP(data.revenue)}</p>
                <p className="text-xs text-burgundy/60 mt-0.5">{data.count} طلب مؤكد</p>
              </div>

              {/* Progress Bar */}
              <div className="h-2 rounded-full bg-burgundy/10 overflow-hidden">
                <div
                  className="h-full bg-burgundy rounded-full transition-all duration-700"
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="pt-2 border-t border-burgundy/10 flex justify-between text-[11px] text-burgundy/70">
                <span>متوسط الطلب (AOV):</span>
                <span className="font-bold text-burgundy">{EGP(aov)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Active Campaigns Breakdown ── */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-sm space-y-4">
        <h4 className="text-base font-bold text-burgundy flex items-center gap-2">
          
          <span>الحملات الإعلانية النشطة (Campaigns Performance)</span>
        </h4>

        {stats.campaigns.length === 0 ? (
          <div className="py-8 text-center text-xs text-burgundy/50 bg-beige/10 rounded-2xl border border-dashed border-burgundy/15">
            لا توجد طلبات مرتبطة بحملات مسماة حتى الآن. استخدم المولد أدناه لإنشاء روابط إعلانية ذكية لحملاتك!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-burgundy/10 bg-burgundy/5">
                  <th className="py-2.5 px-3 font-bold">اسم الحملة (Campaign)</th>
                  <th className="py-2.5 px-3 font-bold">المنصة</th>
                  <th className="py-2.5 px-3 font-bold text-center">عدد الطلبات</th>
                  <th className="py-2.5 px-3 font-bold text-left">إجمالي المبيعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-burgundy/5">
                {stats.campaigns.map((camp) => (
                  <tr key={camp.name} className="hover:bg-burgundy/3">
                    <td className="py-3 px-3 font-mono font-bold text-burgundy">{camp.name}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-burgundy/5 text-burgundy text-[11px] font-bold">
                        {camp.source}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{camp.count}</td>
                    <td className="py-3 px-3 text-left font-black text-burgundy">{EGP(camp.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Smart UTM Link Generator ── */}
      <div className="rounded-[2rem] border border-amber-500/30 bg-gradient-to-br from-[#FFFBF5] via-white to-[#FFF8F0] p-6 shadow-sm space-y-4">
        <div>
          <span className="text-amber-800 text-xs font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            أداة توليد روابط الإعلانات
          </span>
          <h4 className="text-lg font-black text-burgundy mt-1.5">
            توليد روابط الحملات الترويجية الذكية
          </h4>
          <p className="text-xs text-burgundy/70 mt-0.5">
            انسخ هذا الرابط وضعه في إعلانك على إنستغرام أو تيك توك، وسيسجل النظام كل طلب صادر عنه تلقائياً!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Platform Selector */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1">المنصة الإعلانية:</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2.5 text-xs text-burgundy font-bold outline-none"
            >
              <option value="instagram">إنستغرام (Instagram Ads / Bio)</option>
              <option value="tiktok">تيك توك (TikTok Ads)</option>
              <option value="facebook">فيسبوك (Facebook Ads)</option>
              <option value="whatsapp">واتساب (WhatsApp Campaign)</option>
            </select>
          </div>

          {/* Campaign Name */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1">اسم الحملة (بدون مسافات):</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="مثال: summer_drop_2026"
              className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2.5 text-xs text-burgundy font-mono outline-none"
            />
          </div>

          {/* Target Page */}
          <div>
            <label className="text-xs font-bold text-burgundy block mb-1">مسار الصفحة (اختياري):</label>
            <input
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="مثال: /shop أو اتركه للرئيسية"
              className="w-full rounded-xl border border-burgundy/20 bg-white px-3 py-2.5 text-xs text-burgundy font-mono outline-none"
            />
          </div>
        </div>

        {/* Output Box */}
        <div className="rounded-xl bg-[#2A050E] p-3.5 text-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-inner">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-amber-300 font-bold block mb-0.5">الرابط الإعلاني المولد:</span>
            <p className="font-mono text-xs text-white/90 truncate select-all">{generatedUrl}</p>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-burgundy font-black text-xs px-5 py-2.5 shadow active:scale-95 transition shrink-0 flex items-center justify-center gap-1.5"
          >
            <span>{copiedLink ? '✓' : 'نسخ'}</span>
            <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ الرابط للإعلان'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
