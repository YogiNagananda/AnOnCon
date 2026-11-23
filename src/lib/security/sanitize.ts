/**
 * Input sanitization, XSS mitigation, and CSRF origin verification helpers.
 */

/**
 * Strips script tags, HTML tags, and escapes dangerous characters from strings.
 */
export function sanitizeInput(input: string, maxLength: number = 2000): string {
  if (typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return char;
      }
    })
    .trim();
}

/**
 * Checks Origin and Referer headers against allowed hosts for state-changing API requests.
 */
export function verifyCsrfOrigin(headers: Headers): boolean {
  const origin = headers.get('origin');
  const referer = headers.get('referer');
  const host = headers.get('host');

  // If both origin and referer are absent (e.g. native mobile or server-to-server), allow or check custom header
  if (!origin && !referer) return true;

  const targetHost = origin ? new URL(origin).host : referer ? new URL(referer).host : null;

  if (targetHost && host && targetHost !== host) {
    // Also allow common local dev origins
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      return true;
    }
    return false;
  }

  return true;
}
