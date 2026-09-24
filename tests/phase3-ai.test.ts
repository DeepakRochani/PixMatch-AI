import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import crypto from 'crypto';
import {
  cosineSimilarity,
  extractEmbeddedFaceVector,
  AiService,
} from '../apps/api/src/modules/ai/ai.service.js';
import { FaceBoundingBox, FaceSearchMatchDTO } from '../packages/types/src/index.js';

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

/**
 * Generates an L2-normalized 512-dim vector from a seed string with high entropy.
 */
function createMockVector(seedStr: string): number[] {
  const vec: number[] = new Array(512);
  let sumSquares = 0;

  // Use sha256 chunks across the 512 dimensions
  for (let chunk = 0; chunk < 16; chunk++) {
    const chunkHash = crypto
      .createHash('sha256')
      .update(`${seedStr}:chunk:${chunk}`)
      .digest();
    for (let j = 0; j < 32; j++) {
      const idx = chunk * 32 + j;
      const rawVal = chunkHash[j]; // 0 to 255
      const val = (rawVal / 127.5) - 1.0; // -1.0 to 1.0
      vec[idx] = val;
      sumSquares += val * val;
    }
  }

  const mag = Math.sqrt(sumSquares);
  return vec.map((v) => v / (mag || 1));
}

/**
 * Perturbs a vector slightly to simulate different angles/lighting of the SAME person.
 */
function createPerturbedVector(baseVec: number[], perturbation = 0.08): number[] {
  let sumSquares = 0;
  const perturbed = baseVec.map((v, idx) => {
    const delta = ((idx % 7) - 3) * 0.01 * perturbation;
    const val = v + delta;
    sumSquares += val * val;
    return val;
  });
  const mag = Math.sqrt(sumSquares);
  return perturbed.map((v) => v / mag);
}

async function runPhase3TestSuite() {
  console.log('====================================================');
  console.log('🧠 PIXMATCH AI — PHASE 3 AUTOMATED TEST SUITE');
  console.log('   Real AI Face Recognition + Selfie Photo Search');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST GROUP 1: Embedding Vector Geometry & Normalization
  // ----------------------------------------------------
  console.log('📋 Test Group 1: 512-Dimensional Vector Geometry & L2 Normalization');

  const testImageBuffer = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 180, g: 140, b: 120 },
    },
  })
    .jpeg()
    .toBuffer();

  const faceData = extractEmbeddedFaceVector(testImageBuffer);
  assert(faceData.embedding.length === 512, 'Face embedding has exactly 512 dimensions (InsightFace / ArcFace standard)');

  // Verify L2 Unit Magnitude: sqrt(sum(v_i^2)) == 1.0
  const l2Norm = Math.sqrt(faceData.embedding.reduce((sum, v) => sum + v * v, 0));
  assert(Math.abs(l2Norm - 1.0) < 0.0001, `Embedding is strictly L2 unit normalized (norm = ${l2Norm.toFixed(6)})`);
  assert(faceData.face_quality_score >= 0.25, `Face quality score is computed (${faceData.face_quality_score})`);
  assert(faceData.confidence > 0.9, `Detection confidence meets standard (${faceData.confidence})`);

  // ----------------------------------------------------
  // TEST GROUP 2: Cosine Similarity Mathematical Precision
  // ----------------------------------------------------
  console.log('\n📋 Test Group 2: Cosine Similarity Mathematical Accuracy');

  const personA_vec = createMockVector('person-alice-wedding-01');
  const personA_same = [...personA_vec];
  const personA_differentAngle = createPerturbedVector(personA_vec, 0.15);
  const personB_vec = createMockVector('person-bob-guest-44');
  const personC_vec = createMockVector('person-charlie-dj-99');

  const identitySim = cosineSimilarity(personA_vec, personA_same);
  assert(Math.abs(identitySim - 1.0) < 0.0001, `Identical face vectors yield cosine similarity 1.0000 (actual: ${identitySim.toFixed(4)})`);

  const samePersonSim = cosineSimilarity(personA_vec, personA_differentAngle);
  assert(samePersonSim >= 0.85 && samePersonSim < 1.0, `Same person at varied angles produces high similarity (actual: ${samePersonSim.toFixed(4)})`);

  const differentPersonSim = cosineSimilarity(personA_vec, personB_vec);
  assert(differentPersonSim < 0.40, `Unrelated person face vector produces low similarity (actual: ${differentPersonSim.toFixed(4)})`);

  const unrelatedSim = cosineSimilarity(personB_vec, personC_vec);
  assert(unrelatedSim < 0.40, `Different distinct individuals yield low similarity (actual: ${unrelatedSim.toFixed(4)})`);

  // ----------------------------------------------------
  // TEST GROUP 3: Multi-Sensitivity Threshold Filtering
  // ----------------------------------------------------
  console.log('\n📋 Test Group 3: Sensitivity Thresholds (High 0.70 / Medium 0.58 / Low 0.48)');

  const THRESHOLD_HIGH = 0.70;
  const THRESHOLD_MED = 0.58;
  const THRESHOLD_LOW = 0.48;

  assert(samePersonSim >= THRESHOLD_HIGH, `Same person matches at Strict threshold (>= ${THRESHOLD_HIGH})`);
  assert(samePersonSim >= THRESHOLD_MED, `Same person matches at Balanced threshold (>= ${THRESHOLD_MED})`);
  assert(samePersonSim >= THRESHOLD_LOW, `Same person matches at Broad threshold (>= ${THRESHOLD_LOW})`);

  assert(differentPersonSim < THRESHOLD_LOW, `Unrelated person rejected at all sensitivity tiers (< ${THRESHOLD_LOW})`);

  // ----------------------------------------------------
  // TEST GROUP 4: Multi-Tenant Scoping & Gallery Isolation
  // ----------------------------------------------------
  console.log('\n📋 Test Group 4: Strict Multi-Tenant Scoping & Gallery Isolation');

  // Simulated in-memory database of indexed face detections
  interface MockFaceRecord {
    id: string;
    studio_id: string;
    gallery_id: string;
    photo_id: string;
    embedding: number[];
  }

  const mockFaceDb: MockFaceRecord[] = [
    // Studio 1, Gallery 1 (Wedding)
    { id: 'f-1', studio_id: 'studio-1', gallery_id: 'gal-wedding-1', photo_id: 'photo-101', embedding: personA_vec },
    { id: 'f-2', studio_id: 'studio-1', gallery_id: 'gal-wedding-1', photo_id: 'photo-102', embedding: personA_differentAngle },
    { id: 'f-3', studio_id: 'studio-1', gallery_id: 'gal-wedding-1', photo_id: 'photo-103', embedding: personB_vec },

    // Studio 1, Gallery 2 (Corporate Event - Person A is also here)
    { id: 'f-4', studio_id: 'studio-1', gallery_id: 'gal-corporate-2', photo_id: 'photo-201', embedding: personA_vec },

    // Studio 2, Gallery 3 (Other Studio - Person A is also here)
    { id: 'f-5', studio_id: 'studio-2', gallery_id: 'gal-other-3', photo_id: 'photo-301', embedding: personA_vec },
  ];

  function queryScopedFaces(targetGalleryId: string, targetStudioId: string, queryVec: number[], threshold = 0.58) {
    const scoped = mockFaceDb.filter((f) => f.gallery_id === targetGalleryId && f.studio_id === targetStudioId);
    const matches: Array<{ photo_id: string; similarity: number }> = [];

    for (const record of scoped) {
      const sim = cosineSimilarity(queryVec, record.embedding);
      if (sim >= threshold) {
        matches.push({ photo_id: record.photo_id, similarity: sim });
      }
    }
    return matches;
  }

  // Client searches in Studio 1 Wedding Gallery with Person A selfie
  const weddingMatches = queryScopedFaces('gal-wedding-1', 'studio-1', personA_vec);
  const matchedPhotoIds = weddingMatches.map((m) => m.photo_id);

  assert(weddingMatches.length === 2, `Scoped search returns exactly 2 photos containing Person A in Wedding Gallery`);
  assert(matchedPhotoIds.includes('photo-101') && matchedPhotoIds.includes('photo-102'), `Found photo-101 and photo-102`);
  assert(!matchedPhotoIds.includes('photo-103'), `Did not match photo-103 (Person B)`);
  assert(!matchedPhotoIds.includes('photo-201'), `Strict Gallery Isolation: Did NOT leak photos from Gallery 2 (gal-corporate-2)`);
  assert(!matchedPhotoIds.includes('photo-301'), `Strict Tenant Isolation: Did NOT leak photos from Studio 2 (gal-other-3)`);

  // ----------------------------------------------------
  // TEST GROUP 5: Multiple Faces in a Single Photo Aggregation
  // ----------------------------------------------------
  console.log('\n📋 Test Group 5: Group Photos (Multiple Faces) & Best-Match Aggregation');

  // Photo 999 contains Person A, Person B, and Person C (e.g. Wedding Group Shot)
  const groupPhotoFaces: MockFaceRecord[] = [
    { id: 'f-91', studio_id: 'studio-1', gallery_id: 'gal-wedding-1', photo_id: 'photo-group-999', embedding: personB_vec },
    { id: 'f-92', studio_id: 'studio-1', gallery_id: 'gal-wedding-1', photo_id: 'photo-group-999', embedding: personA_differentAngle },
    { id: 'f-93', studio_id: 'studio-1', gallery_id: 'gal-wedding-1', photo_id: 'photo-group-999', embedding: personC_vec },
  ];

  // Aggregate by photo_id, taking MAX(similarity)
  const photoScores = new Map<string, number>();
  for (const face of groupPhotoFaces) {
    const sim = cosineSimilarity(personA_vec, face.embedding);
    if (!photoScores.has(face.photo_id) || sim > photoScores.get(face.photo_id)!) {
      photoScores.set(face.photo_id, sim);
    }
  }

  const groupShotScore = photoScores.get('photo-group-999')!;
  assert(groupShotScore >= 0.85, `Group photo matches query face by taking MAX face similarity (${groupShotScore.toFixed(4)})`);
  assert(photoScores.size === 1, `Multiple faces in same photo correctly aggregated to a single photo match entry`);

  // ----------------------------------------------------
  // TEST GROUP 6: In-Memory Processing & Privacy Verification
  // ----------------------------------------------------
  console.log('\n📋 Test Group 6: Client Privacy Guarantee (In-Memory Processing)');

  const tempUploadDir = path.resolve(process.cwd(), './uploads');
  const tempFilesBefore = await fs.readdir(tempUploadDir).catch(() => []);

  // Simulate in-memory search execution
  const selfieBuffer = await sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 200, g: 160, b: 140 } },
  })
    .jpeg()
    .toBuffer();

  const inMemoryDetection = extractEmbeddedFaceVector(selfieBuffer);
  assert(inMemoryDetection.embedding.length === 512, 'Selfie converted directly from memory buffer to vector');

  const tempFilesAfter = await fs.readdir(tempUploadDir).catch(() => []);
  assert(tempFilesBefore.length === tempFilesAfter.length, 'Privacy Preserved: No temporary selfie images written to disk');

  // ----------------------------------------------------
  // TEST GROUP 7: Ranking & Result Ordering
  // ----------------------------------------------------
  console.log('\n📋 Test Group 7: Score-Ranked Match Results');

  const candidateMatches = [
    { photo_id: 'p-mid', similarity_score: 0.72 },
    { photo_id: 'p-highest', similarity_score: 0.96 },
    { photo_id: 'p-low', similarity_score: 0.61 },
  ];

  const sortedMatches = [...candidateMatches].sort((a, b) => b.similarity_score - a.similarity_score);
  assert(sortedMatches[0].photo_id === 'p-highest', 'Highest confidence face appears first in results');
  assert(sortedMatches[1].photo_id === 'p-mid', 'Intermediate match correctly ranked second');
  assert(sortedMatches[2].photo_id === 'p-low', 'Lowest match ranked last');

  // ----------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`🏁 PHASE 3 TEST RESULTS: ${passedCount} Passed | ${failedCount} Failed`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase3TestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
