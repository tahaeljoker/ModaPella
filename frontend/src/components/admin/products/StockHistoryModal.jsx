import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import ConfirmModal from '../../ConfirmModal';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

const ACTION_AR = {
 'POS Sale': 'مبيعات (كاشير)',
 'Manual Adjustment': 'تعديل يدوي',
 'Refund': 'مرتجع',
 'Inventory Count': 'جرد مخزون',
 'Initial Stock': 'رصيد افتتاحي (كمية البداية)',
 'Purchase Receive': 'استلام مشتريات',
 'Restock': 'تزويد مخزون / شحنة جديدة',
 'Product Edit': 'تعديل بيانات المنتج'
};


export default function StockHistoryModal({ product, onClose, onRefreshProduct }) {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'supplierTxs'
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Supplier Transactions State
  const [supplierTxs, setSupplierTxs] = useState([]);
  const [txsLoading, setTxsLoading] = useState(false);
  const [deleteTxConfirm, setDeleteTxConfirm] = useState(null);
  const [deletingTx, setDeletingTx] = useState(false);
  const [txSuccessMsg, setTxSuccessMsg] = useState('');

  const productId = product?._id;

  const loadStockHistory = () => {
    if (!productId) return;
    setLoading(true);
    api.get(`/admin/products/${productId}/stock-history`)
      .then(r => setHistory(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadSupplierTxs = () => {
    if (!productId) return;
    setTxsLoading(true);
    api.get(`/suppliers/product-transactions/${productId}`)
      .then(r => setSupplierTxs(r.data?.transactions || []))
      .catch(console.error)
      .finally(() => setTxsLoading(false));
  };

  useEffect(() => {
    loadStockHistory();
    loadSupplierTxs();
  }, [productId]);

  const handleDeleteSupplierTx = async () => {
    if (!deleteTxConfirm) return;
    setDeletingTx(true);
    try {
      await api.delete(`/suppliers/transactions/${deleteTxConfirm._id}`);
      setTxSuccessMsg('تم حذف الفاتورة ومصروف الخزينة وتعديل رصيد المورد بنجاح');
      setTimeout(() => setTxSuccessMsg(''), 4000);
      setDeleteTxConfirm(null);
      loadSupplierTxs();
      if (onRefreshProduct) onRefreshProduct();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'فشل حذف الفاتورة');
    } finally {
      setDeletingTx(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose} dir="rtl">
      <div className="w-full max-w-xl overflow-hidden rounded-[2rem] bg-[#F7F0EC] shadow-2xl flex flex-col max-h-[88vh] text-burgundy" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b border-burgundy/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-burgundy flex items-center gap-1.5">
              <span>{product?.name}</span>
              {product?.sku && <span className="font-mono text-xs bg-burgundy/10 px-2 py-0.5 rounded-lg text-burgundy/70">#{product.sku}</span>}
            </h3>
            <p className="text-xs font-bold text-emerald-700 mt-0.5">
              إجمالي ما تم استلامه وتوريده: {Math.max(product?.totalReceived || 0, (product?.stock || 0) + (product?.sold || 0))} قطعة | المخزون الحالي: {product?.stock || 0} قطعة
            </p>
          </div>
          <button onClick={onClose} className="text-burgundy/40 hover:text-burgundy font-bold text-xl cursor-pointer p-1">✕</button>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#F7F0EC] px-6 pt-3 border-b border-burgundy/10 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('stock')}
            className={`pb-2.5 px-3 font-bold text-xs transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'stock'
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-burgundy/40 hover:text-burgundy'
            }`}
          >
            <span>📦</span>
            <span>حركة المخزون ({history.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supplierTxs')}
            className={`pb-2.5 px-3 font-bold text-xs transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'supplierTxs'
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-burgundy/40 hover:text-burgundy'
            }`}
          >
            <span>🧾</span>
            <span>فواتير الموردين المسجلة ({supplierTxs.length})</span>
            {supplierTxs.length > 1 && (
              <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                تكرار محتمل
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: STOCK MOVEMENTS */}
          {activeTab === 'stock' && (
            loading ? (
              <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
            ) : history.length === 0 ? (
              <div className="py-8 text-center text-sm text-burgundy/40">لا توجد حركات مخزون مسجلة لهذا المنتج بعد.</div>
            ) : (
              <div className="relative border-r border-burgundy/20 pr-4 mr-2 space-y-4">
                {history.map((h) => {
                  const diff = h.quantityChanged;
                  const diffClass = diff > 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200';
                  return (
                    <div key={h._id} className="relative">
                      <div className="absolute right-[-21px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-burgundy bg-[#F7F0EC]" />
                      <div className="bg-white rounded-2xl p-3.5 border border-burgundy/5 shadow-sm space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-burgundy">{ACTION_AR[h.changeType] || h.changeType}</span>
                          <span className="text-[10px] text-burgundy/40">{new Date(h.createdAt).toLocaleString('ar-EG-u-nu-latn')}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs py-1">
                          <div>
                            {h.size || h.color ? (
                              <span className="text-burgundy/60 font-semibold">{h.size} · {h.color}</span>
                            ) : (
                              <span className="text-burgundy/40">المنتج الرئيسي</span>
                            )}
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${diffClass}`}>
                            {diff > 0 ? `+${diff}` : diff} قطعة
                          </span>
                        </div>
                        <p className="text-[11px] text-burgundy/50 leading-relaxed">{h.notes}</p>
                        <div className="flex items-center justify-between text-[10px] text-burgundy/30 pt-1 border-t border-burgundy/5">
                          <span>الرصيد: {h.previousStock} ➔ {h.newStock}</span>
                          {h.performedBy?.name && <span>بواسطة: {h.performedBy.name}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* TAB 2: SUPPLIER INVOICES */}
          {activeTab === 'supplierTxs' && (
            <div className="space-y-3">
              {txSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <span>✓</span>
                  <span>{txSuccessMsg}</span>
                </div>
              )}

              {/* Informative duplicate alert if multiple invoices */}
              {supplierTxs.length > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed space-y-1">
                  <p className="font-bold flex items-center gap-1">
                    <span>⚠️</span>
                    <span>تم العثور على {supplierTxs.length} فواتير مسجلة لهذا الصنف:</span>
                  </p>
                  <p className="text-[11px]">
                    إذا تم إضافة المنتج لمكتب أو مورد أولاً ثم تم تحويله لمورد آخر أو تكرر حسابه، يمكنك حذف الفاتورة غير المطلوبة فوراً بالضغط على زر <strong>[حذف الفاتورة]</strong>.
                  </p>
                </div>
              )}

              {txsLoading ? (
                <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-burgundy/20 border-t-burgundy" /></div>
              ) : supplierTxs.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-white rounded-2xl border border-burgundy/5">
                  <p className="text-3xl">🧾</p>
                  <p className="text-xs font-bold text-burgundy/50">لا توجد فواتير موردين مسجلة مرتبطة بهذا الصنف حتى الآن</p>
                  <p className="text-[11px] text-burgundy/30 max-w-xs mx-auto">
                    يتم تسجيل الفواتير تلقائياً عند إضافة صنف جديد أو تزويد مخزون مع اختيار تسجيل فاتورة للمورد.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {supplierTxs.map(tx => {
                    const supName = tx.supplier?.name || 'مورد غير محدد';
                    const isPurchase = tx.type === 'purchase';

                    return (
                      <div
                        key={tx._id}
                        className={`rounded-2xl p-4 border bg-white shadow-xs space-y-2 ${
                          isPurchase ? 'border-red-100 hover:border-red-200' : 'border-emerald-100'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs bg-burgundy/10 text-burgundy px-2.5 py-0.5 rounded-lg border border-burgundy/15">
                              🏢 {supName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              isPurchase ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {isPurchase ? 'فاتورة مشتريات (مديونية)' : 'سداد / حركة'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              tx.paymentSource === 'StoreSafe' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {tx.paymentSource === 'StoreSafe' ? '🏦 الخزينة' : '👤 جيب شخصي'}
                            </span>
                          </div>

                          <div className="text-left">
                            <span className="font-extrabold text-sm text-burgundy">
                              {EGP(tx.amount)}
                            </span>
                          </div>
                        </div>

                        {tx.description && (
                          <p className="text-xs font-medium text-burgundy/70 bg-[#F7F0EC]/60 p-2 rounded-xl">
                            {tx.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[11px] text-burgundy/40 pt-1 border-t border-burgundy/5">
                          <span>
                            {new Date(tx.date || tx.createdAt).toLocaleDateString('ar-EG-u-nu-latn', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                            {tx.reference && ` · مرجع: #${tx.reference}`}
                          </span>

                          <button
                            type="button"
                            onClick={() => setDeleteTxConfirm(tx)}
                            className="text-red-600 hover:text-red-700 font-bold bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1 rounded-xl transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>🗑️</span>
                            <span>حذف الفاتورة</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirmation Modal for deleting supplier bill from product view */}
        <ConfirmModal
          isOpen={!!deleteTxConfirm}
          title="حذف فاتورة المورد"
          message={`هل أنت متأكد من حذف فاتورة التوريد المسجلة للمورد (${deleteTxConfirm?.supplier?.name || 'مورد'}) بقيمة ${EGP(deleteTxConfirm?.amount || 0)}؟ سيتم خصمها من رصيد المورد وحذف أي مصروف مرتبط بها بالخزينة.`}
          onConfirm={handleDeleteSupplierTx}
          onCancel={() => setDeleteTxConfirm(null)}
        />
      </div>
    </div>
  );
}

// ─── Restock Modal ─────────────────────────────────────────────────────────────
