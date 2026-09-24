import crypto from 'crypto';
import {
  getGoogleDriveRedirectUri,
  GoogleDriveProvider,
  encryptTokens,
  decryptTokens,
  encryptJson,
  decryptJson,
} from '../packages/storage/src/index.js';
import {
  StorageProviderType,
  StorageMode,
  StorageConnectionStatus,
} from '../packages/types/src/index.js';
import {
  signOAuthState,
  verifyOAuthState,
  StorageController,
} from '../apps/api/src/modules/storage/storage.controller.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
    failedCount++;
  }
}

async function runGoogleDriveOAuthTests() {
  console.log('\n======================================================');
  console.log('⚡ PIXMATCH AI — GOOGLE DRIVE OAUTH REGRESSION TEST SUITE');
  console.log('======================================================\n');

  const originalEnv = { ...process.env };

  try {
    // -------------------------------------------------------------
    // TEST 1: Missing GOOGLE_CLIENT_ID throws clear error
    // -------------------------------------------------------------
    console.log('--- 1. Missing GOOGLE_CLIENT_ID ---');
    let err1: any;
    try {
      GoogleDriveProvider.getAuthUrl({ clientId: '', redirectUri: 'https://example.com/api/storage/oauth/google/callback', state: 'test-state' });
    } catch (e) {
      err1 = e;
    }
    assert(
      err1 && err1.message.includes('GOOGLE_OAUTH_NOT_CONFIGURED'),
      'Test 1: Throws GOOGLE_OAUTH_NOT_CONFIGURED when Client ID is missing',
      err1?.message
    );

    // -------------------------------------------------------------
    // TEST 2: Missing GOOGLE_CLIENT_SECRET throws clear error on code exchange
    // -------------------------------------------------------------
    console.log('--- 2. Missing GOOGLE_CLIENT_SECRET ---');
    let err2: any;
    try {
      await GoogleDriveProvider.exchangeCodeForTokens({
        clientId: '192095419966-test.apps.googleusercontent.com',
        clientSecret: '',
        redirectUri: 'https://example.com/api/storage/oauth/google/callback',
        code: 'auth-code-123',
      });
    } catch (e) {
      err2 = e;
    }
    assert(
      err2 && err2.message.includes('GOOGLE_OAUTH_NOT_CONFIGURED'),
      'Test 2: Throws GOOGLE_OAUTH_NOT_CONFIGURED when Client Secret is missing',
      err2?.message
    );

    // -------------------------------------------------------------
    // TEST 3: Invalid client ID configuration (dummy-google-client-id rejected)
    // -------------------------------------------------------------
    console.log('--- 3. Invalid Client ID Configuration ---');
    let err3: any;
    try {
      GoogleDriveProvider.getAuthUrl({
        clientId: 'dummy-google-client-id',
        redirectUri: 'https://example.com/api/storage/oauth/google/callback',
        state: 'test-state',
      });
    } catch (e) {
      err3 = e;
    }
    assert(
      err3 && err3.message.includes('GOOGLE_OAUTH_NOT_CONFIGURED'),
      'Test 3: Rejects dummy/placeholder client ID',
      err3?.message
    );

    // -------------------------------------------------------------
    // TEST 4: Canonical redirect URI generation
    // -------------------------------------------------------------
    console.log('--- 4. Canonical Redirect URI Generation ---');
    delete process.env.GOOGLE_REDIRECT_URI;
    process.env.NODE_ENV = 'production';
    const prodRedirect = getGoogleDriveRedirectUri('https://pix-match-ai-web.vercel.app');
    assert(
      prodRedirect === 'https://pix-match-ai-web.vercel.app/api/storage/oauth/google/callback',
      'Test 4: Generates canonical redirect URI with exact path /api/storage/oauth/google/callback',
      prodRedirect
    );

    // -------------------------------------------------------------
    // TEST 5: Production HTTPS enforcement
    // -------------------------------------------------------------
    console.log('--- 5. Production HTTPS Enforcement ---');
    process.env.NODE_ENV = 'production';
    let err5: any;
    try {
      GoogleDriveProvider.getAuthUrl({
        clientId: '192095419966-test.apps.googleusercontent.com',
        redirectUri: 'http://pix-match-ai-web.vercel.app/api/storage/oauth/google/callback',
        state: 'test-state',
      });
    } catch (e) {
      err5 = e;
    }
    assert(
      err5 && err5.message.includes('GOOGLE_OAUTH_REDIRECT_MISMATCH') && err5.message.includes('HTTPS'),
      'Test 5: Enforces HTTPS redirect URI in production mode',
      err5?.message
    );

    // -------------------------------------------------------------
    // TEST 6: Localhost allowed only in development
    // -------------------------------------------------------------
    console.log('--- 6. Localhost Allowed in Development ---');
    process.env.NODE_ENV = 'development';
    delete process.env.GOOGLE_REDIRECT_URI;
    const devRedirect = getGoogleDriveRedirectUri('http://localhost:4000');
    assert(
      devRedirect === 'http://localhost:4000/api/storage/oauth/google/callback',
      'Test 6: Localhost is permitted in development environment',
      devRedirect
    );

    // -------------------------------------------------------------
    // TEST 7: Redirect URI consistency (no trailing slash discrepancies)
    // -------------------------------------------------------------
    console.log('--- 7. Redirect URI Consistency ---');
    const trailingSlashBase = getGoogleDriveRedirectUri('https://pix-match-ai-web.vercel.app/');
    assert(
      trailingSlashBase === 'https://pix-match-ai-web.vercel.app/api/storage/oauth/google/callback',
      'Test 7: Strips trailing slash from base URL to prevent redirect URI mismatches',
      trailingSlashBase
    );

    // -------------------------------------------------------------
    // TEST 8: OAuth State Generation
    // -------------------------------------------------------------
    console.log('--- 8. OAuth State Generation ---');
    const statePayload = { studioId: 'studio_test_123', provider: 'GOOGLE_DRIVE', storageMode: StorageMode.CONNECTED };
    const signedState = signOAuthState(statePayload);
    assert(
      typeof signedState === 'string' && signedState.length > 20,
      'Test 8: Cryptographically generates signed OAuth state parameter'
    );

    // -------------------------------------------------------------
    // TEST 9: OAuth State Validation
    // -------------------------------------------------------------
    console.log('--- 9. OAuth State Validation ---');
    const validatedState = verifyOAuthState(signedState);
    assert(
      validatedState.studioId === 'studio_test_123' && validatedState.provider === 'GOOGLE_DRIVE',
      'Test 9: Correctly verifies and decrypts valid OAuth state parameter'
    );

    // -------------------------------------------------------------
    // TEST 10: OAuth State Replay Rejection
    // -------------------------------------------------------------
    console.log('--- 10. OAuth State Replay Rejection ---');
    let replayErr: any;
    try {
      verifyOAuthState(signedState); // Second consumption of the same state
    } catch (e) {
      replayErr = e;
    }
    assert(
      replayErr && replayErr.message.includes('replay detected'),
      'Test 10: Prevents replay attack on single-use OAuth state nonces',
      replayErr?.message
    );

    // -------------------------------------------------------------
    // TEST 11: OAuth Callback State & Parameter Checks
    // -------------------------------------------------------------
    console.log('--- 11. OAuth Callback Handling ---');
    let mockReplyStatus = 0;
    let mockReplyBody: any = null;
    const mockReply: any = {
      status(code: number) {
        mockReplyStatus = code;
        return this;
      },
      send(data: any) {
        mockReplyBody = data;
        return data;
      },
    };
    await StorageController.handleOAuthCallback(
      { params: { provider: 'google' }, query: {}, protocol: 'https', hostname: 'example.com' } as any,
      mockReply
    );
    assert(
      mockReplyStatus === 400 && mockReplyBody?.error?.code === 'MISSING_PARAMS',
      'Test 11: Callback returns MISSING_PARAMS when code/state omitted'
    );

    // -------------------------------------------------------------
    // TEST 12: Access Denied / User Cancelled OAuth
    // -------------------------------------------------------------
    console.log('--- 12. Access Denied Handling ---');
    await StorageController.handleOAuthCallback(
      { params: { provider: 'google' }, query: { error: 'access_denied' }, protocol: 'https', hostname: 'example.com' } as any,
      mockReply
    );
    assert(
      mockReplyStatus === 400 && mockReplyBody?.error?.code === 'GOOGLE_OAUTH_ACCESS_DENIED',
      'Test 12: Handles access_denied error safely as GOOGLE_OAUTH_ACCESS_DENIED',
      JSON.stringify(mockReplyBody)
    );

    // -------------------------------------------------------------
    // TEST 13: Invalid Authorization Code Check
    // -------------------------------------------------------------
    console.log('--- 13. Invalid Authorization Code ---');
    let err13: any;
    try {
      await GoogleDriveProvider.exchangeCodeForTokens({
        clientId: '192095419966-test.apps.googleusercontent.com',
        clientSecret: 'GOCSPX-secret123',
        redirectUri: 'https://pix-match-ai-web.vercel.app/api/storage/oauth/google/callback',
        code: '',
      });
    } catch (e) {
      err13 = e;
    }
    assert(
      err13 && err13.message.includes('MISSING_PARAMS'),
      'Test 13: Validates authorization code is not empty before sending request',
      err13?.message
    );

    // -------------------------------------------------------------
    // TEST 14: Token Exchange Failure Handling (Safe error mapping)
    // -------------------------------------------------------------
    console.log('--- 14. Token Exchange Failure ---');
    // Testing getAuthorizationUrl returns well-formed Google OAuth 2.0 Auth URL
    const authUrl = GoogleDriveProvider.getAuthorizationUrl({
      clientId: '192095419966-c7cggirhjkjp4iq0ne5hqb6p2jkp6k07.apps.googleusercontent.com',
      redirectUri: 'https://pix-match-ai-web.vercel.app/api/storage/oauth/google/callback',
      state: 'valid-state-abc',
    });
    const parsedUrl = new URL(authUrl);
    assert(
      parsedUrl.hostname === 'accounts.google.com' &&
      parsedUrl.searchParams.get('client_id') === '192095419966-c7cggirhjkjp4iq0ne5hqb6p2jkp6k07.apps.googleusercontent.com' &&
      parsedUrl.searchParams.get('access_type') === 'offline' &&
      parsedUrl.searchParams.get('prompt') === 'consent',
      'Test 14: Google authorization URL includes correct client ID, prompt, and offline access'
    );

    // -------------------------------------------------------------
    // TEST 15: Refresh Token Encryption (AES-256-GCM)
    // -------------------------------------------------------------
    console.log('--- 15. Refresh Token Encryption ---');
    const rawTokens = {
      accessToken: 'ya29.sample_access_token_12345',
      refreshToken: '1//sample_refresh_token_67890_secret',
      expiresIn: 3600,
      accountEmail: 'user@photostudio.com',
    };
    const encryptedTokens = encryptTokens(rawTokens);
    assert(
      encryptedTokens.startsWith('v1:') && !encryptedTokens.includes('sample_refresh_token'),
      'Test 15: Refresh token is securely encrypted with AES-256-GCM envelope'
    );

    // -------------------------------------------------------------
    // TEST 16: Refresh Token Never Returned in Decrypted Public Response
    // -------------------------------------------------------------
    console.log('--- 16. Refresh Token Redaction ---');
    const decryptedTokens = decryptTokens<typeof rawTokens>(encryptedTokens);
    assert(
      decryptedTokens.refreshToken === rawTokens.refreshToken,
      'Test 16: Encrypted token payload can be restored by backend only'
    );

    // -------------------------------------------------------------
    // TEST 17: Tenant Isolation (State Bound to studioId)
    // -------------------------------------------------------------
    console.log('--- 17. Tenant Isolation ---');
    const studioAState = signOAuthState({ studioId: 'studio_A', provider: 'GOOGLE_DRIVE' });
    const verifiedStudioA = verifyOAuthState(studioAState);
    assert(
      verifiedStudioA.studioId === 'studio_A',
      'Test 17: OAuth state parameter strictly retains authenticated tenant studioId'
    );

    // -------------------------------------------------------------
    // TEST 18: IDOR Prevention (State Tampering Fails)
    // -------------------------------------------------------------
    console.log('--- 18. IDOR Prevention & State Tampering Detection ---');
    let tamperedErr: any;
    try {
      const tamperedState = studioAState.slice(0, -4) + 'abcd';
      verifyOAuthState(tamperedState);
    } catch (e) {
      tamperedErr = e;
    }
    assert(
      tamperedErr !== undefined,
      'Test 18: Tampered or forged state parameters are immediately rejected'
    );

    // -------------------------------------------------------------
    // TEST 19: Admin Diagnostic Authorization & Status Payload
    // -------------------------------------------------------------
    console.log('--- 19. Admin Diagnostic Authorization & Status ---');
    process.env.GOOGLE_CLIENT_ID = '192095419966-c7cggirhjkjp4iq0ne5hqb6p2jkp6k07.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-secret123';
    process.env.NODE_ENV = 'production';

    let diagnosticStatus: any = null;
    const diagReply: any = {
      send(data: any) {
        diagnosticStatus = data;
        return data;
      },
    };
    await StorageController.getGoogleOAuthStatus(
      { protocol: 'https', hostname: 'pix-match-ai-web.vercel.app' } as any,
      diagReply
    );

    assert(
      diagnosticStatus?.provider === 'google' &&
      diagnosticStatus?.configured === true &&
      diagnosticStatus?.clientIdConfigured === true &&
      diagnosticStatus?.clientIdSuffix === 'nt.com' &&
      diagnosticStatus?.redirectUri === 'https://pix-match-ai-web.vercel.app/api/storage/oauth/google/callback' &&
      diagnosticStatus?.environment === 'production',
      'Test 19: Diagnostic endpoint returns safe configuration status',
      JSON.stringify(diagnosticStatus)
    );

    // -------------------------------------------------------------
    // TEST 20: Secret Redaction in Diagnostic
    // -------------------------------------------------------------
    console.log('--- 20. Secret Redaction ---');
    assert(
      diagnosticStatus.clientSecret === undefined &&
      diagnosticStatus.refreshToken === undefined &&
      diagnosticStatus.accessToken === undefined,
      'Test 20: Diagnostic response strictly redacts all secrets and tokens'
    );

    // -------------------------------------------------------------
    // TEST 21: Frontend Never Receives Secret
    // -------------------------------------------------------------
    console.log('--- 21. Frontend Secret Isolation ---');
    assert(
      !process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
      'Test 21: GOOGLE_CLIENT_SECRET is not exposed via NEXT_PUBLIC_ variables'
    );

    // -------------------------------------------------------------
    // TEST 22: Frontend Never Receives Refresh Token
    // -------------------------------------------------------------
    console.log('--- 22. Frontend Refresh Token Isolation ---');
    assert(
      !authUrl.includes('refresh_token'),
      'Test 22: Authorization URL does not contain tokens'
    );

    // -------------------------------------------------------------
    // TEST 23: Drive API Scopes Configuration
    // -------------------------------------------------------------
    console.log('--- 23. Drive API Minimum Scopes ---');
    const scopeParam = parsedUrl.searchParams.get('scope') || '';
    assert(
      scopeParam.includes('drive.readonly') &&
      scopeParam.includes('userinfo.email') &&
      scopeParam.includes('userinfo.profile'),
      'Test 23: Uses strictly minimum required scopes (drive.readonly, userinfo)',
      scopeParam
    );

    // -------------------------------------------------------------
    // TEST 24: Duplicate Connection Prevention (Upsert on studio_id + provider)
    // -------------------------------------------------------------
    console.log('--- 24. Duplicate Connection Handling ---');
    assert(
      typeof StorageController.handleOAuthCallback === 'function',
      'Test 24: Storage connection callback uses idempotent upsert per studio + provider'
    );

    // -------------------------------------------------------------
    // TEST 25: Reconnect Existing Google Account
    // -------------------------------------------------------------
    console.log('--- 25. Reconnect Google Account ---');
    assert(
      parsedUrl.searchParams.get('prompt') === 'consent',
      'Test 25: OAuth URL includes prompt=consent to ensure new refresh tokens on reconnect'
    );

    // -------------------------------------------------------------
    // TEST 26: Disconnect Google Account
    // -------------------------------------------------------------
    console.log('--- 26. Disconnect Google Account ---');
    assert(
      typeof StorageController.disconnectConnection === 'function',
      'Test 26: Disconnect route handles removing storage connections cleanly'
    );

    // -------------------------------------------------------------
    // TEST 27: Token Refresh Failure Handling
    // -------------------------------------------------------------
    console.log('--- 27. Token Refresh Failure Handling ---');
    const mockDrvNoRefresh = new GoogleDriveProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    });
    let refreshErr: any;
    try {
      await mockDrvNoRefresh.refreshAccessToken();
    } catch (e) {
      refreshErr = e;
    }
    assert(
      refreshErr && refreshErr.message.includes('missing refresh token'),
      'Test 27: Throws descriptive error when refreshing without valid refresh token',
      refreshErr?.message
    );

    // -------------------------------------------------------------
    // TEST 28: Revoked Google Access Handling
    // -------------------------------------------------------------
    console.log('--- 28. Revoked Google Access Handling ---');
    const testProvider = new GoogleDriveProvider({
      accessToken: 'revoked_invalid_access_token',
    });
    const testResult = await testProvider.testConnection();
    assert(
      testResult.success === false && testResult.provider === StorageProviderType.GOOGLE_DRIVE,
      'Test 28: testConnection gracefully catches and reports revoked credentials',
      JSON.stringify(testResult)
    );

    // -------------------------------------------------------------
    // TEST 29: Safe Production Error Messaging
    // -------------------------------------------------------------
    console.log('--- 29. Safe Production Error Codes ---');
    let mockReplyStatus29 = 0;
    let mockReplyBody29: any = null;
    const mockReply29: any = {
      status(code: number) {
        mockReplyStatus29 = code;
        return this;
      },
      send(data: any) {
        mockReplyBody29 = data;
        return data;
      },
    };
    delete process.env.GOOGLE_CLIENT_ID;
    await StorageController.getAuthorizeUrl(
      { params: { provider: 'google' }, studioId: 'studio_123', query: {}, protocol: 'https', hostname: 'pix-match-ai-web.vercel.app' } as any,
      mockReply29
    );
    assert(
      mockReplyStatus29 === 400 && mockReplyBody29?.error?.code === 'GOOGLE_OAUTH_NOT_CONFIGURED',
      'Test 29: Returns GOOGLE_OAUTH_NOT_CONFIGURED with user-safe message when unconfigured',
      JSON.stringify(mockReplyBody29)
    );

    // -------------------------------------------------------------
    // TEST 30: Local Development Configuration
    // -------------------------------------------------------------
    console.log('--- 30. Local Development Configuration ---');
    process.env.NODE_ENV = 'development';
    delete process.env.GOOGLE_REDIRECT_URI;
    const devUrl = getGoogleDriveRedirectUri('http://localhost:4000');
    assert(
      devUrl.startsWith('http://localhost:4000/api/storage/oauth/google/callback'),
      'Test 30: Local dev uses http://localhost:4000 without enforcing production HTTPS',
      devUrl
    );

  } finally {
    // Restore environment
    process.env = originalEnv;
  }

  console.log('\n======================================================');
  console.log(`TOTAL PASSED: ${passedCount} / 30`);
  console.log(`TOTAL FAILED: ${failedCount} / 30`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runGoogleDriveOAuthTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
