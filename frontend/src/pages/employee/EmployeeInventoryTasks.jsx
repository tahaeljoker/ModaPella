import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import BarcodeScannerModal from '../../components/BarcodeScannerModal';

const STATUS_LABEL = {
  pending:   { label: 'معلق',       color: 'bg-amber-100 text-amber-700',   icon: '⏳' },
  submitted: { label: 'تم التسليم', color: 'bg-blue-100 text-blue-700',    icon: '📤' },
  accepted:  { label: 'مقبول',      color: 'bg-emerald-100 text-emerald-700', icon: '✅' },
  rejected:  { label: 'مرفوض',     color: 'bg-red-100 text-red-700',       icon: '❌' },
};

const DRAFT_KEY = (id) => `employee_task_draft_${id}`;

// ─── Active Task Session ──────────────────────────────────────────────────────
function TaskSession({ task: initialTask, onBack }) {
  const [task, setTask]   = useState(initialTask);
  const [items, setItems] = useState(() => {
    // Restore local draft if exists
    const draft = localStorage.getItem(DRAFT_KEY(initialTask._id));
    if (draft) {
      try {
        const saved = JSON.parse(draft);
        return initialTask.items.map(i => {
          const d = saved.find(s => s._id === i._id);
          return { ...i, _counted: d ? d._counted : (i.countedStock ?? '') };
        });
      } catch {}
    }
    return initialTask.items.map(i => ({ ...i, _counted: i.countedStock ?? '' }));
  });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilter] = useState('all'); // all | uncounted | counted | diff
  const [highlight, setHighlight] = useState(null);  // item._id to flash
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanRef  = useRef(null);
  const inputRefs = useRef({});

  // Auto-save draft to localStorage whenever items change
  useEffect(() => {
    if (['pending', 'rejected'].includes(task.status)) {
      localStorage.setItem(DRAFT_KEY(task._id), JSON.stringify(
        items.map(i => ({ _id: i._id, _counted: i._counted }))
      ));
    }
  }, [items, task._id, task.status]);

  const handleUpdate = (id, val) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, _counted: val } : i));
  };

  // Match-by-system shortcut (sets countedStock = systemStock for one item)
  const handleMatchSystem = (id) => {
    setItems(prev => prev.map(i => i._id === id ? { ...i, _counted: String(i.systemStock) } : i));
  };

  // Match ALL uncounted items to system stock
  const handleAutoFillAll = () => {
    if (!window.confirm('هل تريد ملء جميع الأصناف غير المجرودة بكميات السيستم؟')) return;
    setItems(prev => prev.map(i => i._counted === '' ? { ...i, _counted: String(i.systemStock) } : i));
  };

  // Jump to next uncounted item via Enter key
  const handleKeyDown = useCallback((e, currentId) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const uncounted = items.filter(i => i._counted === '' && i._id !== currentId);
      if (uncounted.length > 0) {
        const next = uncounted[0];
        setHighlight(next._id);
        setTimeout(() => {
          inputRefs.current[next._id]?.focus();
          inputRefs.current[next._id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlight(null);
        }, 50);
      }
    }
  }, [items]);

  // Barcode scanner: fast input auto-matches to product
  const performMatchAndFocus = (q) => {
    const match = items.find(i =>
      i.sku?.toLowerCase() === q.toLowerCase() ||
      i.productName?.toLowerCase().includes(q.toLowerCase())
    );
    if (match) {
      setHighlight(match._id);
      // scroll and focus the count input
      setTimeout(() => {
        inputRefs.current[match._id]?.focus();
        inputRefs.current[match._id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => setHighlight(null), 1500);
      }, 50);
      // Also remove filter so item is visible
      setFilter('all');
      setSearch('');
    } else {
      alert(`لم يتم العثور على منتج بهذا الكود: "${q}"`);
    }
  };

  const handleScan = (e) => {
    if (e.key === 'Enter' && scanRef.current?.value?.trim()) {
      const q = scanRef.current.value.trim();
      performMatchAndFocus(q);
      scanRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const uncountedCount = items.filter(i => i._counted === '').length;
    if (uncountedCount > 0) {
      if (!window.confirm(`تنبيه: ${uncountedCount} صنف لم يُعدّ بعد. هل تريد تسليم الجرد كما هو؟`)) return;
    } else {
      if (!window.confirm('هل أنت متأكد من تسليم الجرد للمراجعة؟')) return;
    }
    setSaving(true);
    try {
      const payload = items.map(i => ({ _id: i._id, countedStock: i._counted === '' ? null : Number(i._counted) }));
      const r = await api.put(`/inventory-tasks/${task._id}/submit`, { items: payload });
      localStorage.removeItem(DRAFT_KEY(task._id));
      setTask(r.data);
      setItems(r.data.items.map(i => ({ ...i, _counted: i.countedStock ?? '' })));
      alert('✅ تم تسليم الجرد للمراجعة بنجاح');
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء التسليم');
    } finally { setSaving(false); }
  };

  // Filtered items
  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const ms = !q || i.productName?.toLowerCase().includes(q) || i.sku?.toLowerCase().includes(q) ||
               i.size?.toLowerCase().includes(q) || i.color?.toLowerCase().includes(q);
    const counted = i._counted !== '';
    const diff = counted && Number(i._counted) !== i.systemStock;
    if (filterStatus === 'uncounted') return ms && !counted;
    if (filterStatus === 'counted')   return ms && counted;
    if (filterStatus === 'diff')      return ms && diff;
    return ms;
  });

  const countedCount  = items.filter(i => i._counted !== '').length;
  const uncountedCount = items.length - countedCount;
  const diffCount     = items.filter(i => i._counted !== '' && Number(i._counted) !== i.systemStock).length;
  const statusInfo    = STATUS_LABEL[task.status] || STATUS_LABEL.pending;
  const isEditable    = ['pending', 'rejected'].includes(task.status);
  const hasDraft      = isEditable && localStorage.getItem(DRAFT_KEY(task._id));

  return (
    <div className="space-y-5 text-burgundy" dir="rtl">
      <button onClick={onBack} className="text-sm text-burgundy/60 hover:text-burgundy flex items-center gap-1">← العودة للمهام</button>

      {/* Session Header */}
      <div className="rounded-[2rem] bg-burgundy text-white p-6 shadow-lg shadow-burgundy/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-70 uppercase tracking-widest">مهمة جرد</p>
            <h3 className="text-xl font-bold mt-1">{task.title}</h3>
            <p className="text-xs opacity-60 mt-0.5">
              كُلّفت بها بتاريخ {new Date(task.createdAt).toLocaleDateString('ar-EG-u-nu-latn')}
            </p>
          </div>
          <div className="text-left shrink-0">
            <p className="text-xs opacity-70">{countedCount}/{items.length} عُدّ</p>
          </div>
        </div>

        {/* Rejection notes */}
        {task.status === 'rejected' && task.adminNotes && (
          <div className="mt-4 rounded-2xl bg-red-400/20 border border-red-300/30 px-4 py-3">
            <p className="text-xs font-bold text-red-100 mb-1">ملاحظات المدير (سبب الرفض):</p>
            <p className="text-sm text-white/90 leading-relaxed">{task.adminNotes}</p>
          </div>
        )}

        {/* Draft badge */}
        {hasDraft && (
          <div className="mt-3 flex items-center gap-2 text-xs text-yellow-200/80">
            <span>💾</span>
            <span>تم استعادة مسودة محفوظة تلقائياً</span>
          </div>
        )}

        {isEditable && (
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 min-w-[140px] rounded-xl bg-emerald-500 hover:bg-emerald-400 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 shadow-lg"
            >
              {saving ? 'جاري التسليم...' : `📤 تسليم الجرد (${countedCount}/${items.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-burgundy/10 rounded-full h-2.5">
        <div
          className="bg-burgundy h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${items.length > 0 ? (countedCount / items.length) * 100 : 0}%` }}
        />
      </div>

      {/* ── Barcode Scanner ── */}
      {isEditable && (
        <div className="rounded-[2rem] border-2 border-dashed border-burgundy/20 bg-white px-5 py-4 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="w-12 h-12 rounded-2xl bg-burgundy/5 border border-burgundy/20 flex items-center justify-center text-xl hover:bg-burgundy/10 transition shrink-0"
            title="مسح الكود بكاميرا الموبايل"
          >
            📸
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-burgundy/40 mb-1">مسح باركود سريع</p>
            <input
              ref={scanRef}
              type="text"
              onKeyDown={handleScan}
              placeholder="امسح الباركود أو اكتب الـ SKU واضغط Enter..."
              className="w-full rounded-xl border border-burgundy/20 bg-[#F7F0EC] px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy"
              dir="ltr"
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 بحث بالاسم أو الكود..."
          className="rounded-2xl border border-burgundy/20 bg-white px-4 py-2 text-sm text-burgundy outline-none focus:border-burgundy min-w-[180px]"
        />
        <div className="flex rounded-2xl border border-burgundy/15 bg-white overflow-hidden">
          {[
            { id: 'all',      label: `الكل (${items.length})` },
            { id: 'uncounted', label: `⬜ لم تُعدّ (${uncountedCount})` },
            { id: 'counted',  label: `✅ تم (${countedCount})` },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-2 text-xs font-semibold transition ${filterStatus === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {isEditable && uncountedCount > 0 && (
          <button
            onClick={() => {
              const firstUncounted = items.find(i => i._counted === '');
              if (firstUncounted) {
                inputRefs.current[firstUncounted._id]?.focus();
                inputRefs.current[firstUncounted._id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="rounded-xl bg-amber-500/10 border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-500 hover:text-white transition"
          >
            ⏭️ انتقل لأول غير مجرود
          </button>
        )}
      </div>

      <p className="text-xs text-burgundy/40">{filtered.length} صنف معروض · اضغط Enter للانتقال للتالي</p>

      {/* Items */}
      <div className="rounded-[2rem] border border-burgundy/10 bg-white shadow-sm overflow-hidden">
        <div className="hidden sm:grid grid-cols-[2fr_0.6fr_0.6fr_1.2fr_auto] gap-3 bg-[#F7F0EC] px-5 py-3 text-xs font-bold uppercase tracking-wide text-burgundy/50 border-b border-burgundy/8">
          <span>المنتج</span><span>المقاس</span><span>اللون</span><span>الكمية الفعلية</span><span></span>
        </div>
        <div className="divide-y divide-burgundy/6">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-burgundy/40">لا توجد أصناف تطابق الفلتر</p>
          ) : filtered.map(item => {
            const isHighlit = highlight === item._id;
            const rowColor = isHighlit ? 'bg-yellow-50 ring-2 ring-yellow-400' :
              item._counted !== '' ? 'bg-emerald-50/20' : '';
            return (
              <div key={item._id} className={`grid sm:grid-cols-[2fr_0.6fr_0.6fr_1.2fr_auto] items-center gap-3 px-5 py-3 transition-all ${rowColor}`}>
                <div>
                  <p className="font-semibold text-sm">{item.productName}</p>
                  {item.sku && <p className="text-[10px] font-mono text-burgundy/40 mt-0.5 bg-burgundy/5 w-fit px-1.5 rounded">{item.sku}</p>}
                </div>
                <p className="text-sm text-burgundy/60">{item.size || '—'}</p>
                <p className="text-sm text-burgundy/60">{item.color || '—'}</p>
                <div className="flex items-center gap-2">
                  <input
                    ref={el => { inputRefs.current[item._id] = el; }}
                    type="number"
                    min="0"
                    value={item._counted}
                    onChange={e => handleUpdate(item._id, e.target.value)}
                    onKeyDown={e => isEditable && handleKeyDown(e, item._id)}
                    disabled={!isEditable}
                    placeholder="أدخل..."
                    className={`w-24 rounded-xl border border-burgundy/20 px-3 py-1.5 text-center text-sm font-bold text-burgundy outline-none focus:border-burgundy focus:ring-1 focus:ring-burgundy/30 ${!isEditable ? 'bg-burgundy/5 opacity-70 cursor-not-allowed' : 'bg-white'}`}
                  />
                </div>
                {isEditable && item._counted !== '' && (
                  <button
                    onClick={() => handleUpdate(item._id, '')}
                    title="مسح القيمة"
                    className="rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-500 hover:text-white transition"
                  >
                    ✕
                  </button>
                )}
                {!isEditable && <span />}
              </div>
            );
          })}
        </div>
      </div>
      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={(code) => {
          performMatchAndFocus(code);
        }}
      />
    </div>
  );
}

// ─── Tasks List ───────────────────────────────────────────────────────────────
function EmployeeInventoryTasks() {
  const [tasks, setTasks]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTask, setActiveTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory-tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleOpenTask = async (task) => {
    try {
      const { data } = await api.get(`/inventory-tasks/${task._id}`);
      setActiveTask(data);
    } catch (e) { console.error(e); }
  };

  if (activeTask) {
    return <TaskSession task={activeTask} onBack={() => { setActiveTask(null); loadTasks(); }} />;
  }

  const pendingCount   = tasks.filter(t => t.status === 'pending').length;
  const rejectedCount  = tasks.filter(t => t.status === 'rejected').length;
  const urgent         = pendingCount + rejectedCount;

  const filtered = statusFilter === 'all' ? tasks : tasks.filter(t => t.status === statusFilter);

  return (
    <div className="space-y-6 text-burgundy" dir="rtl">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الموظف</p>
        <h2 className="text-2xl font-bold mt-0.5">📋 مهام الجرد</h2>
        {urgent > 0 && (
          <p className="text-sm text-red-600 font-semibold mt-1">
            ⚠️ لديك {urgent} مهم{urgent > 1 ? 'ة' : ''} تحتاج اهتمامك
          </p>
        )}
      </div>

      {/* Status Filter Tabs */}
      {tasks.length > 0 && (
        <div className="flex rounded-2xl border border-burgundy/15 bg-white overflow-hidden w-fit">
          {[
            { id: 'all',       label: `الكل (${tasks.length})` },
            { id: 'pending',   label: `⏳ معلق (${pendingCount})` },
            { id: 'rejected',  label: `❌ مرفوض (${rejectedCount})` },
            { id: 'submitted', label: `📤 تم التسليم` },
            { id: 'accepted',  label: `✅ مقبول` },
          ].map(f => (
            <button key={f.id} onClick={() => setStatusFilter(f.id)}
              className={`px-4 py-2.5 text-xs font-semibold transition ${statusFilter === f.id ? 'bg-burgundy text-white' : 'text-burgundy/60 hover:bg-burgundy/8'}`}>
              {f.label}
            </button>
          ))}
        </div>
      )}

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
          {filtered.map(task => {
            const statusInfo   = STATUS_LABEL[task.status] || STATUS_LABEL.pending;
            const totalItems   = task.items?.length || 0;
            const countedItems = task.items?.filter(i => i.countedStock !== null).length || 0;
            const isUrgent     = ['pending', 'rejected'].includes(task.status);
            // Draft indicator
            const hasDraft     = localStorage.getItem(DRAFT_KEY(task._id));
            return (
              <div key={task._id} className={`rounded-[1.5rem] border bg-white px-5 py-4 shadow-sm transition ${isUrgent ? 'border-burgundy/25 shadow-burgundy/5' : 'border-burgundy/10'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-burgundy">{task.title}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                      {hasDraft && isUrgent && (
                        <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-[10px] font-bold">
                          💾 مسودة محفوظة
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-burgundy/50 flex-wrap">
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
                      task.status === 'accepted'   ? 'bg-emerald-50 text-emerald-600 cursor-default border border-emerald-200' :
                      task.status === 'rejected'   ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm' :
                      task.status === 'submitted'  ? 'border border-burgundy/20 text-burgundy hover:bg-burgundy/8' :
                                                     'bg-burgundy text-white hover:bg-[#650018] shadow-md shadow-burgundy/20'
                    }`}
                  >
                    {task.status === 'accepted'  ? '✅ مقبول' :
                     task.status === 'rejected'  ? '🔄 تصحيح وإعادة' :
                     task.status === 'submitted' ? '👁️ عرض' : '📝 بدء الجرد'}
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
