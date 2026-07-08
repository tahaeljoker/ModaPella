import { useEffect, useState } from 'react';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('ar-EG')} ج.م`;
const DATE = (d) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

// ─── Employee Form Modal ───────────────────────────────────────────────────────
function EmployeeModal({ employee, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '', ...employee });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { alert(err.response?.data?.message || 'فشل الحفظ'); }
    finally { setLoading(false); }
  };

  const inp = 'w-full rounded-xl border border-burgundy/20 bg-white px-4 py-2.5 text-sm text-burgundy outline-none transition focus:border-burgundy';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-[2rem] bg-[#F7F0EC] p-7 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="mb-5 text-xl font-bold text-burgundy">{employee?._id ? 'تعديل موظف' : 'إضافة موظف جديد'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">الاسم *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} required placeholder="أحمد محمد" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">رقم الهاتف</label>
            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inp} placeholder="010..." dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-burgundy/60">ملاحظات</label>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={`${inp} min-h-[70px]`} placeholder="أي ملاحظات..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="flex-1 rounded-full bg-burgundy py-3 text-sm font-bold text-white transition hover:bg-[#650018] disabled:opacity-60">
              {loading ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={onClose} className="rounded-full border border-burgundy/20 px-6 py-3 text-sm font-medium text-burgundy transition hover:bg-burgundy/10">إلغاء</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Employee Stats Modal ──────────────────────────────────────────────────────
function EmployeeStatsModal({ employee, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    api.get(`/employees/${employee._id}/stats?${params}`)
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-burgundy text-white px-6 py-5">
          <p className="text-xs opacity-70 uppercase tracking-widest">إحصائيات المبيعات</p>
          <h3 className="text-xl font-bold mt-1">{employee.name}</h3>
          {employee.phone && <p className="text-xs opacity-60 mt-0.5">{employee.phone}</p>}
        </div>

        {/* Date filters */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-burgundy/10 bg-[#F7F0EC]">
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-burgundy/60 whitespace-nowrap">من:</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-sm text-burgundy outline-none focus:border-burgundy" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <label className="text-xs text-burgundy/60 whitespace-nowrap">إلى:</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="flex-1 rounded-xl border border-burgundy/20 bg-white px-3 py-1.5 text-sm text-burgundy outline-none focus:border-burgundy" />
          </div>
          <button onClick={load} className="rounded-xl bg-burgundy px-4 py-2 text-xs font-bold text-white hover:bg-[#650018] transition">بحث</button>
        </div>

        {/* Stats Cards */}
        {!loading && stats && (
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-burgundy/10">
            {[
              { label: 'إجمالي المبيعات', value: EGP(stats.totalSales), icon: '💰', cls: 'bg-burgundy text-white' },
              { label: 'عدد الفواتير', value: stats.count, icon: '🧾', cls: 'bg-emerald-50 border border-emerald-200' },
              { label: 'كاش', value: EGP(stats.cashSales), icon: '💵', cls: 'bg-white border border-burgundy/10' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-4 ${s.cls}`}>
                <p className={`text-xs font-semibold ${s.cls.includes('burgundy text-white') ? 'text-white/70' : 'text-burgundy/60'}`}>{s.icon} {s.label}</p>
                <p className={`text-xl font-extrabold mt-1 ${s.cls.includes('burgundy text-white') ? 'text-white' : s.cls.includes('emerald') ? 'text-emerald-800' : 'text-burgundy'}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
          ) : stats?.orders?.length === 0 ? (
            <p className="text-center text-sm text-burgundy/40 py-12">لا توجد مبيعات في هذه الفترة</p>
          ) : (
            <div className="space-y-2">
              {stats?.orders?.map(order => (
                <div key={order._id} className="flex items-center justify-between bg-[#F7F0EC] rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-sm text-burgundy">{order.items?.map(i => i.name).join('، ')}</p>
                    <p className="text-xs text-burgundy/50 mt-0.5">{new Date(order.createdAt).toLocaleString('ar-EG')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-burgundy">{EGP(order.totalAmount)}</p>
                    <p className="text-xs text-burgundy/50">{order.paymentMethod === 'Cash' ? '💵 كاش' : '📱 انستا'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-[#F7F0EC] border-t border-burgundy/10">
          <button onClick={onClose} className="w-full rounded-xl border border-burgundy/20 py-2.5 text-sm font-medium text-burgundy hover:bg-burgundy/10 transition">إغلاق</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
function AdminEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [statsEmp, setStatsEmp] = useState(null);
  const [toast, setToast] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { const r = await api.get('/employees/all'); setEmployees(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form) => {
    if (form._id) {
      await api.put(`/employees/${form._id}`, form);
      showToast('✅ تم تحديث الموظف');
    } else {
      await api.post('/employees', form);
      showToast('✅ تم إضافة الموظف');
    }
    await load();
  };

  const handleToggle = async (emp) => {
    await api.patch(`/employees/${emp._id}/toggle`);
    showToast(emp.active ? '⏸️ تم تعطيل الموظف' : '✅ تم تفعيل الموظف');
    await load();
  };

  const handleDelete = async () => {
    await api.delete(`/employees/${deleteId}`);
    showToast('✅ تم الحذف');
    setDeleteId(null);
    await load();
  };

  return (
    <div className="space-y-6 text-burgundy">
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">👤 الموظفون</h2>
          <p className="text-sm text-burgundy/50 mt-0.5">إدارة الموظفين وتتبع مبيعاتهم لحساب الكوميشن</p>
        </div>
        <button onClick={() => setModal({})} className="rounded-full bg-burgundy px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-burgundy/20 transition hover:bg-[#650018]">
          + إضافة موظف
        </button>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
      ) : employees.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">👤</p>
          <p className="text-lg font-semibold text-burgundy/40">لا يوجد موظفون بعد</p>
          <p className="text-sm text-burgundy/30 mt-1">أضف موظفيك لتتبع مبيعاتهم</p>
        </div>
      ) : (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_auto] gap-4 bg-[#F7F0EC] px-6 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
            <span>الموظف</span><span>رقم الهاتف</span><span>الحالة</span><span>الإجراءات</span>
          </div>
          <div className="divide-y divide-burgundy/6">
            {employees.map(emp => (
              <div key={emp._id} className={`grid sm:grid-cols-[1fr_1fr_1fr_auto] items-center gap-4 px-6 py-4 transition hover:bg-burgundy/3 ${!emp.active ? 'opacity-50' : ''}`}>
                <div>
                  <p className="font-semibold text-sm text-burgundy">{emp.name}</p>
                  {emp.notes && <p className="text-xs text-burgundy/40 mt-0.5">{emp.notes}</p>}
                </div>
                <p className="text-sm text-burgundy/60 font-mono">{emp.phone || '—'}</p>
                <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${emp.active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {emp.active ? '🟢 نشط' : '🔴 معطّل'}
                </span>
                <div className="flex gap-1.5">
                  <button onClick={() => setStatsEmp(emp)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">📊 مبيعات</button>
                  <button onClick={() => setModal(emp)} className="rounded-xl border border-burgundy/20 px-3 py-1.5 text-xs font-medium text-burgundy transition hover:bg-burgundy hover:text-white">تعديل</button>
                  <button onClick={() => handleToggle(emp)} className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${emp.active ? 'border-amber-200 text-amber-600 hover:bg-amber-500 hover:text-white' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-500 hover:text-white'}`}>
                    {emp.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <button onClick={() => setDeleteId(emp._id)} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500 hover:text-white">حذف</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {modal !== null && <EmployeeModal employee={modal?._id ? modal : null} onClose={() => setModal(null)} onSave={handleSave} />}
      {statsEmp && <EmployeeStatsModal employee={statsEmp} onClose={() => setStatsEmp(null)} />}
      <ConfirmModal
        isOpen={!!deleteId}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا الموظف؟ سيتم إزالته نهائياً."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

export default AdminEmployees;
