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

  if (!apiUrl && (!instanceId || !apiToken)) {
    console.log('ℹ️ [WhatsApp Service] No WhatsApp API credentials configured in .env. OTP printed to console log above.');
    return { success: true, mode: 'console' };
  }

  try {
    // If using Green-API: https://api.green-api.com/waInstance{idInstance}/sendMessage/{token}
    // If using UltraMsg: https://api.ultramsg.com/{instanceId}/messages/chat
    // If custom API_URL is provided, we send a standard POST payload
    let endpoint = apiUrl;
    let payload = {
      chatId: `${targetPhone}@c.us`,
      phone: targetPhone,
      message: message,
      body: message,
      to: targetPhone
    };
    let headers = { 'Content-Type': 'application/json' };

    if (instanceId && apiToken && !apiUrl) {
      // Default Green-API structure
      endpoint = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;
      payload = {
        chatId: `${targetPhone}@c.us`,
        message: message
      };
    } else if (apiToken) {
      headers['Authorization'] = `Bearer ${apiToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('✅ [WhatsApp Service] Message sent via API response:', data);
    return { success: true, mode: 'api', data };
  } catch (error) {
    console.error('⚠️ [WhatsApp Service Error] Failed to reach WhatsApp API gateway:', error.message);
    // Don't throw error to crash login, OTP is still logged in console
    return { success: true, mode: 'console_fallback', error: error.message };
  }
};

module.exports = {
  sendWhatsAppOTP,
  formatPhone
};
