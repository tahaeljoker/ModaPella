require('dotenv').config();

/**
 * WhatsApp Gateway Service for ModaPella
 * Supports HTTP WhatsApp Gateways (Green-API, UltraMsg, CallMeBot, Twilio, Custom Webhooks)
 * Falls back gracefully to console logging if credentials are missing or in dev mode.
 */

const formatPhone = (phone) => {
  if (!phone) return '';
  // Remove spaces, dashes, plus signs
  let cleaned = String(phone).replace(/[^\d]/g, '');
  // Default to Egypt (+20) if starts with 01
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
};

/**
 * Sends a generic WhatsApp message to the target phone number.
 * 
 * @param {string} phone - Target phone number
 * @param {string} message - Text message content
 * @returns {Promise<object>} Status result
 */
const sendWhatsAppMessage = async (phone, message) => {
  const targetPhone = formatPhone(phone);
  if (!targetPhone) {
    return { success: false, reason: 'Invalid or missing phone number' };
  }

  console.log('\n========================================');
  console.log(`📱 [WhatsApp Service - Outgoing Message]`);
  console.log(`🎯 Target Number: ${targetPhone}`);
  console.log(`💬 Message Preview:\n${message}`);
  console.log('========================================\n');

  // Check if WhatsApp API Environment Variables are present
  const apiUrl = process.env.WHATSAPP_API_URL;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const callmebotApiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiUrl && (!instanceId || !apiToken) && !callmebotApiKey) {
    console.log('ℹ️ [WhatsApp Service] No WhatsApp API credentials configured in .env. Message printed to console above.');
    return { success: true, mode: 'console' };
  }

  try {
    let endpoint = apiUrl;
    let method = 'POST';
    let payload = null;
    let headers = { 'Content-Type': 'application/json' };

    if (callmebotApiKey || (apiUrl && apiUrl.includes('callmebot.com'))) {
      // CallMeBot Free API (GET request)
      const key = callmebotApiKey || apiToken;
      const encodedMsg = encodeURIComponent(message);
      const encodedPhone = encodeURIComponent('+' + targetPhone);
      endpoint = `https://api.callmebot.com/whatsapp.php?phone=${encodedPhone}&text=${encodedMsg}&apikey=${key}`;
      method = 'GET';
      headers = {};
    } else if (instanceId && apiToken) {
      // Green-API structure (supports custom instance hosts like https://7107.api.greenapi.com)
      const baseUrl = (apiUrl && !apiUrl.includes('callmebot')) ? apiUrl.replace(/\/$/, '') : 'https://api.green-api.com';
      endpoint = `${baseUrl}/waInstance${instanceId}/sendMessage/${apiToken}`;
      payload = JSON.stringify({
        chatId: `${targetPhone}@c.us`,
        message: message
      });
    } else {
      // Generic POST API
      payload = JSON.stringify({
        chatId: `${targetPhone}@c.us`,
        phone: targetPhone,
        message: message,
        body: message,
        to: targetPhone
      });
      if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;
    }

    const fetchOpts = { method, headers };
    if (payload) fetchOpts.body = payload;

    const response = await fetch(endpoint, fetchOpts);
    const textData = await response.text();
    console.log('✅ [WhatsApp Service] Gateway response:', textData);
    return { success: true, mode: 'api', data: textData };
  } catch (error) {
    console.error('⚠️ [WhatsApp Service Error] Failed to reach WhatsApp API gateway:', error.message);
    return { success: true, mode: 'console_fallback', error: error.message };
  }
};

/**
 * Sends a 2FA OTP code via WhatsApp
 */
const sendWhatsAppOTP = async (phone, otpCode) => {
  const targetPhone = phone || process.env.ADMIN_WHATSAPP_NUMBER;
  const message = `🔑 *رمز التحقق لدخول لوحة التحكم — ModaPella*

رمز الدخول الخاص بك هو:
👉 *${otpCode}*

⏰ الرمز صالح لمدة 5 دقائق.
🔒 لا تشارك هذا الرمز مع أي شخص لأمان حسابك.`;

  return await sendWhatsAppMessage(targetPhone, message);
};

/**
 * Generates a clean wa.me direct URL for a phone and message text
 */
const generateDirectWhatsAppUrl = (phone, message) => {
  const targetPhone = formatPhone(phone);
  if (!targetPhone) return '';
  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
};

/**
 * Generates structured, prestigious copy for a customer purchase invoice
 */
const generateOrderInvoiceMessage = ({ order, customerName }) => {
  const name = customerName || order.customerName || 'عميلتنا العزيزة';
  const invNumber = order.invoiceNumber || (order._id ? `#${order._id.toString().slice(-6).toUpperCase()}` : '—');
  const dateStr = new Date(order.createdAt || Date.now()).toLocaleDateString('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const itemsList = (order.items || []).map((it, idx) => {
    const details = [
      it.size ? `مقاس: ${it.size}` : null,
      it.color ? `لون: ${it.color}` : null
    ].filter(Boolean).join(' | ');

    const detailsStr = details ? ` (${details})` : '';
    const unitPrice = (it.originalPrice && it.originalPrice > 0) ? it.originalPrice : it.price;
    const lineTotal = Number(it.price || unitPrice) * Number(it.quantity || 1);

    return `${idx + 1}. *${it.name}*${detailsStr}\n   العدد: ${it.quantity} × ${Number(unitPrice).toLocaleString('en-US')} ج.م = *${lineTotal.toLocaleString('en-US')} ج.م*`;
  }).join('\n');

  const discountText = order.discount > 0 ? `\n🎁 *خصم الفاتورة:* -${Number(order.discount).toLocaleString('en-US')} ج.م` : '';
  const payMethodName = order.paymentMethod === 'Cash' ? 'كاش نقدي' : order.paymentMethod === 'Instapay' ? 'إنستاباي' : (order.paymentMethod || 'كاش');
  
  let debtText = '';
  if (order.isDebt && order.debtAmount > 0) {
    debtText = `\n💵 *المدفوع نقداً:* ${Number(order.amountPaid || 0).toLocaleString('en-US')} ج.م\n⚠️ *المتبقي (آجل / دين):* ${Number(order.debtAmount).toLocaleString('en-US')} ج.م`;
  }

  return `🌸 *فاتورة شراء — ModaPella* 🌸

أهلاً بكِ يا *${name}*،
شكراً لاختياركِ ModaPella وتسوقكِ معنا! سعداء جداً بخدمتك ونتمنى أن تنال مشترياتكِ إعجابك وتزيد من تألقكِ في كل مناسبة ✨

━━━━━━━━━━━━━━━━━━
🧾 *بيانات الفاتورة:*
• رقم الفاتورة: *${invNumber}*
• التاريخ: ${dateStr}
• طريقة الدفع: ${payMethodName}
━━━━━━━━━━━━━━━━━━
🛍️ *تفاصيل المشتريات:*
${itemsList || '• مشتريات أزياء مختارة'}
━━━━━━━━━━━━━━━━━━
💰 *إجمالي الفاتورة:* *${Number(order.totalAmount).toLocaleString('en-US')} ج.م*${discountText}${debtText}
━━━━━━━━━━━━━━━━━━

✨ *تابعي كل جديد ونسقي إطلالاتكِ:*
تفضلي بزيارة موقعنا لاكتشاف أحدث كولكشن وعروضنا المميزة وتجربة غرفة التنسيق على المانيكان:
🌐 https://modapella.com

📱 *تابعينا على صفحاتنا الرسمية:*
• إنستجرام: instagram.com/moda_pella
• تيك توك: tiktok.com/@moda.pella
• فيسبوك: facebook.com/share/1HdfNYn5QX

📍 *عنوان صالة العرض:* شارع الإعدادية بنات، بني مزار، المنيا
📞 *خدمة العملاء والاستفسارات:* 01090048832

شكراً لثقتكِ الغالية وفي انتظار زيارتكِ القادمة دائماً! 💐`;
};

/**
 * Sends a WhatsApp purchase invoice to the customer
 */
const sendOrderInvoiceWhatsApp = async ({ order, customerName, customerPhone }) => {
  const phone = customerPhone || order.customerPhone;
  if (!phone || phone === 'بدون هاتف' || phone.trim() === '') {
    return { success: false, reason: 'No phone number available' };
  }

  const message = generateOrderInvoiceMessage({ order, customerName });
  const directLink = generateDirectWhatsAppUrl(phone, message);
  const waResult = await sendWhatsAppMessage(phone, message);

  return {
    ...waResult,
    message,
    directLink
  };
};

/**
 * Generates clear, appreciative copy for a customer debt settlement
 */
const generateDebtSettlementMessage = ({
  customerName,
  amountPaid,
  paymentMethod = 'Cash',
  remainingDebt = 0,
  settledOrders = [],
  notes = ''
}) => {
  const name = customerName || 'عميلنا العزيز';
  const dateStr = new Date().toLocaleDateString('ar-EG-u-nu-latn', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const payMethodName = paymentMethod === 'Cash' ? 'كاش نقدي' : paymentMethod === 'Instapay' ? 'إنستاباي' : paymentMethod;
  const isFullySettled = Number(remainingDebt) <= 0.5;

  const ordersDetail = (settledOrders || []).map(o => {
    const inv = o.invoiceNumber || (o._id ? `#${o._id.toString().slice(-6).toUpperCase()}` : '—');
    const status = (Number(o.debtAmount) <= 0.5) ? '✅ تم سداد الفاتورة بالكامل' : `متبقي بالفاتورة: ${Number(o.debtAmount).toLocaleString('en-US')} ج.م`;
    return `• فاتورة *${inv}*: ${status}`;
  }).join('\n');

  const statusSummary = isFullySettled
    ? `🎉 *تم تسوية وسداد كامل الحساب بنجاح!*\n• رصيد الدين المتبقي: *0 ج.م* (حسابك خالص بالكامل ✅).`
    : `📊 *رصيد الدين المتبقي بعد السداد:* *${Number(remainingDebt).toLocaleString('en-US')} ج.م*`;

  return `✨ *إشعار سداد حساب — ModaPella* ✨

أهلاً بكِ يا *${name}*،
تم بحمد الله استلام وتسجيل دفعة سداد لحسابك لدى ModaPella بالتفاصيل التالية:

━━━━━━━━━━━━━━━━━━
💰 *المبلغ المسدد الآن:* *${Number(amountPaid).toLocaleString('en-US')} ج.م*
💵 *طريقة السداد:* ${payMethodName}
📅 *تاريخ وساعة السداد:* ${dateStr}
${notes ? `📝 *ملاحظات:* ${notes}\n` : ''}━━━━━━━━━━━━━━━━━━
📋 *الفواتير المشمولة بالسداد:*
${ordersDetail || '• سداد حساب آجل'}
━━━━━━━━━━━━━━━━━━
${statusSummary}
━━━━━━━━━━━━━━━━━━

خالص شكرنا وتقديرنا لتعاملك الراقي والتزامك الدائم معنا 🌸
نسعد دائماً بخدمتك ونتشرف بزيارتك في أي وقت!

🌐 *موقعنا:* https://modapella.com
📍 *العنوان:* شارع الإعدادية بنات، بني مزار، المنيا
📞 *للتواصل والاستفسار:* 01090048832`;
};

/**
 * Sends a WhatsApp debt settlement notification to the customer
 */
const sendDebtSettlementWhatsApp = async ({
  customerName,
  customerPhone,
  amountPaid,
  paymentMethod = 'Cash',
  remainingDebt = 0,
  settledOrders = [],
  notes = ''
}) => {
  if (!customerPhone || customerPhone === 'بدون هاتف' || customerPhone.trim() === '') {
    return { success: false, reason: 'No phone number available' };
  }

  const message = generateDebtSettlementMessage({
    customerName,
    amountPaid,
    paymentMethod,
    remainingDebt,
    settledOrders,
    notes
  });

  const directLink = generateDirectWhatsAppUrl(customerPhone, message);
  const waResult = await sendWhatsAppMessage(customerPhone, message);

  return {
    ...waResult,
    message,
    directLink
  };
};

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppOTP,
  formatPhone,
  generateDirectWhatsAppUrl,
  generateOrderInvoiceMessage,
  sendOrderInvoiceWhatsApp,
  generateDebtSettlementMessage,
  sendDebtSettlementWhatsApp
};
