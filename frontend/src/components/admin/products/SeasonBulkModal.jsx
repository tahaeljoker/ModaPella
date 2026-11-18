import React from 'react';
import { Icon } from '../../Icon';

export default function SeasonBulkModal({
  isOpen,
  targetSeason,
  bulkLoading,
  onConfirm,
  onClose
}) {
  if (!isOpen || !targetSeason) return null;

  const isWinter = targetSeason === 'winter';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl space-y-4 text-burgundy"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
            <Icon name={isWinter ? 'snowflake' : 'sun'} className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {isWinter ? 'تأكيد التحويل للموسم الشتوي' : 'تأكيد التحويل للموسم الصيفي'}
            </h3>
            <p className="text-xs text-burgundy/60 mt-0.5">
              {isWinter
                ? 'سيتم تجميد وتخزين كل البضاعة الصيفية، وتنشيط كل البضاعة الشتوية.'
                : 'سيتم تنشيط وإظهار كل البضاعة الصيفية، وتخزين البضاعة الشتوية.'}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-[#F7F0EC] rounded-2xl text-xs space-y-2 text-burgundy/80">
          <p className="font-bold text-burgundy flex items-center gap-1.5">
            <span>ضمانات حفظ البيانات والمخزون:</span>
          </p>
          <p>• لن يتم مسح أي صنف، كل الكميات وأسعار التكلفة والأكواد (SKU) محفوظة 100%.</p>
          <p>• بضاعة الصيف ستختفي من شاشة الجرد والكاشير لتجنب التشتت أثناء جرد الشتوي.</p>
          <p>• أصناف طوال العام (الأساسية) ستظل متاحة في كل الأحوال.</p>
          <p>• يمكنك التبديل والرجوع في أي وقت بنقرة واحدة.</p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={bulkLoading}
            className={`flex-1 py-3 rounded-xl text-xs font-bold text-white transition shadow-md ${
              isWinter
                ? 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
            }`}
          >
            {bulkLoading ? 'جاري التحويل...' : 'نعم، قم بالتحويل الآن'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={bulkLoading}
            className="px-5 py-3 rounded-xl border border-burgundy/20 text-xs font-semibold text-burgundy hover:bg-burgundy/5 transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
