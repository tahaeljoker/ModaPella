import { useState, useRef, useEffect } from 'react';

/**
 * InfoPopover — يعرض شرح تفصيلي لأي رقم مالي عند الضغط على أيقونة ⓘ
 *
 * Props:
 *  - title:   string — اسم المقياس
 *  - formula: string — المعادلة المختصرة
 *  - rows:    Array<{ label, value, highlight?, negative?, separator? }> — خطوات الحساب
 *  - note:    string? — ملاحظة اختيارية
 *  - side:    'right'|'left'? — جهة ظهور الـ popover (default: 'right')
 */
export default function InfoPopover({ title, formula, rows = [], note, side = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center" style={{ verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`
          ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold
          transition-all duration-150 select-none
          ${open
            ? 'bg-burgundy text-white shadow-md'
            : 'bg-burgundy/10 text-burgundy hover:bg-burgundy/20'}
        `}
        title="اضغط لمعرفة كيف جاء هذا الرقم"
        aria-label="معلومات عن حساب هذا الرقم"
      >
        ⓘ
      </button>

      {open && (
        <div
          className={`
            absolute z-50 w-72 rounded-2xl border border-burgundy/20 bg-white shadow-2xl
            text-right
            ${side === 'left' ? 'right-0' : 'left-0'}
            top-6
          `}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="rounded-t-2xl bg-burgundy px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">كيف تم حساب هذا الرقم؟</p>
            <p className="mt-0.5 text-sm font-bold text-white">{title}</p>
          </div>

          {formula && (
            <div className="mx-3 mt-3 rounded-xl bg-burgundy/5 px-3 py-2 text-center">
              <p className="text-[11px] font-semibold text-burgundy/80">{formula}</p>
            </div>
          )}

          {rows.length > 0 && (
            <div className="mx-3 mt-3 mb-1 space-y-1">
              {rows.map((row, i) => {
                if (row.separator) {
                  return <div key={i} className="my-2 border-t border-dashed border-burgundy/15" />;
                }
                return (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-lg px-2 py-1.5 text-xs ${
                      row.highlight
                        ? 'bg-burgundy text-white font-bold rounded-xl'
                        : 'text-burgundy/80'
                    }`}
                  >
                    <span className={row.highlight ? 'text-white/80' : 'text-burgundy/60'}>{row.label}</span>
                    <span className={`font-bold tabular-nums ${
                      row.negative ? 'text-rose-400' : row.highlight ? 'text-white' : 'text-burgundy'
                    }`}>
                      {row.value}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {note && (
            <div className="mx-3 mb-3 mt-2 rounded-xl bg-amber-50 px-3 py-2 border border-amber-200/60">
              <p className="text-[10px] text-amber-800 leading-relaxed">
                <span className="font-bold">⚠ ملاحظة: </span>{note}
              </p>
            </div>
          )}

          <div className="border-t border-burgundy/8 px-3 pb-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-xl bg-burgundy/5 py-1.5 text-xs font-semibold text-burgundy hover:bg-burgundy/10 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
