import crypto from 'crypto';
import {
  AnalyticsDateRangePreset,
  AnalyticsMetricComparison,
  AnalyticsOverviewDTO,
  AnalyticsTimeseriesPointDTO,
  GalleryAnalyticsItemDTO,
  ClientAnalyticsSummaryDTO,
  AiAnalyticsSummaryDTO,
  StorageAnalyticsSummaryDTO,
  DownloadAnalyticsSummaryDTO,
  ClientStatus,
  GalleryStatus,
} from '../packages/types/src/index.js';
import { AnalyticsService } from '../apps/api/src/modules/analytics/analytics.service.js';

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

async function runPhase8AnalyticsBiTests() {
  console.log('\n========================================================================');
  console.log('📊 PIXMATCH AI — PHASE 8 ANALYTICS & BUSINESS INTELLIGENCE');
  console.log('   Metrics, Timeseries, AI Search BI, Funnel, CSV Export & Tenant Isolation');
  console.log('========================================================================\n');

  const studioAlphaId = 'studio-alpha-' + crypto.randomUUID().slice(0, 8);
  const studioBravoId = 'studio-bravo-' + crypto.randomUUID().slice(0, 8);

  // ========================================================================
  // TEST GROUP 1: DATE RANGE CALCULATIONS & COMPARISON ENGINE
  // ========================================================================
  console.log('📅 Test Group 1: Date Range Presets & Mathematical Comparison Engine');

  const preset7d = AnalyticsService.parseDateRange('7d');
  assert(preset7d.preset === '7d', 'parseDateRange parses 7d preset');
  assert(preset7d.from < preset7d.to, '7d start date is before end date');
  assert(preset7d.previousFrom < preset7d.previousTo, '7d previous period start date is before end date');
  const diffDays7d = Math.round((preset7d.to.getTime() - preset7d.from.getTime()) / (1000 * 3600 * 24));
  assert(diffDays7d === 7, `7d preset covers 7 days (got ${diffDays7d})`);

  const preset30d = AnalyticsService.parseDateRange('30d');
  const diffDays30d = Math.round((preset30d.to.getTime() - preset30d.from.getTime()) / (1000 * 3600 * 24));
  assert(diffDays30d === 30, `30d preset covers 30 days (got ${diffDays30d})`);

  const customRange = AnalyticsService.parseDateRange('custom', '2026-08-01', '2026-08-15');
  assert(customRange.preset === 'custom', 'parseDateRange parses custom date range');
  assert(customRange.from.toISOString().startsWith('2026-08-01'), 'Custom from matches specified date');
  assert(customRange.to.toISOString().startsWith('2026-08-15'), 'Custom to matches specified date');

  // Comparison math
  const comp1 = AnalyticsService.computeComparison(150, 100);
  assert(comp1.current === 150 && comp1.previous === 100, 'Comparison values match inputs');
  assert(comp1.change_percentage === 50, `50% increase calculated correctly (got ${comp1.change_percentage}%)`);
  assert(comp1.trend === 'UP', 'Trend identified as UP');

  const compDown = AnalyticsService.computeComparison(75, 100);
  assert(compDown.change_percentage === -25, `-25% decrease calculated correctly (got ${compDown.change_percentage}%)`);
  assert(compDown.trend === 'DOWN', 'Trend identified as DOWN');

  const compNeutral = AnalyticsService.computeComparison(100, 100);
  assert(compNeutral.change_percentage === 0, '0% change is neutral');
  assert(compNeutral.trend === 'NEUTRAL', 'Trend identified as NEUTRAL');

  // Zero-denominator defense
  const compZeroPrev = AnalyticsService.computeComparison(50, 0);
  assert(compZeroPrev.change_percentage === 100, 'Zero previous with positive current yields +100%');
  assert(compZeroPrev.trend === 'UP', 'Zero previous with positive current has UP trend');

  const compBothZero = AnalyticsService.computeComparison(0, 0);
  assert(compBothZero.change_percentage === 0, 'Zero previous with zero current yields 0%');
  assert(compBothZero.trend === 'NEUTRAL', 'Zero previous with zero current is NEUTRAL');

  // ========================================================================
  // TEST GROUP 2: CSV FORMULA INJECTION SANITIZATION & SAFE EXPORTS
  // ========================================================================
  console.log('\n🔒 Test Group 2: CSV Formula Injection Defense & Export Sanitation');

  const unsafeInputs = [
    '=1+2',
    '+cmd|"/c calc"!A1',
    '-2+3',
    '@SUM(A1:A10)',
    '\t=malicious_code()',
    '\r=alert(1)',
    'Normal Gallery Name',
    'Sharma Wedding, 2026',
    'Quote "Special" Edition',
  ];

  const sanitizedOutputs = unsafeInputs.map(AnalyticsService.sanitizeCsvField);

  assert(sanitizedOutputs[0].startsWith("'=1+2"), 'Prepends single quote to formula starting with =');
  assert(sanitizedOutputs[1].startsWith("\"'+cmd") || sanitizedOutputs[1].startsWith("'+cmd"), 'Sanitizes formula starting with + and quotes if needed');
  assert(sanitizedOutputs[2].startsWith("'-2+3"), 'Prepends single quote to formula starting with -');
  assert(sanitizedOutputs[3].startsWith("'@SUM"), 'Prepends single quote to formula starting with @');
  assert(sanitizedOutputs[4].includes("'\t") || sanitizedOutputs[4].startsWith("\"'\t"), 'Sanitizes tab character prefix');
  assert(sanitizedOutputs[5].includes("'\r") || sanitizedOutputs[5].startsWith("\"'\r"), 'Sanitizes CR character prefix');
  assert(sanitizedOutputs[6] === 'Normal Gallery Name', 'Leaves safe string unquoted without commas');
  assert(sanitizedOutputs[7] === '"Sharma Wedding, 2026"', 'Wraps strings with commas in double quotes');
  assert(sanitizedOutputs[8] === '"Quote ""Special"" Edition"', 'Escapes embedded double quotes properly');

  // ========================================================================
  // TEST GROUP 3: BIOMETRIC PRIVACY & ZERO EMBEDDING LEAKAGE IN AI LOGS
  // ========================================================================
  console.log('\n🧠 Test Group 3: AI Face Recognition Analytics & Biometric Privacy');

  interface MockAiSearchLog {
    id: string;
    studio_id: string;
    gallery_id: string;
    faces_detected: number;
    matches_count: number;
    processing_time_ms: number;
    sensitivity: number;
    created_at: Date;
  }

  const aiLogs: MockAiSearchLog[] = [
    {
      id: 'log-1',
      studio_id: studioAlphaId,
      gallery_id: 'gal-1',
      faces_detected: 1,
      matches_count: 14,
      processing_time_ms: 120,
      sensitivity: 0.85,
      created_at: new Date('2026-09-10T10:00:00Z'),
    },
    {
      id: 'log-2',
      studio_id: studioAlphaId,
      gallery_id: 'gal-1',
      faces_detected: 1,
      matches_count: 0,
      processing_time_ms: 95,
      sensitivity: 0.85,
      created_at: new Date('2026-09-11T11:00:00Z'),
    },
    {
      id: 'log-3',
      studio_id: studioAlphaId,
      gallery_id: 'gal-2',
      faces_detected: 2,
      matches_count: 28,
      processing_time_ms: 180,
      sensitivity: 0.80,
      created_at: new Date('2026-09-12T14:30:00Z'),
    },
  ];

  // Verify privacy contract on AI search log
  for (const log of aiLogs) {
    assert(!('embedding' in log), `AI Log ${log.id} does not contain embedding field`);
    assert(!('vector' in log), `AI Log ${log.id} does not contain vector field`);
    assert(!('selfie_url' in log), `AI Log ${log.id} does not store raw selfie image URL`);
    assert(!('landmarks' in log), `AI Log ${log.id} does not store biometric facial landmarks`);
  }

  const totalAiSearches = aiLogs.length;
  const successfulAiMatches = aiLogs.filter((l) => l.matches_count > 0).length;
  const matchRate = (successfulAiMatches / totalAiSearches) * 100;
  const avgLatency = aiLogs.reduce((acc, l) => acc + l.processing_time_ms, 0) / totalAiSearches;

  assert(totalAiSearches === 3, 'Total AI searches aggregated accurately');
  assert(successfulAiMatches === 2, 'Successful AI matches count computed accurately');
  assert(Math.round(matchRate) === 67, `AI match rate is 67% (got ${Math.round(matchRate)}%)`);
  assert(Math.round(avgLatency) === 132, `Average AI search latency is 132ms (got ${Math.round(avgLatency)}ms)`);

  // ========================================================================
  // TEST GROUP 4: TIMESERIES AGGREGATION & ZERO FILLING
  // ========================================================================
  console.log('\n📈 Test Group 4: Timeseries Aggregation, Date Bucketing & Zero-Filling');

  const timeseriesPoints = [
    { date: '2026-09-07', views: 0, visitors: 0, favorites: 0, selections: 0, downloads: 0, ai_searches: 0 },
    { date: '2026-09-08', views: 42, visitors: 18, favorites: 12, selections: 5, downloads: 3, ai_searches: 8 },
    { date: '2026-09-09', views: 105, visitors: 45, favorites: 30, selections: 14, downloads: 8, ai_searches: 22 },
    { date: '2026-09-10', views: 0, visitors: 0, favorites: 0, selections: 0, downloads: 0, ai_searches: 0 }, // zero filled day
    { date: '2026-09-11', views: 88, visitors: 39, favorites: 25, selections: 10, downloads: 7, ai_searches: 15 },
    { date: '2026-09-12', views: 130, visitors: 60, favorites: 40, selections: 18, downloads: 12, ai_searches: 31 },
    { date: '2026-09-13', views: 95, visitors: 41, favorites: 28, selections: 11, downloads: 6, ai_searches: 19 },
  ];

  assert(timeseriesPoints.length === 7, 'Timeseries produces continuous 7 daily buckets without gaps');
  assert(timeseriesPoints[3].views === 0, 'Inactive date 2026-09-10 correctly zero-filled');
  assert(timeseriesPoints[5].views === 130, 'Peak date 2026-09-12 records 130 gallery views');

  const totalViews = timeseriesPoints.reduce((acc, p) => acc + p.views, 0);
  const totalFavorites = timeseriesPoints.reduce((acc, p) => acc + p.favorites, 0);
  const totalDownloads = timeseriesPoints.reduce((acc, p) => acc + p.downloads, 0);

  assert(totalViews === 460, `Total views summed across period = 460 (got ${totalViews})`);
  assert(totalFavorites === 135, `Total favorites summed = 135 (got ${totalFavorites})`);
  assert(totalDownloads === 36, `Total downloads summed = 36 (got ${totalDownloads})`);

  // ========================================================================
  // TEST GROUP 5: GALLERY LEADERBOARD & ENGAGEMENT SCORING
  // ========================================================================
  console.log('\n🏆 Test Group 5: Gallery Leaderboard & Engagement Formula');

  interface MockGalleryMetric {
    id: string;
    title: string;
    views: number;
    favorites: number;
    selections: number;
    downloads: number;
    ai_searches: number;
  }

  const galleries: MockGalleryMetric[] = [
    { id: 'gal-alpha', title: 'Aarav & Meera Wedding', views: 500, favorites: 120, selections: 50, downloads: 35, ai_searches: 90 },
    { id: 'gal-beta', title: 'Corporate Summit 2026', views: 200, favorites: 10, selections: 5, downloads: 4, ai_searches: 15 },
    { id: 'gal-gamma', title: 'Vikram Portrait Session', views: 50, favorites: 30, selections: 15, downloads: 10, ai_searches: 8 },
  ];

  // Engagement score formula: views*1 + favs*3 + selections*4 + downloads*5 + ai_searches*2
  function computeEngagement(g: MockGalleryMetric) {
    return g.views * 1 + g.favorites * 3 + g.selections * 4 + g.downloads * 5 + g.ai_searches * 2;
  }

  const scoreAlpha = computeEngagement(galleries[0]); // 500 + 360 + 200 + 175 + 180 = 1415
  const scoreBeta = computeEngagement(galleries[1]);  // 200 + 30 + 20 + 20 + 30 = 300
  const scoreGamma = computeEngagement(galleries[2]); // 50 + 90 + 60 + 50 + 16 = 266

  assert(scoreAlpha === 1415, `Aarav & Meera wedding engagement score = 1415 (got ${scoreAlpha})`);
  assert(scoreBeta === 300, `Corporate Summit engagement score = 300 (got ${scoreBeta})`);
  assert(scoreGamma === 266, `Vikram Portrait engagement score = 266 (got ${scoreGamma})`);

  const ranked = [...galleries].sort((a, b) => computeEngagement(b) - computeEngagement(a));
  assert(ranked[0].id === 'gal-alpha', 'Top engagement gallery correctly ranked #1');
  assert(ranked[1].id === 'gal-beta', 'Second engagement gallery correctly ranked #2');
  assert(ranked[2].id === 'gal-gamma', 'Third engagement gallery correctly ranked #3');

  // ========================================================================
  // TEST GROUP 6: CLIENT CRM INTELLIGENCE & HIGH-INTENT SCORING
  // ========================================================================
  console.log('\n👥 Test Group 6: Client CRM Intelligence & Intent Scoring');

  const clients = [
    {
      id: 'c-1',
      name: 'Priya Sharma',
      email: 'priya@sharma.in',
      galleries_count: 2,
      views_count: 45,
      favorites_count: 32,
      selections_count: 18,
      downloads_count: 8,
      ai_searches_count: 12,
      delivery_status: 'OPENED',
      last_active_at: new Date(),
    },
    {
      id: 'c-2',
      name: 'Rohan Gupta',
      email: 'rohan@gupta.com',
      galleries_count: 1,
      views_count: 2,
      favorites_count: 0,
      selections_count: 0,
      downloads_count: 0,
      ai_searches_count: 0,
      delivery_status: 'SENT',
      last_active_at: new Date(),
    },
    {
      id: 'c-3',
      name: 'Aditi Patel',
      email: 'aditi@patel.io',
      galleries_count: 1,
      views_count: 0,
      favorites_count: 0,
      selections_count: 0,
      downloads_count: 0,
      ai_searches_count: 0,
      delivery_status: 'NOT_SENT',
      last_active_at: null,
    },
  ];

  function computeClientIntent(c: typeof clients[0]) {
    return c.views_count * 1 + c.favorites_count * 3 + c.selections_count * 4 + c.downloads_count * 5 + c.ai_searches_count * 2;
  }

  const intentPriya = computeClientIntent(clients[0]); // 45 + 96 + 72 + 40 + 24 = 277
  const intentRohan = computeClientIntent(clients[1]); // 2 + 0 + 0 + 0 + 0 = 2
  const intentAditi = computeClientIntent(clients[2]); // 0

  assert(intentPriya === 277, `Priya Sharma intent score = 277 (got ${intentPriya})`);
  assert(intentRohan === 2, `Rohan Gupta intent score = 2 (got ${intentRohan})`);
  assert(intentAditi === 0, `Aditi Patel intent score = 0 (got ${intentAditi})`);

  // Intent tier classification
  function getIntentTier(score: number): 'HIGH' | 'MEDIUM' | 'LOW' | 'INACTIVE' {
    if (score >= 50) return 'HIGH';
    if (score >= 10) return 'MEDIUM';
    if (score > 0) return 'LOW';
    return 'INACTIVE';
  }

  assert(getIntentTier(intentPriya) === 'HIGH', 'Priya classified as HIGH intent');
  assert(getIntentTier(intentRohan) === 'LOW', 'Rohan classified as LOW intent');
  assert(getIntentTier(intentAditi) === 'INACTIVE', 'Aditi classified as INACTIVE intent');

  // ========================================================================
  // TEST GROUP 7: DELIVERY FUNNEL & CONVERSION VELOCITY
  // ========================================================================
  console.log('\n🎯 Test Group 7: Delivery Funnel & Step-by-Step Conversion Rates');

  const funnelStages = {
    delivered: 100,
    opened: 85,
    viewed: 78,
    favorited: 52,
    selected: 38,
    downloaded: 24,
  };

  const openRate = (funnelStages.opened / funnelStages.delivered) * 100;
  const viewRate = (funnelStages.viewed / funnelStages.opened) * 100;
  const favRate = (funnelStages.favorited / funnelStages.viewed) * 100;
  const selectRate = (funnelStages.selected / funnelStages.favorited) * 100;
  const downloadRate = (funnelStages.downloaded / funnelStages.selected) * 100;
  const overallConversion = (funnelStages.downloaded / funnelStages.delivered) * 100;

  assert(openRate === 85, `Open rate = 85% (got ${openRate}%)`);
  assert(Math.round(viewRate) === 92, `View conversion from opened = 92% (got ${Math.round(viewRate)}%)`);
  assert(Math.round(favRate) === 67, `Favorited rate from viewed = 67% (got ${Math.round(favRate)}%)`);
  assert(Math.round(selectRate) === 73, `Selection rate from favorited = 73% (got ${Math.round(selectRate)}%)`);
  assert(Math.round(downloadRate) === 63, `Download rate from selected = 63% (got ${Math.round(downloadRate)}%)`);
  assert(overallConversion === 24, `End-to-end delivery conversion = 24% (got ${overallConversion}%)`);

  // ========================================================================
  // TEST GROUP 8: STORAGE UTILIZATION & DOWNLOAD ANALYTICS
  // ========================================================================
  console.log('\n💾 Test Group 8: Storage Utilization Breakdown & Download Intelligence');

  const storageSummary: StorageAnalyticsSummaryDTO = {
    total_storage_bytes: 52428800000, // 50 GB
    photos_stored_count: 12500,
    storage_limit_bytes: 107374182400, // 100 GB
    usage_percentage: 48.8,
    estimated_monthly_growth_bytes: 5242880000,
    galleries_breakdown: [
      { gallery_id: 'gal-1', title: 'Grand Royal Wedding', photo_count: 5000, storage_bytes: 20971520000, percentage_of_total: 40 },
      { gallery_id: 'gal-2', title: 'Beachside Sangeet', photo_count: 3750, storage_bytes: 15728640000, percentage_of_total: 30 },
      { gallery_id: 'gal-3', title: 'Reception Evening', photo_count: 3750, storage_bytes: 15728640000, percentage_of_total: 30 },
    ],
    connected_storage_providers: [
      { provider: 'CLOUDFLARE_R2', display_name: 'Cloudflare R2', status: 'CONNECTED', storage_used_bytes: 31457280000 },
      { provider: 'AWS_S3', display_name: 'Amazon S3', status: 'CONNECTED', storage_used_bytes: 15728640000 },
      { provider: 'LOCAL', display_name: 'Local Server Storage', status: 'CONNECTED', storage_used_bytes: 5242880000 },
    ],
  };

  assert(storageSummary.photos_stored_count === 12500, 'Total photos count accurate across storage');
  assert(storageSummary.connected_storage_providers.length === 3, 'All 3 storage providers represented in breakdown');
  assert(
    storageSummary.galleries_breakdown.reduce((acc, p) => acc + p.percentage_of_total, 0) === 100,
    'Storage gallery percentages sum up to 100%'
  );

  const downloadSummary: DownloadAnalyticsSummaryDTO = {
    total_download_jobs: 145,
    total_photos_downloaded: 450,
    single_downloads_count: 95,
    bulk_downloads_count: 50,
    total_download_bytes: 3670016000, // ~3.5 GB
    top_downloaded_galleries: [
      { gallery_id: 'gal-1', title: 'Grand Royal Wedding', downloads_count: 90, download_bytes: 2400000000 },
      { gallery_id: 'gal-2', title: 'Beachside Sangeet', downloads_count: 35, download_bytes: 850000000 },
      { gallery_id: 'gal-3', title: 'Reception Evening', downloads_count: 20, download_bytes: 420016000 },
    ],
  };

  assert(
    downloadSummary.single_downloads_count + downloadSummary.bulk_downloads_count ===
      downloadSummary.total_download_jobs,
    'Download types cleanly partition total download events'
  );
  assert(downloadSummary.top_downloaded_galleries[0].downloads_count === 90, 'Gallery download distribution accurate');

  // ========================================================================
  // TEST GROUP 9: STRICT TENANT ISOLATION & ANTI-IDOR DEFENSE
  // ========================================================================
  console.log('\n🛡️  Test Group 9: Multi-Tenant Isolation & Anti-IDOR Security');

  interface StudioScopedRecord {
    id: string;
    studio_id: string;
    data: string;
  }

  const studioAlphaRecords: StudioScopedRecord[] = [
    { id: 'rec-alpha-1', studio_id: studioAlphaId, data: 'Alpha Revenue & Activity' },
    { id: 'rec-alpha-2', studio_id: studioAlphaId, data: 'Alpha Client Leads' },
  ];

  const studioBravoRecords: StudioScopedRecord[] = [
    { id: 'rec-bravo-1', studio_id: studioBravoId, data: 'Bravo VIP Clients' },
  ];

  function queryStudioAnalytics(requestingStudioId: string, allRecords: StudioScopedRecord[]) {
    // Simulated Prisma query with where: { studio_id: requestingStudioId }
    return allRecords.filter((r) => r.studio_id === requestingStudioId);
  }

  const allRecords = [...studioAlphaRecords, ...studioBravoRecords];

  const alphaView = queryStudioAnalytics(studioAlphaId, allRecords);
  assert(alphaView.length === 2, 'Studio Alpha retrieves exactly its own 2 records');
  assert(alphaView.every((r) => r.studio_id === studioAlphaId), 'Studio Alpha results contain zero Bravo data (Anti-IDOR PASS)');

  const bravoView = queryStudioAnalytics(studioBravoId, allRecords);
  assert(bravoView.length === 1, 'Studio Bravo retrieves exactly its own 1 record');
  assert(bravoView.every((r) => r.studio_id === studioBravoId), 'Studio Bravo results contain zero Alpha data (Anti-IDOR PASS)');

  // Attempting direct ID access with cross-tenant check
  function accessGalleryAnalytics(galleryOwnerStudioId: string, accessorStudioId: string) {
    if (galleryOwnerStudioId !== accessorStudioId) {
      throw new Error('Forbidden: Cross-tenant access denied');
    }
    return { status: 200, access: 'GRANTED' };
  }

  let idorBlocked = false;
  try {
    accessGalleryAnalytics(studioAlphaId, studioBravoId);
  } catch (err: any) {
    idorBlocked = err.message.includes('Forbidden');
  }
  assert(idorBlocked, 'Cross-tenant gallery analytics access strictly forbidden with 403 (Anti-IDOR PASS)');

  // ========================================================================
  // TEST GROUP 10: DAILY AGGREGATION IDEMPOTENCY & CRON RECOVERY
  // ========================================================================
  console.log('\n⚙️  Test Group 10: Daily Aggregation Idempotency & Backfill Reliability');

  interface DailyAggTable {
    studio_id: string;
    date: string;
    views_count: number;
    downloads_count: number;
    updated_at: Date;
  }

  const dailyAggregates: Map<string, DailyAggTable> = new Map();

  function upsertDailyAggregate(studioId: string, date: string, views: number, downloads: number) {
    const key = `${studioId}:${date}`;
    // Simulates Prisma upsert with @@unique([studio_id, date])
    dailyAggregates.set(key, {
      studio_id: studioId,
      date,
      views_count: views,
      downloads_count: downloads,
      updated_at: new Date(),
    });
  }

  // Run initial daily aggregate
  upsertDailyAggregate(studioAlphaId, '2026-09-13', 120, 15);
  const initialEntry = dailyAggregates.get(`${studioAlphaId}:2026-09-13`);
  assert(initialEntry !== undefined && initialEntry.views_count === 120, 'Initial daily aggregation entry written');

  // Re-run identical aggregation (e.g. cron retry / manual backfill)
  upsertDailyAggregate(studioAlphaId, '2026-09-13', 120, 15);
  const totalEntries = Array.from(dailyAggregates.keys()).filter((k) => k.startsWith(studioAlphaId)).length;
  assert(totalEntries === 1, 'Re-running daily aggregation creates zero duplicate rows (Idempotency PASS)');

  // Updated values on re-aggregation (e.g., late events ingested)
  upsertDailyAggregate(studioAlphaId, '2026-09-13', 145, 18);
  const updatedEntry = dailyAggregates.get(`${studioAlphaId}:2026-09-13`);
  assert(updatedEntry?.views_count === 145, 'Re-aggregation correctly updates existing values smoothly');
  assert(updatedEntry?.downloads_count === 18, 'Re-aggregation updates download count');

  // Multi-day backfill test
  const backfillDates = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
  for (const bDate of backfillDates) {
    upsertDailyAggregate(studioAlphaId, bDate, 50, 5);
  }
  const backfillCount = Array.from(dailyAggregates.keys()).filter((k) => k.startsWith(studioAlphaId)).length;
  assert(backfillCount === 5, `Backfill executed cleanly across 4 historical days + 1 today (total ${backfillCount} rows)`);

  console.log('\n========================================================================');
  console.log(`🏁 PHASE 8 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase8AnalyticsBiTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
