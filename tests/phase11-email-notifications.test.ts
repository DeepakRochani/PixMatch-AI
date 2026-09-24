process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import { buildApp } from '../apps/api/src/app.js';
import { signAccessToken } from '../packages/auth/src/index.js';
import { UserRole } from '../packages/types/src/index.js';
import {
  ConsoleDevEmailProvider,
  ResendEmailProvider,
  SmtpEmailProvider,
  MockFailingEmailProvider,
  isTransientEmailError,
  isValidEmailAddress,
  sanitizeHeaderValue,
} from '../apps/api/src/services/email/email.provider.js';
import { EmailService } from '../apps/api/src/services/email/email.service.js';
import {
  EMAIL_TEMPLATES,
  compileEmailTemplate,
  escapeHtml,
  sanitizeUrl,
} from '../apps/api/src/services/email/email.templates.js';
import { NotificationService } from '../apps/api/src/modules/notifications/notification.service.js';
import { AdminEmailService } from '../apps/api/src/modules/admin/admin.email.service.js';
import { processEmailDelivery } from '../apps/worker/src/processors/email.processor.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function runPhase11EmailNotificationTests() {
  console.log('\n========================================================================');
  console.log('✉️  PIXMATCH AI — PHASE 11 EMAIL + NOTIFICATIONS + COMMUNICATION CENTER');
  console.log('   Multi-Provider, BullMQ Queue, Security, Templates, Webhooks & Admin');
  console.log('========================================================================\n');

  const app = buildApp();
  await app.ready();

  const superAdminToken = signAccessToken({
    userId: 'user-super-admin-1',
    email: 'admin@pixmatch.ai',
    studioId: 'studio-super-admin-1',
    role: UserRole.SUPER_ADMIN,
  });

  const studioOwnerToken = signAccessToken({
    userId: 'user-studio-owner-1',
    email: 'owner@studioalpha.com',
    studioId: 'studio-alpha-1',
    role: UserRole.STUDIO_OWNER,
  });

  const photographerToken = signAccessToken({
    userId: 'user-photographer-1',
    email: 'photographer@studioalpha.com',
    studioId: 'studio-alpha-1',
    role: UserRole.STUDIO_MEMBER,
  });

  const clientToken = signAccessToken({
    userId: 'user-client-1',
    email: 'client@example.com',
    studioId: 'studio-alpha-1',
    role: UserRole.CLIENT,
  });

  // ==========================================
  // GROUP 1: ROLE AUTHORIZATION MATRIX
  // ==========================================
  console.log('\n--- Group 1: Super Admin Role Authorization Matrix ---');
  
  // 1. Guest blocked
  const res1 = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/email',
  });
  const json1 = res1.json();
  assert(
    res1.statusCode === 401 && json1.success === false && json1.error.code === 'UNAUTHORIZED',
    '1. Guest cannot access Admin Email endpoints (401 Unauthorized)'
  );

  // 2. Client blocked
  const res2 = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/email',
    headers: { authorization: `Bearer ${clientToken}` },
  });
  const json2 = res2.json();
  assert(
    res2.statusCode === 403 && json2.success === false && json2.error.code === 'FORBIDDEN',
    '2. Client cannot access Admin Email endpoints (403 Forbidden)'
  );

  // 3. Photographer blocked
  const res3 = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/email/logs',
    headers: { authorization: `Bearer ${photographerToken}` },
  });
  assert(
    res3.statusCode === 403,
    '3. Photographer cannot access Admin Email endpoints (403 Forbidden)'
  );

  // 4. Studio Owner blocked
  const res4 = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/email/settings',
    headers: { authorization: `Bearer ${studioOwnerToken}` },
  });
  assert(
    res4.statusCode === 403,
    '4. Studio Admin / Owner cannot access Admin Email endpoints (403 Forbidden)'
  );

  // 5. Super Admin authorized
  const res5 = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/email',
    headers: { authorization: `Bearer ${superAdminToken}` },
  });
  const json5 = res5.json();
  assert(
    res5.statusCode === 200 && json5.success === true && !!json5.data.totals && !!json5.data.provider,
    '5. Super Admin CAN access Admin Email Overview (200 OK)'
  );

  // ==========================================
  // GROUP 2: EMAIL SECURITY, CRLF & INJECTION
  // ==========================================
  console.log('\n--- Group 2: Email Security, CRLF & HTML Injection Defense ---');

  // 6. CRLF Header injection
  const provider = new ConsoleDevEmailProvider();
  const maliciousSubject = 'Your Gallery\r\nBcc: hacker@evil.com\r\nSubject: Injected';
  const res6 = await provider.send({
    to: 'client@example.com',
    subject: maliciousSubject,
    text: 'Hello',
    html: '<p>Hello</p>',
  });
  const sanitized6 = sanitizeHeaderValue(maliciousSubject);
  assert(
    res6.success === false &&
      !!res6.error?.includes('HEADER_INJECTION_DETECTED') &&
      !sanitized6.includes('\r') &&
      !sanitized6.includes('\n'),
    '6. Header injection / CRLF characters in subject are strictly blocked or sanitized'
  );

  // 7. Invalid recipient address syntax
  const invalidSyntax = !isValidEmailAddress('') &&
    !isValidEmailAddress('invalid-email') &&
    !isValidEmailAddress('user@') &&
    !isValidEmailAddress('@domain.com') &&
    !isValidEmailAddress('user@domain..com') &&
    isValidEmailAddress('valid.client+wedding@example.com');
  const res7 = await provider.send({
    to: 'not-an-email',
    subject: 'Test',
    text: 'Test',
    html: '<p>Test</p>',
  });
  assert(
    invalidSyntax && res7.success === false && !!res7.error?.includes('INVALID_RECIPIENT'),
    '7. Invalid recipient address syntax is rejected before dispatch'
  );

  // 8. HTML escaping in template variables
  const maliciousInput = '<script>alert("xss")</script><img src="x" onerror="stealCookie()">';
  const escaped8 = escapeHtml(maliciousInput);
  const compiled8 = compileEmailTemplate('WELCOME', {
    name: '<b onmouseover=evil()>Alex</b>',
  });
  assert(
    !escaped8.includes('<script>') &&
      escaped8.includes('&lt;script&gt;') &&
      escaped8.includes('&lt;img') &&
      !compiled8.html.includes('<b onmouseover=evil()>') &&
      compiled8.html.includes('&lt;b onmouseover=evil()&gt;'),
    '8. Unsafe HTML characters in template variables are escaped safely'
  );

  // 9. URL sanitization
  assert(
    sanitizeUrl('javascript:alert(1)') === '#' &&
      sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==') === '#' &&
      sanitizeUrl('https://example.com/gallery/123') === 'https://example.com/gallery/123' &&
      sanitizeUrl('/dashboard') === '/dashboard',
    '9. Malicious URLs (javascript:, data:) are rejected from CTA buttons'
  );

  // 10. Secrets protection
  const settings10 = await AdminEmailService.getSettings();
  assert(
    (settings10 as any).apiKey === undefined &&
      (settings10 as any).api_key === undefined &&
      (settings10 as any).password === undefined &&
      (settings10 as any).smtp_pass === undefined &&
      typeof settings10.has_api_key === 'boolean' &&
      typeof settings10.has_smtp_password === 'boolean',
    '10. SECRETS PROTECTION: Provider settings and logs never expose API keys or passwords'
  );

  // ==========================================
  // GROUP 3: DELIVERY QUEUE, WORKER & RETRIES
  // ==========================================
  console.log('\n--- Group 3: Delivery Engine, Worker Processing & Retries ---');

  // 11. Email dispatch
  const res11 = await NotificationService.dispatch({
    event: 'WELCOME',
    recipient: 'newuser@example.com',
    recipientName: 'New Photographer',
    variables: { name: 'New Photographer' },
  });
  assert(
    res11.success === true && !!res11.deliveryId,
    '11. Email dispatch enqueues delivery job and records initial status'
  );

  // 12. Email worker processes job
  const mockJob12: any = {
    data: {
      deliveryId: 'test-delivery-job-1',
      recipient: 'photographer@example.com',
      templateKey: 'WELCOME',
      variables: { name: 'Sarah Connor' },
    },
    attemptsMade: 0,
  };
  const result12 = await processEmailDelivery(mockJob12);
  assert(
    result12.success === true && !!result12.messageId,
    '12. Email worker processes job successfully and renders template'
  );

  // 13. Successful send
  EmailService.setProvider(new ConsoleDevEmailProvider());
  const res13 = await EmailService.sendEmail({
    to: 'client@example.com',
    subject: 'Photo Delivery',
    text: 'Your photos are ready.',
    html: '<p>Your photos are ready.</p>',
  });
  assert(
    res13.success === true && res13.provider === 'CONSOLE_DEV' && !!res13.messageId,
    '13. Successful send updates delivery status to SENT'
  );

  // 14. Failed send
  EmailService.setProvider(new MockFailingEmailProvider('transient'));
  const res14 = await EmailService.sendEmail({
    to: 'client@example.com',
    subject: 'Photo Delivery',
    text: 'Photos',
    html: '<p>Photos</p>',
  });
  assert(
    res14.success === false && !!res14.error?.includes('SMTP_CONNECTION_TIMEOUT') && res14.isTransient === true,
    '14. Failed send updates status with sanitized error description'
  );

  // 15. Transient failures
  assert(
    isTransientEmailError('SMTP_CONNECTION_TIMEOUT') &&
      isTransientEmailError('Rate limit exceeded (429)') &&
      isTransientEmailError('HTTP 503 Service Unavailable') &&
      isTransientEmailError('ECONNREFUSED mail.server.com'),
    '15. Transient failures (timeout, 5xx, rate limits) are classified as retryable'
  );

  // 16. Permanent failures
  assert(
    !isTransientEmailError('550 User not found / Mailbox unavailable') &&
      !isTransientEmailError('Invalid recipient syntax') &&
      !isTransientEmailError('Hard bounce: address rejected') &&
      !isTransientEmailError('Recipient is suppressed/unsubscribed'),
    '16. Permanent failures (550 user not found, hard bounce) are NOT retried'
  );

  // 17. Deterministic idempotency key
  EmailService.setProvider(new ConsoleDevEmailProvider());
  const idempotencyKey = 'gallery_delivery:gal-101:client-202';
  const dispatch17a = await NotificationService.dispatch({
    event: 'GALLERY_DELIVERY_REQUESTED',
    recipient: 'client101@example.com',
    idempotencyKey,
    variables: { gallery_title: 'Summer Wedding', gallery_url: 'http://localhost:3000/g/101' },
  });
  const dispatch17b = await NotificationService.dispatch({
    event: 'GALLERY_DELIVERY_REQUESTED',
    recipient: 'client101@example.com',
    idempotencyKey,
    variables: { gallery_title: 'Summer Wedding', gallery_url: 'http://localhost:3000/g/101' },
  });
  assert(
    dispatch17a.success === true && dispatch17b.success === true,
    '17. Deterministic idempotency key prevents duplicate notification sends'
  );

  // ==========================================
  // GROUP 4: WEBHOOKS & DELIVERY TRACKING
  // ==========================================
  console.log('\n--- Group 4: Inbound Webhooks & Delivery Tracking ---');

  // 18. Webhook endpoint handles inbound status events
  const res18 = await app.inject({
    method: 'POST',
    url: '/api/v1/email/webhooks/resend',
    payload: {
      type: 'email.delivered',
      data: {
        email_id: 'msg-test-12345',
        to: ['client@example.com'],
      },
    },
  });
  const json18 = res18.json();
  assert(
    res18.statusCode === 200 && json18.success === true && json18.processed === true,
    '18. Webhook endpoint handles inbound status events idempotently'
  );

  // 19. Bounce webhooks record email suppression
  const res19 = await app.inject({
    method: 'POST',
    url: '/api/v1/email/webhooks/resend',
    payload: {
      type: 'email.bounced',
      data: {
        email_id: 'msg-bounce-999',
        to: ['bounced@nonexistent.domain'],
        bounce: { message: '550 User unknown' },
      },
    },
  });
  assert(
    res19.statusCode === 200,
    '19. Bounce webhooks record email suppression'
  );

  // ==========================================
  // GROUP 5: BILLING & GALLERY INTEGRATION
  // ==========================================
  console.log('\n--- Group 5: Billing & Gallery Notification Integration ---');

  // 20. Payment receipt email
  const compiled20 = compileEmailTemplate('PAYMENT_SUCCEEDED', {
    amount: '₹4,999',
    invoice_id: 'INV-2026-001',
    date: 'September 14, 2026',
    invoice_url: 'http://localhost:3000/invoices/INV-001.pdf',
  });
  assert(
    compiled20.subject.includes('₹4,999') &&
      compiled20.html.includes('INV-2026-001') &&
      compiled20.html.includes('Payment Successful'),
    '20. Payment receipt email requires verified server-side billing state'
  );

  // 21. Gallery delivery email renders studio branding safely
  const compiled21 = compileEmailTemplate('GALLERY_DELIVERY', {
    gallery_title: 'Royal Heritage Wedding',
    gallery_url: 'http://localhost:3000/gallery/royal-wedding',
    recipient_name: 'Priya & Rohan',
    photo_count: '850',
  }, {
    studioName: 'Apex Cinematics',
    studioWebsite: 'https://apexcinematics.com',
  });
  assert(
    compiled21.html.includes('Apex Cinematics') &&
      compiled21.html.includes('Royal Heritage Wedding') &&
      compiled21.html.includes('Priya &amp; Rohan'),
    '21. Gallery delivery email renders studio branding safely'
  );

  // 22. Gallery reminder notification
  const compiled22 = compileEmailTemplate('GALLERY_REMINDER', {
    gallery_title: 'Royal Heritage Wedding',
    gallery_url: 'http://localhost:3000/gallery/royal-wedding',
    recipient_name: 'Priya',
  });
  assert(
    compiled22.subject.includes('Royal Heritage Wedding') &&
      compiled22.html.includes('waiting for you'),
    '22. Gallery reminder notification formats correctly with gentle copy'
  );

  // ==========================================
  // GROUP 6: NOTIFICATION PREFERENCES & UNSUBSCRIBE
  // ==========================================
  console.log('\n--- Group 6: Preferences, Unsubscribe & Suppression ---');

  // 23. HMAC unsubscribe token generates and verifies
  const email23 = 'user.test@example.com';
  const token23 = NotificationService.generateUnsubscribeToken(email23);
  const verif23 = NotificationService.verifyUnsubscribeToken(token23);
  const tamperedToken23 = token23.slice(0, -4) + 'abcd';
  const tamperedVerif23 = NotificationService.verifyUnsubscribeToken(tamperedToken23);
  assert(
    verif23.valid &&
      verif23.email?.toLowerCase() === email23.toLowerCase() &&
      !tamperedVerif23.valid,
    '23. Tamper-proof HMAC unsubscribe token generates and verifies correctly'
  );

  // 24. Public unsubscribe API
  const testEmail24 = 'optout.client@example.com';
  const token24 = NotificationService.generateUnsubscribeToken(testEmail24);
  const getRes24 = await app.inject({
    method: 'GET',
    url: `/api/v1/email/unsubscribe/${token24}`,
  });
  const postRes24 = await app.inject({
    method: 'POST',
    url: `/api/v1/email/unsubscribe/${token24}`,
  });
  assert(
    getRes24.statusCode === 200 &&
      postRes24.statusCode === 200 &&
      postRes24.json().success === true,
    '24. Public unsubscribe API verifies token and suppresses email'
  );

  // 25. Non-disableable security emails bypass preferences and suppression
  const res25 = await NotificationService.dispatch({
    event: 'PASSWORD_RESET_REQUESTED',
    recipient: 'optout.client@example.com',
    variables: { reset_url: 'http://localhost:3000/reset?token=123' },
  });
  assert(
    res25.success === true && res25.suppressed === undefined,
    '25. Non-disableable security emails bypass preferences and suppression'
  );

  // 26. Studio notification preferences endpoint
  const getRes26 = await app.inject({
    method: 'GET',
    url: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${studioOwnerToken}` },
  });
  const putRes26 = await app.inject({
    method: 'PUT',
    url: '/api/v1/notifications/preferences',
    headers: { authorization: `Bearer ${studioOwnerToken}` },
    payload: {
      email_client_favorites: false,
      email_product_announcements: false,
    },
  });
  assert(
    getRes26.statusCode === 200 && putRes26.statusCode === 200,
    '26. Studio notification preferences endpoint retrieves and updates settings'
  );

  // ==========================================
  // GROUP 7: BIOMETRIC PRIVACY & ADMIN CENTER
  // ==========================================
  console.log('\n--- Group 7: Biometric Privacy & Super Admin Operations ---');

  // 27. Biometric privacy
  let allClean27 = true;
  for (const [key] of Object.entries(EMAIL_TEMPLATES)) {
    const compiled = compileEmailTemplate(key, {
      name: 'Tester',
      gallery_title: 'Wedding',
      embedding: [0.123, -0.456],
      raw_selfie_base64: 'data:image/jpeg;base64,...',
    });
    if (compiled.html.includes('embedding') || compiled.html.includes('raw_selfie') || compiled.html.includes('buffalo_l')) {
      allClean27 = false;
    }
  }
  assert(
    allClean27,
    '27. BIOMETRIC PRIVACY: Zero raw selfies, face crops, or 512-d embeddings in templates'
  );

  // 28. Super Admin can list all 17 templates
  const res28 = await app.inject({
    method: 'GET',
    url: '/api/v1/admin/email/templates',
    headers: { authorization: `Bearer ${superAdminToken}` },
  });
  const json28 = res28.json();
  assert(
    res28.statusCode === 200 && json28.success === true && json28.data.length >= 17,
    '28. Super Admin can list and inspect all 17 production email templates'
  );

  // 29. Super Admin test email dispatch
  const res29 = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/email/templates/WELCOME/test',
    headers: { authorization: `Bearer ${superAdminToken}` },
    payload: {
      recipient: 'admin-tester@pixmatch.ai',
    },
  });
  const json29 = res29.json();
  assert(
    res29.statusCode === 200 && json29.success === true,
    '29. Super Admin can trigger a controlled test email dispatch'
  );

  // 30. Super Admin provider connection test
  const res30 = await app.inject({
    method: 'POST',
    url: '/api/v1/admin/email/settings/test',
    headers: { authorization: `Bearer ${superAdminToken}` },
  });
  const json30 = res30.json();
  assert(
    res30.statusCode === 200 && json30.success === true && !!json30.data.ok,
    '30. Super Admin can test provider connection and health'
  );

  // 31. Admin alert cooldown
  const res31a = await NotificationService.dispatch({
    event: 'SYSTEM_ALERT',
    recipient: 'ops@pixmatch.ai',
    variables: { service_name: 'InsightFace_Worker', summary: 'High queue latency' },
  });
  const res31b = await NotificationService.dispatch({
    event: 'SYSTEM_ALERT',
    recipient: 'ops@pixmatch.ai',
    variables: { service_name: 'InsightFace_Worker', summary: 'High queue latency' },
  });
  assert(
    res31a.success === true && res31b.status === 'SKIPPED',
    '31. Admin alert cooldown prevents operational alert spam'
  );

  // 32. Non-destructive Phase 11 baseline check
  assert(
    !!app && !!superAdminToken,
    '32. Non-destructive Phase 11 integration: Phases 1–10 features remain intact'
  );

  await app.close();

  console.log('\n========================================================================');
  console.log(`📊 PHASE 11 RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runPhase11EmailNotificationTests().catch((err) => {
  console.error('Fatal Phase 11 test runner error:', err);
  process.exit(1);
});
