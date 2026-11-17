import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import ProductAnalyticsModal from '../../components/ProductAnalyticsModal';
import CategoryAnalyticsModal from '../../components/CategoryAnalyticsModal';
import InventoryDetailsModal from '../../components/InventoryDetailsModal';

import { useAdminProducts } from '../../components/admin/products/useAdminProducts';
import ProductFormModal from '../../components/admin/products/ProductFormModal';
import RestockModal from '../../components/admin/products/RestockModal';
import StockHistoryModal from '../../components/admin/products/StockHistoryModal';
import CatalogTab from '../../components/admin/products/CatalogTab';
import InventoryTab from '../../components/admin/products/InventoryTab';

const TABS = [
  { id: 'catalog', label: 'كتالوج المنتجات' },
  { id: 'inventory', label: 'إدارة المخزون', icon: '' },
];

export default function AdminProducts() {
  const navigate = useNavigate();
  const {
    products,
    loading,
    siteConfig,
    setSiteConfig,
    categories,
    catAr,
    toast,
    showToast,
    loadProducts,
    handleAddCategory,
    handleSave,
    handleDelete
  } = useAdminProducts();

  const [tab, setTab] = useState('catalog'); // 'catalog' | 'inventory'
  const [modal, setModal] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [analyticsProduct, setAnalyticsProduct] = useState(null);
  const [categoryAnalyticsTarget, setCategoryAnalyticsTarget] = useState(null);
  const [isInventoryDetailsOpen, setIsInventoryDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [restockingProduct, setRestockingProduct] = useState(null);

  const confirmDelete = async () => {
    if (!productToDelete) return;
    await handleDelete(productToDelete);
    setIsDeleteOpen(false);
    setProductToDelete(null);
  };

  return (
    <div className="space-y-6 text-burgundy">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-burgundy/40">الإدارة</p>
          <h2 className="text-2xl font-bold">المنتجات والمخزون</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl border border-burgundy/10 p-1.5 w-fit shadow-sm">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              tab === t.id
                ? 'bg-burgundy text-white shadow-md shadow-burgundy/25'
                : 'text-burgundy/60 hover:text-burgundy hover:bg-burgundy/6'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'catalog' ? (
        <CatalogTab
          products={products}
          loading={loading}
          categories={categories}
          catAr={catAr}
          siteConfig={siteConfig}
          setSiteConfig={setSiteConfig}
          onAdd={() => setModal('create')}
          onEdit={p => setModal({
            ...p,
            images: (p.images || []).join('\n'),
            sizes: (p.sizes || []).join(', '),
            colors: (p.colors || []).join(', ')
          })}
          onDelete={id => { setProductToDelete(id); setIsDeleteOpen(true); }}
          onShowHistory={setHistoryProduct}
          onShowAnalytics={setAnalyticsProduct}
          onOpenCategoryAnalytics={(cat) => setCategoryAnalyticsTarget(cat || 'all')}
          onRestock={setRestockingProduct}
          onRefresh={loadProducts}
          showToast={showToast}
        />
      ) : (
        <InventoryTab
          products={products}
          loading={loading}
          categories={categories}
          catAr={catAr}
          onRefresh={loadProducts}
          onRestock={setRestockingProduct}
          onEdit={p => setModal({
            ...p,
            images: (p.images || []).join('\n'),
            sizes: (p.sizes || []).join(', '),
            colors: (p.colors || []).join(', ')
          })}
          onShowHistory={setHistoryProduct}
          onShowAnalytics={setAnalyticsProduct}
        />
      )}

      {/* Modal */}
      {modal && (
        <ProductFormModal
          product={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          categories={categories}
          catAr={catAr}
          onAddCategory={handleAddCategory}
          siteConfig={siteConfig}
        />
      )}

      {/* Restock Modal */}
      {restockingProduct && (
        <RestockModal
          product={restockingProduct}
          onClose={() => setRestockingProduct(null)}
          onRestocked={(msg) => {
            showToast(msg);
            loadProducts();
          }}
        />
      )}

      {/* Stock History Modal */}
      {historyProduct && (
        <StockHistoryModal
          product={historyProduct}
          onClose={() => setHistoryProduct(null)}
          onRefreshProduct={loadProducts}
        />
      )}

      {/* Product Performance & Analytics Modal */}
      {analyticsProduct && (
        <ProductAnalyticsModal
          product={analyticsProduct}
          onClose={() => setAnalyticsProduct(null)}
          onOpenCategoryAnalytics={(cat) => setCategoryAnalyticsTarget(cat || 'all')}
        />
      )}

      {/* Category Performance & Analytics Modal */}
      {categoryAnalyticsTarget && (
        <CategoryAnalyticsModal
          initialCategory={categoryAnalyticsTarget}
          onClose={() => setCategoryAnalyticsTarget(null)}
          onSelectProduct={(p) => {
            setCategoryAnalyticsTarget(null);
            setAnalyticsProduct({ ...p, _id: p?._id || p?.id });
          }}
        />
      )}

      {/* Inventory Details Modal */}
      <InventoryDetailsModal
        isOpen={isInventoryDetailsOpen}
        onClose={() => setIsInventoryDetailsOpen(false)}
        initialProducts={products}
        title="تفاصيل واشتقاق حساب المنتجات والمخزون"
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        title="تأكيد الأرشفة"
        message="هل أنت متأكد من أرشفة هذا المنتج؟ لن يظهر مجدداً في واجهة الكاشير ولكنه سيظل في قاعدة البيانات للتقارير القديمة."
        onConfirm={confirmDelete}
        onCancel={() => { setIsDeleteOpen(false); setProductToDelete(null); }}
      />
    </div>
  );
}
