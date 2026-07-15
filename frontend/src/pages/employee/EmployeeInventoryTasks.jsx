import { useState, useEffect } from 'react';
import api from '../../services/api';

const STATUS_LABEL = {
  pending: { label: 'معلق', color: 'bg-amber-100 text-amber-700', icon: '⏳' },
  submitted: { label: 'تم التسليم', color: 'bg-blue-100 text-blue-700', icon: '📤' },
  accepted: { label: 'مقبول', color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: '❌' },
};

// ─── Active Task Session ──────────────────────────────────────────────────────
function TaskSession({ task: initialTask, onBack }) {
  const [task, setTask] = useState(initialTask);
  const [items, setItems] = useState(initialTask.items.map(i => ({ ...i, _counted: i.countedStock ?? '' })));
  const [saving, setSaving] = useState(false);

  const handleUpdate = (id, val) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, _counted: val } : i));
  };

  const handleSubmit = async () => {
    if (!window.confirm('هل أنت متأكد من تسليم الجرد للمراجعة؟ لن تتمكن من تعديله بعد ذلك إلا إذا رفضه المدير.')) return;
    setSaving(true);
    try {
      const payload = items.map(i => ({ _id: i._id, countedStock: i._counted === '' ? null : Number(i._counted) }));
      const r = await api.put(`/inventory-tasks/${task._id}/submit`, { items: payload });
      setTask(r.data);
      setItems(r.data.items.map(i => ({ ...i, _counted: i.countedStock ?? '' })));
      alert('✅ تم تسليم الجرد للمراجعة بنجاح');
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء التسليم');
    } finally {
      setSaving(false);
    }
  };

  const countedCount = items.filter(i => i._counted !== '').length;
  const statusInfo = STATUS_LABEL[task.status] || STATUS_LABEL.pending;
  const isEditable = ['pending', 'rejected'].includes(task.status);

  return (
    <div className="space-y-5 text-burgundy" dir="rtl">
      <button onClick={onBack} className="text-sm text-burgundy/60 hover:text-burgundy flex items-center gap-1">← العودة للمهام</button>

      {/* Session Header */}
      <div className="rounded-[2rem] bg-burgundy text-white p-6 shadow-lg shadow-burgundy/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs opacity-70 uppercase tracking-widest">مهمة جرد</p>
            <h3 className="text-xl font-bold mt-1">{task.title}</h3>
            <p className="text-xs opacity-60 mt-0.5">
              كُلّفت بها بتاريخ {new Date(task.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${statusInfo.color} text-opacity-100`} style={{ color: 'inherit' }}>
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>

        {/* Rejection notes */}
        {task.status === 'rejected' && task.adminNotes && (
          <div className="mt-4 rounded-2xl bg-red-400/20 border border-red-300/30 px-4 py-3">
            <p className="text-xs font-bold text-red-100 mb-1">ملاحظات المدير (سبب الرفض):</p>
            <p className="text-sm text-white/90 leading-relaxed">{task.adminNotes}</p>
          </div>
        )}

        {isEditable && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving || countedCount === 0}
              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 shadow-lg"
            >
              {saving ? 'جاري التسليم...' : `📤 تسليم الجرد (${countedCount}/${items.length} عُدّ)`}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-burgundy/10 rounded-full h-2">
        <div
          className="bg-burgundy h-2 rounded-full transition-all duration-500"
          style={{ width: `${items.length > 0 ? (countedCount / items.length) * 100 : 0}%` }}
        />
      </div>
      <p className="text-xs text-burgundy/50 text-center">{countedCount} من {items.length} صنف تم عدّه</p>

      {/* Items */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_0.6fr_0.6fr_0.7fr_1fr] gap-3 bg-[#F7F0EC] px-5 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
          <span>المنتج</span><span>المقاس</span><span>اللون</span><span>النظام</span><span>الكمية الفعلية</span>
        </div>
        <div className="divide-y divide-burgundy/6">
          {items.map(item => {
            const counted = item._counted !== '' ? Number(item._counted) : null;
            const variance = counted !== null ? counted - item.systemStock : null;
            const rowColor = variance === null ? '' : variance === 0 ? 'bg-emerald-50/30' : variance > 0 ? 'bg-blue-50/30' : 'bg-red-50/30';
            return (
              <div key={item._id} className={`grid sm:grid-cols-[2fr_0.6fr_0.6fr_0.7fr_1fr] items-center gap-3 px-5 py-3 ${rowColor}`}>
                <div>
                  <p className="font-semibold text-sm">{item.productName}</p>
                  {item.sku && <p className="text-[10px] font-mono text-burgundy/40 mt-0.5">{item.sku}</p>}
                </div>
                <p className="text-sm text-burgundy/60">{item.size || '—'}</p>
                <p className="text-sm text-burgundy/60">{item.color || '—'}</p>
                <span className="rounded-full bg-burgundy/8 px-3 py-1 text-sm font-bold w-fit">{item.systemStock}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={item._counted}
                    onChange={e => handleUpdate(item._id, e.target.value)}
                    disabled={!isEditable}
                    placeholder="أدخل..."
                    className={`w-24 rounded-xl border border-burgundy/20 px-3 py-1.5 text-center text-sm font-bold text-burgundy outline-none focus:border-burgundy ${!isEditable ? 'bg-burgundy/5 opacity-70 cursor-not-allowed' : 'bg-white'}`}
                  />
                  {variance !== null && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${variance === 0 ? 'bg-emerald-100 text-emerald-700' : variance > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                      {variance > 0 ? `+${variance}` : variance}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Tasks List ───────────────────────────────────────────────────────────────
function EmployeeInventoryTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory-tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleOpenTask = async (task) => {
    try {
      const { data } = await api.get(`/inventory-tasks/${task._id}`);
      setActiveTask(data);
    } catch (e) {
      console.error(e);
    }
  };

  if (activeTask) {
    return <TaskSession task={activeTask} onBack={() => { setActiveTask(null); loadTasks(); }} />;
  }

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الموظف</p>
        <h2 className="text-2xl font-bold mt-0.5">📋 مهام الجرد</h2>
        <p className="text-sm text-burgundy/50 mt-1">المهام الجردية المكلّف بها من قِبل الإدارة</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-[2rem] border border-burgundy/10 bg-white py-20 text-center">
          <p className="text-5xl mb-3">📋</p>
          <p className="text-lg font-semibold text-burgundy/40">لا توجد مهام جرد بعد</p>
          <p className="text-sm text-burgundy/30 mt-1">ستظهر هنا المهام التي يكلّفك بها المدير</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const statusInfo = STATUS_LABEL[task.status] || STATUS_LABEL.pending;
            const totalItems = task.items?.length || 0;
            const countedItems = task.items?.filter(i => i.countedStock !== null).length || 0;
            return (
              <div key={task._id} className="rounded-[1.5rem] border border-burgundy/10 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-burgundy">{task.title}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-burgundy/50">
                      <span>{new Date(task.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}</span>
                      <span>{totalItems} صنف</span>
                      {task.status === 'submitted' && <span className="text-blue-600">{countedItems}/{totalItems} عُدّ</span>}
                    </div>
                    {task.status === 'rejected' && task.adminNotes && (
                      <p className="mt-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-1.5 line-clamp-2">
                        ⚠️ {task.adminNotes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleOpenTask(task)}
                    disabled={task.status === 'accepted'}
                    className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition ${
                      task.status === 'accepted'
                        ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-200'
                        : task.status === 'rejected'
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-burgundy text-white hover:bg-[#650018]'
                    }`}
                  >
                    {task.status === 'accepted' ? '✅ مقبول' : task.status === 'rejected' ? '🔄 إعادة الجرد' : task.status === 'submitted' ? '👁️ عرض' : '📝 بدء الجرد'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default EmployeeInventoryTasks;
