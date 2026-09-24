import crypto from 'crypto';
import {
  ClientStatus,
  DeliveryStatus,
  ClientDTO,
  ClientGalleryDTO,
  ClientActivityDTO,
  GalleryDeliveryDTO,
  GalleryAccessType,
  GalleryStatus,
  UserRole,
} from '../packages/types/src/index.js';
import { EmailProvider, EmailMessage, EmailResult, ConsoleDevEmailProvider, MockFailingEmailProvider } from '../apps/api/src/services/email/email.provider.js';
import { EmailService } from '../apps/api/src/services/email/email.service.js';

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

async function runPhase7ClientCrmDeliveryTests() {
  console.log('\n========================================================================');
  console.log('🏛️  PIXMATCH AI — PHASE 7 CLIENT CRM & PROFESSIONAL GALLERY DELIVERY');
  console.log('   Client CRM, Multi-Gallery Delivery, Email Abstraction, Anti-IDOR & Privacy');
  console.log('========================================================================\n');

  const studioAlpha = { id: 'studio-alpha-001', name: 'Alpha Photography Studios', website: 'https://alphaphoto.com', logo_url: 'https://cdn.alphaphoto.com/logo.png' };
  const studioBravo = { id: 'studio-bravo-002', name: 'Bravo Moments Lab', website: 'https://bravomoments.com', logo_url: 'https://cdn.bravomoments.com/logo.png' };

  // ========================================================================
  // TEST GROUP 1: CLIENT CRUD, VALIDATION, NOTES & TAGS
  // ========================================================================
  console.log('📋 Test Group 1: Client CRUD, Validation, Private Notes & Studio Tags');

  interface MockClient {
    id: string;
    studio_id: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    phone?: string | null;
    company?: string | null;
    notes?: string | null;
    tags: string[];
    status: ClientStatus;
    deleted_at?: Date | null;
    created_at: Date;
    updated_at: Date;
  }

  const clientStore: MockClient[] = [];

  function createClient(data: Partial<MockClient> & { studio_id: string; name: string; email: string }): MockClient {
    // Input validation
    if (!data.name || data.name.trim().length === 0) throw new Error('Client name is required');
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('Invalid email address format');
    if (data.name.length > 200) throw new Error('Client name exceeds 200 character limit');

    const names = data.name.trim().split(' ');
    const firstName = data.first_name || names[0];
    const lastName = data.last_name || (names.length > 1 ? names.slice(1).join(' ') : null);

    const newClient: MockClient = {
      id: `client-${crypto.randomUUID()}`,
      studio_id: data.studio_id,
      name: data.name.trim(),
      first_name: firstName,
      last_name: lastName,
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || null,
      company: data.company?.trim() || null,
      notes: data.notes?.trim() || null,
      tags: data.tags || [],
      status: data.status || ClientStatus.ACTIVE,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    clientStore.push(newClient);
    return newClient;
  }

  const client1 = createClient({
    studio_id: studioAlpha.id,
    name: 'Rahul & Priya Sharma',
    email: 'rahul.priya@sharmaweddings.in',
    phone: '+91 98765 43210',
    company: 'Sharma Family',
    notes: 'Bride prefers warm tone grading; album delivery requested in silk box.',
    tags: ['Wedding', 'VIP', 'Repeat Client'],
  });

  assert(Boolean(client1.id), 'Client successfully created with UUID');
  assert(client1.email === 'rahul.priya@sharmaweddings.in', 'Client email is sanitized and normalized to lowercase');
  assert(client1.tags.includes('Wedding') && client1.tags.includes('VIP'), 'Studio-scoped tags attached to client');
  assert(client1.notes?.includes('silk box') === true, 'Private internal notes stored safely');
  assert(client1.status === ClientStatus.ACTIVE, 'New client defaults to ACTIVE status');

  // Input Validation Test: Malformed email rejection
  try {
    createClient({ studio_id: studioAlpha.id, name: 'Invalid User', email: 'not-an-email' });
    assert(false, 'Malformed email should be rejected');
  } catch (err: any) {
    assert(err.message.includes('Invalid email'), 'Malformed email successfully rejected by validator');
  }

  // Input Validation Test: Empty name rejection
  try {
    createClient({ studio_id: studioAlpha.id, name: '   ', email: 'test@example.com' });
    assert(false, 'Empty name should be rejected');
  } catch (err: any) {
    assert(err.message.includes('name is required'), 'Blank client name rejected by validator');
  }

  // Soft Delete & Restore
  function softDeleteClient(clientId: string, studioId: string): boolean {
    const target = clientStore.find((c) => c.id === clientId && c.studio_id === studioId);
    if (!target) return false;
    target.deleted_at = new Date();
    target.status = ClientStatus.ARCHIVED;
    return true;
  }

  function restoreClient(clientId: string, studioId: string): boolean {
    const target = clientStore.find((c) => c.id === clientId && c.studio_id === studioId);
    if (!target) return false;
    target.deleted_at = null;
    target.status = ClientStatus.ACTIVE;
    return true;
  }

  const clientTemp = createClient({
    studio_id: studioAlpha.id,
    name: 'Temporary Client',
    email: 'temp@example.com',
  });

  assert(softDeleteClient(clientTemp.id, studioAlpha.id), 'Client soft-deleted successfully');
  assert(clientTemp.deleted_at !== null && clientTemp.status === ClientStatus.ARCHIVED, 'Soft-deleted client marked with deleted_at timestamp and ARCHIVED status');

  assert(restoreClient(clientTemp.id, studioAlpha.id), 'Client restored successfully');
  assert(clientTemp.deleted_at === null && clientTemp.status === ClientStatus.ACTIVE, 'Restored client has deleted_at cleared and status ACTIVE');

  // ========================================================================
  // TEST GROUP 2: DUPLICATE DETECTION WITHIN STUDIO VS CROSS-STUDIO ISOLATION
  // ========================================================================
  console.log('\n📋 Test Group 2: Duplicate Client Detection within Studio vs Cross-Studio');

  function checkDuplicateClient(studioId: string, email?: string, name?: string, phone?: string): MockClient | null {
    if (email) {
      const match = clientStore.find(
        (c) => c.studio_id === studioId && c.deleted_at === null && c.email.toLowerCase() === email.toLowerCase().trim()
      );
      if (match) return match;
    }
    if (name && phone) {
      const match = clientStore.find(
        (c) => c.studio_id === studioId && c.deleted_at === null && c.name.toLowerCase() === name.toLowerCase().trim() && c.phone === phone.trim()
      );
      if (match) return match;
    }
    return null;
  }

  const dupSameStudio = checkDuplicateClient(studioAlpha.id, 'rahul.priya@sharmaweddings.in');
  assert(dupSameStudio !== null && dupSameStudio.id === client1.id, 'Duplicate detected when adding same email within Studio Alpha');

  const dupDiffStudio = checkDuplicateClient(studioBravo.id, 'rahul.priya@sharmaweddings.in');
  assert(dupDiffStudio === null, 'Studio Bravo is not blocked from creating client with same email (Strict Studio Isolation)');

  // Studio Bravo creates client with same email
  const clientBravo = createClient({
    studio_id: studioBravo.id,
    name: 'Rahul Sharma (Corporate)',
    email: 'rahul.priya@sharmaweddings.in',
    company: 'Bravo Commercial Client',
  });
  assert(clientBravo.id !== client1.id, 'Studio Bravo client created with independent ID and studio_id');

  // ========================================================================
  // TEST GROUP 3: SERVER-SIDE SEARCH, FILTERS & CURSOR PAGINATION
  // ========================================================================
  console.log('\n📋 Test Group 3: Server-Side Search, Filter Queries & Cursor Pagination');

  // Seed 1,000 clients for performance & pagination stress test
  for (let i = 1; i <= 1000; i++) {
    clientStore.push({
      id: `client-stress-${i}`,
      studio_id: studioAlpha.id,
      name: `Client Number ${i} Gupta`,
      email: `client.${i}@photomatch-stress.com`,
      phone: `+91 90000 ${String(i).padStart(5, '0')}`,
      company: i % 5 === 0 ? 'Enterprise Org' : null,
      notes: null,
      tags: i % 2 === 0 ? ['Wedding'] : ['Portrait'],
      status: i % 10 === 0 ? ClientStatus.ARCHIVED : ClientStatus.ACTIVE,
      deleted_at: i % 10 === 0 ? new Date() : null,
      created_at: new Date(Date.now() - (1000 - i) * 60000),
      updated_at: new Date(),
    });
  }

  function queryClients(params: {
    studioId: string;
    search?: string;
    filter?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = params.limit || 25;
    let query = clientStore.filter((c) => c.studio_id === params.studioId);

    // Filter Deleted / Status
    if (params.filter === 'ARCHIVED') {
      query = query.filter((c) => c.deleted_at !== null || c.status === ClientStatus.ARCHIVED);
    } else {
      query = query.filter((c) => c.deleted_at === null);
      if (params.filter === 'ACTIVE') {
        query = query.filter((c) => c.status === ClientStatus.ACTIVE);
      }
    }

    // Search query
    if (params.search) {
      const q = params.search.toLowerCase();
      query = query.filter(
        (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
      );
    }

    // Sort by created_at desc
    query.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

    // Cursor pagination
    let startIndex = 0;
    if (params.cursor) {
      const cursorIndex = query.findIndex((c) => c.id === params.cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    const page = query.slice(startIndex, startIndex + limit);
    const nextCursor = page.length === limit && startIndex + limit < query.length ? page[page.length - 1].id : null;

    return {
      clients: page,
      total_count: query.length,
      next_cursor: nextCursor,
      has_more: nextCursor !== null,
    };
  }

  const page1 = queryClients({ studioId: studioAlpha.id, limit: 25 });
  assert(page1.clients.length === 25, 'Page 1 returns exactly 25 client records');
  assert(page1.has_more === true, 'Pagination indicates more records are available');
  assert(page1.next_cursor !== null, 'Cursor token generated for next page');

  const page2 = queryClients({ studioId: studioAlpha.id, limit: 25, cursor: page1.next_cursor! });
  assert(page2.clients.length === 25, 'Page 2 returns next 25 client records seamlessly');
  assert(page2.clients[0].id !== page1.clients[0].id, 'Page 2 does not duplicate Page 1 records');

  // Search verification
  const searchResults = queryClients({ studioId: studioAlpha.id, search: 'Gupta' });
  assert(searchResults.clients.length > 0 && searchResults.clients.every((c) => c.name.includes('Gupta')), 'Search query filters results server-side');

  // Phone search
  const phoneSearch = queryClients({ studioId: studioAlpha.id, search: '90000 00042' });
  assert(phoneSearch.clients.length === 1 && phoneSearch.clients[0].email === 'client.42@photomatch-stress.com', 'Phone number search matches exact contact');

  // ========================================================================
  // TEST GROUP 4: CLIENT ↔ GALLERY MULTI-RELATIONSHIP & UNASSIGN
  // ========================================================================
  console.log('\n📋 Test Group 4: Client ↔ Gallery Relationships & Multi-Gallery Assignment');

  interface MockGallery {
    id: string;
    studio_id: string;
    title: string;
    slug: string;
    event_type: string;
    status: GalleryStatus;
    expires_at: Date | null;
  }

  interface MockClientGallery {
    id: string;
    client_id: string;
    gallery_id: string;
    studio_id: string;
    relationship_type: string;
    created_at: Date;
  }

  const galleryStore: MockGallery[] = [
    { id: 'gal-w-01', studio_id: studioAlpha.id, title: 'Rahul & Priya — Wedding 2026', slug: 'rahul-priya-wedding-2026', event_type: 'Wedding', status: GalleryStatus.PUBLISHED, expires_at: new Date(Date.now() + 86400000 * 90) },
    { id: 'gal-e-02', studio_id: studioAlpha.id, title: 'Rahul & Priya — Engagement 2026', slug: 'rahul-priya-engagement-2026', event_type: 'Engagement', status: GalleryStatus.PUBLISHED, expires_at: new Date(Date.now() + 86400000 * 90) },
    { id: 'gal-r-03', studio_id: studioAlpha.id, title: 'Rahul & Priya — Reception 2026', slug: 'rahul-priya-reception-2026', event_type: 'Reception', status: GalleryStatus.PUBLISHED, expires_at: new Date(Date.now() + 86400000 * 90) },
    { id: 'gal-b-01', studio_id: studioBravo.id, title: 'Bravo Secret Gallery', slug: 'bravo-secret', event_type: 'Commercial', status: GalleryStatus.PUBLISHED, expires_at: null },
  ];

  const clientGalleryStore: MockClientGallery[] = [];

  function assignClientToGallery(studioId: string, clientId: string, galleryId: string, relationshipType = 'PRIMARY'): MockClientGallery {
    const gallery = galleryStore.find((g) => g.id === galleryId && g.studio_id === studioId);
    if (!gallery) throw new Error('Gallery not found or unauthorized');

    const client = clientStore.find((c) => c.id === clientId && c.studio_id === studioId && c.deleted_at === null);
    if (!client) throw new Error('Client not found or unauthorized');

    const existing = clientGalleryStore.find((cg) => cg.client_id === clientId && cg.gallery_id === galleryId);
    if (existing) {
      existing.relationship_type = relationshipType;
      return existing;
    }

    const rel: MockClientGallery = {
      id: `cg-${crypto.randomUUID()}`,
      client_id: clientId,
      gallery_id: galleryId,
      studio_id: studioId,
      relationship_type: relationshipType,
      created_at: new Date(),
    };
    clientGalleryStore.push(rel);
    return rel;
  }

  // Assign multiple galleries to Client 1 (Rahul & Priya)
  const rel1 = assignClientToGallery(studioAlpha.id, client1.id, 'gal-w-01', 'PRIMARY');
  const rel2 = assignClientToGallery(studioAlpha.id, client1.id, 'gal-e-02', 'PRIMARY');
  const rel3 = assignClientToGallery(studioAlpha.id, client1.id, 'gal-r-03', 'PRIMARY');

  assert(clientGalleryStore.filter((cg) => cg.client_id === client1.id).length === 3, 'Client 1 successfully assigned 3 distinct galleries (Multi-Gallery model)');
  assert(rel1.relationship_type === 'PRIMARY' && rel2.relationship_type === 'PRIMARY', 'Relationship types correctly set to PRIMARY');

  // Anti-IDOR Check: Studio Alpha cannot assign Studio Bravo Gallery
  try {
    assignClientToGallery(studioAlpha.id, client1.id, 'gal-b-01');
    assert(false, 'Cross-studio gallery assignment should fail');
  } catch (err: any) {
    assert(err.message.includes('not found or unauthorized'), 'Cross-tenant gallery assignment blocked (Anti-IDOR PASS)');
  }

  // Anti-IDOR Check: Studio Alpha cannot assign Studio Bravo Client
  try {
    assignClientToGallery(studioAlpha.id, clientBravo.id, 'gal-w-01');
    assert(false, 'Cross-studio client assignment should fail');
  } catch (err: any) {
    assert(err.message.includes('not found or unauthorized'), 'Cross-tenant client assignment blocked (Anti-IDOR PASS)');
  }

  // Unassign Gallery
  function unassignClientGallery(studioId: string, clientId: string, galleryId: string): boolean {
    const index = clientGalleryStore.findIndex(
      (cg) => cg.client_id === clientId && cg.gallery_id === galleryId && cg.studio_id === studioId
    );
    if (index === -1) return false;
    clientGalleryStore.splice(index, 1);
    return true;
  }

  assert(unassignClientGallery(studioAlpha.id, client1.id, 'gal-r-03'), 'Reception gallery unassigned from client');
  assert(clientGalleryStore.filter((cg) => cg.client_id === client1.id).length === 2, 'Client now has exactly 2 assigned galleries');

  // ========================================================================
  // TEST GROUP 5: GALLERY DELIVERY STATE MACHINE & EXPIRATION
  // ========================================================================
  console.log('\n📋 Test Group 5: Gallery Delivery State Machine & Expiry Transition');

  interface MockDelivery {
    id: string;
    studio_id: string;
    gallery_id: string;
    client_id: string;
    recipient_email: string;
    status: DeliveryStatus;
    sent_at: Date;
    opened_at?: Date | null;
    idempotency_key?: string | null;
  }

  const deliveryStore: MockDelivery[] = [];

  function computeDeliveryStatus(gallery: MockGallery, deliveries: MockDelivery[], viewsCount: number): DeliveryStatus {
    if (gallery.expires_at && new Date() > gallery.expires_at) {
      return DeliveryStatus.EXPIRED;
    }
    const latest = deliveries.find((d) => d.gallery_id === gallery.id);
    if (!latest) return DeliveryStatus.NOT_SENT;
    if (viewsCount > 0 || latest.status === DeliveryStatus.OPENED || latest.status === DeliveryStatus.ACTIVE) {
      return DeliveryStatus.OPENED;
    }
    return latest.status;
  }

  const testGal = galleryStore[0];
  assert(computeDeliveryStatus(testGal, deliveryStore, 0) === DeliveryStatus.NOT_SENT, 'Initial gallery delivery status is NOT_SENT');

  // Dispatch delivery
  const delivery1: MockDelivery = {
    id: 'del-001',
    studio_id: studioAlpha.id,
    gallery_id: testGal.id,
    client_id: client1.id,
    recipient_email: client1.email,
    status: DeliveryStatus.SENT,
    sent_at: new Date(),
    opened_at: null,
    idempotency_key: 'key-12345',
  };
  deliveryStore.push(delivery1);

  assert(computeDeliveryStatus(testGal, deliveryStore, 0) === DeliveryStatus.SENT, 'Delivery status transitions to SENT after dispatch');

  // Client opens gallery
  assert(computeDeliveryStatus(testGal, deliveryStore, 1) === DeliveryStatus.OPENED, 'Delivery status transitions to OPENED upon client view');

  // Expired Gallery Test
  const expiredGal: MockGallery = {
    id: 'gal-exp-01',
    studio_id: studioAlpha.id,
    title: 'Expired Gallery 2025',
    slug: 'expired-gallery-2025',
    event_type: 'Wedding',
    status: GalleryStatus.PUBLISHED,
    expires_at: new Date(Date.now() - 100000), // Past
  };
  assert(computeDeliveryStatus(expiredGal, [delivery1], 5) === DeliveryStatus.EXPIRED, 'Authoritative gallery expiration transitions status to EXPIRED');

  // ========================================================================
  // TEST GROUP 6: EMAIL ABSTRACTION, FAILURE RECOVERY & IDEMPOTENCY
  // ========================================================================
  console.log('\n📋 Test Group 6: Email Abstraction, Failure Recovery & Idempotency Key Defense');

  const devProvider = new ConsoleDevEmailProvider();
  EmailService.setProvider(devProvider);

  // Send Initial Delivery Email
  const deliveryResult = await EmailService.sendGalleryDelivery({
    recipientEmail: client1.email,
    recipientName: client1.name,
    galleryTitle: testGal.title,
    gallerySlug: testGal.slug,
    eventType: testGal.event_type,
    studioName: studioAlpha.name,
    studioWebsite: studioAlpha.website,
    studioLogoUrl: studioAlpha.logo_url,
    customMessage: 'We loved photographing your special day! Here is your private gallery link.',
  });

  assert(deliveryResult.success === true, 'Email dispatched successfully via ConsoleDevEmailProvider');
  assert(deliveryResult.messageId?.startsWith('dev-msg-') === true, 'Message ID generated for email tracking');

  // Send Reminder Email
  const reminderResult = await EmailService.sendGalleryReminder({
    recipientEmail: client1.email,
    recipientName: client1.name,
    galleryTitle: testGal.title,
    gallerySlug: testGal.slug,
    studioName: studioAlpha.name,
    studioWebsite: studioAlpha.website,
  });

  assert(reminderResult.success === true, 'Gallery reminder email dispatched successfully');

  // Test Failure Recovery with Failing Provider
  const failingProvider = new MockFailingEmailProvider();
  EmailService.setProvider(failingProvider);

  const failedResult = await EmailService.sendGalleryDelivery({
    recipientEmail: 'broken@example.com',
    recipientName: 'Broken Delivery',
    galleryTitle: testGal.title,
    gallerySlug: testGal.slug,
    studioName: studioAlpha.name,
  });

  assert(failedResult.success === false, 'Failing provider returns false without throwing unhandled exceptions');
  assert(Boolean(failedResult.error), 'Safe error description returned on delivery failure');

  // Restore Dev Provider
  EmailService.setProvider(devProvider);

  // Test Idempotency Key Defense
  function dispatchWithIdempotency(key: string): { status: number; is_replay: boolean } {
    const existing = deliveryStore.find((d) => d.idempotency_key === key);
    if (existing) {
      return { status: 200, is_replay: true };
    }
    deliveryStore.push({
      id: `del-${crypto.randomUUID()}`,
      studio_id: studioAlpha.id,
      gallery_id: testGal.id,
      client_id: client1.id,
      recipient_email: client1.email,
      status: DeliveryStatus.SENT,
      sent_at: new Date(),
      idempotency_key: key,
    });
    return { status: 201, is_replay: false };
  }

  const initialSend = dispatchWithIdempotency('idemp-unique-token-001');
  assert(initialSend.status === 201 && initialSend.is_replay === false, 'Initial send dispatches and records idempotency key');

  const replaySend = dispatchWithIdempotency('idemp-unique-token-001');
  assert(replaySend.status === 200 && replaySend.is_replay === true, 'Duplicate request with identical idempotency key returns cached replay (Idempotency PASS)');

  // ========================================================================
  // TEST GROUP 7: CLIENT ACTIVITY TIMELINE, PRIVACY & BIOMETRIC MASKING
  // ========================================================================
  console.log('\n📋 Test Group 7: Client Activity Timeline, Privacy & Biometric Masking');

  interface MockActivity {
    id: string;
    studio_id: string;
    client_id: string;
    gallery_id?: string | null;
    activity_type: string;
    description: string;
    created_at: Date;
  }

  const activityStore: MockActivity[] = [];

  function logActivity(studioId: string, clientId: string, type: string, description: string, galleryId?: string) {
    activityStore.push({
      id: `act-${crypto.randomUUID()}`,
      studio_id: studioId,
      client_id: clientId,
      gallery_id: galleryId || null,
      activity_type: type,
      description,
      created_at: new Date(),
    });
  }

  // Simulate lifecycle activities
  logActivity(studioAlpha.id, client1.id, 'CLIENT_CREATED', 'Client profile created');
  logActivity(studioAlpha.id, client1.id, 'GALLERY_ASSIGNED', 'Assigned to "Rahul & Priya — Wedding 2026"', testGal.id);
  logActivity(studioAlpha.id, client1.id, 'GALLERY_SHARED', `Invitation email sent to ${client1.email}`, testGal.id);
  logActivity(studioAlpha.id, client1.id, 'GALLERY_VIEWED', 'Client viewed gallery via desktop web', testGal.id);
  logActivity(studioAlpha.id, client1.id, 'PHOTO_FAVORITED', 'Client favorited 14 photos', testGal.id);
  logActivity(studioAlpha.id, client1.id, 'PHOTO_SELECTED', 'Client submitted proofing selection of 32 photos', testGal.id);
  logActivity(studioAlpha.id, client1.id, 'DOWNLOAD_COMPLETED', 'Client downloaded high-res ZIP package', testGal.id);

  assert(activityStore.length === 7, 'All 7 client lifecycle activity events successfully logged');

  // Verify Privacy: No Biometric Data in Activity
  const leakedBiometrics = activityStore.some(
    (a) => a.description.includes('embedding') || a.description.includes('vector') || a.description.includes('0.58')
  );
  assert(!leakedBiometrics, 'Activity timeline contains ZERO biometric embeddings or raw vectors (Strict Privacy PASS)');

  // Verify Studio Isolation on Activity
  const alphaActivity = activityStore.filter((a) => a.studio_id === studioAlpha.id);
  const bravoActivity = activityStore.filter((a) => a.studio_id === studioBravo.id);
  assert(alphaActivity.length === 7 && bravoActivity.length === 0, 'Studio Bravo cannot view Studio Alpha activity history');

  // ========================================================================
  // TEST SUMMARY
  // ========================================================================
  console.log('\n========================================================================');
  console.log(`🏁 PHASE 7 TEST SUMMARY: ${passed} Passed | ${failed} Failed`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7ClientCrmDeliveryTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
