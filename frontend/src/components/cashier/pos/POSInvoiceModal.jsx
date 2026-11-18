import React, { useState } from 'react';
import { renderBarcodeSVG } from '../../../utils/barcode';

const EGP = (n) => `${Number(n || 0).toLocaleString('en-US')} ج.م`;

function saveInvoiceAsHTML(order, showDiscount = true) {
  const id = order.invoiceNumber || order._id?.toString().slice(-8).toUpperCase();
  const date = new Date(order.createdAt).toLocaleString('ar-EG-u-nu-latn');
  const itemsHTML = (order.items || []).map(item => {
    const unitPrice = (item.originalPrice && item.originalPrice > 0) ? item.originalPrice : item.price;
    return `
    <tr>
    <td>${item.name}</td>
    <td>${item.size || '—'}</td>
    <td>${item.color || '—'}</td>
    <td style="text-align:center">${item.quantity}</td>
    <td style="text-align:left">${Number(unitPrice).toLocaleString('en-US')} ج.م</td>
    <td style="text-align:left;font-weight:bold">${Number(unitPrice * item.quantity).toLocaleString('en-US')} ج.م</td>
    </tr>`;
  }).join('');
  const discountRow = (showDiscount && order.discount > 0) ? `
  <tr><td colspan="5" style="text-align:right;color:#16a34a">خصم</td>
  <td style="text-align:left;color:#16a34a">- ${Number(order.discount).toLocaleString('en-US')} ج.م</td></tr>` : '';

 const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>فاتورة ModaPella #${id}</title>
<style>
 body{font-family:Cairo,Arial,sans-serif;background:#fff;color:#1a0509;padding:32px;max-width:600px;margin:auto}
 h1{color:#7C0A12;text-align:center;margin:0;font-size:24px}
 .sub{text-align:center;color:#888;font-size:12px;margin:4px 0 20px}
 table{width:100%;border-collapse:collapse;font-size:13px}
 th{background:#f7f0ec;color:#7C0A12;padding:8px;text-align:right;border-bottom:2px solid #e0c9c9}
 td{padding:7px 8px;border-bottom:1px solid #f0e8e8}
 .total{font-size:16px;font-weight:900;color:#7C0A12;text-align:left;margin-top:16px;border-top:2px solid #7C0A12;padding-top:10px}
 .footer{text-align:center;color:#aaa;font-size:11px;margin-top:24px;line-height:1.6}
 .method{color:#555;font-size:12px;margin-top:6px;text-align:left}
 .emp{color:#7C0A12;font-size:11px;margin-top:4px;text-align:left;font-weight:bold}
</style></head>
<body>
<h1>ModaPella</h1>
<div class="sub">فاتورة بيع | رقم: #${id} | التاريخ: ${date}</div>
${order.notes ? `<div class="sub" style="font-weight:bold;margin-top:2px;">ملاحظات: ${order.notes}</div>` : ''}
<table>
 <thead><tr><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
 <tbody>${itemsHTML}${discountRow}</tbody>
</table>
<div class="total">الإجمالي الكلي: ${Number(order.totalAmount).toLocaleString('en-US')} ج.م</div>
${order.isDebt ? `
<div class="method" style="color:#056608;font-weight:bold;">المدفوع نقداً: ${Number(order.amountPaid || 0).toLocaleString('en-US')} ج.م</div>
<div class="method" style="color:#b45309;font-weight:900;font-size:14px;">المتبقي (آجل / دين): ${Number(order.debtAmount || 0).toLocaleString('en-US')} ج.م</div>
` : ''}
<div class="method">طريقة الدفع: ${order.paymentMethod === 'Cash' ? 'كاش ' : order.paymentMethod === 'Instapay' ? 'انستا باي ' : 'محفظة كاش '}${order.isDebt ? '(آجل)' : ''}</div>
${order._employeeName ? `<div class="emp">الموظف: ${order._employeeName}</div>` : ''}
<div style="border-top:1px dashed #ccc;margin-top:16px;padding-top:10px;font-size:11px;color:#555;line-height:1.6;text-align:right">
  <strong style="color:#7C0A12">سياسة الاستبدال والاسترجاع:</strong><br/>
  • الاستبدال والاسترجاع خلال [ 14 يوماً] من تاريخ الشراء.<br/>
  • يشترط وجود الفاتورة الأصلية، وأن تكون البضاعة بحالتها الأصلية وغير مستخدمة وفي غلافها.<br/>
  • البضائع المُخفضة أو التالفة بسبب سوء الاستخدام لا تُرد ولا تُستبدل.<br/>
  • يتم إرجاع المبلغ بنفس طريقة الدفع الأصلية.
</div>
<div class="footer">
 شكراً لتعاملكم مع ModaPella <br/>
 تواصل معنا: 01090048832
</div>
</body></html>`;

 const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `فاتورة-ModaPella-${id}.html`;
 a.click();
 URL.revokeObjectURL(url);
}

// ─── Invoice Receipt Modal ────────────────────────────────────────────────────

export { saveInvoiceAsHTML };

export default function InvoiceModal({ order, onClose }) {
  const [copies, setCopies] = useState(1);
  const [showDiscount, setShowDiscount] = useState(order?.showDiscountInInvoice !== false);

 if (!order) return null;

 const handlePrint = () => {
 const printDiv = document.createElement('div');
 printDiv.id = 'invoice-print-root';
 const id = order.invoiceNumber || order._id?.toString().slice(-8).toUpperCase();
 const date = new Date(order.createdAt).toLocaleString('ar-EG-u-nu-latn');
 
 // Create the HTML for ONE receipt
 const singleReceiptHTML = `
 <div style="direction:rtl;text-align:right;font-family:Cairo,sans-serif;padding:10px;width:58mm;font-size:12px;color:#000;box-sizing:border-box;">
 <div style="text-align:center;font-weight:bold;font-size:16px;margin-bottom:5px">ModaPella</div>
 <div style="text-align:center;margin-bottom:10px;font-size:11px;color:#444">فاتورة بيع | رقم: ${order.invoiceNumber ? order.invoiceNumber : '#' + id}</div>
 
 <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px;font-size:10px">
 <div><strong>التاريخ:</strong> ${date}</div>
 ${order.customerName ? `<div><strong>العميل:</strong> ${order.customerName} ${order.customerPhone ? `- ${order.customerPhone}` : ''}</div>` : ''}
 ${order._employeeName ? `<div><strong>الموظف:</strong> ${order._employeeName}</div>` : ''}
 ${order.notes ? `<div><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
 </div>

 <div style="border-bottom:1px dashed #000;padding-bottom:5px;margin-bottom:8px">
 ${(order.items || []).map(item => {
    const unitPrice = (item.originalPrice && item.originalPrice > 0) ? item.originalPrice : item.price;
    return `
    <div style="display:flex;justify-content:space-between;margin:4px 0;font-size:12px">
    <span>${item.name} ${item.size ? `(${item.size})` : ''} ${item.color ? `(${item.color})` : ''} x${item.quantity}</span>
    <span>${Number(unitPrice * item.quantity).toLocaleString('en-US')} ج.م</span>
    </div>
    `;
  }).join('')}
 </div>

 <div style="font-weight:bold;font-size:12px">
 ${showDiscount && order.discount > 0 ? `
  <div style="display:flex;justify-content:space-between;font-size:11px;color:#555"><span>الإجمالي قبل الخصم:</span><span>${Number(order.totalAmount + order.discount).toLocaleString('en-US')} ج.م</span></div>
  <div style="display:flex;justify-content:space-between;color:#16a34a"><span>خصم:</span><span>-${Number(order.discount).toLocaleString('en-US')} ج.م</span></div>
  ` : ''}
 <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:5px">
 <span>الإجمالي:</span>
 <span>${Number(order.totalAmount).toLocaleString('en-US')} ج.م</span>
 </div>
 ${order.isDebt ? `
 <div style="border-top:1px dashed #000;margin-top:5px;padding-top:4px">
 <div style="display:flex;justify-content:space-between;font-size:11px;color:#000">
 <span>المدفوع:</span>
 <span>${Number(order.amountPaid || 0).toLocaleString('en-US')} ج.م</span>
 </div>
 <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;margin-top:2px">
 <span>المتبقي (آجل):</span>
 <span>${Number(order.debtAmount || 0).toLocaleString('en-US')} ج.م</span>
 </div>
 </div>
 ` : ''}
 <div style="font-size:10px;margin-top:2px;font-weight:normal">طريقة الدفع: ${order.paymentMethod === 'Cash' ? 'كاش' : order.paymentMethod === 'Instapay' ? 'انستا باي' : 'محفظة'}${order.isDebt ? ' (آجل)' : ''}</div>
 </div>

  <div style="border-top:1px dashed #000;margin-top:8px;padding-top:5px;text-align:right;font-size:8px;line-height:1.35;color:#000">
    <div style="font-weight:bold;text-align:center;margin-bottom:2px;font-size:8.5px">سياسة الاستبدال والاسترجاع:</div>
    <div>• الاستبدال والاسترجاع خلال [ 14 يوماً] من تاريخ الشراء.</div>
    <div>• يشترط وجود الفاتورة الأصلية، وأن تكون البضاعة بحالتها الأصلية وغير مستخدمة وفي غلافها.</div>
    <div>• البضائع المُخفضة أو التالفة بسبب سوء الاستخدام لا تُرد ولا تُستبدل.</div>
    <div>• يتم إرجاع المبلغ بنفس طريقة الدفع الأصلية.</div>
  </div>

 <div style="text-align:center;margin-top:10px;font-size:10px;color:#444">
 شكراً لتعاملكم مع ModaPella <br/>
 تواصل معنا: 01090048832
 </div>
 </div>
 <div style="page-break-after: always;"></div>
 `;

 // Repeat the HTML based on copies
 printDiv.innerHTML = Array(copies).fill(singleReceiptHTML).join('');
 
 document.body.appendChild(printDiv);
 setTimeout(() => {
 window.print();
 document.body.removeChild(printDiv);
 }, 100);
 };

 const handlePrintBarcode = () => {
 const printDiv = document.createElement('div');
 printDiv.id = 'invoice-barcode-print-root';
 const id = order.invoiceNumber || order._id?.toString().slice(-8).toUpperCase();
 const barcodeSVG = renderBarcodeSVG(order.invoiceNumber || order._id?.toString().toUpperCase(), 60);

 const singleLabelHTML = `
 <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:58mm;height:40mm;font-family:Cairo,sans-serif;background:#fff;padding:5mm;box-sizing:border-box;">
 <div style="font-weight:900;font-size:14px;margin-bottom:2px">ModaPella</div>
 <div style="font-size:10px;margin-bottom:5px">كود الفاتورة</div>
 <div style="width:100%;height:15mm;">${barcodeSVG}</div>
 <div style="font-size:12px;margin-top:2px;font-weight:bold">${order.invoiceNumber ? order.invoiceNumber : '#' + id}</div>
 </div>
 <div style="page-break-after: always;"></div>
 `;

 printDiv.innerHTML = Array(copies).fill(singleLabelHTML).join('');
 
 document.body.appendChild(printDiv);
 setTimeout(() => {
 window.print();
 document.body.removeChild(printDiv);
 }, 100);
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
 <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
 {/* Header */}
 <div className="bg-burgundy text-white text-center py-5 px-6">
 <p className="text-xs tracking-widest uppercase opacity-70">ModaPella</p>
 <h2 className="text-xl font-bold mt-1">فاتورة البيع</h2>
 <p className="text-xs opacity-60 mt-1">{order.invoiceNumber || ('#' + order._id?.toString().slice(-8).toUpperCase())}</p>
 </div>

 {/* Invoice Body */}
 <div className="p-5 space-y-4">
          {/* Discount visibility toggle */}
          <div className="flex items-center justify-between p-3 bg-burgundy/5 rounded-2xl border border-burgundy/15">
            <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-burgundy">
              <input
                type="checkbox"
                checked={showDiscount}
                onChange={e => setShowDiscount(e.target.checked)}
                className="w-4 h-4 accent-burgundy rounded cursor-pointer"
              />
              <span>إظهار الخصم في الفاتورة المطبوعة</span>
            </label>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-burgundy/10 text-burgundy">
              {showDiscount ? 'الخصم ظاهر' : 'الخصم مخفي'}
            </span>
          </div>
 <div className="flex justify-between text-xs text-burgundy/50">
 <span>التاريخ</span>
 <span>{new Date(order.createdAt).toLocaleString('ar-EG-u-nu-latn')}</span>
 </div>
 <div className="border-t border-dashed border-burgundy/20" />

 {/* Items */}
 <div className="space-y-2">
 {order.items?.map((item, i) => {
            const unitPrice = (item.originalPrice && item.originalPrice > 0) ? item.originalPrice : item.price;
            return (
              <div key={i} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-semibold text-burgundy">{item.name}</p>
                  <p className="text-xs text-burgundy/50">
                    {item.size && <span className="ml-2">المقاس: {item.size}</span>}
                    {item.color && <span>اللون: {item.color}</span>}
                  </p>
                  <p className="text-xs text-burgundy/50">الكمية: {item.quantity} × {EGP(unitPrice)}</p>
                </div>
                <p className="font-bold text-burgundy">{EGP(unitPrice * item.quantity)}</p>
              </div>
            );
          })}
 </div>

 <div className="border-t border-dashed border-burgundy/20" />

 {/* Totals */}
 <div className="space-y-1 text-sm">
 {showDiscount && order.discount > 0 && (
              <>
                <div className="flex justify-between text-burgundy/60">
                  <span>الإجمالي قبل الخصم</span>
                  <span>{EGP(order.totalAmount + order.discount)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>خصم</span>
                  <span>- {EGP(order.discount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-bold text-base text-burgundy">
 <span>الإجمالي</span>
 <span>{EGP(order.totalAmount)}</span>
 </div>
 {order.isDebt && (
 <>
 <div className="border-t border-dashed border-amber-300 my-1" />
 <div className="flex justify-between text-xs font-semibold text-emerald-700">
 <span>المدفوع نقداً</span>
 <span>{EGP(order.amountPaid || 0)}</span>
 </div>
 <div className="flex justify-between text-xs font-extrabold text-amber-700 bg-amber-50 rounded-xl px-2.5 py-1.5">
 <span>المتبقي (دين على العميل)</span>
 <span>{EGP(order.debtAmount || 0)}</span>
 </div>
 </>
 )}
 <div className="flex justify-between text-sm text-burgundy/60">
 <span>طريقة الدفع</span>
 <span>{order.paymentMethod === 'Cash' ? ' كاش' : order.paymentMethod === 'Instapay' ? ' انستا باي' : ' محفظة كاش'}{order.isDebt ? ' (آجل)' : ''}</span>
 </div>
 </div>

 <div className="border-t border-dashed border-burgundy/20" />
 {order.notes && (
 <>
 <div className="text-xs text-burgundy/60 bg-burgundy/5 p-2.5 rounded-xl border border-burgundy/10">
 <strong>ملاحظات:</strong> {order.notes}
 </div>
 <div className="border-t border-dashed border-burgundy/20" />
 </>
 )}
  <div className="border-t border-dashed border-burgundy/15 pt-3 text-[11px] text-burgundy/70 space-y-1 text-right">
    <p className="font-bold text-burgundy text-center mb-1">سياسة الاستبدال والاسترجاع:</p>
    <p>• الاستبدال والاسترجاع خلال [ 14 يوماً] من تاريخ الشراء.</p>
    <p>• يشترط وجود الفاتورة الأصلية، وأن تكون البضاعة بحالتها الأصلية وغير مستخدمة وفي غلافها.</p>
    <p>• البضائع المُخفضة أو التالفة بسبب سوء الاستخدام لا تُرد ولا تُستبدل.</p>
    <p>• يتم إرجاع المبلغ بنفس طريقة الدفع الأصلية.</p>
  </div>

 <p className="text-center text-xs text-burgundy/40 pt-2">شكراً لتعاملكم معنا </p>
 <p className="text-center text-[10px] text-burgundy/30">تواصل معنا: 01090048832</p>
 </div>

 {/* Actions */}
 <div className="grid grid-cols-2 gap-2 p-4 bg-[#F7F0EC] border-b border-burgundy/10">
 <button
 onClick={onClose}
 className="rounded-xl border border-burgundy/20 py-2.5 text-sm font-medium text-burgundy/70 transition hover:bg-burgundy/10"
 >
 إغلاق
 </button>
 <button
 onClick={() => saveInvoiceAsHTML(order, showDiscount)}
 className="rounded-xl border-2 border-burgundy/30 py-2.5 text-sm font-bold text-burgundy transition hover:bg-burgundy/10"
 >
 حفظ HTML
 </button>
 </div>
 
 {/* Print Section with Copies Counter */}
 <div className="p-4 bg-white flex items-center gap-3">
 <div className="flex items-center gap-0 bg-[#F7F0EC] rounded-xl overflow-hidden border border-burgundy/15">
 <button onClick={() => setCopies(c => Math.max(1, c - 1))} className="w-10 h-10 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition">−</button>
 <span className="w-10 text-center font-bold text-burgundy">{copies}</span>
 <button onClick={() => setCopies(c => c + 1)} className="w-10 h-10 flex items-center justify-center text-lg font-bold text-burgundy hover:bg-burgundy/10 transition">+</button>
 </div>
 <span className="text-xs font-bold text-burgundy/50 w-8">نسخة</span>
 <div className="flex gap-2 flex-1">
 <button
 onClick={handlePrint}
 className="flex-1 rounded-xl bg-burgundy py-3 text-xs font-bold text-white transition hover:bg-[#650018] shadow-lg shadow-burgundy/20"
 >
 طباعة الفاتورة
 </button>
 <button
 onClick={handlePrintBarcode}
 className="flex-1 rounded-xl bg-[#F7F0EC] border-2 border-burgundy py-3 text-xs font-bold text-burgundy transition hover:bg-burgundy/10 shadow-lg shadow-burgundy/20"
 >
 طباعة كود
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

// ─── Toast Notification ───────────────────────────────────────────────────────
