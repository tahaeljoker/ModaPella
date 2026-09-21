import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * InfoPopover — يعرض نافذة مركزية وشرحاً تفصيلياً لأي رقم مالي عند الضغط على أيقونة الاستفهام (?)
 *
 * Props:
 * - title: string — اسم المقياس
 * - formula: string — المعادلة المختصرة
 * - rows: Array<{ label, value, highlight?, negative?, separator? }> — خطوات الحساب
 * - note: string? — ملاحظة توضيحية
 */
export default function InfoPopover({ title, formula, rows = [], note }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`
          ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold
          transition-all duration-200 select-none shadow-sm cursor-pointer
          ${open
            ? 'bg-burgundy text-white ring-2 ring-burgundy/30 scale-110'
            : 'bg-burgundy/10 text-burgundy hover:bg-burgundy hover:text-white hover:scale-110'}
        `}
        title="اضغط لمعرفة كيف تم حساب هذا الرقم"
        aria-label="تفاصيل حساب هذا الرقم"
      >
        ?
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          dir="rtl"
        >
          {/* Modal Container */}
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-burgundy/20 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-burgundy via-[#8B1A24] to-burgundy px-6 py-5 text-white flex items-start justify-between relative shadow-md">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                  <span>📊</span> كيف تم حساب هذا الرقم؟
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-white tracking-tight">{title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full h-8 w-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer text-sm font-bold"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6 space-y-4">
              {/* Formula Badge */}
              {formula && (
                <div className="rounded-2xl bg-[#F7F0EC]/80 border border-burgundy/15 p-3.5 text-center">
                  <p className="text-[11px] font-bold text-burgundy/70 mb-1">المعادلة المحاسبية المعتمدة</p>
                  <p className="text-xs sm:text-sm font-bold text-burgundy leading-relaxed">{formula}</p>
                </div>
              )}

              {/* Breakdown Rows */}
              {rows.length > 0 && (
                <div className="rounded-2xl border border-burgundy/10 bg-white p-3 space-y-2 shadow-sm">
                  {rows.map((row, i) => {
                    if (row.separator) {
                      return <div key={i} className="my-2 border-t border-dashed border-burgundy/20" />;
                    }

                    if (row.highlight) {
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-burgundy px-4 py-2.5 text-white shadow-sm font-bold text-sm"
                        >
                          <span className="text-white/90">{row.label}</span>
                          <span className="text-base tabular-nums font-mono text-white tracking-wide">
                            {row.value}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm transition-colors ${
                          row.negative
                            ? 'bg-rose-50/70 text-rose-900 border border-rose-100/60'
                            : 'hover:bg-burgundy/[0.03] text-gray-700'
                        }`}
                      >
                        <span className={`font-medium ${row.negative ? 'text-rose-900 font-semibold' : 'text-gray-600'}`}>
                          {row.label}
                        </span>
                        <span
                          className={`font-bold tabular-nums font-mono ${
                            row.negative ? 'text-rose-700 text-sm' : 'text-burgundy'
                          }`}
                        >
                          {row.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Accounting Note */}
              {note && (
                <div className="rounded-2xl bg-amber-50/90 border border-amber-200/80 p-4">
                  <div className="flex items-start gap-2 text-amber-900">
                    <span className="text-base leading-none">💡</span>
                    <div className="text-xs leading-relaxed">
                      <span className="font-bold text-amber-950">إيضاح مالي: </span>
                      <span className="text-amber-900/90">{note}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-burgundy/10 bg-gray-50/60 px-6 py-3.5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto px-6 py-2 rounded-xl bg-burgundy text-white text-xs sm:text-sm font-bold hover:bg-burgundy/90 transition-all shadow-sm cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
