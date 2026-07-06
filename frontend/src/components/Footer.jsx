import React from 'react';
import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="mt-12 border-t border-burgundy/10 bg-white py-10">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h4 className="font-semibold">ModaPella</h4>
            <p className="mt-2 text-sm text-burgundy/70">أحدث القطع النسائية، مصممة للراحة والأناقة اليومية.</p>
          </div>
          <div>
            <h4 className="font-semibold">روابط سريعة</h4>
            <ul className="mt-2 space-y-2 text-sm text-burgundy/75">
              <li><Link to="/" className="hover:text-burgundy">الرئيسية</Link></li>
              <li><Link to="/shop" className="hover:text-burgundy">المتجر</Link></li>
              <li><Link to="/about" className="hover:text-burgundy">من نحن</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">تسوق الآن</h4>
            <ul className="mt-2 space-y-2 text-sm text-burgundy/75">
              <li><Link to="/shop" className="hover:text-burgundy">المتجر الكامل</Link></li>
              <li><Link to="/collections" className="hover:text-burgundy">المجموعات</Link></li>
              <li><Link to="/cart" className="hover:text-burgundy">السلة</Link></li>
              <li><Link to="/payment" className="hover:text-burgundy">الدفع</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">تواصل معنا</h4>
            <p className="mt-2 text-sm text-burgundy/75">info@modapella.com</p>
            <p className="mt-1 text-sm text-burgundy/75">+966 5X XXX XXXX</p>
            <p className="mt-3 max-w-[16rem] text-sm text-burgundy/75">اضغطي على أي منتج لرؤية صفحة التفاصيل مع المقاسات والألوان والكمية.</p>
            <div className="mt-3 flex gap-3">
              <div className="h-8 w-8 rounded-full bg-burgundy/10" />
              <div className="h-8 w-8 rounded-full bg-burgundy/10" />
              <div className="h-8 w-8 rounded-full bg-burgundy/10" />
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-burgundy/8 pt-6 text-center text-sm text-burgundy/60">© {new Date().getFullYear()} ModaPella — جميع الحقوق محفوطة.</div>
      </div>
    </footer>
  );
}

export default Footer;
