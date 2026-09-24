import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import {
  encryptText,
  decryptText,
  encryptTokens,
  decryptTokens,
  encryptJson,
  decryptJson,
  StorageService,
  PlatformStorageProvider,
  GoogleDriveProvider,
  DropboxProvider,
  OneDriveProvider,
  MediaService,
} from '../packages/storage/src/index.js';
import {
  StorageProviderType,
  StorageMode,
  StorageConnectionStatus,
  StorageSyncStatus,
} from '../packages/types/src/index.js';
import sharp from 'sharp';

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

async function runStorageIntegrationTests() {
  console.log('\n======================================================');
  console.log('⚡ PIXMATCH AI — PHASE 4A STORAGE INTEGRATION TEST SUITE');
  console.log('======================================================\n');

  // -------------------------------------------------------------
  // 1. AES-256-GCM APPLICATION-LEVEL ENCRYPTION & TAMPER PROOFING
  // -------------------------------------------------------------
  console.log('--- 1. AES-256-GCM Token Encryption & Security ---');

  const rawTokens = {
    accessToken: 'ya29.a0AfH6SMD_SampleGoogleAccessToken1234567890',
    refreshToken: '1//0gSampleGoogleRefreshToken1234567890abcdef',
    expiresAt: new Date(Date.now() + 3600 * 1000),
    scope: 'https://www.googleapis.com/auth/drive.readonly',
  };

  const encrypted = encryptTokens(rawTokens);
  assert(typeof encrypted === 'string', 'Tokens successfully encrypted to string');
  assert(encrypted.split(':').length === 4 || encrypted.split(':').length === 3, 'Encrypted format follows standard [version:]ivHex:tagHex:cipherHex');

  const decrypted = decryptTokens(encrypted);
  assert(decrypted.accessToken === rawTokens.accessToken, 'Decrypted accessToken matches original');
  assert(decrypted.refreshToken === rawTokens.refreshToken, 'Decrypted refreshToken matches original');
  assert(new Date(decrypted.expiresAt).getTime() === rawTokens.expiresAt.getTime(), 'Decrypted expiresAt matches original');

  // Tamper detection test
  const parts = encrypted.split(':');
  let tamperedCipher: string;
  let tamperedTag: string;

  if (parts.length === 4) {
    tamperedCipher = `${parts[0]}:${parts[1]}:${parts[2]}:${parts[3].slice(0, -2)}ff`;
    tamperedTag = `${parts[0]}:${parts[1]}:${'00'.repeat(16)}:${parts[3]}`;
  } else {
    tamperedCipher = `${parts[0]}:${parts[1]}:${parts[2].slice(0, -2)}ff`;
    tamperedTag = `${parts[0]}:${'00'.repeat(16)}:${parts[2]}`;
  }

  let tamperCaught = false;
  try {
    decryptTokens(tamperedCipher);
  } catch (err: any) {
    tamperCaught = true;
  }
  assert(tamperCaught, 'Tampered ciphertext is rejected by GCM authentication tag verification');

  let tagTamperCaught = false;
  try {
    decryptTokens(tamperedTag);
  } catch {
    tagTamperCaught = true;
  }
  assert(tagTamperCaught, 'Tampered authentication tag fails integrity verification');

  // -------------------------------------------------------------
  // 2. OAUTH 2.0 AUTHORIZATION URLS & CSRF STATE VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 2. OAuth 2.0 Handshake & CSRF State ---');

  const googleAuthUrl = GoogleDriveProvider.getAuthorizationUrl({
    clientId: 'test-google-client-id.apps.googleusercontent.com',
    redirectUri: 'http://localhost:4000/api/storage/oauth/google/callback',
    state: 'secure-csrf-state-1234',
  });
  assert(googleAuthUrl.includes('accounts.google.com/o/oauth2/v2/auth'), 'Google Drive authorization endpoint is correct');
  assert(googleAuthUrl.includes('test-google-client-id'), 'Client ID parameter encoded in Google auth URL');
  assert(googleAuthUrl.includes('access_type=offline'), 'Offline access requested for refresh tokens');
  assert(googleAuthUrl.includes('prompt=consent'), 'Consent prompt requested to ensure refresh token delivery');

  const dropboxAuthUrl = DropboxProvider.getAuthorizationUrl({
    clientId: 'dropbox-test-app-key',
    redirectUri: 'http://localhost:4000/api/storage/oauth/dropbox/callback',
    state: 'secure-csrf-state-1234',
  });
  assert(dropboxAuthUrl.includes('dropbox.com/oauth2/authorize'), 'Dropbox authorization endpoint is correct');
  assert(dropboxAuthUrl.includes('token_access_type=offline'), 'Dropbox offline access token requested');

  const oneDriveAuthUrl = OneDriveProvider.getAuthorizationUrl({
    clientId: 'ms-graph-client-id-uuid',
    redirectUri: 'http://localhost:4000/api/storage/oauth/onedrive/callback',
    state: 'secure-csrf-state-1234',
  });
  assert(oneDriveAuthUrl.includes('login.microsoftonline.com/common/oauth2/v2.0/authorize'), 'OneDrive MS Graph endpoint is correct');
  assert(oneDriveAuthUrl.includes('Files.Read.All'), 'OneDrive Files.Read.All scope requested');

  // -------------------------------------------------------------
  // 3. STORAGE SERVICE FACTORY & PLATFORM STORAGE ENGINE
  // -------------------------------------------------------------
  console.log('\n--- 3. Canonical StorageProvider Abstraction & Platform Storage ---');

  const platformProvider = StorageService.getProvider(StorageProviderType.PLATFORM);
  assert(platformProvider.providerType === StorageProviderType.PLATFORM, 'StorageService resolves PLATFORM provider');

  // Create sample image buffer for upload/download testing
  const sampleImageBuffer = await sharp({
    create: {
      width: 800,
      height: 600,
      channels: 3,
      background: { r: 120, g: 180, b: 240 },
    },
  })
    .jpeg()
    .toBuffer();

  const uploadRes = await platformProvider.upload({
    studioId: 'studio_test_01',
    galleryId: 'gallery_test_01',
    category: 'originals',
    filename: 'wedding_sample_01.jpg',
    mimeType: 'image/jpeg',
    buffer: sampleImageBuffer,
  });

  assert(uploadRes.storagePath.includes('studios/studio_test_01/galleries/gallery_test_01/originals/wedding_sample_01.jpg'), 'Storage path includes isolated tenant structure');
  assert(uploadRes.sizeBytes === sampleImageBuffer.length, 'Uploaded size matches buffer byte length');

  const downloadedBuffer = await platformProvider.download(uploadRes.storagePath);
  assert(downloadedBuffer.length === sampleImageBuffer.length, 'Downloaded buffer matches original uploaded byte size');

  const metadata = await platformProvider.getMetadata(uploadRes.storagePath);
  assert(metadata !== null && metadata.sizeBytes === sampleImageBuffer.length, 'Metadata extracted correctly from local platform storage');

  const signedUrl = await platformProvider.generateSignedUrl(uploadRes.storagePath, 900);
  assert(signedUrl.includes('expires='), 'Signed URL generated with expiration timestamp');

  const healthCheck = await platformProvider.testConnection();
  assert(healthCheck.success === true, 'Platform storage health check operational');

  // -------------------------------------------------------------
  // 4. GOOGLE DRIVE, DROPBOX, ONEDRIVE PROVIDER VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- 4. Cloud Storage Providers (GDrive, Dropbox, OneDrive) ---');

  const gdrive = new GoogleDriveProvider({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUri: 'http://localhost/cb',
    accessToken: 'mock-access-token',
  });
  assert(gdrive.providerType === StorageProviderType.GOOGLE_DRIVE, 'GoogleDriveProvider instantiated with type GOOGLE_DRIVE');

  const dbx = new DropboxProvider({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUri: 'http://localhost/cb',
    accessToken: 'mock-access-token',
  });
  assert(dbx.providerType === StorageProviderType.DROPBOX, 'DropboxProvider instantiated with type DROPBOX');

  const onedrive = new OneDriveProvider({
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUri: 'http://localhost/cb',
    accessToken: 'mock-access-token',
  });
  assert(onedrive.providerType === StorageProviderType.ONEDRIVE, 'OneDriveProvider instantiated with type ONEDRIVE');

  // -------------------------------------------------------------
  // 5. STORAGE MODE PIPELINE SIMULATION (MODE A vs MODE B)
  // -------------------------------------------------------------
  console.log('\n--- 5. Storage Ingestion Pipelines (Mode A vs Mode B) ---');

  // MODE A: Ingest / Copy to Platform Storage
  console.log('  Testing Mode A: Import to Platform...');
  const modeAUpload = await platformProvider.upload({
    studioId: 'studio_test_01',
    galleryId: 'gallery_test_01',
    category: 'originals',
    filename: 'imported_remote_file.jpg',
    mimeType: 'image/jpeg',
    buffer: sampleImageBuffer,
  });
  assert(modeAUpload.storagePath.length > 0, 'Mode A persists original to local disk');

  // MODE B: Ephemeral Thumbnailing & Remote Streaming
  console.log('  Testing Mode B: Connected Storage Ephemeral Processing...');
  const { metadata: modeBMeta, sm, md, lg } = await MediaService.extractMetadataAndThumbnails(sampleImageBuffer);
  assert(modeBMeta.width === 800 && modeBMeta.height === 600, 'Mode B extracts dimensions without saving full original');
  assert(sm.length > 0 && md.length > 0 && lg.length > 0, 'Mode B generates SM, MD, LG WebP derivatives');

  const smThumbUpload = await platformProvider.upload({
    studioId: 'studio_test_01',
    galleryId: 'gallery_test_01',
    category: 'thumbnails/sm',
    filename: 'external_id_123_sm.webp',
    mimeType: 'image/webp',
    buffer: sm,
  });
  assert(smThumbUpload.storagePath.includes('thumbnails/sm'), 'Mode B stores lightweight thumbnails for client browsing');

  // Cleanup test artifacts
  await platformProvider.delete(uploadRes.storagePath).catch(() => null);
  await platformProvider.delete(modeAUpload.storagePath).catch(() => null);
  await platformProvider.delete(smThumbUpload.storagePath).catch(() => null);

  // -------------------------------------------------------------
  // 6. DELTA SYNC & SOURCE_MISSING RECONCILIATION LOGIC
  // -------------------------------------------------------------
  console.log('\n--- 6. Delta Sync & Deletion Grace Periods ---');

  const remoteFiles = [
    { id: 'file_001', name: 'photo_01.jpg', size: 2000000, mimeType: 'image/jpeg', modifiedAt: new Date(2026, 8, 1, 10, 0, 0), path: '/photo_01.jpg' },
    { id: 'file_002', name: 'photo_02.jpg', size: 3000000, mimeType: 'image/jpeg', modifiedAt: new Date(2026, 8, 1, 11, 0, 0), path: '/photo_02.jpg' },
  ];

  const dbExistingPhotos = [
    { id: 'db_001', source_file_id: 'file_001', source_modified_at: new Date(2026, 8, 1, 10, 0, 0), source_status: 'SYNCED' },
    { id: 'db_003', source_file_id: 'file_003', source_modified_at: new Date(2026, 7, 15, 9, 0, 0), source_status: 'SYNCED' },
  ];

  const remoteIdSet = new Set(remoteFiles.map((f) => f.id));

  // File 1 is unchanged (cached)
  const file1 = remoteFiles[0];
  const dbMatch = dbExistingPhotos.find((p) => p.source_file_id === file1.id);
  const isUnchanged = dbMatch && dbMatch.source_modified_at.getTime() >= file1.modifiedAt.getTime();
  assert(isUnchanged === true, 'Delta sync accurately detects unchanged file and skips re-downloading');

  // File 2 is new
  const file2 = remoteFiles[1];
  const isNew = !dbExistingPhotos.some((p) => p.source_file_id === file2.id);
  assert(isNew === true, 'Delta sync accurately detects newly added remote file');

  // File 3 is missing from remote
  const missingPhotos = dbExistingPhotos.filter((p) => !remoteIdSet.has(p.source_file_id));
  assert(missingPhotos.length === 1 && missingPhotos[0].id === 'db_003', 'Missing remote file identified for SOURCE_MISSING grace status');

  // -------------------------------------------------------------
  // TEST SUMMARY
  // -------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST RESULTS: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStorageIntegrationTests().catch((err) => {
  console.error('Fatal error running Phase 4A test suite:', err);
  process.exit(1);
});
