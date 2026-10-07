import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function WhatsAppWidget({ whatsappNumber = '201090048832' }) {
  const location = useLocation();
  const [isBubbleOpen, setIsBubbleOpen] = useState(false);
  const [hasDismissed, setHasDismissed] = useState(false);

  // Position higher on mobile Product Details to avoid mobile sticky bottom bar
  const isProductPage = location.pathname.startsWith('/product/');

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem('modapella_wa_dismissed');
    if (dismissed) {
      setHasDismissed(true);
      return;
    }

    // Auto-open welcome bubble after 7 seconds
    const timer = setTimeout(() => {
      setIsBubbleOpen(true);
    }, 7000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismissBubble = (e) => {
    e.stopPropagation();
    setIsBubbleOpen(false);
    setHasDismissed(true);
    sessionStorage.setItem('modapella_wa_dismissed', '1');
  };

  const cleanPhone = String(whatsappNumber).replace(/[^0-9]/g, '');
  const greetingText = encodeURIComponent('أهلاً ModaPella، حابة استفسر عن تفاصيل الموديلات والتوصيل.');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${greetingText}`;

  return (
    <div
      dir="rtl"
      className={`fixed z-40 transition-all duration-300 float-gentle ${
        isProductPage ? 'bottom-20 sm:bottom-6' : 'bottom-5 sm:bottom-6'
      } right-4 sm:right-6`}
    >
      {/* ── Welcome Chat Bubble ── */}
      {isBubbleOpen && (
        <div className="mb-3 max-w-[290px] sm:max-w-[320px] rounded-2xl sm:rounded-3xl border border-burgundy/15 bg-white/95 backdrop-blur-md p-4 shadow-2xl transition-all duration-300 animate-slide-up text-right">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-burgundy/10">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm text-base">
                
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-burgundy">خدمة عملاء ModaPella</p>
                <p className="text-[10px] text-emerald-600 font-medium">متواجدون للمساعدة الآن</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissBubble}
              className="text-burgundy/40 hover:text-burgundy p-1 text-xs leading-none transition cursor-pointer"
              aria-label="إغلاق التنبيه"
            >
              ✕
            </button>
          </div>

          {/* Message Body */}
          <p className="text-xs text-burgundy/80 leading-relaxed">
            أهلاً بكِ في <strong className="text-burgundy">ModaPella</strong>! محتاجة مساعدة في اختيار المقاس أو أي استفسار عن الموديلات؟
          </p>

          {/* Action Button */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsBubbleOpen(false)}
            className="mt-3 flex items-center justify-center gap-2 w-full rounded-xl sm:rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white py-2.5 px-3 text-xs font-bold shadow-md transition-transform active:scale-95"
          >
            <span>بدء المحادثة على واتساب</span>
            
          </a>
        </div>
      )}

      {/* ── Floating Pulsing WhatsApp Button ── */}
      <div className="relative group">
        {/* Radar ping animation behind button */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />

        {/* Unread message badge if bubble is closed and not dismissed */}
        {!isBubbleOpen && !hasDismissed && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-md animate-bounce z-10">
            1
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (isBubbleOpen) {
              window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
            } else {
              setIsBubbleOpen(true);
            }
          }}
          className="flex h-14 w-14 sm:h-15 sm:w-15 items-center justify-center rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer relative"
          title="تواصل معنا عبر واتساب"
          aria-label="تواصل معنا عبر واتساب"
        >
          <svg className="h-7 w-7 sm:h-8 sm:w-8 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.5-5.739-1.446L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436.002 9.858-4.419 9.862-9.86.002-2.636-1.023-5.112-2.885-6.978C16.582 1.9 14.116.877 11.478.875c-5.442 0-9.866 4.42-9.87 9.861a9.814 9.814 0 001.492 5.161l-1.018 3.714 3.812-.999c1.637.893 3.167 1.362 4.155 1.362zm10.963-7.405c-.247-.124-1.462-.72-1.687-.801-.225-.082-.388-.124-.55.125-.162.247-.631.801-.773.962-.143.162-.285.182-.532.058-.247-.124-1.043-.383-1.987-1.227-.734-.654-1.229-1.462-1.373-1.711-.143-.247-.015-.38.109-.503.111-.11.247-.285.37-.428.123-.143.165-.244.247-.409.082-.165.041-.309-.021-.433-.062-.124-.55-1.326-.753-1.815-.198-.479-.399-.413-.55-.421-.143-.008-.306-.01-.47-.01-.162 0-.427.061-.65.309-.225.247-.856.837-.856 2.037s.872 2.358.995 2.524c.123.165 1.716 2.62 4.156 3.673.58.25 1.033.4 1.385.512.583.185 1.114.159 1.533.096.467-.069 1.462-.598 1.666-1.173.205-.576.205-1.071.143-1.173-.062-.102-.224-.165-.471-.289z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
