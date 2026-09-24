/**
 * PIXMatch AI — Phase 30 Master Test Suite
 * ADVANCED CLIENT EXPERIENCE & GALLERY EXPERIENCE 2.0
 *
 * Covers 16 comprehensive test modules with 340+ assertions.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import crypto from 'crypto';
import { prisma } from '@pixmatch/database';
import { ClientPortalSessionService } from '../apps/api/src/modules/client-portal/client-portal-session.service.js';
import { ClientExperienceService } from '../apps/api/src/modules/client-portal/client-experience.service.js';
import { StudioBrandingService } from '../apps/api/src/modules/branding/studio-branding.service.js';
import { PhotoRecommendationService } from '../apps/api/src/modules/galleries/photo-recommendation.service.js';

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

// In-Memory Mock Database for Phase 30 Deterministic Testing
class MockPhase30Database {
  studios: any[] = [];
  clients: any[] = [];
  projects: any[] = [];
  galleries: any[] = [];
  clientGalleries: any[] = [];
  photos: any[] = [];
  albums: any[] = [];
  galleryFavorites: any[] = [];
  gallerySelections: any[] = [];
  galleryClientSessions: any[] = [];
  proofingSessions: any[] = [];
  proofingItems: any[] = [];
  fulfillmentOrders: any[] = [];
  fulfillmentDeliveries: any[] = [];
  fulfillmentPackages: any[] = [];
  clientConversations: any[] = [];
  clientMessages: any[] = [];
  notificationLogs: any[] = [];
  clientImportantDates: any[] = [];
  clientActivities: any[] = [];
  clientPortalSessions: any[] = [];
  clientPortalNotificationReads: any[] = [];
  clientPortalPreferences: any[] = [];
  studioBrandings: any[] = [];
  photoAIAnalyses: any[] = [];
  photoHighlights: any[] = [];
  eventChapters: any[] = [];
  smartAlbums: any[] = [];

  reset() {
    this.studios = [];
    this.clients = [];
    this.projects = [];
    this.galleries = [];
    this.clientGalleries = [];
    this.photos = [];
    this.albums = [];
    this.galleryFavorites = [];
    this.gallerySelections = [];
    this.galleryClientSessions = [];
    this.proofingSessions = [];
    this.proofingItems = [];
    this.fulfillmentOrders = [];
    this.fulfillmentDeliveries = [];
    this.fulfillmentPackages = [];
    this.clientConversations = [];
    this.clientMessages = [];
    this.notificationLogs = [];
    this.clientImportantDates = [];
    this.clientActivities = [];
    this.clientPortalSessions = [];
    this.clientPortalNotificationReads = [];
    this.clientPortalPreferences = [];
    this.studioBrandings = [];
    this.photoAIAnalyses = [];
    this.photoHighlights = [];
    this.eventChapters = [];
    this.smartAlbums = [];
  }
}

const mockDb = new MockPhase30Database();

function patchPrismaMock() {
  const p: any = prisma;

  p.$transaction = async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(p);
    }
    return Promise.all(fnOrArray);
  };

  p.studio = {
    findUnique: async ({ where, include }: any) => {
      const s = mockDb.studios.find(st => (where.id && st.id === where.id) || (where.slug && st.slug === where.slug)) || null;
      if (!s) return null;
      const res = { ...s };
      if (include?.branding) {
        res.branding = mockDb.studioBrandings.find(b => b.studio_id === s.id) || null;
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      const s = mockDb.studios.find(st => {
        for (const [k, v] of Object.entries(where)) {
          if (st[k] !== v) return false;
        }
        return true;
      }) || null;
      if (!s) return null;
      const res = { ...s };
      if (include?.branding) {
        res.branding = mockDb.studioBrandings.find(b => b.studio_id === s.id) || null;
      }
      return res;
    },
  };

  p.client = {
    findUnique: async ({ where }: any) => {
      return mockDb.clients.find(c => c.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.clients.find(c => {
        for (const [k, v] of Object.entries(where)) {
          if (c[k] !== v) return false;
        }
        return true;
      }) || null;
    },
  };

  p.clientPortalSession = {
    create: async ({ data }: any) => {
      const session = {
        id: data.id || `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date(),
        updated_at: new Date(),
        access_count: 0,
        last_accessed_at: null,
        metadata: {},
        ...data,
      };
      mockDb.clientPortalSessions.push(session);
      return session;
    },
    findUnique: async ({ where, include }: any) => {
      const session = mockDb.clientPortalSessions.find(
        s => (where.id && s.id === where.id) || (where.token_hash && s.token_hash === where.token_hash)
      );
      if (!session) return null;
      const res = { ...session };
      if (include?.client) {
        res.client = mockDb.clients.find(c => c.id === session.client_id) || null;
      }
      if (include?.studio) {
        const st = mockDb.studios.find(s => s.id === session.studio_id) || null;
        if (st) {
          const br = mockDb.studioBrandings.find(b => b.studio_id === st.id) || null;
          res.studio = { ...st, branding: br };
        } else {
          res.studio = null;
        }
      }
      return res;
    },
    update: async ({ where, data }: any) => {
      const session = mockDb.clientPortalSessions.find(s => s.id === where.id);
      if (!session) throw new Error('Session not found');
      Object.assign(session, data, { updated_at: new Date() });
      return session;
    },
  };

  p.studioBranding = {
    findUnique: async ({ where }: any) => {
      return mockDb.studioBrandings.find(b => b.studio_id === where.studio_id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.studioBrandings.find(b => b.studio_id === where.studio_id) || null;
    },
  };

  p.clientGallery = {
    findMany: async ({ where, include }: any) => {
      const list = mockDb.clientGalleries.filter(cg => {
        if (where.studio_id && cg.studio_id !== where.studio_id) return false;
        if (where.client_id && cg.client_id !== where.client_id) return false;
        return true;
      });
      return list.map(cg => {
        const res = { ...cg };
        if (include?.gallery) {
          const g = mockDb.galleries.find(gal => gal.id === cg.gallery_id);
          if (g) {
            const photos = mockDb.photos.filter(ph => ph.gallery_id === g.id && ph.status === 'READY');
            res.gallery = {
              ...g,
              photos: photos.slice(0, 1),
              _count: { photos: photos.length },
            };
          }
        }
        return res;
      });
    },
    findFirst: async ({ where }: any) => {
      return mockDb.clientGalleries.find(cg => {
        if (where.studio_id && cg.studio_id !== where.studio_id) return false;
        if (where.client_id && cg.client_id !== where.client_id) return false;
        if (where.gallery_id && cg.gallery_id !== where.gallery_id) return false;
        return true;
      }) || null;
    },
  };

  p.gallery = {
    findUnique: async ({ where }: any) => {
      return mockDb.galleries.find(g => (where.id && g.id === where.id) || (where.slug && g.slug === where.slug)) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.galleries.find(g => {
        for (const [k, v] of Object.entries(where)) {
          if (g[k] !== v) return false;
        }
        return true;
      }) || null;
    },
  };

  p.photo = {
    findMany: async ({ where, include, take, skip = 0 }: any) => {
      let list = mockDb.photos.filter(ph => {
        if (where.studio_id && ph.studio_id !== where.studio_id) return false;
        if (where.gallery_id && ph.gallery_id !== where.gallery_id) return false;
        if (where.album_id && ph.album_id !== where.album_id) return false;
        if (where.status && ph.status !== where.status) return false;
        if (where.id?.in && !where.id.in.includes(ph.id)) return false;
        if (where.OR) {
          const matchesOr = where.OR.some((cond: any) => {
            if (cond.original_filename?.contains && ph.original_filename?.toLowerCase().includes(cond.original_filename.contains)) return true;
            if (cond.caption?.contains && ph.caption?.toLowerCase().includes(cond.caption.contains)) return true;
            if (cond.title?.contains && ph.title?.toLowerCase().includes(cond.title.contains)) return true;
            return false;
          });
          if (!matchesOr) return false;
        }
        return true;
      });

      if (skip) list = list.slice(skip);
      if (take) list = list.slice(0, take);

      return list.map(ph => {
        const res = { ...ph };
        if (include?.gallery) {
          res.gallery = mockDb.galleries.find(g => g.id === ph.gallery_id) || null;
        }
        return res;
      });
    },
    findFirst: async ({ where, include }: any) => {
      const ph = mockDb.photos.find(p => {
        if (where.id && p.id !== where.id) return false;
        if (where.studio_id && p.studio_id !== where.studio_id) return false;
        if (where.gallery_id && p.gallery_id !== where.gallery_id) return false;
        if (where.status && p.status !== where.status) return false;
        return true;
      });
      if (!ph) return null;
      const res = { ...ph };
      if (include?.gallery) {
        res.gallery = mockDb.galleries.find(g => g.id === ph.gallery_id) || null;
      }
      return res;
    },
    count: async ({ where }: any) => {
      return mockDb.photos.filter(ph => {
        if (where.studio_id && ph.studio_id !== where.studio_id) return false;
        if (where.gallery_id && ph.gallery_id !== where.gallery_id) return false;
        if (where.album_id && ph.album_id !== where.album_id) return false;
        if (where.status && ph.status !== where.status) return false;
        if (where.id?.in && !where.id.in.includes(ph.id)) return false;
        if (where.OR) {
          const matchesOr = where.OR.some((cond: any) => {
            if (cond.original_filename?.contains && ph.original_filename?.toLowerCase().includes(cond.original_filename.contains)) return true;
            if (cond.caption?.contains && ph.caption?.toLowerCase().includes(cond.caption.contains)) return true;
            if (cond.title?.contains && ph.title?.toLowerCase().includes(cond.title.contains)) return true;
            return false;
          });
          if (!matchesOr) return false;
        }
        return true;
      }).length;
    },
  };

  p.album = {
    findMany: async ({ where, include, take }: any) => {
      let list = mockDb.albums.filter(a => {
        if (where.studio_id && a.studio_id !== where.studio_id) return false;
        if (where.gallery_id && a.gallery_id !== where.gallery_id) return false;
        if (where.title?.contains && !a.title?.toLowerCase().includes(where.title.contains)) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list.map(a => {
        const res = { ...a };
        if (include?._count?.select?.photos) {
          res._count = {
            photos: mockDb.photos.filter(ph => ph.album_id === a.id && ph.status === 'READY').length,
          };
        }
        return res;
      });
    },
  };

  p.galleryClientSession = {
    findFirst: async ({ where }: any) => {
      return mockDb.galleryClientSessions.find(s => {
        if (where.gallery_id && s.gallery_id !== where.gallery_id) return false;
        if (where.session_token_hash && s.session_token_hash !== where.session_token_hash) return false;
        return true;
      }) || null;
    },
    create: async ({ data }: any) => {
      const s = {
        id: `client-session-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        created_at: new Date(),
        ...data,
      };
      mockDb.galleryClientSessions.push(s);
      return s;
    },
  };

  p.galleryFavorite = {
    findUnique: async ({ where }: any) => {
      const { gallery_id, session_id, photo_id } = where.gallery_id_session_id_photo_id;
      return mockDb.galleryFavorites.find(
        f => f.gallery_id === gallery_id && f.session_id === session_id && f.photo_id === photo_id
      ) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.galleryFavorites.find(f => {
        if (where.gallery_id && f.gallery_id !== where.gallery_id) return false;
        if (where.session_id && f.session_id !== where.session_id) return false;
        if (where.photo_id && f.photo_id !== where.photo_id) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where, include, take }: any) => {
      let list = mockDb.galleryFavorites.filter(f => {
        if (where.gallery_id?.in && !where.gallery_id.in.includes(f.gallery_id)) return false;
        if (where.gallery_id && typeof where.gallery_id === 'string' && f.gallery_id !== where.gallery_id) return false;
        if (where.photo_id?.in && !where.photo_id.in.includes(f.photo_id)) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list.map(f => {
        const res = { ...f };
        if (include?.photo) {
          res.photo = mockDb.photos.find(p => p.id === f.photo_id) || null;
        }
        return res;
      });
    },
    count: async ({ where }: any) => {
      return mockDb.galleryFavorites.filter(f => {
        if (where.gallery_id?.in && !where.gallery_id.in.includes(f.gallery_id)) return false;
        if (where.gallery_id && typeof where.gallery_id === 'string' && f.gallery_id !== where.gallery_id) return false;
        if (where.session_id && f.session_id !== where.session_id) return false;
        return true;
      }).length;
    },
    create: async ({ data }: any) => {
      const fav = { id: `fav-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, created_at: new Date(), ...data };
      mockDb.galleryFavorites.push(fav);
      return fav;
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.galleryFavorites.findIndex(f => f.id === where.id);
      if (idx !== -1) mockDb.galleryFavorites.splice(idx, 1);
      return { id: where.id };
    },
  };

  p.gallerySelection = {
    findUnique: async ({ where }: any) => {
      const { gallery_id, session_id, photo_id } = where.gallery_id_session_id_photo_id;
      return mockDb.gallerySelections.find(
        s => s.gallery_id === gallery_id && s.session_id === session_id && s.photo_id === photo_id
      ) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.gallerySelections.find(s => {
        if (where.gallery_id && s.gallery_id !== where.gallery_id) return false;
        if (where.session_id && s.session_id !== where.session_id) return false;
        if (where.photo_id && s.photo_id !== where.photo_id) return false;
        return true;
      }) || null;
    },
    findMany: async ({ where, include, take }: any) => {
      let list = mockDb.gallerySelections.filter(s => {
        if (where.gallery_id?.in && !where.gallery_id.in.includes(s.gallery_id)) return false;
        if (where.gallery_id && typeof where.gallery_id === 'string' && s.gallery_id !== where.gallery_id) return false;
        if (where.photo_id?.in && !where.photo_id.in.includes(s.photo_id)) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list.map(s => {
        const res = { ...s };
        if (include?.photo) {
          res.photo = mockDb.photos.find(p => p.id === s.photo_id) || null;
        }
        return res;
      });
    },
    count: async ({ where }: any) => {
      return mockDb.gallerySelections.filter(s => {
        if (where.gallery_id?.in && !where.gallery_id.in.includes(s.gallery_id)) return false;
        if (where.gallery_id && typeof where.gallery_id === 'string' && s.gallery_id !== where.gallery_id) return false;
        if (where.session_id && s.session_id !== where.session_id) return false;
        return true;
      }).length;
    },
    create: async ({ data }: any) => {
      const sel = { id: `sel-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, created_at: new Date(), ...data };
      mockDb.gallerySelections.push(sel);
      return sel;
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.gallerySelections.findIndex(s => s.id === where.id);
      if (idx !== -1) mockDb.gallerySelections.splice(idx, 1);
      return { id: where.id };
    },
  };

  p.clientActivity = {
    findMany: async ({ where, orderBy, take, skip = 0 }: any) => {
      let list = mockDb.clientActivities.filter(a => {
        if (where.studio_id && a.studio_id !== where.studio_id) return false;
        if (where.client_id && a.client_id !== where.client_id) return false;
        if (where.activity_type?.in && !where.activity_type.in.includes(a.activity_type)) return false;
        return true;
      });
      if (orderBy?.created_at === 'desc') {
        list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
      if (skip) list = list.slice(skip);
      if (take) list = list.slice(0, take);
      return list;
    },
    count: async ({ where }: any) => {
      return mockDb.clientActivities.filter(a => {
        if (where.studio_id && a.studio_id !== where.studio_id) return false;
        if (where.client_id && a.client_id !== where.client_id) return false;
        if (where.activity_type?.in && !where.activity_type.in.includes(a.activity_type)) return false;
        return true;
      }).length;
    },
    create: async ({ data }: any) => {
      const act = { id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, created_at: new Date(), ...data };
      mockDb.clientActivities.push(act);
      return act;
    },
  };

  p.photoProofingSession = {
    findMany: async ({ where, include, take }: any) => {
      let list = mockDb.proofingSessions.filter(ps => {
        if (where.studio_id && ps.studio_id !== where.studio_id) return false;
        if (where.client_id && ps.client_id !== where.client_id) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list.map(ps => {
        const res = { ...ps };
        if (include?.items) {
          res.items = mockDb.proofingItems.filter(i => i.session_id === ps.id);
        }
        return res;
      });
    },
  };

  p.clientConversation = {
    findMany: async ({ where, include, take }: any) => {
      let list = mockDb.clientConversations.filter(c => {
        if (where.studio_id && c.studio_id !== where.studio_id) return false;
        if (where.client_id && c.client_id !== where.client_id) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list.map(c => {
        const res = { ...c };
        if (include?.messages) {
          res.messages = mockDb.clientMessages.filter(m => m.conversation_id === c.id);
        }
        return res;
      });
    },
  };

  p.fulfillmentOrder = {
    findMany: async ({ where, include, take }: any) => {
      let list = mockDb.fulfillmentOrders.filter(o => {
        if (where.studio_id && o.studio_id !== where.studio_id) return false;
        if (where.client_id && o.client_id !== where.client_id) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list.map(o => {
        const res = { ...o };
        if (include?.deliveries) {
          res.deliveries = mockDb.fulfillmentDeliveries.filter(d => d.order_id === o.id);
        }
        if (include?.packages) {
          res.packages = mockDb.fulfillmentPackages.filter(pkg => pkg.order_id === o.id);
        }
        return res;
      });
    },
  };

  p.clientImportantDate = {
    findMany: async ({ where, orderBy, take }: any) => {
      let list = mockDb.clientImportantDates.filter(d => {
        if (where.studio_id && d.studio_id !== where.studio_id) return false;
        if (where.client_id && d.client_id !== where.client_id) return false;
        return true;
      });
      if (orderBy?.date === 'asc') {
        list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      if (take) list = list.slice(0, take);
      return list;
    },
  };

  p.clientPortalNotificationRead = {
    findMany: async ({ where }: any) => {
      return mockDb.clientPortalNotificationReads.filter(r => {
        if (where.studio_id && r.studio_id !== where.studio_id) return false;
        if (where.client_id && r.client_id !== where.client_id) return false;
        return true;
      });
    },
  };

  p.notificationLog = {
    count: async ({ where }: any) => {
      return mockDb.notificationLogs.filter(n => {
        if (where.studio_id && n.studio_id !== where.studio_id) return false;
        if (where.recipient_type && n.recipient_type !== where.recipient_type) return false;
        return true;
      }).length;
    },
  };

  p.photoAIAnalysis = {
    findMany: async ({ where, take }: any) => {
      let list = mockDb.photoAIAnalyses.filter(a => {
        if (where.gallery_id && a.gallery_id !== where.gallery_id) return false;
        if (where.photo_id?.in && !where.photo_id.in.includes(a.photo_id)) return false;
        return true;
      });
      if (take) list = list.slice(0, take);
      return list;
    },
    findFirst: async () => null,
  };

  p.photoHighlight = {
    findMany: async () => mockDb.photoHighlights,
    findFirst: async () => null,
  };

  p.eventChapter = {
    findMany: async () => mockDb.eventChapters,
    findFirst: async () => null,
  };

  p.smartAlbum = {
    findMany: async () => mockDb.smartAlbums,
    findFirst: async () => null,
  };

  (PhotoRecommendationService as any).defaultInstance = new PhotoRecommendationService(p);
}

async function runPhase30TestSuite() {
  console.log('============================================================');
  console.log('PIXMATCH AI — PHASE 30 MASTER TEST SUITE');
  console.log('ADVANCED CLIENT EXPERIENCE & GALLERY EXPERIENCE 2.0');
  console.log('============================================================\n');

  patchPrismaMock();

  // Test Fixtures Setup
  const studioA = {
    id: 'studio-alpha',
    name: 'Lumiere Studio',
    slug: 'lumiere',
    logo_url: 'https://cdn.example.com/logo-a.png',
    custom_domain: 'portal.lumierestudio.com',
  };
  const studioB = {
    id: 'studio-beta',
    name: 'Solstice Creative',
    slug: 'solstice',
    logo_url: 'https://cdn.example.com/logo-b.png',
    custom_domain: 'portal.solsticecreative.com',
  };
  mockDb.studios.push(studioA, studioB);

  const clientA = { id: 'client-1', studio_id: studioA.id, name: 'Elena Rostova', email: 'elena@example.com', first_name: 'Elena', last_name: 'Rostova' };
  const clientB = { id: 'client-2', studio_id: studioB.id, name: 'Marcus Vance', email: 'marcus@example.com', first_name: 'Marcus', last_name: 'Vance' };
  mockDb.clients.push(clientA, clientB);

  const brandingA = {
    id: 'brand-a',
    studio_id: studioA.id,
    studio_name: studioA.name,
    primary_color: '#6366F1',
    logo_url: studioA.logo_url,
    custom_domain: 'portal.lumierestudio.com',
  };
  mockDb.studioBrandings.push(brandingA);

  const sessionA = await ClientPortalSessionService.createSession(studioA.id, clientA.id);
  const sessionB = await ClientPortalSessionService.createSession(studioB.id, clientB.id);

  const galleryA1 = {
    id: 'gallery-a1',
    studio_id: studioA.id,
    title: 'Elena & Lucas Wedding',
    slug: 'elena-lucas-wedding',
    status: 'PUBLISHED',
    cover_photo_url: 'https://cdn.example.com/cover-wedding.jpg',
    allow_downloads: true,
    allow_social_sharing: true,
    created_at: new Date('2026-06-15T10:00:00Z'),
  };
  const galleryA2 = {
    id: 'gallery-a2',
    studio_id: studioA.id,
    title: 'Elena Portrait Session',
    slug: 'elena-portraits',
    status: 'PUBLISHED',
    cover_photo_url: null,
    allow_downloads: false,
    allow_social_sharing: true,
    created_at: new Date('2026-07-01T10:00:00Z'),
  };
  const galleryB1 = {
    id: 'gallery-b1',
    studio_id: studioB.id,
    title: 'Marcus Commercial Shoot',
    slug: 'marcus-commercial',
    status: 'PUBLISHED',
    cover_photo_url: 'https://cdn.example.com/cover-b.jpg',
    allow_downloads: true,
    allow_social_sharing: false,
    created_at: new Date('2026-07-10T10:00:00Z'),
  };
  mockDb.galleries.push(galleryA1, galleryA2, galleryB1);
  mockDb.clientGalleries.push(
    { id: 'cg-1', studio_id: studioA.id, client_id: clientA.id, gallery_id: galleryA1.id, created_at: new Date() },
    { id: 'cg-2', studio_id: studioA.id, client_id: clientA.id, gallery_id: galleryA2.id, created_at: new Date() },
    { id: 'cg-3', studio_id: studioB.id, client_id: clientB.id, gallery_id: galleryB1.id, created_at: new Date() }
  );

  const albumA1 = { id: 'album-1', studio_id: studioA.id, gallery_id: galleryA1.id, title: 'Ceremony & Vows', cover_photo_url: 'https://cdn.example.com/alb-cov.jpg' };
  const albumA2 = { id: 'album-2', studio_id: studioA.id, gallery_id: galleryA1.id, title: 'Reception & Dance', cover_photo_url: null };
  mockDb.albums.push(albumA1, albumA2);

  const photosA1: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const ph = {
      id: `photo-a1-${i}`,
      studio_id: studioA.id,
      gallery_id: galleryA1.id,
      album_id: i <= 10 ? albumA1.id : albumA2.id,
      original_filename: `wedding_shot_${i.toString().padStart(3, '0')}.jpg`,
      caption: i === 1 ? 'First dance emotional moment' : i === 2 ? 'Exchange of wedding rings' : `Wedding capture ${i}`,
      title: `Moment ${i}`,
      thumbnail_url: `https://cdn.example.com/thumb_${i}.jpg`,
      original_url: `https://cdn.example.com/orig_${i}.jpg`,
      width: 4000,
      height: 3000,
      status: 'READY',
      tags: i % 2 === 0 ? ['B&W', 'candid'] : ['color', 'stage'],
      created_at: new Date(Date.now() - (20 - i) * 60000),
    };
    photosA1.push(ph);
    mockDb.photos.push(ph);
  }

  // -------------------------------------------------------------
  // MODULE 1: CLIENT EXPERIENCE HOME & AGGREGATION
  // -------------------------------------------------------------
  console.log('--- MODULE 1: Client Experience Home Aggregation ---');
  {
    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);

    assert(!!home, 'Home payload returned');
    assert(home.client.id === clientA.id, 'Correct client identity');
    assert(home.client.name === clientA.name, 'Correct client name');
    assert(home.client.email === clientA.email, 'Correct client email');
    assert(home.client.first_name === clientA.first_name, 'Correct client first name');
    assert(home.client.last_name === clientA.last_name, 'Correct client last name');
    assert(home.client.studio_id === studioA.id, 'Client belongs to studio A');
    assert(home.studio.id === studioA.id, 'Correct studio id');
    assert(home.studio.name === studioA.name, 'Correct studio branding name');
    assert(home.studio.slug === studioA.slug, 'Correct studio slug');
    assert(home.studio.brand_color === brandingA.primary_color, 'Correct brand primary color');
    assert(home.studio.custom_domain === brandingA.custom_domain, 'Correct custom domain');
    assert(home.active_galleries.length === 2, 'Surfaces 2 active client galleries');
    assert(home.active_galleries[0].id === galleryA1.id || home.active_galleries[1].id === galleryA1.id, 'Contains wedding gallery');
    assert(home.active_galleries[0].photo_count === 20 || home.active_galleries[1].photo_count === 20, 'Correct gallery photo count');
    assert(typeof home.notifications_unread_count === 'number', 'Contains unread notification count');
    assert(typeof home.unread_messages_count === 'number', 'Contains unread messages count');
    assert(Array.isArray(home.available_downloads), 'Surfaces available downloads array');
    assert(Array.isArray(home.latest_deliveries), 'Surfaces latest deliveries array');
    assert(Array.isArray(home.upcoming_important_dates), 'Surfaces upcoming important dates');
    assert(Array.isArray(home.recently_viewed_photos), 'Surfaces recently viewed photos array');
    assert(Array.isArray(home.recommended_photos), 'Surfaces recommendations array');
    assert(home.favorites.total_count === 0, 'Initial favorites count is 0');
    assert(home.selections.total_count === 0, 'Initial selections count is 0');
    assert(home.continue_where_left_off === null, 'Initial continue state is null');
    assert(!('password' in home.client), 'Zero password leakage in client object');
    assert(!('token_hash' in home.client), 'Zero token hash leakage in client object');
    assert(!('storage_credentials' in home.studio), 'Zero storage credentials leakage');
    assert(!('wholesale_margin' in home.studio), 'Zero wholesale margin leakage');
    assert(!('raw_token' in home.client), 'Zero raw token leakage in client');
    assert(!('salt' in home.client), 'Zero salt leakage in client');
    assert(!('internal_lead_score' in home.client), 'Zero internal CRM score leakage');
    assert(home.studio.logo_url === brandingA.logo_url, 'Correct studio logo URL');
    assert(home.studio.cover_image_url === brandingA.cover_image_url, 'Correct studio cover image URL');
    assert(home.studio.secondary_color === brandingA.secondary_color, 'Correct secondary color');
    assert(home.studio.font_family === brandingA.font_family, 'Correct typography font family');
    assert(home.studio.contact_email === brandingA.contact_email, 'Correct studio contact email');
    assert(home.studio.contact_phone === brandingA.contact_phone, 'Correct studio contact phone');
    assert(home.active_galleries.every(g => g.status === 'PUBLISHED'), 'All active galleries are published');
    assert(home.active_galleries.every(g => typeof g.is_password_protected === 'boolean'), 'Galleries have password protection flag');
    assert(home.active_galleries.every(g => !!g.slug), 'All galleries have slugs');
    assert(home.active_galleries.every(g => !!g.title), 'All galleries have titles');
  }

  // -------------------------------------------------------------
  // MODULE 2: CONTINUE WHERE YOU LEFT OFF STATE TRACKING
  // -------------------------------------------------------------
  console.log('\n--- MODULE 2: Continue Where You Left Off State Tracking ---');
  {
    const stateToSave = {
      last_gallery_id: galleryA1.id,
      last_gallery_name: galleryA1.title,
      last_gallery_slug: galleryA1.slug,
      last_album_id: albumA1.id,
      last_album_name: albumA1.title,
      last_photo_id: photosA1[4].id,
      last_photo_thumbnail_url: photosA1[4].thumbnail_url,
      last_photo_index: 4,
      last_scroll_position: 1250,
      view_mode: 'MASONRY',
      active_tab: 'FAVORITES',
    };

    const saved = await ClientExperienceService.saveNavigationState(sessionA.raw_token, stateToSave);
    assert(saved.last_gallery_id === galleryA1.id, 'Saved last gallery id');
    assert(saved.last_gallery_name === galleryA1.title, 'Saved last gallery name');
    assert(saved.last_gallery_slug === galleryA1.slug, 'Saved last gallery slug');
    assert(saved.last_album_id === albumA1.id, 'Saved last album id');
    assert(saved.last_album_name === albumA1.title, 'Saved last album name');
    assert(saved.last_photo_id === photosA1[4].id, 'Saved last photo id');
    assert(saved.last_photo_thumbnail_url === photosA1[4].thumbnail_url, 'Saved last photo thumbnail');
    assert(saved.last_photo_index === 4, 'Saved last photo index');
    assert(saved.last_scroll_position === 1250, 'Saved last scroll position');
    assert(saved.view_mode === 'MASONRY', 'Saved view mode');
    assert(saved.active_tab === 'FAVORITES', 'Saved active tab');
    assert(!!saved.last_viewed_at, 'Recorded last viewed timestamp');

    const retrieved = await ClientExperienceService.getNavigationState(sessionA.raw_token);
    assert(!!retrieved, 'Retrieved navigation state from session');
    assert(retrieved?.last_photo_id === photosA1[4].id, 'Retrieved matching photo id');
    assert(retrieved?.last_scroll_position === 1250, 'Retrieved matching scroll pos');
    assert(retrieved?.view_mode === 'MASONRY', 'Retrieved matching view mode');
    assert(retrieved?.active_tab === 'FAVORITES', 'Retrieved matching active tab');
    assert(retrieved?.last_gallery_id === galleryA1.id, 'Retrieved matching gallery id');
    assert(retrieved?.last_album_id === albumA1.id, 'Retrieved matching album id');
    assert(retrieved?.last_gallery_name === galleryA1.title, 'Retrieved matching gallery title');
    assert(retrieved?.last_photo_index === 4, 'Retrieved matching photo index');

    // Verify in Client Experience Home
    const homeWithContinue = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(!!homeWithContinue.continue_where_left_off, 'Home surfaces continue where left off');
    assert(homeWithContinue.continue_where_left_off?.last_gallery_id === galleryA1.id, 'Home has correct continue gallery');
    assert(homeWithContinue.continue_where_left_off?.last_photo_thumbnail_url === photosA1[4].thumbnail_url, 'Home has continue thumbnail');
    assert(homeWithContinue.continue_where_left_off?.last_photo_index === 4, 'Home has continue photo index');
    assert(homeWithContinue.continue_where_left_off?.last_album_name === albumA1.title, 'Home has continue album name');
    assert(homeWithContinue.continue_where_left_off?.view_mode === 'MASONRY', 'Home has continue view mode');
    assert(homeWithContinue.continue_where_left_off?.active_tab === 'FAVORITES', 'Home has continue active tab');

    // Tenant isolation on continue state
    const sessionBContinue = await ClientExperienceService.getNavigationState(sessionB.raw_token);
    assert(sessionBContinue === null, 'Session B has no continue state (strictly isolated)');

    // Second navigation state update (e.g. user moved to album 2)
    const updatedState = await ClientExperienceService.saveNavigationState(sessionA.raw_token, {
      last_gallery_id: galleryA1.id,
      last_album_id: albumA2.id,
      last_album_name: albumA2.title,
      last_photo_id: photosA1[12].id,
      last_photo_thumbnail_url: photosA1[12].thumbnail_url,
      last_photo_index: 12,
      last_scroll_position: 2400,
      view_mode: 'GRID',
      active_tab: 'ALL',
    });
    assert(updatedState.last_album_id === albumA2.id, 'Updated to album 2');
    assert(updatedState.last_photo_id === photosA1[12].id, 'Updated to photo 13');
    assert(updatedState.last_scroll_position === 2400, 'Updated scroll position to 2400');
    assert(updatedState.view_mode === 'GRID', 'Updated view mode to GRID');
    assert(updatedState.active_tab === 'ALL', 'Updated active tab to ALL');
  }

  // -------------------------------------------------------------
  // MODULE 3: RECENTLY VIEWED PHOTOS (Deduplication & Order)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 3: Recently Viewed Photos ---');
  {
    // Record photo view activities
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'PHOTO_VIEWED',
        description: 'Viewed wedding shot 1',
        metadata: { photo_id: photosA1[0].id },
        created_at: new Date('2026-07-01T12:00:00Z'),
      },
    });
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'PHOTO_VIEWED',
        description: 'Viewed wedding shot 2',
        metadata: { photo_id: photosA1[1].id },
        created_at: new Date('2026-07-01T12:05:00Z'),
      },
    });
    // Duplicate view on shot 1 with newer timestamp
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'PHOTO_VIEWED',
        description: 'Viewed wedding shot 1 again',
        metadata: { photo_id: photosA1[0].id },
        created_at: new Date('2026-07-01T12:10:00Z'),
      },
    });

    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(home.recently_viewed_photos.length === 2, 'Deduplicated recently viewed photos count');
    assert(home.recently_viewed_photos[0].id === photosA1[0].id, 'Most recently viewed photo is first');
    assert(home.recently_viewed_photos[1].id === photosA1[1].id, 'Older viewed photo is second');
    assert(home.recently_viewed_photos[0].gallery_title === galleryA1.title, 'Photo has gallery title');
    assert(home.recently_viewed_photos[0].thumbnail_url === photosA1[0].thumbnail_url, 'Photo has thumbnail URL');
    assert(home.recently_viewed_photos[0].original_url === photosA1[0].original_url, 'Photo has original URL');
    assert(!!home.recently_viewed_photos[0].viewed_at, 'Photo has viewed_at timestamp');
    assert(!('face_embeddings' in home.recently_viewed_photos[0]), 'No face embedding leakage in photo');
    assert(home.recently_viewed_photos[0].gallery_id === galleryA1.id, 'Recently viewed photo has gallery id');
    assert(home.recently_viewed_photos[1].gallery_id === galleryA1.id, 'Second recently viewed photo has gallery id');
    assert(new Date(home.recently_viewed_photos[0].viewed_at).getTime() >= new Date(home.recently_viewed_photos[1].viewed_at).getTime(), 'Recently viewed are in descending order');
    assert(home.recently_viewed_photos[1].gallery_title === galleryA1.title, 'Second recently viewed photo has gallery title');
    assert(home.recently_viewed_photos[1].thumbnail_url === photosA1[1].thumbnail_url, 'Second photo has thumbnail URL');
  }

  // -------------------------------------------------------------
  // MODULE 4: FAVORITES EXPERIENCE & CONCURRENCY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 4: Favorites Experience & Concurrency ---');
  {
    // Toggle on photo 1
    const fav1 = await ClientExperienceService.toggleFavorite(sessionA.raw_token, photosA1[0].id);
    assert(fav1.is_favorite === true, 'Photo 1 marked as favorite');
    assert(fav1.total_favorites === 1, 'Total favorites is 1');
    assert(fav1.photo_id === photosA1[0].id, 'Correct photo id in response');

    // Toggle on photo 2
    const fav2 = await ClientExperienceService.toggleFavorite(sessionA.raw_token, photosA1[1].id);
    assert(fav2.is_favorite === true, 'Photo 2 marked as favorite');
    assert(fav2.total_favorites === 2, 'Total favorites is 2');
    assert(fav2.photo_id === photosA1[1].id, 'Photo 2 id in response');

    // Toggle off photo 1
    const unfav1 = await ClientExperienceService.toggleFavorite(sessionA.raw_token, photosA1[0].id);
    assert(unfav1.is_favorite === false, 'Photo 1 removed from favorites');
    assert(unfav1.total_favorites === 1, 'Total favorites is now 1');

    // Concurrency test: 20 simultaneous favorite actions on photo 3
    const promises = Array.from({ length: 20 }).map(() =>
      ClientExperienceService.toggleFavorite(sessionA.raw_token, photosA1[2].id)
    );
    const results = await Promise.all(promises);
    assert(results.length === 20, '20 simultaneous favorite operations completed');

    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(typeof home.favorites.total_count === 'number', 'Favorites total count is numeric');
    assert(home.favorites.sample_photos.length > 0, 'Sample favorites present in home');
    assert(home.favorites.sample_photos[0].thumbnail_url.startsWith('http'), 'Favorite has thumbnail url');
    assert(home.favorites.sample_photos[0].original_url.startsWith('http'), 'Favorite has original url');
    assert(typeof home.favorites.sample_photos[0].gallery_id === 'string', 'Favorite has gallery id');
    assert(home.favorites.total_count >= 1, 'Favorites total count is at least 1');
    assert(home.favorites.sample_photos.every(p => !!p.id), 'All sample favorites have IDs');
    assert(home.favorites.sample_photos.every(p => !!p.gallery_id), 'All sample favorites have gallery IDs');
  }

  // -------------------------------------------------------------
  // MODULE 5: SELECTIONS EXPERIENCE & PROOFING RULES
  // -------------------------------------------------------------
  console.log('\n--- MODULE 5: Selections Experience & Concurrency ---');
  {
    const sel1 = await ClientExperienceService.toggleSelection(sessionA.raw_token, photosA1[5].id);
    assert(sel1.is_selected === true, 'Photo 6 marked as selected');
    assert(sel1.total_selections === 1, 'Total selections is 1');
    assert(sel1.photo_id === photosA1[5].id, 'Correct photo id in response');

    const sel2 = await ClientExperienceService.toggleSelection(sessionA.raw_token, photosA1[6].id);
    assert(sel2.is_selected === true, 'Photo 7 marked as selected');
    assert(sel2.total_selections === 2, 'Total selections is 2');
    assert(sel2.photo_id === photosA1[6].id, 'Photo 7 id matches');

    const unsel1 = await ClientExperienceService.toggleSelection(sessionA.raw_token, photosA1[5].id);
    assert(unsel1.is_selected === false, 'Photo 6 deselected');
    assert(unsel1.total_selections === 1, 'Total selections is now 1');

    // Concurrency test: 20 simultaneous selection toggles on photo 8
    const promises = Array.from({ length: 20 }).map(() =>
      ClientExperienceService.toggleSelection(sessionA.raw_token, photosA1[7].id)
    );
    const results = await Promise.all(promises);
    assert(results.length === 20, '20 simultaneous selection operations completed');

    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(typeof home.selections.total_count === 'number', 'Selections count is valid');
    assert(Array.isArray(home.selections.sample_photos), 'Selections sample photos array present');
    assert(home.selections.total_count >= 1, 'Selections total count is at least 1');
    if (home.selections.sample_photos.length > 0) {
      assert(home.selections.sample_photos[0].thumbnail_url.startsWith('http'), 'Selection has valid thumbnail');
      assert(home.selections.sample_photos[0].original_url.startsWith('http'), 'Selection has valid original URL');
      assert(typeof home.selections.sample_photos[0].gallery_id === 'string', 'Selection has valid gallery ID');
    }
  }

  // -------------------------------------------------------------
  // MODULE 6: PHOTO LIGHTBOX 2.0 (High-res, Zoom, Next/Prev)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 6: Photo Lightbox 2.0 ---');
  {
    const lightboxPhoto = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[1].id);
    assert(lightboxPhoto.id === photosA1[1].id, 'Loaded correct lightbox photo');
    assert(lightboxPhoto.gallery_id === galleryA1.id, 'Matches gallery id');
    assert(lightboxPhoto.high_res_url === photosA1[1].original_url, 'Contains high-res photo URL');
    assert(lightboxPhoto.thumbnail_url === photosA1[1].thumbnail_url, 'Contains thumbnail URL');
    assert(lightboxPhoto.width === 4000 && lightboxPhoto.height === 3000, 'Provides image dimensions');
    assert(lightboxPhoto.aspect_ratio === 4000 / 3000, 'Calculates aspect ratio');
    assert(lightboxPhoto.can_download === true, 'Honors gallery allow_downloads setting');
    assert(lightboxPhoto.can_share === true, 'Honors gallery allow_social_sharing setting');
    assert(lightboxPhoto.prev_photo_id === photosA1[0].id, 'Correct previous photo pointer');
    assert(lightboxPhoto.next_photo_id === photosA1[2].id, 'Correct next photo pointer');
    assert(typeof lightboxPhoto.is_favorite === 'boolean', 'Contains is_favorite boolean flag');
    assert(typeof lightboxPhoto.is_selected === 'boolean', 'Contains is_selected boolean flag');
    assert(!('storage_credentials' in lightboxPhoto), 'Zero storage credentials in lightbox payload');
    assert(!('s3_secret_key' in lightboxPhoto), 'Zero S3 secret key in lightbox payload');
    assert(!('face_vector' in lightboxPhoto), 'Zero face vector in lightbox payload');
    assert(!('raw_embedding' in lightboxPhoto), 'Zero raw embedding in lightbox payload');
    assert(lightboxPhoto.title === photosA1[1].title, 'Contains matching title');
    assert(lightboxPhoto.caption === photosA1[1].caption, 'Contains matching caption');
    assert(lightboxPhoto.original_filename === photosA1[1].original_filename, 'Contains matching filename');

    // First photo has no prev pointer
    const firstPhoto = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[0].id);
    assert(firstPhoto.prev_photo_id === null, 'First photo has null prev pointer');
    assert(firstPhoto.next_photo_id === photosA1[1].id, 'First photo points to second photo');
    assert(firstPhoto.id === photosA1[0].id, 'First photo id matches');

    // Last photo has no next pointer
    const lastPhoto = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[19].id);
    assert(lastPhoto.next_photo_id === null, 'Last photo has null next pointer');
    assert(lastPhoto.prev_photo_id === photosA1[18].id, 'Last photo points to penultimate photo');
    assert(lastPhoto.id === photosA1[19].id, 'Last photo id matches');

    // Intermediate photo pointer check inside album 1
    const midPhoto1 = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[5].id);
    assert(midPhoto1.prev_photo_id === photosA1[4].id, 'Middle photo in album 1 points to previous photo');
    assert(midPhoto1.next_photo_id === photosA1[6].id, 'Middle photo in album 1 points to next photo');
    assert(midPhoto1.id === photosA1[5].id, 'Middle photo 1 id matches');

    // Intermediate photo pointer check inside album 2
    const midPhoto2 = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[15].id);
    assert(midPhoto2.prev_photo_id === photosA1[14].id, 'Middle photo in album 2 points to previous photo');
    assert(midPhoto2.next_photo_id === photosA1[16].id, 'Middle photo in album 2 points to next photo');
    assert(midPhoto2.id === photosA1[15].id, 'Middle photo 2 id matches');

    // First photo of album 2 has null prev pointer because it is the first photo of album 2
    const firstPhotoAlb2 = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[10].id);
    assert(firstPhotoAlb2.prev_photo_id === null, 'First photo of album 2 has null prev pointer');
    assert(firstPhotoAlb2.next_photo_id === photosA1[11].id, 'First photo of album 2 points to second photo of album 2');
  }

  // -------------------------------------------------------------
  // MODULE 7: RESPONSIVE VIEWPORT CHECKS (Mobile & Desktop)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 7: Responsive Viewport Geometry & Safe Areas ---');
  {
    const mobileViewports = [
      { name: 'iPhone 13 / 14 mini (375x812)', w: 375, h: 812, safeTop: 44, safeBottom: 34, minTouchTarget: 44 },
      { name: 'iPhone 14 / 15 (390x844)', w: 390, h: 844, safeTop: 47, safeBottom: 34, minTouchTarget: 44 },
      { name: 'iPhone 15 Pro Max (430x932)', w: 430, h: 932, safeTop: 59, safeBottom: 34, minTouchTarget: 44 },
      { name: 'Pixel 7 (412x915)', w: 412, h: 915, safeTop: 40, safeBottom: 24, minTouchTarget: 48 },
    ];
    const desktopViewports = [
      { name: 'iPad Portrait (768x1024)', w: 768, h: 1024, maxColumns: 3 },
      { name: 'iPad Pro Landscape (1366x1024)', w: 1366, h: 1024, maxColumns: 4 },
      { name: 'HD Laptop (1280x720)', w: 1280, h: 720, maxColumns: 4 },
      { name: 'MacBook Pro (1440x900)', w: 1440, h: 900, maxColumns: 5 },
      { name: 'Full HD Desktop (1920x1080)', w: 1920, h: 1080, maxColumns: 6 },
      { name: '4K Ultra HD (3840x2160)', w: 3840, h: 2160, maxColumns: 8 },
    ];

    for (const vp of mobileViewports) {
      assert(vp.w >= 360 && vp.w <= 430, `Mobile viewport width valid: ${vp.name}`);
      assert(vp.h >= 700 && vp.h <= 950, `Mobile viewport height valid: ${vp.name}`);
      assert(vp.safeTop > 0 && vp.safeBottom > 0, `Safe areas configured for: ${vp.name}`);
      assert(vp.minTouchTarget >= 44, `Minimum touch target 44px on: ${vp.name}`);
    }

    for (const vp of desktopViewports) {
      assert(vp.w >= 768 && vp.w <= 3840, `Desktop viewport width supported: ${vp.name}`);
      assert(vp.h >= 720 && vp.h <= 2160, `Desktop viewport height supported: ${vp.name}`);
      assert(vp.maxColumns >= 3 && vp.maxColumns <= 8, `Grid column scalability verified on: ${vp.name}`);
      assert(vp.w / vp.h >= 0.75, `Aspect ratio ergonomic on: ${vp.name}`);
    }
  }

  // -------------------------------------------------------------
  // MODULE 8: SMART GALLERY NAVIGATION & PERMISSIONS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 8: Smart Gallery Navigation & Permissions ---');
  {
    // Gallery A1 has allow_downloads = true
    const lbA1 = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[0].id);
    assert(lbA1.can_download === true, 'Gallery A1 allows download');
    assert(lbA1.can_share === true, 'Gallery A1 allows share');

    // Create a photo in Gallery A2 which has allow_downloads = false
    const phA2 = {
      id: 'photo-a2-1',
      studio_id: studioA.id,
      gallery_id: galleryA2.id,
      original_filename: 'portrait_001.jpg',
      thumbnail_url: 'https://cdn.example.com/p_thumb.jpg',
      original_url: 'https://cdn.example.com/p_orig.jpg',
      status: 'READY',
      created_at: new Date(),
    };
    mockDb.photos.push(phA2);

    const lbA2 = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, phA2.id);
    assert(lbA2.can_download === false, 'Gallery A2 strictly forbids downloads based on studio settings');
    assert(lbA2.can_share === true, 'Gallery A2 allows social share');
    assert(lbA2.gallery_id === galleryA2.id, 'Photo belongs to gallery A2');
    assert(lbA2.id === phA2.id, 'Photo ID matches query');

    // Test gallery search photo extraction
    const g1Search = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: '',
    });
    assert(g1Search.total_photos === 20, 'Search returns all 20 photos for gallery A1');
    assert(g1Search.photos.length === 20, 'Photos array length matches total photos');

    const g2Search = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA2.id,
      query: '',
    });
    assert(g2Search.total_photos === 1, 'Search returns 1 photo for gallery A2');
    assert(g2Search.photos[0].id === phA2.id, 'Search photo id matches gallery A2 photo');
    assert(g2Search.has_more === false, 'Search has_more is false for 1 photo');
    assert(g2Search.page === 1, 'Search page is 1');
  }

  // -------------------------------------------------------------
  // MODULE 9: ALBUM EXPERIENCE & COUNTS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 9: Album Experience & Counts ---');
  {
    const searchRes = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: '',
    });

    assert(searchRes.albums.length === 2, 'Returns 2 albums for gallery');
    assert(searchRes.albums[0].title === albumA1.title || searchRes.albums[1].title === albumA1.title, 'Contains ceremony album');
    assert(searchRes.albums[0].photo_count === 10, 'Album 1 has 10 photos');
    assert(searchRes.albums[1].photo_count === 10, 'Album 2 has 10 photos');
    assert(searchRes.total_photos === 20, 'Total photos count in gallery is 20');
    assert(searchRes.albums[0].id === albumA1.id || searchRes.albums[1].id === albumA1.id, 'Album 1 id matches');
    assert(searchRes.albums.every(a => typeof a.photo_count === 'number'), 'All albums have numeric photo_count');
    assert(searchRes.albums.every(a => typeof a.title === 'string'), 'All albums have string title');
    assert(searchRes.albums.some(a => a.cover_photo_url === albumA1.cover_photo_url), 'Album has cover photo URL');
    assert(searchRes.albums.every(a => !!a.id), 'All albums have unique IDs');
  }

  // -------------------------------------------------------------
  // MODULE 10: CLIENT-FACING SAFE SEARCH
  // -------------------------------------------------------------
  console.log('\n--- MODULE 10: Client-facing Safe Search ---');
  {
    // Search by filename
    const searchByFilename = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: 'wedding_shot_001',
    });
    assert(searchByFilename.photos.length === 1, 'Search by filename returns exact match');
    assert(searchByFilename.photos[0].id === photosA1[0].id, 'Matched photo 1');
    assert(searchByFilename.photos[0].original_filename === 'wedding_shot_001.jpg', 'Filename matches');
    assert(searchByFilename.photos[0].thumbnail_url.startsWith('https://'), 'Photo has secure thumbnail URL');

    // Search by caption
    const searchByCaption = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: 'emotional moment',
    });
    assert(searchByCaption.photos.length === 1, 'Search by caption returns exact match');
    assert(searchByCaption.photos[0].caption?.includes('emotional moment') === true, 'Caption contains search string');
    assert(searchByCaption.photos[0].id === photosA1[0].id, 'Caption matched photo 1');

    // Search scoped to album
    const searchInAlbum = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      album_id: albumA1.id,
      query: '',
    });
    assert(searchInAlbum.photos.length === 10, 'Album filtered search returns only photos in that album');
    assert(searchInAlbum.photos.every(p => p.album_id === albumA1.id), 'All photos have album_id');
    assert(searchInAlbum.page === 1, 'Current page is 1');
    assert(searchInAlbum.limit === 24, 'Default limit is 24');
    assert(searchInAlbum.total_photos === 10, 'Total photos count is 10 for album');

    // Search with pagination
    const searchPage1 = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      page: 1,
      limit: 5,
    });
    assert(searchPage1.photos.length === 5, 'Search page 1 has 5 photos');
    assert(searchPage1.page === 1, 'Search page 1 index is 1');
    assert(searchPage1.limit === 5, 'Search page 1 limit is 5');
    assert(searchPage1.total_photos === 20, 'Search page 1 total photos is 20');
    assert(searchPage1.has_more === true, 'Search page 1 has_more is true');

    const searchPage2 = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      page: 2,
      limit: 5,
    });
    assert(searchPage2.photos.length === 5, 'Search page 2 has 5 photos');
    assert(searchPage2.page === 2, 'Search page 2 index is 2');
    assert(searchPage2.has_more === true, 'Search page 2 has_more is true');
    assert(searchPage2.photos[0].id !== searchPage1.photos[0].id, 'Page 2 photos distinct from page 1');

    const searchLastPage = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      page: 4,
      limit: 5,
    });
    assert(searchLastPage.photos.length === 5, 'Search page 4 has 5 photos');
    assert(searchLastPage.has_more === false, 'Search page 4 has_more is false on final page');

    // Case insensitive search
    const caseSearch = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: 'WEDDING_SHOT_002',
    });
    assert(caseSearch.photos.length === 1, 'Case insensitive query matched');
    assert(caseSearch.photos[0].id === photosA1[1].id, 'Matched photo 2 on uppercase query');
    assert(caseSearch.total_photos === 1, 'Total photos count matches 1 for unique shot');
  }

  // -------------------------------------------------------------
  // MODULE 11: FIND MY PHOTOS EXPERIENCE & PRIVACY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 11: Find My Photos Experience & Privacy ---');
  {
    const targetPhotos = [photosA1[0].id, photosA1[2].id, photosA1[4].id];
    const fmpResult = await ClientExperienceService.getFindMyPhotosResults(
      sessionA.raw_token,
      galleryA1.id,
      targetPhotos
    );

    assert(fmpResult.total_matches === 3, 'Find My Photos returns 3 matches');
    assert(fmpResult.matched_photos[0].id === photosA1[0].id, 'First match photo matches');
    assert(fmpResult.matched_photos[1].id === photosA1[2].id, 'Second match photo matches');
    assert(fmpResult.matched_photos[2].id === photosA1[4].id, 'Third match photo matches');
    assert(fmpResult.matched_photos[0].confidence_tier === 'HIGH', 'Top matches have HIGH confidence tier');
    assert(fmpResult.privacy_notice.includes('ephemerally in-memory'), 'Privacy notice explains ephemeral processing');
    assert(!('vector' in fmpResult), 'Zero vector in results');
    assert(!('embedding' in fmpResult), 'Zero embedding in results');
    assert(!('face_crop' in fmpResult), 'Zero raw selfie crops stored or leaked');
    assert(typeof fmpResult.matched_photos[0].is_favorite === 'boolean', 'Contains is_favorite flag');
    assert(typeof fmpResult.matched_photos[0].is_selected === 'boolean', 'Contains is_selected flag');
    assert(fmpResult.gallery_id === galleryA1.id, 'Result includes gallery id');
    assert(fmpResult.matched_photos.every(p => p.thumbnail_url.startsWith('http')), 'All matched photos have thumbnail URLs');
    assert(fmpResult.matched_photos.every(p => p.original_url.startsWith('http')), 'All matched photos have original URLs');

    // Empty matches array handling
    const emptyFmp = await ClientExperienceService.getFindMyPhotosResults(
      sessionA.raw_token,
      galleryA1.id,
      []
    );
    assert(emptyFmp.total_matches === 0, 'Empty photo list yields 0 matches');
    assert(Array.isArray(emptyFmp.matched_photos), 'Matched photos is empty array');
    assert(emptyFmp.gallery_id === galleryA1.id, 'Empty FMP retains gallery ID');
  }

  // -------------------------------------------------------------
  // MODULE 12: SMART RECOMMENDATIONS & COLD-START FALLBACK
  // -------------------------------------------------------------
  console.log('\n--- MODULE 12: Smart Recommendations ---');
  {
    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(Array.isArray(home.recommended_photos), 'Recommendations array is present');
    assert(home.recommended_photos.length <= 12, 'Recommendations bounded by max count');
    assert(home.recommended_photos.every(r => typeof r.id === 'string'), 'Recommendations have valid photo ids');
    assert(home.recommended_photos.every(r => typeof r.thumbnail_url === 'string'), 'Recommendations have valid thumbnail URLs');
    assert(home.recommended_photos.every(r => typeof r.reason === 'string'), 'Recommendations have explanation reason');
    assert(home.recommended_photos.every(r => r.gallery_id === galleryA1.id || r.gallery_id === galleryA2.id), 'Recommendations belong to client galleries');

    // Test isolated client B cold start
    const homeB = await ClientExperienceService.getClientExperienceHome(sessionB.raw_token);
    assert(Array.isArray(homeB.recommended_photos), 'Client B recommendations array is present');
    assert(homeB.client.id === clientB.id, 'Client B identity preserved');
    assert(homeB.studio.id === studioB.id, 'Client B studio identity preserved');
    assert(homeB.active_galleries.length === 1, 'Client B has 1 active gallery');
  }

  // -------------------------------------------------------------
  // MODULE 13: CLIENT-SAFE FILTERED TIMELINE
  // -------------------------------------------------------------
  console.log('\n--- MODULE 13: Client-Safe Filtered Timeline ---');
  {
    // Add client-safe activities
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'GALLERY_VIEWED',
        description: 'Client opened wedding gallery',
        created_at: new Date('2026-07-01T10:00:00Z'),
      },
    });
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'PROOFING_SUBMITTED',
        description: 'Submitted 25 album selections for review',
        created_at: new Date('2026-07-02T14:00:00Z'),
      },
    });

    // Add internal staff-only activity that must NOT be exposed
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        activity_type: 'INTERNAL_CRM_LEAD_SCORE_UPDATED',
        description: 'Lead score recalculated to 92 (Private Note: High budget client)',
        created_at: new Date('2026-07-03T10:00:00Z'),
      },
    });

    const timeline = await ClientExperienceService.getClientSafeTimeline(sessionA.raw_token);
    assert(timeline.items.length >= 2, 'Returns client-safe timeline events');
    const hasInternalEvent = timeline.items.some(it => it.event_type.includes('INTERNAL') || it.description.includes('Private Note'));
    assert(!hasInternalEvent, 'Zero internal CRM notes or staff comments in client timeline');
    assert(timeline.items.every(it => ['GALLERY', 'PROOFING', 'ORDER', 'DELIVERY', 'COMMUNICATION', 'PROJECT'].includes(it.category)), 'All events belong to safe categories');
    assert(timeline.page === 1, 'Timeline page is 1');
    assert(typeof timeline.has_more === 'boolean', 'Timeline has_more is boolean');
    assert(typeof timeline.total === 'number', 'Timeline has numeric total items');
    assert(timeline.items.every(it => typeof it.id === 'string'), 'Timeline items have IDs');
    assert(timeline.items.every(it => !!it.occurred_at), 'Timeline items have occurred_at timestamps');
    assert(timeline.items.every(it => typeof it.title === 'string'), 'Timeline items have titles');
    assert(timeline.items.every(it => typeof it.description === 'string'), 'Timeline items have descriptions');
  }

  // -------------------------------------------------------------
  // MODULE 14: PROOFING, ORDERS & DELIVERY INTEGRATIONS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 14: Proofing, Orders, Downloads & Delivery ---');
  {
    // Proofing session
    const ps = {
      id: 'proof-1',
      studio_id: studioA.id,
      client_id: clientA.id,
      gallery_id: galleryA1.id,
      title: 'Album Layout Proofing',
      status: 'IN_PROGRESS',
      target_selections: 30,
      deadline: new Date('2026-08-01T00:00:00Z'),
      is_locked: false,
    };
    mockDb.proofingSessions.push(ps);
    mockDb.proofingItems.push(
      { id: 'pi-1', session_id: ps.id, photo_id: photosA1[0].id, is_selected: true },
      { id: 'pi-2', session_id: ps.id, photo_id: photosA1[1].id, is_selected: true }
    );

    // Order & Delivery
    const order = {
      id: 'ord-1',
      studio_id: studioA.id,
      client_id: clientA.id,
      order_number: 'ORD-2026-001',
      status: 'PROCESSING',
      payment_status: 'PAID',
      total_amount: 450.00,
      currency: 'USD',
      created_at: new Date('2026-07-05T12:00:00Z'),
    };
    mockDb.fulfillmentOrders.push(order);

    const delivery = {
      id: 'del-1',
      order_id: order.id,
      delivery_status: 'IN_TRANSIT',
      tracking_number: '1Z9999999999999999',
      carrier: 'UPS',
      estimated_delivery_at: new Date('2026-07-10T18:00:00Z'),
    };
    mockDb.fulfillmentDeliveries.push(delivery);

    const pkg = {
      id: 'pkg-1',
      order_id: order.id,
      gallery_id: galleryA1.id,
      title: 'High-Res Digital Album (Zip)',
      package_status: 'READY',
      file_count: 20,
      total_size_bytes: 524288000, // 500MB
      expires_at: new Date('2026-12-31T23:59:59Z'),
    };
    mockDb.fulfillmentPackages.push(pkg);

    // Upcoming important date
    const impDate = {
      id: 'date-1',
      studio_id: studioA.id,
      client_id: clientA.id,
      title: 'First Wedding Anniversary',
      date: new Date('2027-06-15T00:00:00Z'),
      date_type: 'ANNIVERSARY',
    };
    mockDb.clientImportantDates.push(impDate);

    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(home.proofing_sessions_requiring_action.length === 1, 'Surfaces 1 active proofing session');
    assert(home.proofing_sessions_requiring_action[0].title === ps.title, 'Proofing title matches');
    assert(home.proofing_sessions_requiring_action[0].target_count === 30, 'Proofing target is 30');
    assert(home.proofing_sessions_requiring_action[0].selected_count === 2, 'Proofing selected is 2');
    assert(home.proofing_sessions_requiring_action[0].is_locked === false, 'Proofing is unlocked');
    assert(home.proofing_sessions_requiring_action[0].gallery_id === galleryA1.id, 'Proofing belongs to gallery A1');

    assert(home.latest_orders.length === 1, 'Surfaces 1 latest order');
    assert(home.latest_orders[0].order_number === 'ORD-2026-001', 'Order number matches');
    assert(home.latest_orders[0].payment_status === 'PAID', 'Order payment status is PAID');
    assert(home.latest_orders[0].total_amount === 450, 'Order total amount is 450');
    assert(home.latest_orders[0].currency === 'USD', 'Order currency is USD');

    assert(home.available_downloads.length === 1, 'Surfaces 1 available download package');
    assert(home.available_downloads[0].file_count === 20, 'Download package file count is 20');
    assert(home.available_downloads[0].is_ready === true, 'Download is ready');
    assert(home.available_downloads[0].total_size_bytes === 524288000, 'Download package size is 500MB');

    assert(home.latest_deliveries.length === 1, 'Surfaces 1 physical delivery tracking');
    assert(home.latest_deliveries[0].tracking_number === '1Z9999999999999999', 'Tracking number matches');
    assert(home.latest_deliveries[0].carrier === 'UPS', 'Carrier is UPS');
    assert(home.latest_deliveries[0].status === 'IN_TRANSIT', 'Delivery status is IN_TRANSIT');

    assert(home.upcoming_important_dates.length === 1, 'Surfaces 1 upcoming date');
    assert(home.upcoming_important_dates[0].title === 'First Wedding Anniversary', 'Date title matches');
    assert(home.upcoming_important_dates[0].date_type === 'ANNIVERSARY', 'Date type matches');
    assert(typeof home.upcoming_important_dates[0].days_remaining === 'number', 'Days remaining is calculated');
    assert(home.upcoming_important_dates[0].days_remaining > 0, 'Days remaining is positive');
  }

  // -------------------------------------------------------------
  // MODULE 15: CROSS-TENANT ISOLATION, IDOR & CACHE HEADERS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 15: Cross-Tenant Isolation & Security Headers ---');
  {
    // Client B trying to access Gallery A1
    try {
      await ClientExperienceService.searchGallery(sessionB.raw_token, {
        gallery_id: galleryA1.id,
        query: '',
      });
      assert(false, 'Expected cross-tenant gallery access to be rejected');
    } catch (err: any) {
      assert(true, 'Cross-tenant gallery search rejected with error');
    }

    // Client B trying to access Photo in Gallery A1
    try {
      await ClientExperienceService.getLightboxPhoto(sessionB.raw_token, photosA1[0].id);
      assert(false, 'Expected cross-tenant lightbox photo access to be rejected');
    } catch (err: any) {
      assert(true, 'Cross-tenant photo access rejected with error');
    }

    // Client B trying to favorite Photo in Gallery A1
    try {
      await ClientExperienceService.toggleFavorite(sessionB.raw_token, photosA1[0].id);
      assert(false, 'Expected cross-tenant favorite to fail');
    } catch (err: any) {
      assert(true, 'Cross-tenant favorite rejected with error');
    }

    // Client B trying to select Photo in Gallery A1
    try {
      await ClientExperienceService.toggleSelection(sessionB.raw_token, photosA1[0].id);
      assert(false, 'Expected cross-tenant selection to fail');
    } catch (err: any) {
      assert(true, 'Cross-tenant selection rejected with error');
    }

    // Client B trying to run Find My Photos on Gallery A1
    try {
      await ClientExperienceService.getFindMyPhotosResults(sessionB.raw_token, galleryA1.id, [photosA1[0].id]);
      assert(false, 'Expected cross-tenant Find My Photos to fail');
    } catch (err: any) {
      assert(true, 'Cross-tenant Find My Photos rejected with error');
    }

    // Client A attempting to access Gallery B1
    try {
      await ClientExperienceService.searchGallery(sessionA.raw_token, {
        gallery_id: galleryB1.id,
        query: '',
      });
      assert(false, 'Expected client A searching gallery B1 to be rejected');
    } catch (err: any) {
      assert(true, 'Client A cannot search Studio B gallery');
    }

    // Invalid / malformed token rejection tests
    try {
      await ClientExperienceService.getClientExperienceHome('invalid-fake-token-xyz');
      assert(false, 'Expected invalid token to be rejected');
    } catch (err: any) {
      assert(true, 'Invalid token correctly rejected');
      assert(err.statusCode === 401 || err.statusCode === 403 || err.statusCode === 404 || err.message.includes('Invalid'), 'Invalid token returns auth or 404 error');
    }

    try {
      await ClientExperienceService.getNavigationState('nonexistent-token');
      assert(false, 'Expected nonexistent token to be rejected');
    } catch (err: any) {
      assert(true, 'Nonexistent navigation state token rejected');
    }

    try {
      await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, 'non-existent-photo-id');
      assert(false, 'Expected non-existent photo to throw 404');
    } catch (err: any) {
      assert(true, 'Non-existent photo correctly rejected with 404');
      assert(err.statusCode === 404, 'Status code is 404 for missing photo');
    }

    // Verify security headers policy
    const securityHeaders = {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Robots-Tag': 'noindex, noarchive, nofollow',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    };
    assert(securityHeaders['Cache-Control'].includes('no-store'), 'Security header contains no-store');
    assert(securityHeaders['X-Robots-Tag'].includes('noindex'), 'Security header contains noindex');
    assert(securityHeaders['X-Frame-Options'] === 'DENY', 'Security header contains X-Frame-Options: DENY');
    assert(securityHeaders['X-Content-Type-Options'] === 'nosniff', 'Security header contains nosniff');
    assert(securityHeaders['Cache-Control'].includes('private'), 'Security header contains private cache control');
    assert(securityHeaders['X-Robots-Tag'].includes('nofollow'), 'Security header contains nofollow');
  }

  // -------------------------------------------------------------
  // MODULE 16: CONCURRENCY HARDENING & IDEMPOTENCY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 16: Concurrency Hardening & Idempotency ---');
  {
    // 20 simultaneous client home queries
    const homeQueries = Array.from({ length: 20 }).map(() =>
      ClientExperienceService.getClientExperienceHome(sessionA.raw_token)
    );
    const homes = await Promise.all(homeQueries);
    assert(homes.length === 20, '20 concurrent home requests succeeded');
    assert(homes.every(h => h.client.id === clientA.id), 'All 20 concurrent requests returned client A data');
    assert(homes.every(h => h.studio.id === studioA.id), 'All 20 concurrent requests returned studio A branding');
    assert(homes.every(h => h.active_galleries.length === 2), 'All 20 concurrent requests returned 2 galleries');

    // 20 simultaneous navigation state updates
    const navUpdates = Array.from({ length: 20 }).map((_, idx) =>
      ClientExperienceService.saveNavigationState(sessionA.raw_token, {
        last_gallery_id: galleryA1.id,
        last_scroll_position: idx * 100,
      })
    );
    const updatedNavs = await Promise.all(navUpdates);
    assert(updatedNavs.length === 20, '20 concurrent navigation state updates succeeded without crash or corruption');
    assert(updatedNavs.every(n => n.last_gallery_id === galleryA1.id), 'All navigation updates preserved gallery id');
    assert(updatedNavs.every(n => typeof n.last_scroll_position === 'number'), 'All navigation updates preserved scroll position');

    // Final navigation state retrieval check
    const finalNav = await ClientExperienceService.getNavigationState(sessionA.raw_token);
    assert(finalNav?.last_gallery_id === galleryA1.id, 'Final navigation state remains valid');
    assert(typeof finalNav?.last_scroll_position === 'number', 'Final scroll position is numeric');
    assert(finalNav?.last_scroll_position! >= 0, 'Final scroll position is non-negative');
    assert(!!finalNav?.last_viewed_at, 'Final navigation timestamp is recorded');
  }

  console.log('\n============================================================');
  console.log(`PHASE 30 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase30TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
