/**
 * Cloudflare Turnstile server-side verification helper.
 * Gracefully permits testing in local development when keys are not configured.
 */

export interface CaptchaVerifyResult {
  success: boolean;
  error?: string;
  isBypassedInDev?: boolean;
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<CaptchaVerifyResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // Development / test bypass if secret key is omitted
  if (!secretKey) {
    return { success: true, isBypassedInDev: true };
  }

  if (!token) {
    return { success: false, error: 'CAPTCHA verification token is missing' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });

    const data = await res.json();
    if (!data.success) {
      return {
        success: false,
        error: data['error-codes']?.join(', ') || 'CAPTCHA verification failed',
      };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Turnstile verification error:', err);
    return { success: false, error: 'Failed to reach CAPTCHA verification service' };
  }
}
