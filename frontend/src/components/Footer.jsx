import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

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

  return (
    <footer className="mt-12 border-t border-burgundy/10 bg-white py-10">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-semibold text-base sm:text-lg">ModaPella</h4>
            <p className="mt-2 text-sm text-burgundy/70 leading-relaxed">أحدث القطع النسائية، مصممة للراحة والأناقة اليومية.</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base">روابط سريعة</h4>
            <ul className="mt-2 space-y-2 text-sm text-burgundy/75">
              <li><Link to="/" className="hover:text-burgundy">الرئيسية</Link></li>
              <li><Link to="/shop" className="hover:text-burgundy">المتجر</Link></li>
              <li><Link to="/about" className="hover:text-burgundy">تواصل معنا</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base">تسوق الآن</h4>
            <ul className="mt-2 space-y-2 text-sm text-burgundy/75">
              <li><Link to="/shop" className="hover:text-burgundy">المتجر الكامل</Link></li>
              <li><Link to="/collections" className="hover:text-burgundy">المجموعات</Link></li>
              <li><Link to="/payment" className="hover:text-burgundy">الدفع</Link></li>
            </ul>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <h4 className="font-semibold text-sm sm:text-base">تواصل معنا</h4>
            <p className="mt-2 text-sm text-burgundy/75">{address}</p>
            <p className="mt-1 text-sm text-burgundy/75">{phone}</p>
            <a
              href={`https://wa.me/${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:underline"
            >
              💬 واتساب
            </a>
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
