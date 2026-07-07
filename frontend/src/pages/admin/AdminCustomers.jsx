import { useEffect, useState } from 'react';
import api from '../../services/api';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    api.get('/admin/customers')
      .then(res => setCustomers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/50">لوحة التحكم</p>
          <h2 className="mt-1 text-3xl font-bold">👥 العملاء</h2>
          <p className="mt-1 text-sm text-burgundy/60">
            سجل مشتريات العملاء وتاريخ طلباتهم
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-burgundy/10">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-burgundy/50">إجمالي العملاء</p>
            <p className="font-bold">{customers.length} عميل</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث باسم العميل أو رقم الهاتف..."
          className="w-full max-w-md rounded-2xl border border-burgundy/20 bg-white px-5 py-3 text-sm outline-none transition focus:border-burgundy focus:shadow-sm"
        />
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Customers List */}
        <div className="lg:col-span-2 rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-burgundy/40">
              <span className="text-4xl">🔍</span>
              <p className="text-sm">لا يوجد عملاء بهذا الاسم أو الرقم</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-burgundy/8 bg-burgundy/5">
                    <th className="py-4 px-5 font-semibold text-burgundy/70">العميل</th>
                    <th className="py-4 px-5 font-semibold text-burgundy/70">رقم الهاتف</th>
                    <th className="py-4 px-5 font-semibold text-burgundy/70">إجمالي المشتريات</th>
                    <th className="py-4 px-5 font-semibold text-burgundy/70">عدد الطلبات</th>
                    <th className="py-4 px-5 font-semibold text-burgundy/70">آخر طلب</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr
                      key={c.phone + c.name}
                      onClick={() => setSelectedCustomer(c)}
                      className={`border-b border-burgundy/5 last:border-0 cursor-pointer transition ${
                        selectedCustomer?.phone === c.phone ? 'bg-burgundy/5' : 'hover:bg-burgundy/3'
                      }`}
                    >
                      <td className="py-3 px-5 font-bold text-burgundy">{c.name}</td>
                      <td className="py-3 px-5 font-mono text-xs">{c.phone}</td>
                      <td className="py-3 px-5 font-extrabold text-emerald-700">{EGP(c.totalSpent)}</td>
                      <td className="py-3 px-5">
                        <span className="rounded-lg bg-burgundy/10 px-2 py-1 font-bold text-burgundy">
                          {c.ordersCount}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-xs text-burgundy/50">
                        {new Date(c.lastOrderDate).toLocaleDateString('ar-EG')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Customer Details Panel */}
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden sticky top-6">
          {selectedCustomer ? (
            <div className="flex flex-col h-[calc(100vh-140px)]">
              {/* Header */}
              <div className="bg-burgundy p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                    {selectedCustomer.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedCustomer.name}</h3>
                    <p className="text-sm opacity-80 font-mono mt-1">{selectedCustomer.phone}</p>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex border-b border-burgundy/10 bg-[#F7F0EC]">
                <div className="flex-1 p-4 text-center border-l border-burgundy/10">
                  <p className="text-xs text-burgundy/50 font-bold mb-1">المدفوعات</p>
                  <p className="font-extrabold text-emerald-700">{EGP(selectedCustomer.totalSpent)}</p>
                </div>
                <div className="flex-1 p-4 text-center">
                  <p className="text-xs text-burgundy/50 font-bold mb-1">الطلبات</p>
                  <p className="font-extrabold text-burgundy">{selectedCustomer.ordersCount}</p>
                </div>
              </div>

              {/* Orders History */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <h4 className="font-bold text-sm text-burgundy/60 uppercase tracking-widest mb-3">سجل المشتريات (أخذ إيه؟)</h4>
                {selectedCustomer.orders.map((order, idx) => (
                  <div key={order.id} className="rounded-2xl border border-burgundy/10 bg-burgundy/5 p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-burgundy/50">
                        {new Date(order.date).toLocaleString('ar-EG')}
                      </span>
                      <span className="font-bold text-burgundy">{EGP(order.total)}</span>
                    </div>
                    <div className="space-y-2">
                      {order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-xs text-burgundy/50 mr-2">
                              {item.size ? `(${item.size})` : ''} {item.color ? `(${item.color})` : ''}
                            </span>
                          </div>
                          <span className="font-mono text-xs font-bold">{item.qty} x {item.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-center p-6 text-burgundy/40">
              <span className="text-5xl mb-4">👤</span>
              <p className="font-bold">اختر عميلاً من القائمة</p>
              <p className="text-sm mt-1">لعرض تفاصيل المشتريات والطلبات السابقة (ماذا اشترى)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminCustomers;
