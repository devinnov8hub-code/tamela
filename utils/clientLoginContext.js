/**
 * Best-effort client hints for login activity (IP must come from Edge Function in production).
 * @returns {{
 *   user_agent: string | null,
 *   device_type: string | null,
 *   browser: string | null,
 *   timezone: string | null,
 *   language: string | null,
 * }}
 */
export function collectClientLoginContext() {
  if (typeof navigator === "undefined") {
    return {
      user_agent: null,
      device_type: null,
      browser: null,
      timezone: null,
      language: null,
    };
  }

  const userAgent = navigator.userAgent || null;

  return {
    user_agent: userAgent,
    device_type: detectDeviceType(userAgent),
    browser: detectBrowser(userAgent),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    language: navigator.language || null,
  };
}

/**
 * @param {string | null} ua
 */
function detectDeviceType(ua) {
  if (!ua) return null;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua)) return "mobile";
  return "desktop";
}

/**
 * @param {string | null} ua
 */
function detectBrowser(ua) {
  if (!ua) return null;
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) return "Safari";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  return "Unknown";
}
