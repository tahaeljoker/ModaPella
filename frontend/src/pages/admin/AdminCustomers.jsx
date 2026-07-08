import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Edit / Delete states
  const [editModal, setEditModal] = useState(null); // { oldPhone, oldName, newPhone, newName }
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const loadCustomers = () => {
    setLoading(true);
    api.get('/admin/customers')
      .then(res => setCustomers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put('/admin/customers/update', {
        oldPhone: editModal.oldPhone,
        oldName: editModal.oldName,
        newPhone: editModal.newPhone,
        newName: editModal.newName
      });
      setEditModal(null);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (err) {
      alert('فشل تحديث بيانات العميل');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.post('/admin/customers/delete', {
        phone: customerToDelete.phone,
        name: customerToDelete.name
      });
      setIsDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      setSelectedCustomer(null);
      loadCustomers();
    } catch (err) {
      alert('فشل حذف العميل');
    }
  };

  const getVipBadge = (index, totalSpent) => {
    if (index === 0) return { text: '👑 VIP الأول', style: 'bg-amber-100 text-amber-800 border-amber-300 border' };
    if (index === 1) return { text: '🥈 VIP الثاني', style: 'bg-slate-100 text-slate-800 border-slate-300 border' };
    if (index === 2) return { text: '🥉 VIP الثالث', style: 'bg-orange-100 text-orange-800 border-orange-300 border' };
    if (totalSpent >= 5000) return { text: '💎 VIP عميل مميز', style: 'bg-emerald-50 text-emerald-700 border-emerald-200 border' };
    return null;
  };

  const inputCls = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none focus:border-burgundy';

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
                  {filtered.map((c) => {
                    const globalIndex = customers.findIndex(cust => cust.phone === c.phone && cust.name === c.name);
                    const badge = getVipBadge(globalIndex, c.totalSpent);
                    return (
                      <tr
                        key={c.phone + c.name}
                        onClick={() => setSelectedCustomer({ ...c, rankBadge: badge })}
                        className={`border-b border-burgundy/5 last:border-0 cursor-pointer transition ${
                          selectedCustomer?.phone === c.phone ? 'bg-burgundy/5' : 'hover:bg-burgundy/3'
                        }`}
                      >
                        <td className="py-3 px-5 font-bold text-burgundy">
                          <div className="flex items-center gap-2">
                            <span>{c.name}</span>
                            {badge && (
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.style}`}>
                                {badge.text}
                              </span>
                            )}
                          </div>
                        </td>
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
                    );
                  })}
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
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                      {selectedCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold flex items-center gap-2">
                        <span>{selectedCustomer.name}</span>
                        {selectedCustomer.rankBadge && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${selectedCustomer.rankBadge.style}`}>
                            {selectedCustomer.rankBadge.text}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm opacity-80 font-mono mt-1">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => setEditModal({
                        oldPhone: selectedCustomer.phone,
                        oldName: selectedCustomer.name,
                        newPhone: selectedCustomer.phone,
                        newName: selectedCustomer.name
                      })}
                      className="rounded-xl bg-white/25 hover:bg-white/35 px-3 py-1 text-xs font-bold transition flex items-center gap-1 justify-center"
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      onClick={() => {
                        setCustomerToDelete(selectedCustomer);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="rounded-xl bg-red-600/50 hover:bg-red-600/70 px-3 py-1 text-xs font-bold transition flex items-center gap-1 justify-center"
                    >
                      🗑️ حذف
                    </button>
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
                {selectedCustomer.orders.map((order) => (
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

      {/* Edit Customer Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-6 shadow-2xl text-burgundy text-right" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-bold">✏️ تعديل بيانات العميل</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الاسم</label>
                <input
                  type="text"
                  required
                  value={editModal.newName}
                  onChange={e => setEditModal({ ...editModal, newName: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رقم الهاتف</label>
                <input
                  type="text"
                  required
                  value={editModal.newPhone}
                  onChange={e => setEditModal({ ...editModal, newPhone: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018]">حفظ</button>
                <button type="button" onClick={() => setEditModal(null)} className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium transition hover:bg-burgundy/10">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation */}
      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="حذف العميل"
        message={`هل أنت متأكد من حذف العميل "${customerToDelete?.name}"؟ سيتم الاحتفاظ بإحصائيات المبيعات، ولكن سيتم إزالة اسم العميل ورقم هاتفه من جميع فواتيره السابقة.`}
        confirmText="نعم، حذف بيانات العميل"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
      />
    </div>
  );
}

export default AdminCustomers;
