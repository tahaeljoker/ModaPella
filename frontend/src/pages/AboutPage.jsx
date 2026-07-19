import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function AboutPage() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get('/admin/site-config')
      .then(res => setConfig(res.data))
      .catch(() => setConfig(null));
  }, []);

  const phone = config?.storePhone || '01090048832';
  const address = config?.storeAddress || 'شارع الإعدادية بنات، بني مزار، المنيا';
  const about = config?.aboutText || 'محل أزياء نسائي في قلب بني مزار، بنقدم فيه أحدث الموديلات العصرية بأسعار كويسة. تصفحي أونلاين واطلبي، أو تعالي المحل وشوفي القطع على عينك.';
  const waPhone = `2${phone.replace(/[^0-9]/g, '').replace(/^0/, '')}`;

  return (
    <section className="space-y-6 sm:space-y-10 py-4 sm:py-10 text-burgundy" dir="rtl">

      {/* Header */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-burgundy/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-burgundy">
              ModaPella
              <span className="block h-2 w-2 rounded-full bg-burgundy animate-pulse" />
            </span>
            <h1 className="mt-4 text-2xl sm:text-4xl font-bold text-burgundy leading-snug">تواصل معنا</h1>
            <p className="mt-3 max-w-xl text-sm sm:text-base leading-7 sm:leading-8 text-burgundy/75">
              {about}
            </p>
          </div>
          <div className="flex-shrink-0 w-full lg:w-52">
            <div className="relative overflow-hidden rounded-[2rem] bg-burgundy/5 aspect-square flex items-center justify-center">
              <div className="text-center p-4 space-y-2">
                <div className="text-6xl">🏪</div>
                <p className="text-base font-bold text-burgundy">ModaPella</p>
                <p className="text-xs text-burgundy/60">بني مزار — المنيا</p>
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">● مفتوح الآن</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Location */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-beige/10 p-6 sm:p-8 shadow-soft space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-burgundy/10 text-2xl">📍</div>
          <h2 className="text-base sm:text-lg font-bold">العنوان</h2>
          <p className="text-sm text-burgundy/75 leading-7">{address}</p>
        </div>

        {/* Phone */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 sm:p-8 shadow-soft space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-burgundy/10 text-2xl">📞</div>
          <h2 className="text-base sm:text-lg font-bold">رقم الهاتف</h2>
          <p className="text-sm text-burgundy/75 font-mono">{phone}</p>
          <a
            href={`tel:${phone}`}
            className="inline-block rounded-full border border-burgundy px-4 py-2 text-xs font-bold text-burgundy transition hover:bg-burgundy/5"
          >
            اتصل الآن
          </a>
        </div>

        {/* WhatsApp */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-emerald-50 p-6 sm:p-8 shadow-soft space-y-3 sm:col-span-2 lg:col-span-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">💬</div>
          <h2 className="text-base sm:text-lg font-bold">واتساب</h2>
          <p className="text-sm text-burgundy/75">كلمينا على واتساب وهنرد عليكِ بسرعة</p>
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 shadow"
          >
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z" />
            </svg>
            تواصل عبر واتساب
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 sm:p-10 shadow-soft text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold">مستنياكِ في المحل 🎀</h2>
        <p className="text-sm text-burgundy/70 max-w-md mx-auto leading-7">
          تصفحي الكتالوج اونلاين واطلبي، أو تعالي شوفي القطع على عينك في {address}.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center justify-center rounded-full bg-burgundy px-8 py-3 text-sm font-bold text-white transition hover:bg-[#650018] shadow"
        >
          تسوقي الآن
        </Link>
      </div>

    </section>
  );
}

export default AboutPage;
