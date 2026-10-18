import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Icon } from './Icon';

function Footer() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    api.get('/admin/site-config')
      .then(res => setConfig(res.data))
      .catch(() => setConfig(null));
  }, []);

  const address = config?.storeAddress || 'شارع الإعدادية بنات، بني مزار، المنيا';
  const phone = config?.storePhone || '01090048832';
  const whatsapp = config?.whatsappNumber || '201090048832';
  const instagram = config?.instagramUrl || 'https://www.instagram.com/moda_pella?obrf=NTRsYWI3MXpuZXNm';
  const facebook = config?.facebookUrl || 'https://www.facebook.com/share/1HdfNYn5QX/';
  const tiktok = config?.tiktokUrl || 'https://www.tiktok.com/@moda.pella?_r=1&_t=ZS-9AfaJHoDzJk';

  return (
    <footer className="mt-12 border-t border-burgundy/10 bg-white py-10" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-semibold text-base sm:text-lg text-burgundy">ModaPella</h4>
            <p className="mt-2 text-sm text-burgundy/70 leading-relaxed">أحدث القطع النسائية، مصممة للراحة والأناقة اليومية.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-burgundy">روابط سريعة</h4>
            <ul className="mt-2 space-y-2 text-sm text-burgundy/75">
              <li><Link to="/" className="hover:text-burgundy transition">الرئيسية</Link></li>
              <li><Link to="/shop" className="hover:text-burgundy transition">المتجر</Link></li>
              <li><Link to="/about" className="hover:text-burgundy transition">تواصل معنا</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base text-burgundy">تسوق الآن</h4>
            <ul className="mt-2 space-y-2 text-sm text-burgundy/75">
              <li><Link to="/shop" className="hover:text-burgundy transition">المتجر الكامل</Link></li>
              <li><Link to="/collections" className="hover:text-burgundy transition">المجموعات</Link></li>
              <li><Link to="/payment" className="hover:text-burgundy transition">الدفع</Link></li>
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-semibold text-sm sm:text-base text-burgundy">تواصل معنا</h4>
            <p className="mt-2 text-sm text-burgundy/75">{address}</p>
            <p className="mt-1 text-sm text-burgundy/75 font-mono" dir="ltr">{phone}</p>
            <div className="mt-3 flex items-center gap-2">
              <a
                href={instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy/5 text-burgundy hover:bg-[#dc2743] hover:text-white transition shadow-sm"
                title="Instagram"
              >
                <Icon name="instagram" className="w-4 h-4" />
              </a>
              <a
                href={tiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy/5 text-burgundy hover:bg-black hover:text-white transition shadow-sm"
                title="TikTok"
              >
                <Icon name="tiktok" className="w-4 h-4" />
              </a>
              <a
                href={facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy/5 text-burgundy hover:bg-[#1877F2] hover:text-white transition shadow-sm"
                title="Facebook"
              >
                <Icon name="facebook" className="w-4 h-4" />
              </a>
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy/5 text-burgundy hover:bg-[#25D366] hover:text-white transition shadow-sm"
                title="WhatsApp"
              >
                <Icon name="whatsapp" className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-burgundy/8 pt-6 text-center text-xs sm:text-sm text-burgundy/60">
          © {new Date().getFullYear()} ModaPella — جميع الحقوق محفوظة. | تم التطوير بواسطة{' '}
          <a
            href="https://wa.me/201143632650"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-burgundy font-bold transition"
          >
            طه أنس
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
