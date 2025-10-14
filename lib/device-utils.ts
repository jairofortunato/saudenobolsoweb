/**
 * Device detection utilities
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check user agent
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];

  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Check screen size as additional validation
  const isSmallScreen = window.innerWidth <= 768;

  // Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Consider it mobile if UA matches OR (small screen AND touch capable)
  return isMobileUA || (isSmallScreen && isTouchDevice);
}

export function isWhatsAppBrowser(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.includes('whatsapp');
}

export function isFromWhatsApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if opened from WhatsApp browser
  if (isWhatsAppBrowser()) {
    return true;
  }

  // Check referrer
  const referrer = document.referrer.toLowerCase();
  if (referrer.includes('whatsapp') || referrer.includes('wa.me')) {
    return true;
  }

  // Check URL params for WhatsApp indicator
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('source') === 'whatsapp' || urlParams.get('from') === 'whatsapp') {
    return true;
  }

  return false;
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') {
    return 'desktop';
  }

  const width = window.innerWidth;

  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}
