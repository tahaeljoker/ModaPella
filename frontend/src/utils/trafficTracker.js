/**
 * Smart Traffic & Ad Campaign Tracker for ModaPella
 * Captures UTM parameters, social referrals (Instagram, TikTok, Facebook, WhatsApp),
 * and friend share links, persisting acquisition source across customer session.
 */

const STORAGE_KEY = 'modapella_traffic_source';

export function initTrafficTracking() {
  try {
    // Only capture on initial visit in session or if new campaign detected
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get('utm_source');
    const utmCampaign = searchParams.get('utm_campaign');
    const utmMedium = searchParams.get('utm_medium');
    const ref = searchParams.get('ref');
    const referrer = document.referrer || '';

    // If already stored and current URL has no new campaign params, keep existing
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing && !utmSource && !utmCampaign && !ref) {
      return JSON.parse(existing);
    }

    let detectedSource = 'Direct';
    let detectedMedium = utmMedium || 'organic';
    let detectedCampaign = utmCampaign || '';

    // Check UTM source first
    if (utmSource) {
      const src = utmSource.toLowerCase();
      if (src.includes('instagram') || src.includes('ig')) detectedSource = 'Instagram';
      else if (src.includes('tiktok') || src.includes('tt')) detectedSource = 'TikTok';
      else if (src.includes('facebook') || src.includes('fb')) detectedSource = 'Facebook';
      else if (src.includes('whatsapp') || src.includes('wa')) detectedSource = 'WhatsApp';
      else detectedSource = utmSource;
      detectedMedium = utmMedium || 'paid_ad';
    } else if (ref === 'share_friend') {
      detectedSource = 'WhatsApp / Share';
      detectedMedium = 'friend_referral';
      detectedCampaign = 'share_outfit';
    } else if (referrer) {
      const refLower = referrer.toLowerCase();
      if (refLower.includes('instagram.com')) {
        detectedSource = 'Instagram';
        detectedMedium = 'social';
      } else if (refLower.includes('tiktok.com')) {
        detectedSource = 'TikTok';
        detectedMedium = 'social';
      } else if (refLower.includes('facebook.com') || refLower.includes('fb.com')) {
        detectedSource = 'Facebook';
        detectedMedium = 'social';
      } else if (refLower.includes('whatsapp.com')) {
        detectedSource = 'WhatsApp';
        detectedMedium = 'chat';
      }
    }

    const data = {
      source: detectedSource,
      campaign: detectedCampaign,
      medium: detectedMedium,
      ref: ref || '',
      landingPage: window.location.pathname,
      timestamp: new Date().toISOString()
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('Traffic tracking error:', e);
    return { source: 'Direct', campaign: '', medium: '', ref: '' };
  }
}

export function getTrafficSource() {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return initTrafficTracking();
  } catch {
    return { source: 'Direct', campaign: '', medium: '', ref: '' };
  }
}
