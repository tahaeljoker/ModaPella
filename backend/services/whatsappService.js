require('dotenv').config();

/**
 * WhatsApp Gateway Service for ModaPella Admin OTP Verification
 * Supports HTTP WhatsApp Gateways (Green-API, UltraMsg, CallMeBot, Twilio, Custom Webhooks)
 * Falls back gracefully to console logging if credentials are missing or in dev mode.
 */

const formatPhone = (phone) => {
  if (!phone) return '';
  // Remove spaces, dashes, plus signs
  let cleaned = phone.replace(/[^\d]/g, '');
  // Default to Egypt (+20) if starts with 01
  if (cleaned.startsWith('01') && cleaned.length === 11) {
    cleaned = '20' + cleaned;
  }
  return cleaned;
};

const sendWhatsAppOTP = async (phone, otpCode) => {
  const targetPhone = formatPhone(phone || process.env.ADMIN_WHATSAPP_NUMBER);
  const message = `🔑 رمز التحقق الخاص بدخول لوحة تحكم ModaPella هو: *${otpCode}*\n\nهذا الرمز صالح لمدة 5 دقائق. لا تشاركه مع أحد.`;

  console.log('\n========================================');
  console.log(`📱 [WhatsApp OTP Service]`);
  console.log(`🎯 Target Number: ${targetPhone || 'NOT_SPECIFIED'}`);
  console.log(`🔑 OTP Code: ${otpCode}`);
  console.log('========================================\n');

  // Check if WhatsApp API Environment Variables are present
  const apiUrl = process.env.WHATSAPP_API_URL;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const callmebotApiKey = process.env.CALLMEBOT_API_KEY;

  if (!apiUrl && (!instanceId || !apiToken) && !callmebotApiKey) {
    console.log('ℹ️ [WhatsApp Service] No WhatsApp API credentials configured in .env. OTP printed to console log above.');
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

module.exports = {
  sendWhatsAppOTP,
  formatPhone
};
