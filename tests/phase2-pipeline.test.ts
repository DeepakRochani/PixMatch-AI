import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { MediaService, PlatformStorageProvider } from '../packages/storage/src/index.js';
import { StorageProviderType, ProcessingStatus, PhotoVersionType } from '../packages/types/src/index.js';

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

async function runPhase2TestSuite() {
  console.log('====================================================');
  console.log('🧪 PIXMATCH AI — PHASE 2 AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const testStorageDir = path.resolve(process.cwd(), './test-uploads');
  await fs.rm(testStorageDir, { recursive: true, force: true });
  await fs.mkdir(testStorageDir, { recursive: true });

  const storage = new PlatformStorageProvider(testStorageDir, 'http://localhost:4000/uploads');

  // Generate a test high-resolution image buffer (2000x1500 JPEG)
  const testImageBuffer = await sharp({
    create: {
      width: 2000,
      height: 1500,
      channels: 3,
      background: { r: 24, g: 119, b: 242 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  // ----------------------------------------------------
  // TEST GROUP 1: MediaService Validation & Hashing
  // ----------------------------------------------------
  console.log('📋 Test Group 1: MediaService Validation & SHA-256 Hashing');

  const hash1 = MediaService.computeSha256(testImageBuffer);
  const hash2 = MediaService.computeSha256(testImageBuffer);
  assert(hash1 === hash2 && hash1.length === 64, 'SHA-256 hash calculation is deterministic and 64-hex chars');

  const validValidation = MediaService.validateImage(testImageBuffer, 'wedding_ceremony_001.jpg', 'image/jpeg');
  assert(validValidation.valid === true, 'Valid JPEG image passes validation');
  assert(validValidation.sanitizedFilename === 'wedding_ceremony_001.jpg', 'Filename sanitized cleanly');

  const invalidExtValidation = MediaService.validateImage(testImageBuffer, 'script.exe', 'application/x-msdownload');
  assert(invalidExtValidation.valid === false, 'Executable file extension rejected');

  const invalidContentValidation = MediaService.validateImage(Buffer.from('not an image at all'), 'test.jpg', 'image/jpeg');
  assert(invalidContentValidation.valid === false, 'Corrupted / fake image header rejected');

  const pathTraversalFilename = MediaService.sanitizeFilename('../../../etc/passwd.jpg');
  assert(!pathTraversalFilename.includes('..') && !pathTraversalFilename.includes('/'), 'Filename sanitization strips path traversal');

  // ----------------------------------------------------
  // TEST GROUP 2: Sharp Thumbnail & Metadata Generation
  // ----------------------------------------------------
  console.log('\n📋 Test Group 2: Sharp Image Processing (SM, MD, LG Thumbnails)');

  const { metadata, sm, md, lg } = await MediaService.extractMetadataAndThumbnails(testImageBuffer);
  assert(metadata.width === 2000 && metadata.height === 1500, 'Original dimensions extracted accurately (2000x1500)');

  const smMeta = await sharp(sm).metadata();
  assert(smMeta.width! <= 320 && smMeta.height! <= 320, `SM thumbnail max dimension <= 320px (actual: ${smMeta.width}x${smMeta.height})`);
  assert(smMeta.format === 'webp', 'SM thumbnail rendered in modern WebP format');

  const mdMeta = await sharp(md).metadata();
  assert(mdMeta.width! <= 1200 && mdMeta.height! <= 1200, `MD thumbnail max dimension <= 1200px (actual: ${mdMeta.width}x${mdMeta.height})`);
  assert(mdMeta.format === 'webp', 'MD thumbnail rendered in modern WebP format');

  const lgMeta = await sharp(lg).metadata();
  assert(lgMeta.width! <= 2400 && lgMeta.height! <= 2400, `LG thumbnail max dimension <= 2400px (actual: ${lgMeta.width}x${lgMeta.height})`);
  assert(lgMeta.format === 'webp', 'LG thumbnail rendered in modern WebP format');

  // Aspect ratio preservation test
  const originalRatio = metadata.width / metadata.height;
  const smRatio = smMeta.width! / smMeta.height!;
  assert(Math.abs(originalRatio - smRatio) < 0.05, 'Aspect ratio preserved across thumbnail tiers');

  // ----------------------------------------------------
  // TEST GROUP 3: PlatformStorageProvider & Security Isolation
  // ----------------------------------------------------
  console.log('\n📋 Test Group 3: Storage Provider Tenant Isolation & Security');

  const studioA = 'studio-alpha';
  const galleryA = 'gallery-101';
  const studioB = 'studio-beta';

  const uploadResult = await storage.upload({
    studioId: studioA,
    galleryId: galleryA,
    category: 'originals',
    filename: 'photo_01.jpg',
    mimeType: 'image/jpeg',
    buffer: testImageBuffer,
  });

  assert(uploadResult.storagePath.startsWith(`studios/${studioA}/galleries/${galleryA}/originals/`), 'File uploaded to strict isolated tenant directory');
  assert(uploadResult.sizeBytes === testImageBuffer.length, 'Uploaded size matches original buffer length');

  const downloadedBuffer = await storage.download(uploadResult.storagePath);
  assert(downloadedBuffer.length === testImageBuffer.length, 'Downloaded buffer matches uploaded buffer');

  const signedUrl = await storage.generateSignedUrl(uploadResult.storagePath, 3600);
  assert(signedUrl.includes('expires=') && signedUrl.includes('sig='), 'Signed URL generated with temporary expiration');

  // Path Traversal Security Test
  let traversalCaught = false;
  try {
    await storage.download('../../../../etc/passwd');
  } catch (err) {
    traversalCaught = true;
  }
  assert(traversalCaught === true, 'Path traversal attempt rejected by storage security layer');

  // ----------------------------------------------------
  // TEST GROUP 4: Derivative Versions & Lifecycle
  // ----------------------------------------------------
  console.log('\n📋 Test Group 4: Thumbnail Derivatives Storage & Deletion');

  const smUpload = await storage.upload({
    studioId: studioA,
    galleryId: galleryA,
    category: 'thumbnails/sm',
    filename: 'photo_01_sm.webp',
    mimeType: 'image/webp',
    buffer: sm,
  });

  const mdUpload = await storage.upload({
    studioId: studioA,
    galleryId: galleryA,
    category: 'thumbnails/md',
    filename: 'photo_01_md.webp',
    mimeType: 'image/webp',
    buffer: md,
  });

  assert(smUpload.storagePath.includes('/thumbnails/sm/'), 'SM thumbnail stored in thumbnails/sm directory');
  assert(mdUpload.storagePath.includes('/thumbnails/md/'), 'MD thumbnail stored in thumbnails/md directory');

  // Delete individual original and derivatives
  const deletedOriginal = await storage.delete(uploadResult.storagePath);
  const deletedSm = await storage.delete(smUpload.storagePath);
  assert(deletedOriginal === true && deletedSm === true, 'Deleted original and thumbnail files successfully');

  // Verify file no longer exists
  let downloadAfterDeleteFailed = false;
  try {
    await storage.download(uploadResult.storagePath);
  } catch {
    downloadAfterDeleteFailed = true;
  }
  assert(downloadAfterDeleteFailed === true, 'File is confirmed removed from physical storage');

  // ----------------------------------------------------
  // TEST GROUP 5: Batch Operations & Duplicate Simulation
  // ----------------------------------------------------
  console.log('\n📋 Test Group 5: Batch Processing & Duplicate Detection Simulation');

  const mockDbPhotos = new Map<string, { id: string; galleryId: string; fileHash: string; status: ProcessingStatus }>();

  function simulateUpload(galleryId: string, filename: string, buffer: Buffer) {
    const fileHash = MediaService.computeSha256(buffer);
    const existing = Array.from(mockDbPhotos.values()).find((p) => p.galleryId === galleryId && p.fileHash === fileHash);
    if (existing) {
      return { duplicate: true, photo: existing, message: 'Photo already exists' };
    }
    const newPhoto = {
      id: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      galleryId,
      fileHash,
      status: ProcessingStatus.COMPLETED,
    };
    mockDbPhotos.set(newPhoto.id, newPhoto);
    return { duplicate: false, photo: newPhoto };
  }

  const upload1 = simulateUpload('gal-wedding', 'image1.jpg', testImageBuffer);
  assert(upload1.duplicate === false, 'First upload creates new photo record');

  const upload2 = simulateUpload('gal-wedding', 'image1_duplicate.jpg', testImageBuffer);
  assert(upload2.duplicate === true && upload2.photo.id === upload1.photo.id, 'Second upload with same hash returns existing photo without re-processing');

  // Upload to a DIFFERENT gallery should allow same hash
  const uploadDifferentGallery = simulateUpload('gal-corporate', 'image1.jpg', testImageBuffer);
  assert(uploadDifferentGallery.duplicate === false, 'Same photo uploaded to a different gallery is permitted');

  // ----------------------------------------------------
  // CLEANUP & SUMMARY
  // ----------------------------------------------------
  await fs.rm(testStorageDir, { recursive: true, force: true });

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passedCount} Passed | ${failedCount} Failed`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase2TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
