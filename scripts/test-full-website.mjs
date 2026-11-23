/**
 * Comprehensive Automated End-to-End Test Suite for Anon Connect
 * Tests pages, security headers, protected route redirection, API endpoints,
 * age checks, and automated content filters.
 */

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Starting Full Website Test Suite for Anon Connect...\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  ❌ [FAIL] ${testName} ${details ? '— ' + details : ''}`);
      failedCount++;
    }
  }

  // ==========================================
  // 1. PUBLIC PAGES RENDERING & CONTENT
  // ==========================================
  console.log('--- 1. Testing Public Pages & Legal Content ---');

  // Landing Page
  const homeRes = await fetch(`${BASE_URL}/`);
  assert(homeRes.status === 200, 'GET / returns 200 OK');
  const homeHtml = await homeRes.text();
  assert(homeHtml.includes('Anon Connect') || homeHtml.includes('Connect'), 'Landing page contains brand name');
  assert(homeHtml.includes('18+'), 'Landing page contains 18+ indicator');
  assert(homeHtml.includes('Terms of Service') && homeHtml.includes('Privacy Policy'), 'Universal footer rendered on home page');

  // Safety Center
  const safetyRes = await fetch(`${BASE_URL}/safety`);
  assert(safetyRes.status === 200, 'GET /safety returns 200 OK');
  const safetyHtml = await safetyRes.text();
  assert(safetyHtml.includes('Safety Center') || safetyHtml.includes('Safety First'), 'Safety Center title rendered');
  assert(safetyHtml.includes('988') || safetyHtml.includes('Crisis'), 'Emergency crisis helplines rendered in Safety Center');

  // Terms of Service
  const termsRes = await fetch(`${BASE_URL}/terms`);
  assert(termsRes.status === 200, 'GET /terms returns 200 OK');
  const termsHtml = await termsRes.text();
  assert(termsHtml.includes('Draft Template') && termsHtml.includes('Legal Review'), 'Terms page contains Draft Legal Review banner');
  assert(termsHtml.includes('18+ Age Requirement'), 'Terms page contains 18+ section');

  // Privacy Policy
  const privacyRes = await fetch(`${BASE_URL}/privacy`);
  assert(privacyRes.status === 200, 'GET /privacy returns 200 OK');
  const privacyHtml = await privacyRes.text();
  assert(privacyHtml.includes('Draft Template'), 'Privacy page contains Draft Legal Review banner');
  assert(privacyHtml.includes('Ephemeral Location Fuzzing') || privacyHtml.includes('Fuzzing'), 'Privacy page documents location fuzzing');

  // Community Guidelines
  const guidelinesRes = await fetch(`${BASE_URL}/guidelines`);
  assert(guidelinesRes.status === 200, 'GET /guidelines returns 200 OK');
  const guidelinesHtml = await guidelinesRes.text();
  assert(guidelinesHtml.includes('Community Guidelines'), 'Guidelines page title rendered');
  assert(guidelinesHtml.includes('Zero Tolerance'), 'Guidelines page contains Zero Tolerance section');

  // Account Banned Page
  const bannedRes = await fetch(`${BASE_URL}/auth/banned`);
  assert(bannedRes.status === 200, 'GET /auth/banned returns 200 OK');
  const bannedHtml = await bannedRes.text();
  assert(bannedHtml.includes('Account Restricted') || bannedHtml.includes('Banned'), 'Banned page renders restriction notice');

  // ==========================================
  // 2. AUTHENTICATION PAGES & FORMS
  // ==========================================
  console.log('\n--- 2. Testing Authentication Pages & Bot Protection ---');

  // Login Page
  const loginRes = await fetch(`${BASE_URL}/auth/login`);
  assert(loginRes.status === 200, 'GET /auth/login returns 200 OK');
  const loginHtml = await loginRes.text();
  assert(loginHtml.includes('Sign in') || loginHtml.includes('login'), 'Login page renders form');
  assert(loginHtml.includes('Cloudflare Turnstile') || loginHtml.includes('Turnstile'), 'Turnstile bot protection present on login');

  // Signup Page
  const signupRes = await fetch(`${BASE_URL}/auth/signup`);
  assert(signupRes.status === 200, 'GET /auth/signup returns 200 OK');
  const signupHtml = await signupRes.text();
  assert(signupHtml.includes('Date of Birth'), 'Signup page renders DOB input fields');
  assert(signupHtml.includes('18 years of age'), 'Signup page renders 18+ confirmation checkbox');
  assert(signupHtml.includes('Cloudflare Turnstile') || signupHtml.includes('Turnstile'), 'Turnstile bot protection present on signup');

  // ==========================================
  // 3. SECURITY HEADERS
  // ==========================================
  console.log('\n--- 3. Testing Security Headers ---');

  const headers = homeRes.headers;
  assert(headers.get('x-frame-options') === 'DENY', 'X-Frame-Options: DENY is active');
  assert(headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff is active');
  assert(headers.get('referrer-policy') === 'strict-origin-when-cross-origin', 'Referrer-Policy: strict-origin-when-cross-origin is active');
  assert(headers.get('strict-transport-security')?.includes('max-age=63072000'), 'Strict-Transport-Security (HSTS) is active');
  assert(headers.get('permissions-policy')?.includes('geolocation=(self)'), 'Permissions-Policy is active');
  assert(headers.get('content-security-policy')?.includes("default-src 'self'"), 'Content-Security-Policy (CSP) is active');

  // ==========================================
  // 4. PROTECTED ROUTES REDIRECTION (MIDDLEWARE)
  // ==========================================
  console.log('\n--- 4. Testing Protected Route Middleware Redirections ---');

  // Dashboard redirect
  const dashRes = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
  assert(
    dashRes.status === 307 || dashRes.status === 302,
    `Unauthenticated /dashboard redirects (status: ${dashRes.status})`
  );
  assert(
    dashRes.headers.get('location')?.includes('/auth/login'),
    `Redirect target points to /auth/login (location: ${dashRes.headers.get('location')})`
  );

  // Admin redirect
  const adminRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  assert(
    adminRes.status === 307 || adminRes.status === 302,
    `Unauthenticated /admin redirects (status: ${adminRes.status})`
  );
  assert(
    adminRes.headers.get('location')?.includes('/auth/login'),
    `Redirect target points to /auth/login for /admin (location: ${adminRes.headers.get('location')})`
  );

  // Settings redirect
  const settingsRes = await fetch(`${BASE_URL}/settings`, { redirect: 'manual' });
  assert(
    settingsRes.status === 307 || settingsRes.status === 302,
    `Unauthenticated /settings redirects (status: ${settingsRes.status})`
  );

  // ==========================================
  // 5. SERVER-SIDE AGE VERIFICATION API
  // ==========================================
  console.log('\n--- 5. Testing Server-Side Age Verification APIs ---');

  // 1. Check Age API with Underage DOB
  const underAgeRes = await fetch(`${BASE_URL}/api/auth/check-age`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dob: '2015-05-15' }), // 11 years old
  });
  const underAgeJson = await underAgeRes.json();
  assert(underAgeRes.status === 403, 'Underage DOB is blocked with HTTP 403 Forbidden');
  assert(underAgeJson.isAdult === false, 'API returns isAdult = false for minor');

  // 2. Check Age API with Adult DOB (without active session, returns 401 Not authenticated)
  const adultRes = await fetch(`${BASE_URL}/api/auth/check-age`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dob: '1998-05-15' }), // Adult
  });
  const adultJson = await adultRes.json();
  assert(adultRes.status === 401, 'Adult DOB without active session proceeds past age check to 401 Not authenticated');
  assert(adultJson.error === 'Not authenticated', 'Response indicates age check passed and requires authentication');

  // 3. Signup with Underage DOB
  const randIp1 = `192.168.100.${Math.floor(Math.random() * 200) + 1}`;
  const signupUnderageRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp1 },
    body: JSON.stringify({
      email: `test_minor_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      dob: '2012-01-01',
      confirmAdult: true,
      agreedToTerms: true,
      captchaToken: 'mock-dev-turnstile-token',
    }),
  });
  assert(signupUnderageRes.status === 403, 'Signup with underage DOB rejected with 403');

  // 4. Signup without Terms / 18+ confirmation
  const randIp2 = `192.168.100.${Math.floor(Math.random() * 200) + 1}`;
  const signupNoTermsRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp2 },
    body: JSON.stringify({
      email: `test_noterms_${Date.now()}@example.com`,
      password: 'StrongPassword123!',
      dob: '1995-01-01',
      confirmAdult: false,
      agreedToTerms: false,
      captchaToken: 'mock-dev-turnstile-token',
    }),
  });
  assert(signupNoTermsRes.status === 400, 'Signup without Terms/18+ confirmation rejected with 400');

  // 5. Rate limiting verification
  console.log('\n--- 5b. Testing Rate Limiting (5 signups / hour / IP) ---');
  const floodIp = `10.99.99.${Math.floor(Math.random() * 250) + 1}`;
  let wasRateLimited = false;
  for (let i = 0; i < 7; i++) {
    const res = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': floodIp },
      body: JSON.stringify({ email: `flood_${i}@example.com` }),
    });
    if (res.status === 429) {
      wasRateLimited = true;
      break;
    }
  }
  assert(wasRateLimited === true, 'Rate limiter activates and returns HTTP 429 Too Many Requests');

  // ==========================================
  // 6. PROTECTED API ENDPOINTS (RLS & 401 AUTH CHECKS)
  // ==========================================
  console.log('\n--- 6. Testing Protected API Auth Enforcement ---');

  const endpoints = [
    { url: `${BASE_URL}/api/admin/stats`, name: '/api/admin/stats' },
    { url: `${BASE_URL}/api/admin/reports`, name: '/api/admin/reports' },
    { url: `${BASE_URL}/api/chats`, name: '/api/chats' },
    { url: `${BASE_URL}/api/nearby`, name: '/api/nearby' },
    { url: `${BASE_URL}/api/groups`, name: '/api/groups' },
    { url: `${BASE_URL}/api/requests`, name: '/api/requests' },
  ];

  for (const ep of endpoints) {
    const res = await fetch(ep.url);
    assert(
      res.status === 401 || res.status === 403,
      `Unauthenticated ${ep.name} returns 401/403 (status: ${res.status})`
    );
  }

  // ==========================================
  // 7. AUTOMATED CONTENT & SAFETY FILTERS
  // ==========================================
  console.log('\n--- 7. Testing Automated Content Filters ---');

  const { filterMessageContent } = await import('../src/lib/safety/messageFilter.ts');

  // Bad words test
  const badWordRes = filterMessageContent('hey bitch what are you doing');
  assert(badWordRes.allowed === false, 'Bad word filter blocks profanity/slurs');
  assert(badWordRes.reason === 'inappropriate_language', 'Reason is inappropriate_language');

  // Evasion leetspeak test
  const evasionRes = filterMessageContent('you should k.y.s right now');
  assert(evasionRes.allowed === false, 'Evasion patterns are caught');

  // 24-hour link restriction test (chat created 2 hours ago)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const linkRes = filterMessageContent('check out https://example.com/free', twoHoursAgo);
  assert(linkRes.allowed === false, 'Links blocked in first 24 hours of connection');
  assert(linkRes.reason === 'early_connection_restriction', 'Reason is early_connection_restriction');

  // 24-hour phone number restriction test
  const phoneRes = filterMessageContent('call me at 555-123-4567 tonight', twoHoursAgo);
  assert(phoneRes.allowed === false, 'Phone numbers blocked in first 24 hours of connection');

  // 24-hour email restriction test
  const emailRes = filterMessageContent('reach me at test@anonconnect.com', twoHoursAgo);
  assert(emailRes.allowed === false, 'Emails blocked in first 24 hours of connection');

  // Connection older than 24 hours allowed
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const olderConnRes = filterMessageContent('check out https://coolsite.org', twoDaysAgo);
  assert(olderConnRes.allowed === true, 'Links permitted after 24 hours of connection');

  // Normal friendly message allowed
  const cleanRes = filterMessageContent('Hello! How has your day been?');
  assert(cleanRes.allowed === true, 'Standard friendly message permitted');

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log('\n==========================================');
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (Total: ${passedCount + failedCount})`);
  console.log('==========================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
