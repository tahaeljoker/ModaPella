import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * ProtectedRoute — blocks access based on role.
 * Shows a styled "Access Denied" screen for wrong-role users instead of silent redirect.
 */
function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F0EC]" dir="rtl">
      <div className="w-full max-w-md rounded-[2rem] border border-burgundy/10 bg-white p-10 text-center shadow-xl">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <span className="text-4xl">🔒</span>
        </div>
        {/* Text */}
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-burgundy/40">خطأ 403</p>
        <h1 className="mt-2 text-2xl font-bold text-burgundy">غير مسموح بالدخول</h1>
        <p className="mt-3 text-sm leading-relaxed text-burgundy/60">
          هذه الصفحة مخصصة للمدير فقط.
          <br />
          حسابك (كاشير) لا يملك صلاحية الوصول إلى لوحة الإدارة.
        </p>
        {/* Divider */}
        <div className="my-6 border-t border-burgundy/10" />
        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate('/cashier')}
            className="w-full rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018]"
          >
            ← العودة إلى شاشة الكاشير
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('modapella_token');
              localStorage.removeItem('modapella_role');
              localStorage.removeItem('modapella_user');
              navigate('/login');
            }}
            className="w-full rounded-full border border-burgundy/20 py-3 text-sm font-medium text-burgundy/60 transition hover:bg-burgundy/5"
          >
            تسجيل الخروج والدخول بحساب آخر
          </button>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles = ['admin', 'cashier', 'manager'] }) {
  const token = localStorage.getItem('modapella_token');
  const role = localStorage.getItem('modapella_role');

  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles.length && !allowedRoles.includes(role)) {
    // Show a clear "Access Denied" screen instead of silent redirect
    return <AccessDenied />;
  }

  return children;
}

export default ProtectedRoute;
