import { useEffect, useState } from 'react';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

function EmployeeFinances() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/employees/me/adjustments')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-burgundy/40">
        <p className="text-5xl">💸</p>
        <p className="font-bold mt-2">لا توجد بيانات متاحة</p>
      </div>
    );
  }

  const { adjustments, totalRewards, totalDiscounts, netBalance } = data;

  return (
    <div className="space-y-6 text-burgundy text-right" dir="rtl">
      <div>
        <p className="text-xs uppercase tracking-widest text-burgundy/50">الحساب المالي</p>
        <h2 className="text-2xl font-bold mt-1">💸 مكافآتي وخصوماتي</h2>
        <p className="text-sm text-burgundy/60 mt-0.5">سجل بجميع التسويات المالية والخصومات والمكافآت الاستثنائية الصادرة لك</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/50 p-6 text-center shadow-soft">
          <span className="text-2xl">🎁</span>
          <p className="text-xs text-emerald-700 font-bold mt-1">إجمالي المكافآت</p>
          <p className="text-2xl font-extrabold text-emerald-800 mt-2">{EGP(totalRewards)}</p>
        </div>

        <div className="rounded-[2rem] border border-red-100 bg-red-50/50 p-6 text-center shadow-soft">
          <span className="text-2xl">📉</span>
          <p className="text-xs text-red-600 font-bold mt-1">إجمالي الخصومات</p>
          <p className="text-2xl font-extrabold text-red-700 mt-2">{EGP(totalDiscounts)}</p>
        </div>

        <div className="rounded-[2rem] bg-burgundy p-6 text-center text-white shadow-lg shadow-burgundy/10">
          <span className="text-2xl">⚖️</span>
          <p className="text-xs opacity-75 font-bold mt-1">صافي الرصيد المالي</p>
          <p className="text-2xl font-extrabold mt-2">
            {netBalance >= 0 ? `+${EGP(netBalance)}` : `-${EGP(Math.abs(netBalance))}`}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white p-6 shadow-soft space-y-4">
        <h3 className="font-bold text-lg mb-4 border-b border-burgundy/10 pb-3">📋 كشف حركة التسويات</h3>
        {adjustments.length === 0 ? (
          <div className="text-center py-10 text-burgundy/40">
            <span className="text-4xl">✨</span>
            <p className="text-sm mt-2">لا توجد تسويات مسجلة في حسابك حتى الآن</p>
          </div>
        ) : (
          <div className="divide-y divide-burgundy/5">
            {adjustments.map((adj) => (
              <div key={adj._id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${adj.type === 'reward' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {adj.type === 'reward' ? 'مكافأة' : 'خصم'}
                    </span>
                    <span className="font-semibold text-sm">{adj.reason}</span>
                  </div>
                  <p className="text-[10px] text-burgundy/40 mt-1">
                    التاريخ: {new Date(adj.date).toLocaleDateString('ar-EG-u-nu-latn')}
                  </p>
                </div>
                <span className={`text-base font-extrabold ${adj.type === 'reward' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {adj.type === 'reward' ? `+${EGP(adj.amount)}` : `-${EGP(adj.amount)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeFinances;
