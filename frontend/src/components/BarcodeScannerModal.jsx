import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

function BarcodeScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [error, setError] = useState('');
  const [cameraPermission, setCameraPermission] = useState(true);
  const qrCodeInstance = useRef(null);
  const elementId = 'html5qrcode-scanner-viewport';

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setCameraPermission(true);

    // Initialize scanner after a tiny timeout to ensure element exists in DOM
    const t = setTimeout(() => {
      startScanner();
    }, 100);

    return () => {
      clearTimeout(t);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      const html5Qrcode = new Html5Qrcode(elementId);
      qrCodeInstance.current = html5Qrcode;

      const config = {
        fps: 10,
        qrbox: (width, height) => {
          // Responsive target frame
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size * 0.5 }; // wide rectangle suitable for 1D barcodes
        },
        aspectRatio: 1.0
      };

      await html5Qrcode.start(
        { facingMode: 'environment' }, // Default to back camera
        config,
        (decodedText) => {
          // Success
          onScanSuccess(decodedText);
          stopScanner();
          onClose();
        },
        (errorMessage) => {
          // Ignore parse errors as they trigger continuously during search
        }
      );
    } catch (err) {
      console.error('Camera start error:', err);
      if (err?.toString().includes('NotAllowedError') || err?.toString().includes('Permission denied')) {
        setCameraPermission(false);
      } else {
        setError('لا يمكن تشغيل الكاميرا. تأكد من إعطاء الصلاحية أو عدم تشغيلها في تطبيق آخر.');
      }
    }
  };

  const stopScanner = async () => {
    if (qrCodeInstance.current && qrCodeInstance.current.isScanning) {
      try {
        await qrCodeInstance.current.stop();
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        
        {/* Header */}
        <div className="bg-burgundy px-6 py-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <p className="font-bold text-sm">مسح الباركود بالكاميرا</p>
          </div>
          <button 
            onClick={() => { stopScanner().then(onClose); }} 
            className="text-white/60 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
          {cameraPermission ? (
            <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden border-2 border-burgundy/20 bg-slate-900">
              <div id={elementId} className="w-full h-full" />
              {/* Target Guide overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-[80%] h-[35%] border-2 border-dashed border-red-500 rounded-xl flex items-center justify-center">
                  <div className="w-full h-[2px] bg-red-500 animate-pulse" />
                </div>
                <p className="text-[10px] text-white/70 bg-black/60 px-3 py-1 rounded-full mt-3 font-semibold">ضع الباركود داخل المربع الأحمر</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4 space-y-3">
              <p className="text-4xl">🔒</p>
              <p className="font-bold text-red-600 text-sm">صلاحية الكاميرا مرفوضة</p>
              <p className="text-xs text-burgundy/60 leading-relaxed">يرجى السماح للمتصفح بالوصول إلى الكاميرا من إعدادات الموقع لتتمكن من مسح الأكواد.</p>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-xs text-red-600 text-center">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#F7F0EC] px-6 py-4 flex justify-center border-t border-burgundy/10">
          <button 
            onClick={() => { stopScanner().then(onClose); }} 
            className="rounded-xl border border-burgundy/20 px-6 py-2 text-xs font-semibold text-burgundy hover:bg-burgundy/5 transition"
          >
            إلغاء وإغلاق
          </button>
        </div>

      </div>
    </div>
  );
}

export default BarcodeScannerModal;
