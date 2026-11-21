/**
 * Generates direct WhatsApp share link for an in-store order invoice
 */
export function generateWhatsAppInvoiceUrl(order) {
  if (!order || !order.customerPhone) return '';
  let phone = String(order.customerPhone).replace(/[^\d]/g, '');
  if (phone.startsWith('01') && phone.length === 11) {
    phone = '20' + phone;
  }
  if (!phone) return '';

  const name = order.customerName || 'عميلتنا العزيزة';
  const id = order.invoiceNumber || (order._id ? `#${order._id.toString().slice(-6).toUpperCase()}` : '—');
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('ar-EG-u-nu-latn');

  const itemsList = (order.items || []).map((it, idx) => {
    const details = [it.size ? `مقاس: ${it.size}` : null, it.color ? `لون: ${it.color}` : null].filter(Boolean).join(' | ');
    const lineTotal = Number(it.price) * Number(it.quantity || 1);
    return `${idx + 1}. *${it.name}*${details ? ` (${details})` : ''}\n   العدد: ${it.quantity} × ${Number(it.price).toLocaleString('en-US')} ج.م = *${lineTotal.toLocaleString('en-US')} ج.م*`;
  }).join('\n');

  const discountText = order.discount > 0 ? `\n🎁 *خصم الفاتورة:* -${Number(order.discount).toLocaleString('en-US')} ج.م` : '';
  const payMethodName = order.paymentMethod === 'Cash' ? 'كاش نقدي' : order.paymentMethod === 'Instapay' ? 'إنستاباي' : (order.paymentMethod || 'كاش');
  let debtText = '';
  if (order.isDebt && order.debtAmount > 0) {
    debtText = `\n💵 *المدفوع نقداً:* ${Number(order.amountPaid || 0).toLocaleString('en-US')} ج.م\n⚠️ *المتبقي (آجل / دين):* ${Number(order.debtAmount).toLocaleString('en-US')} ج.م`;
  }

  const message = `🌸 *فاتورة شراء — ModaPella* 🌸

أهلاً بكِ يا *${name}*،
شكراً لاختياركِ ModaPella وتسوقكِ معنا! سعداء جداً بخدمتك ونتمنى أن تنال مشترياتكِ إعجابك وتزيد من تألقكِ في كل مناسبة ✨

━━━━━━━━━━━━━━━━━━
🧾 *بيانات الفاتورة:*
• رقم الفاتورة: *${id}*
• التاريخ: ${dateStr}
• طريقة الدفع: ${payMethodName}
━━━━━━━━━━━━━━━━━━
🛍️ *تفاصيل المشتريات:*
${itemsList || '• مشتريات أزياء مختارة'}
━━━━━━━━━━━━━━━━━━
💰 *إجمالي الفاتورة:* *${Number(order.totalAmount).toLocaleString('en-US')} ج.م*${discountText}${debtText}
━━━━━━━━━━━━━━━━━━

✨ *تابعي أحدث كولكشن وإطلالات الموسم:*
شوفي كل الموديلات الجديدة ونسقي أطقمك على موقعنا:
🌐 https://modapella.com

📱 *تابعينا على صفحاتنا الرسمية:*
• إنستجرام: instagram.com/moda_pella
• تيك توك: tiktok.com/@moda.pella
• فيسبوك: facebook.com/share/1HdfNYn5QX

📍 *عنوان صالة العرض:* شارع الإعدادية بنات، بني مزار، المنيا
📞 *خدمة العملاء والاستفسارات:* 01090048832

شكراً لثقتكِ الغالية وفي انتظار زيارتكِ القادمة دائماً! 💐`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
