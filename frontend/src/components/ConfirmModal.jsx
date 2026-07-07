import React from 'react';

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'تأكيد', cancelText = 'إلغاء', confirmColor = 'bg-red-600 hover:bg-red-700' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl" onClick={onCancel}>
      <div 
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl overflow-hidden transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${confirmColor.includes('red') ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-burgundy">{title}</h3>
          <p className="mt-2 text-sm text-burgundy/60 leading-relaxed">{message}</p>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-burgundy/20 py-3 text-sm font-bold text-burgundy/70 transition hover:bg-burgundy/5"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-lg transition active:scale-95 ${confirmColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
