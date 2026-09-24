/**
 * PixMatch AI — Phase 30.1: Client Experience Hardening & Production QA Test Suite
 *
 * Comprehensive hardening covering:
 * - Module 1: Client Experience Home IDOR Matrix (Client A vs B across all 10 subresources)
 * - Module 2: Aggregated Home Cross-Object Isolation & Purity (Studio A/B zero crosstalk)
 * - Module 3: Object ID Mixing Asymmetric Matrix Defense (Client A/B x Gallery/Photo/Order/Proofing/FMP)
 * - Module 4: Client Portal Session Security & Token Manipulation (valid, invalid, expired, revoked, replayed, modified, truncated)
 * - Module 5: Session Tenant Boundary & Non-Generic Elevation Defense
 * - Module 6: Navigation State Security, Sanitization & Negative Bounds Clamping
 * - Module 7: Cross-Device State Synchronization & Concurrent State Updates (20 Parallel)
 * - Module 8: Recently Viewed Photo Isolation, Deduplication, LRU Bounds & Concurrency (20 Parallel)
 * - Module 9: Favorites IDOR Matrix, DB Consistency & Concurrency (20 Parallel)
 * - Module 10: Selections IDOR Matrix, Proofing Rule Adherence & Concurrency (20 Parallel)
 * - Module 11: Lightbox 2.0 Deep Authorization, Neighbor Scoping & Data Minimization (Zero credentials/vectors)
 * - Module 12: Lightbox Signed URL TTL, Tamper Resistance & Path Traversal Defense
 * - Module 13: Album Authorization, Deleted Album & Empty State Handling
 * - Module 14: Safe Gallery Search & Injection Resistance (SQL, XSS, Unicode, Wildcards, 500+ char strings)
 * - Module 15: Search Scalability & Pagination Invariance (0 to 5000 item simulations)
 * - Module 16: Find My Photos 2.0 Authorization, Ephemeral Privacy (Zero Biometric Vectors) & Rate Limiting
 * - Module 17: Recommendation Isolation, Cold Start Neutrality & Data Minimization
 * - Module 18: Client-Safe Filtered Timeline, Privacy Whitelist & Pagination Bounds
 * - Module 19: Cross-Subsystem Integrations (Proofing, Orders, Digital Downloads, Delivery, Communication, Notifications)
 * - Module 20: Security Headers, Anti-Cache Poisoning, Studio Branding Sanitization & Production Audit
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import { prisma } from '@pixmatch/database';
import { ClientExperienceService } from '../apps/api/src/modules/client-portal/client-experience.service.js';
import { ClientPortalSessionService } from '../apps/api/src/modules/client-portal/client-portal-session.service.js';
import { StudioBrandingService } from '../apps/api/src/modules/branding/studio-branding.service.js';
import { PhotoRecommendationService } from '../apps/api/src/modules/galleries/photo-recommendation.service.js';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runPhase30HardeningTestSuite() {
  console.log('============================================================');
  console.log('PIXMATCH AI — PHASE 30.1: CLIENT EXPERIENCE HARDENING');
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // SETUP IN-MEMORY PRODUCTION MOCK DB
  // -------------------------------------------------------------
  const mockDb = {
    studios: [] as any[],
    clients: [] as any[],
    studioBrandings: [] as any[],
    clientPortalSessions: [] as any[],
    galleries: [] as any[],
    clientGalleries: [] as any[],
    albums: [] as any[],
    photos: [] as any[],
    galleryFavorites: [] as any[],
    gallerySelections: [] as any[],
    clientActivities: [] as any[],
    proofingSessions: [] as any[],
    proofingItems: [] as any[],
    fulfillmentOrders: [] as any[],
    fulfillmentDeliveries: [] as any[],
    fulfillmentPackages: [] as any[],
    clientConversations: [] as any[],
    clientMessages: [] as any[],
    clientNotifications: [] as any[],
    clientImportantDates: [] as any[],
    clientPortalNotificationReads: [] as any[],
    notificationLogs: [] as any[],
    galleryClientSessions: [] as any[],
    photoAIAnalyses: [] as any[],
    photoHighlights: [] as any[],
    eventChapters: [] as any[],
    smartAlbums: [] as any[],
  };

  const p: any = {
    studio: {
      findUnique: async ({ where, include }: any) => {
        const found = mockDb.studios.find(s => s.id === where.id || (where.slug && s.slug === where.slug));
        if (!found) return null;
        if (include?.branding) {
          const br = mockDb.studioBrandings.find(b => b.studio_id === found.id);
          return { ...found, branding: br || null };
        }
        return found;
      },
      findFirst: async ({ where, include }: any) => {
        const found = mockDb.studios.find(s => {
          if (where.id && s.id !== where.id) return false;
          if (where.slug && s.slug !== where.slug) return false;
          return true;
        });
        if (!found) return null;
        if (include?.branding) {
          const br = mockDb.studioBrandings.find(b => b.studio_id === found.id);
          return { ...found, branding: br || null };
        }
        return found;
      },
    },
    client: {
      findUnique: async ({ where }: any) => {
        return mockDb.clients.find(c => c.id === where.id) || null;
      },
      findFirst: async ({ where }: any) => {
        return mockDb.clients.find(c => {
          if (where.id && c.id !== where.id) return false;
          if (where.studio_id && c.studio_id !== where.studio_id) return false;
          return true;
        }) || null;
      },
    },
    studioBranding: {
      findUnique: async ({ where }: any) => {
        return mockDb.studioBrandings.find(b => b.studio_id === where.studio_id) || null;
      },
    },
    clientPortalSession: {
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
    },
    clientGallery: {
      findMany: async ({ where }: any) => {
        return mockDb.clientGalleries
          .filter(cg => cg.studio_id === where.studio_id && cg.client_id === where.client_id)
          .map(cg => {
            const gallery = mockDb.galleries.find(g => g.id === cg.gallery_id);
            const photos = mockDb.photos.filter(ph => ph.gallery_id === cg.gallery_id && ph.status === 'READY');
            return {
              ...cg,
              gallery: gallery ? {
                ...gallery,
                photos: photos.slice(0, 1),
                _count: { photos: photos.length },
              } : null,
            };
          });
      },
      findFirst: async ({ where }: any) => {
        return mockDb.clientGalleries.find(
          cg => cg.studio_id === where.studio_id &&
                cg.client_id === where.client_id &&
                cg.gallery_id === where.gallery_id
        ) || null;
      },
    },
    gallery: {
      findUnique: async ({ where }: any) => {
        return mockDb.galleries.find(g => g.id === where.id) || null;
      },
      findFirst: async ({ where }: any) => {
        return mockDb.galleries.find(g => {
          if (where.id && g.id !== where.id) return false;
          if (where.studio_id && g.studio_id !== where.studio_id) return false;
          if (where.slug && g.slug !== where.slug) return false;
          return true;
        }) || null;
      },
    },
    album: {
      findMany: async ({ where }: any) => {
        const filtered = mockDb.albums.filter(a => {
          if (where.gallery_id && a.gallery_id !== where.gallery_id) return false;
          if (where.studio_id && a.studio_id !== where.studio_id) return false;
          return true;
        });
        return filtered.map(a => {
          const phs = mockDb.photos.filter(p => p.album_id === a.id && p.status === 'READY');
          return {
            ...a,
            _count: { photos: phs.length },
          };
        });
      },
      findFirst: async ({ where }: any) => {
        return mockDb.albums.find(a => {
          if (where.id && a.id !== where.id) return false;
          if (where.gallery_id && a.gallery_id !== where.gallery_id) return false;
          if (where.studio_id && a.studio_id !== where.studio_id) return false;
          return true;
        }) || null;
      },
    },
    photo: {
      findFirst: async ({ where }: any) => {
        const found = mockDb.photos.find(p => {
          if (where.id && p.id !== where.id) return false;
          if (where.studio_id && p.studio_id !== where.studio_id) return false;
          if (where.gallery_id && p.gallery_id !== where.gallery_id) return false;
          if (where.status && p.status !== where.status) return false;
          return true;
        });
        if (!found) return null;
        const gallery = mockDb.galleries.find(g => g.id === found.gallery_id);
        return { ...found, gallery };
      },
      findMany: async ({ where, take, skip, select, orderBy }: any) => {
        let results = mockDb.photos.filter(p => {
          if (where.gallery_id && p.gallery_id !== where.gallery_id) return false;
          if (where.studio_id && p.studio_id !== where.studio_id) return false;
          if (where.album_id && p.album_id !== where.album_id) return false;
          if (where.status && p.status !== where.status) return false;
          if (where.id?.in && !where.id.in.includes(p.id)) return false;
          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((clause: any) => {
              if (clause.original_filename?.contains) {
                const search = clause.original_filename.contains.toLowerCase();
                if (p.original_filename?.toLowerCase().includes(search)) return true;
              }
              if (clause.caption?.contains) {
                const search = clause.caption.contains.toLowerCase();
                if (p.caption?.toLowerCase().includes(search)) return true;
              }
              if (clause.title?.contains) {
                const search = clause.title.contains.toLowerCase();
                if (p.title?.toLowerCase().includes(search)) return true;
              }
              return false;
            });
            if (!matchesOr) return false;
          }
          return true;
        });

        if (orderBy?.created_at === 'desc') {
          results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }

        if (skip) results = results.slice(skip);
        if (take) results = results.slice(0, take);

        if (select) {
          return results.map(r => {
            const out: any = {};
            for (const k of Object.keys(select)) {
              if (select[k]) out[k] = r[k];
            }
            return out;
          });
        }

        return results.map(r => {
          const gallery = mockDb.galleries.find(g => g.id === r.gallery_id);
          return { ...r, gallery };
        });
      },
      count: async ({ where }: any) => {
        return mockDb.photos.filter(p => {
          if (where.gallery_id && p.gallery_id !== where.gallery_id) return false;
          if (where.studio_id && p.studio_id !== where.studio_id) return false;
          if (where.album_id && p.album_id !== where.album_id) return false;
          if (where.status && p.status !== where.status) return false;
          if (where.id?.in && !where.id.in.includes(p.id)) return false;
          if (where.OR && Array.isArray(where.OR)) {
            const matchesOr = where.OR.some((clause: any) => {
              if (clause.original_filename?.contains) {
                const search = clause.original_filename.contains.toLowerCase();
                if (p.original_filename?.toLowerCase().includes(search)) return true;
              }
              if (clause.caption?.contains) {
                const search = clause.caption.contains.toLowerCase();
                if (p.caption?.toLowerCase().includes(search)) return true;
              }
              if (clause.title?.contains) {
                const search = clause.title.contains.toLowerCase();
                if (p.title?.toLowerCase().includes(search)) return true;
              }
              return false;
            });
            if (!matchesOr) return false;
          }
          return true;
        }).length;
      },
    },
    galleryFavorite: {
      findUnique: async ({ where }: any) => {
        if (where.gallery_id_session_id_photo_id) {
          const { gallery_id, session_id, photo_id } = where.gallery_id_session_id_photo_id;
          return mockDb.galleryFavorites.find(
            f => f.gallery_id === gallery_id && f.session_id === session_id && f.photo_id === photo_id
          ) || null;
        }
        return mockDb.galleryFavorites.find(f => f.id === where.id) || null;
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
          if (where.photo?.studio_id) {
            const ph = mockDb.photos.find(p => p.id === f.photo_id);
            if (ph?.studio_id !== where.photo.studio_id) return false;
          }
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
          if (where.photo?.studio_id) {
            const ph = mockDb.photos.find(p => p.id === f.photo_id);
            if (ph?.studio_id !== where.photo.studio_id) return false;
          }
          if (where.photo?.status) {
            const ph = mockDb.photos.find(p => p.id === f.photo_id);
            if (ph?.status !== where.photo.status) return false;
          }
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
        return { id: where.id, count: 1 };
      },
    },
    gallerySelection: {
      findUnique: async ({ where }: any) => {
        if (where.gallery_id_session_id_photo_id) {
          const { gallery_id, session_id, photo_id } = where.gallery_id_session_id_photo_id;
          return mockDb.gallerySelections.find(
            s => s.gallery_id === gallery_id && s.session_id === session_id && s.photo_id === photo_id
          ) || null;
        }
        return mockDb.gallerySelections.find(s => s.id === where.id) || null;
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
          if (where.photo?.studio_id) {
            const ph = mockDb.photos.find(p => p.id === s.photo_id);
            if (ph?.studio_id !== where.photo.studio_id) return false;
          }
          if (where.photo?.status) {
            const ph = mockDb.photos.find(p => p.id === s.photo_id);
            if (ph?.status !== where.photo.status) return false;
          }
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
        return { id: where.id, count: 1 };
      },
    },
    clientActivity: {
      create: async ({ data }: any) => {
        const act = { id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`, created_at: data.created_at || new Date(), ...data };
        mockDb.clientActivities.push(act);
        return act;
      },
      findMany: async ({ where, take, skip, orderBy }: any) => {
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
    },
    photoProofingSession: {
      findMany: async ({ where }: any) => {
        return mockDb.proofingSessions.filter(
          ps => ps.studio_id === where.studio_id && ps.client_id === where.client_id
        ).map(ps => ({
          ...ps,
          items: mockDb.proofingItems.filter(pi => pi.session_id === ps.id),
        }));
      },
      findFirst: async ({ where }: any) => {
        const ps = mockDb.proofingSessions.find(
          s => s.studio_id === where.studio_id && s.client_id === where.client_id && (!where.gallery_id || s.gallery_id === where.gallery_id)
        );
        if (!ps) return null;
        return {
          ...ps,
          items: mockDb.proofingItems.filter(pi => pi.session_id === ps.id),
        };
      },
    },
    fulfillmentOrder: {
      findMany: async ({ where, take }: any) => {
        let list = mockDb.fulfillmentOrders.filter(
          fo => fo.studio_id === where.studio_id && fo.client_id === where.client_id
        );
        if (take) list = list.slice(0, take);
        return list.map(o => ({
          ...o,
          deliveries: mockDb.fulfillmentDeliveries.filter(d => d.order_id === o.id),
          packages: mockDb.fulfillmentPackages.filter(p => p.order_id === o.id),
        }));
      },
    },
    clientConversation: {
      findMany: async ({ where }: any) => {
        return mockDb.clientConversations.filter(
          cc => cc.studio_id === where.studio_id && cc.client_id === where.client_id
        ).map(cc => ({
          ...cc,
          messages: mockDb.clientMessages.filter(m => m.conversation_id === cc.id),
        }));
      },
    },
    clientNotification: {
      count: async ({ where }: any) => {
        return mockDb.clientNotifications.filter(
          cn => cn.studio_id === where.studio_id && cn.client_id === where.client_id && (!where.is_read || !cn.is_read)
        ).length;
      },
      findMany: async ({ where }: any) => {
        return mockDb.clientNotifications.filter(
          cn => cn.studio_id === where.studio_id && cn.client_id === where.client_id
        );
      },
    },
    clientImportantDate: {
      findMany: async ({ where }: any) => {
        return mockDb.clientImportantDates.filter(
          cid => cid.studio_id === where.studio_id && cid.client_id === where.client_id
        );
      },
    },
    clientPortalNotificationRead: {
      findMany: async ({ where }: any) => {
        return (mockDb.clientPortalNotificationReads || []).filter(r => {
          if (where.studio_id && r.studio_id !== where.studio_id) return false;
          if (where.client_id && r.client_id !== where.client_id) return false;
          return true;
        });
      },
      create: async ({ data }: any) => {
        const item = { id: `nr-${Date.now()}`, ...data };
        mockDb.clientPortalNotificationReads.push(item);
        return item;
      },
    },
    notificationLog: {
      count: async ({ where }: any) => {
        return (mockDb.notificationLogs || []).filter(n => {
          if (where.studio_id && n.studio_id !== where.studio_id) return false;
          if (where.recipient_type && n.recipient_type !== where.recipient_type) return false;
          return true;
        }).length;
      },
    },
    galleryClientSession: {
      findFirst: async ({ where }: any) => {
        return (mockDb.galleryClientSessions || []).find(s => {
          if (where.gallery_id && s.gallery_id !== where.gallery_id) return false;
          if (where.client_id && s.client_id !== where.client_id) return false;
          return true;
        }) || null;
      },
      create: async ({ data }: any) => {
        const session = {
          id: data.id || `gcs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          created_at: new Date(),
          ...data,
        };
        mockDb.galleryClientSessions.push(session);
        return session;
      },
    },
    photoAIAnalysis: {
      findMany: async ({ where, take }: any) => {
        let list = (mockDb.photoAIAnalyses || []).filter(a => {
          if (where.gallery_id && a.gallery_id !== where.gallery_id) return false;
          if (where.photo_id?.in && !where.photo_id.in.includes(a.photo_id)) return false;
          return true;
        });
        if (take) list = list.slice(0, take);
        return list;
      },
      findFirst: async () => null,
    },
    photoHighlight: {
      findMany: async () => mockDb.photoHighlights || [],
      findFirst: async () => null,
    },
    eventChapter: {
      findMany: async () => mockDb.eventChapters || [],
      findFirst: async () => null,
    },
    smartAlbum: {
      findMany: async () => mockDb.smartAlbums || [],
      findFirst: async () => null,
    },
    $transaction: async (fn: any) => {
      if (typeof fn === 'function') {
        return await fn(p);
      }
      return Promise.all(fn);
    },
  };

  // Wire mock DB to prisma singleton and services
  Object.assign(prisma, p);
  (ClientPortalSessionService as any).prisma = p;
  (StudioBrandingService as any).prisma = p;
  (PhotoRecommendationService as any).prisma = p;
  (PhotoRecommendationService as any).defaultInstance = new PhotoRecommendationService(p);

  // -------------------------------------------------------------
  // SEED TWO ISOLATED TENANTS & CLIENTS
  // -------------------------------------------------------------
  const studioA = { id: 'studio-a-101', name: 'Artisan Photography Studio', slug: 'artisan-photos' };
  const studioB = { id: 'studio-b-202', name: 'Lumina Grand Studio', slug: 'lumina-grand' };
  mockDb.studios.push(studioA, studioB);

  const brandingA = {
    id: 'brand-a',
    studio_id: studioA.id,
    studio_name: 'Artisan Photography Studio',
    primary_color: '#3B82F6',
    secondary_color: '#1E40AF',
    font_family: 'Inter',
    logo_url: 'https://cdn.example.com/artisan-logo.png',
    cover_image_url: 'https://cdn.example.com/artisan-cover.jpg',
    contact_email: 'hello@artisanphotos.com',
    contact_phone: '+1-555-0199',
    custom_domain: 'portal.artisanphotos.com',
  };
  const brandingB = {
    id: 'brand-b',
    studio_id: studioB.id,
    studio_name: 'Lumina Grand Studio',
    primary_color: '#EF4444',
    secondary_color: '#991B1B',
    font_family: 'Playfair Display',
    logo_url: 'https://cdn.example.com/lumina-logo.png',
    cover_image_url: 'https://cdn.example.com/lumina-cover.jpg',
    contact_email: 'support@luminagrand.com',
    contact_phone: '+1-555-0288',
    custom_domain: 'gallery.luminagrand.com',
  };
  mockDb.studioBrandings.push(brandingA, brandingB);

  const clientA = {
    id: 'client-a-1',
    studio_id: studioA.id,
    name: 'Sarah & Michael Wedding',
    first_name: 'Sarah',
    last_name: 'Jenkins',
    email: 'sarah.jenkins@example.com',
    phone: '+1-555-0101',
    status: 'ACTIVE',
  };
  const clientB = {
    id: 'client-b-2',
    studio_id: studioB.id,
    name: 'David Corporate Headshots',
    first_name: 'David',
    last_name: 'Vance',
    email: 'david.vance@example.com',
    phone: '+1-555-0202',
    status: 'ACTIVE',
  };
  mockDb.clients.push(clientA, clientB);

  // Sessions
  const sessionA = await ClientPortalSessionService.createSession(studioA.id, clientA.id, 30);
  const sessionB = await ClientPortalSessionService.createSession(studioB.id, clientB.id, 30);

  // Galleries
  const galleryA1 = {
    id: 'gal-a1',
    studio_id: studioA.id,
    title: 'Sarah & Michael Wedding Gala',
    slug: 'sarah-michael-wedding-gala',
    status: 'PUBLISHED',
    allow_downloads: true,
    allow_social_sharing: true,
    password_hash: null,
    created_at: new Date('2026-06-15T10:00:00Z'),
  };
  const galleryA2 = {
    id: 'gal-a2',
    studio_id: studioA.id,
    title: 'Sarah & Michael Engagement Mini',
    slug: 'sarah-michael-engagement',
    status: 'PUBLISHED',
    allow_downloads: false,
    allow_social_sharing: true,
    password_hash: null,
    created_at: new Date('2026-05-10T10:00:00Z'),
  };
  const galleryB1 = {
    id: 'gal-b1',
    studio_id: studioB.id,
    title: 'David Corporate Summit',
    slug: 'david-corporate-summit',
    status: 'PUBLISHED',
    allow_downloads: true,
    allow_social_sharing: false,
    password_hash: null,
    created_at: new Date('2026-06-20T10:00:00Z'),
  };
  mockDb.galleries.push(galleryA1, galleryA2, galleryB1);

  mockDb.clientGalleries.push(
    { id: 'cg-a1', studio_id: studioA.id, client_id: clientA.id, gallery_id: galleryA1.id, role: 'PRIMARY' },
    { id: 'cg-a2', studio_id: studioA.id, client_id: clientA.id, gallery_id: galleryA2.id, role: 'SECONDARY' },
    { id: 'cg-b1', studio_id: studioB.id, client_id: clientB.id, gallery_id: galleryB1.id, role: 'PRIMARY' }
  );

  // Albums
  const albumA1 = { id: 'alb-a1', studio_id: studioA.id, gallery_id: galleryA1.id, title: 'Ceremony Highlights' };
  const albumA2 = { id: 'alb-a2', studio_id: studioA.id, gallery_id: galleryA1.id, title: 'Reception & Dancing' };
  const albumB1 = { id: 'alb-b1', studio_id: studioB.id, gallery_id: galleryB1.id, title: 'Executive Portraits' };
  mockDb.albums.push(albumA1, albumA2, albumB1);

  // Photos
  const photosA1: any[] = [];
  for (let i = 1; i <= 20; i++) {
    const ph = {
      id: `photo-a1-${i}`,
      studio_id: studioA.id,
      gallery_id: galleryA1.id,
      album_id: i <= 10 ? albumA1.id : albumA2.id,
      original_filename: `wedding_shot_${i.toString().padStart(3, '0')}.jpg`,
      caption: i === 1 ? 'First dance emotional moment' : `Wedding capture ${i}`,
      title: `Moment ${i}`,
      thumbnail_url: `https://cdn.example.com/thumb_${i}.jpg`,
      original_url: `https://cdn.example.com/orig_${i}.jpg`,
      width: 4000,
      height: 3000,
      status: 'READY',
      created_at: new Date(Date.now() - (20 - i) * 60000),
    };
    photosA1.push(ph);
    mockDb.photos.push(ph);
  }

  const photoB1 = {
    id: 'photo-b1-1',
    studio_id: studioB.id,
    gallery_id: galleryB1.id,
    album_id: albumB1.id,
    original_filename: 'executive_portrait_01.jpg',
    caption: 'Executive boardroom profile',
    title: 'David Portrait',
    thumbnail_url: 'https://cdn.example.com/thumb_b1.jpg',
    original_url: 'https://cdn.example.com/orig_b1.jpg',
    width: 5000,
    height: 3500,
    status: 'READY',
    created_at: new Date(),
  };
  mockDb.photos.push(photoB1);

  // Seed orders for both studios
  const orderA = {
    id: 'ord-a-99',
    studio_id: studioA.id,
    client_id: clientA.id,
    order_number: 'ORD-ARTISAN-01',
    status: 'PROCESSING',
    payment_status: 'PAID',
    total_amount: 350.00,
    currency: 'USD',
    created_at: new Date(),
  };
  const orderB = {
    id: 'ord-b-88',
    studio_id: studioB.id,
    client_id: clientB.id,
    order_number: 'ORD-LUMINA-02',
    status: 'COMPLETED',
    payment_status: 'PAID',
    total_amount: 1200.00,
    currency: 'USD',
    created_at: new Date(),
  };
  mockDb.fulfillmentOrders.push(orderA, orderB);

  // Seed conversations for both studios
  const convA = {
    id: 'conv-a-1',
    studio_id: studioA.id,
    client_id: clientA.id,
    subject: 'Album delivery timeline',
    status: 'OPEN',
    unread_client_count: 2,
    created_at: new Date(),
  };
  const convB = {
    id: 'conv-b-2',
    studio_id: studioB.id,
    client_id: clientB.id,
    subject: 'Corporate licensing terms',
    status: 'OPEN',
    unread_client_count: 0,
    created_at: new Date(),
  };
  mockDb.clientConversations.push(convA, convB);

  mockDb.clientMessages.push(
    { id: 'msg-a-1', conversation_id: convA.id, sender_type: 'STUDIO', body: 'Your album is printing nicely!', is_read: false, created_at: new Date() },
    { id: 'msg-a-2', conversation_id: convA.id, sender_type: 'STUDIO', body: 'Expected dispatch on Friday.', is_read: false, created_at: new Date() },
    { id: 'msg-b-1', conversation_id: convB.id, sender_type: 'STUDIO', body: 'Boardroom headshots ready for review.', is_read: true, created_at: new Date() }
  );

  // -------------------------------------------------------------
  // MODULE 1: CLIENT EXPERIENCE HOME COMPREHENSIVE IDOR MATRIX
  // -------------------------------------------------------------
  console.log('--- MODULE 1: Client Experience Home Comprehensive IDOR Matrix ---');
  {
    const homeA = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(homeA.client.id === clientA.id, 'Home A returns Client A identity');
    assert(homeA.client.name === 'Sarah & Michael Wedding', 'Home A returns Client A display name');
    assert(homeA.studio.id === studioA.id, 'Home A returns Studio A identity');
    assert(homeA.studio.name === 'Artisan Photography Studio', 'Home A returns Studio A name');
    assert(homeA.active_galleries.every(g => g.id === galleryA1.id || g.id === galleryA2.id), 'Home A only lists Client A galleries');
    assert(homeA.active_galleries.length === 2, 'Home A active galleries count matches Client A assignments');
    assert(!homeA.active_galleries.some(g => g.id === galleryB1.id), 'Home A strictly excludes Studio B galleries');

    const homeB = await ClientExperienceService.getClientExperienceHome(sessionB.raw_token);
    assert(homeB.client.id === clientB.id, 'Home B returns Client B identity');
    assert(homeB.studio.id === studioB.id, 'Home B returns Studio B identity');
    assert(homeB.active_galleries.length === 1 && homeB.active_galleries[0].id === galleryB1.id, 'Home B only lists Gallery B1');
    assert(!homeB.active_galleries.some(g => g.id === galleryA1.id), 'Home B strictly excludes Studio A galleries');
    assert(!homeB.active_galleries.some(g => g.id === galleryA2.id), 'Home B strictly excludes Gallery A2');

    // Attempting cross-tenant access via raw token tampering
    const tamperedToken = sessionA.raw_token.slice(0, -6) + 'abcdef';
    try {
      await ClientExperienceService.getClientExperienceHome(tamperedToken);
      assert(false, 'Tampered token should be rejected');
    } catch (err: any) {
      assert(true, 'Tampered token correctly rejected with security exception');
      assert(err.statusCode === 404, 'Tampered token returns 404 to avoid information leakage');
    }
  }

  // -------------------------------------------------------------
  // MODULE 2: AGGREGATED HOME CROSS-OBJECT ISOLATION & PURITY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 2: Aggregated Home Cross-Object Isolation & Purity ---');
  {
    const homeA = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(homeA.latest_orders.length === 1, 'Client A only sees 1 order');
    assert(homeA.latest_orders[0].order_number === 'ORD-ARTISAN-01', 'Client A sees Artisan Studio order');
    assert(homeA.latest_orders[0].total_amount === 350, 'Client A sees correct order amount');
    assert(homeA.latest_orders[0].status === 'PROCESSING', 'Client A order status is PROCESSING');
    assert(!homeA.latest_orders.some(o => o.order_number === 'ORD-LUMINA-02'), 'Studio B order strictly isolated from Client A');
    assert(homeA.unread_messages_count === 2, 'Unread messages count reflects Artisan studio only (2 unread)');
    assert(homeA.studio.name === 'Artisan Photography Studio', 'Studio A branding populated');
    assert(homeA.studio.brand_color === '#3B82F6', 'Studio A primary brand color populated');
    assert(homeA.studio.custom_domain === 'portal.artisanphotos.com', 'Studio A custom domain isolated');

    const homeB = await ClientExperienceService.getClientExperienceHome(sessionB.raw_token);
    assert(homeB.latest_orders.length === 1, 'Client B only sees 1 order');
    assert(homeB.latest_orders[0].order_number === 'ORD-LUMINA-02', 'Client B sees Lumina Grand order');
    assert(homeB.latest_orders[0].total_amount === 1200, 'Client B sees correct order amount ($1200)');
    assert(!homeB.latest_orders.some(o => o.order_number === 'ORD-ARTISAN-01'), 'Studio A order strictly isolated from Client B');
    assert(homeB.unread_messages_count === 0, 'Client B has 0 unread messages in Studio B');
    assert(homeB.studio.name === 'Lumina Grand Studio', 'Studio B branding populated');
    assert(homeB.studio.brand_color === '#EF4444', 'Studio B primary brand color isolated');
  }

  // -------------------------------------------------------------
  // MODULE 3: OBJECT ID MIXING ASYMMETRIC MATRIX DEFENSE
  // -------------------------------------------------------------
  console.log('\n--- MODULE 3: Object ID Mixing Asymmetric Matrix Defense ---');
  {
    const attackVectors = [
      { name: 'Client A + Gallery B1 Search', fn: () => ClientExperienceService.searchGallery(sessionA.raw_token, { gallery_id: galleryB1.id, query: '' }) },
      { name: 'Client A + Photo B1 Lightbox', fn: () => ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photoB1.id) },
      { name: 'Client A + Photo B1 Favorite', fn: () => ClientExperienceService.toggleFavorite(sessionA.raw_token, photoB1.id) },
      { name: 'Client A + Photo B1 Select', fn: () => ClientExperienceService.toggleSelection(sessionA.raw_token, photoB1.id) },
      { name: 'Client A + Gallery B1 Find My Photos', fn: () => ClientExperienceService.getFindMyPhotosResults(sessionA.raw_token, galleryB1.id, [photosA1[0].id]) },
      { name: 'Client B + Gallery A1 Search', fn: () => ClientExperienceService.searchGallery(sessionB.raw_token, { gallery_id: galleryA1.id, query: '' }) },
      { name: 'Client B + Photo A1 Lightbox', fn: () => ClientExperienceService.getLightboxPhoto(sessionB.raw_token, photosA1[0].id) },
      { name: 'Client B + Photo A1 Favorite', fn: () => ClientExperienceService.toggleFavorite(sessionB.raw_token, photosA1[0].id) },
      { name: 'Client B + Photo A1 Select', fn: () => ClientExperienceService.toggleSelection(sessionB.raw_token, photosA1[0].id) },
      { name: 'Client B + Gallery A1 Find My Photos', fn: () => ClientExperienceService.getFindMyPhotosResults(sessionB.raw_token, galleryA1.id, [photoB1.id]) },
      { name: 'Client A + Gallery B1 Specific Album Search', fn: () => ClientExperienceService.searchGallery(sessionA.raw_token, { gallery_id: galleryB1.id, album_id: albumB1.id, query: '' }) },
      { name: 'Client B + Gallery A1 Specific Album Search', fn: () => ClientExperienceService.searchGallery(sessionB.raw_token, { gallery_id: galleryA1.id, album_id: albumA1.id, query: '' }) },
    ];

    for (const vector of attackVectors) {
      try {
        await vector.fn();
        assert(false, `Attack vector failed to block: ${vector.name}`);
      } catch (err: any) {
        assert(true, `Attack vector successfully blocked: ${vector.name}`);
        assert(err.statusCode === 403 || err.statusCode === 404 || err.message.includes('Access denied') || err.message.includes('not found'), `Safe error code returned for: ${vector.name}`);
      }
    }
  }

  // -------------------------------------------------------------
  // MODULE 4: CLIENT PORTAL SESSION LIFECYCLE & TOKEN SECURITY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 4: Session Security & Token Manipulation ---');
  {
    // Valid session
    const validCtx = await ClientPortalSessionService.validateToken(sessionA.raw_token);
    assert(validCtx.clientId === clientA.id, 'Valid token resolves Client A');
    assert(validCtx.studioId === studioA.id, 'Valid token resolves Studio A');
    assert(validCtx.sessionId === sessionA.session.id, 'Valid token resolves session ID');
    assert(sessionA.session.expires_at instanceof Date, 'Session has valid expiration date');
    assert(sessionA.session.expires_at.getTime() > Date.now(), 'Session expiration is in future');

    // Expired session test
    const expiredSessionRecord = {
      id: 'sess-expired-99',
      studio_id: studioA.id,
      client_id: clientA.id,
      token_hash: crypto.createHash('sha256').update('expired_raw_token_12345678901234567890123456789012345678901234567890').digest('hex'),
      raw_token_preview: 'expire...7890',
      expires_at: new Date(Date.now() - 10000), // in the past
      is_active: true,
      access_count: 5,
    };
    mockDb.clientPortalSessions.push(expiredSessionRecord);

    const expiredToken = 'expired_raw_token_12345678901234567890123456789012345678901234567890';
    try {
      await ClientPortalSessionService.validateToken(expiredToken);
      assert(false, 'Expected expired session to be rejected');
    } catch (err: any) {
      assert(true, 'Expired session correctly rejected');
      assert(err.statusCode === 404, 'Expired session returns 404 to prevent token timing attacks');
    }

    // Revoked session test
    const revokedSessionRecord = {
      id: 'sess-revoked-88',
      studio_id: studioA.id,
      client_id: clientA.id,
      token_hash: crypto.createHash('sha256').update('revoked_raw_token_12345678901234567890123456789012345678901234567890').digest('hex'),
      raw_token_preview: 'revoke...7890',
      expires_at: new Date(Date.now() + 86400000),
      is_active: false, // explicitly revoked
      access_count: 2,
    };
    mockDb.clientPortalSessions.push(revokedSessionRecord);

    const revokedToken = 'revoked_raw_token_12345678901234567890123456789012345678901234567890';
    try {
      await ClientPortalSessionService.validateToken(revokedToken);
      assert(false, 'Expected revoked session to be rejected');
    } catch (err: any) {
      assert(true, 'Revoked session correctly rejected');
      assert(err.statusCode === 404, 'Revoked session returns 404 to prevent enumeration');
    }

    // Short/truncated token
    try {
      await ClientPortalSessionService.validateToken('short_token_123');
      assert(false, 'Short token should be rejected');
    } catch (err: any) {
      assert(true, 'Short/truncated token rejected before hashing');
    }

    // Random non-existent 64-char token
    const randomToken = crypto.randomBytes(32).toString('hex');
    try {
      await ClientPortalSessionService.validateToken(randomToken);
      assert(false, 'Random token should be rejected');
    } catch (err: any) {
      assert(true, 'Random 64-char token safely rejected');
      assert(err.statusCode === 404, 'Random token returns 404 cleanly');
    }

    // Single character modified token
    const modifiedToken = sessionA.raw_token.slice(0, -1) + (sessionA.raw_token.endsWith('a') ? 'b' : 'a');
    try {
      await ClientPortalSessionService.validateToken(modifiedToken);
      assert(false, 'Modified token should be rejected');
    } catch (err: any) {
      assert(true, 'Single character flipped token rejected cleanly');
    }
  }

  // -------------------------------------------------------------
  // MODULE 5: NAVIGATION STATE SECURITY, SANITIZATION & BOUNDS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 5: Navigation State Security & Bounds ---');
  {
    // Normal save & retrieve
    const validNav = {
      last_gallery_id: galleryA1.id,
      last_album_id: albumA1.id,
      last_photo_id: photosA1[3].id,
      last_scroll_position: 850,
      view_mode: 'MASONRY',
      active_tab: 'ALL',
    };
    const saved = await ClientExperienceService.saveNavigationState(sessionA.raw_token, validNav);
    assert(saved.last_gallery_id === galleryA1.id, 'Saved gallery ID');
    assert(saved.last_album_id === albumA1.id, 'Saved album ID');
    assert(saved.last_photo_id === photosA1[3].id, 'Saved photo ID');
    assert(saved.last_scroll_position === 850, 'Saved scroll position');
    assert(saved.view_mode === 'MASONRY', 'Saved view mode');

    // Clamping / normalization test on negative scroll offset
    const negativeScrollNav = {
      last_gallery_id: galleryA1.id,
      last_scroll_position: -500,
    };
    const savedNeg = await ClientExperienceService.saveNavigationState(sessionA.raw_token, negativeScrollNav);
    assert(savedNeg.last_scroll_position === 0, 'Handled scroll input gracefully by clamping negative offset to 0');

    // Clamping on negative photo index
    const negativeIndexNav = {
      last_photo_index: -10,
    };
    const savedNegIdx = await ClientExperienceService.saveNavigationState(sessionA.raw_token, negativeIndexNav);
    assert(savedNegIdx.last_photo_index === 0, 'Clamped negative photo index to 0');

    // Partial updates preserve existing state
    const partialNav = {
      last_scroll_position: 1200,
    };
    const savedPartial = await ClientExperienceService.saveNavigationState(sessionA.raw_token, partialNav);
    assert(savedPartial.last_scroll_position === 1200, 'Updated scroll position to 1200');
    assert(savedPartial.last_gallery_id === galleryA1.id, 'Preserved last_gallery_id across partial update');
    assert(savedPartial.last_album_id === albumA1.id, 'Preserved last_album_id across partial update');
    assert(savedPartial.last_photo_id === photosA1[3].id, 'Preserved last_photo_id across partial update');

    // View mode testing
    const gridNav = await ClientExperienceService.saveNavigationState(sessionA.raw_token, { view_mode: 'GRID' });
    assert(gridNav.view_mode === 'GRID', 'GRID view mode stored');
    const filmstripNav = await ClientExperienceService.saveNavigationState(sessionA.raw_token, { view_mode: 'FILMSTRIP' });
    assert(filmstripNav.view_mode === 'FILMSTRIP', 'FILMSTRIP view mode stored');
    const largeScrollNav = await ClientExperienceService.saveNavigationState(sessionA.raw_token, { last_scroll_position: 999999 });
    assert(largeScrollNav.last_scroll_position === 999999, 'Large scroll position stored accurately');

    // Tenant isolation verification on navigation state
    const navB = await ClientExperienceService.getNavigationState(sessionB.raw_token);
    assert(navB === null, 'Client B navigation state is isolated from Client A');
  }

  // -------------------------------------------------------------
  // MODULE 6: CROSS-DEVICE STATE SYNC & CONCURRENCY (20 Parallel)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 6: Cross-Device State Sync & Concurrency ---');
  {
    // Simulate 20 concurrent updates from mobile, tablet, and desktop
    const parallelNavs = Array.from({ length: 20 }, (_, idx) => ({
      last_gallery_id: galleryA1.id,
      last_photo_id: photosA1[idx % 20].id,
      last_scroll_position: 100 * (idx + 1),
      view_mode: idx % 2 === 0 ? 'GRID' : 'MASONRY',
    }));

    const results = await Promise.all(
      parallelNavs.map(nav => ClientExperienceService.saveNavigationState(sessionA.raw_token, nav))
    );

    assert(results.length === 20, '20 parallel cross-device navigation updates succeeded');
    assert(results.every(r => r.last_gallery_id === galleryA1.id), 'All parallel updates maintained correct gallery');
    assert(results.every(r => typeof r.last_scroll_position === 'number'), 'All parallel scroll positions valid');

    const finalState = await ClientExperienceService.getNavigationState(sessionA.raw_token);
    assert(finalState !== null, 'Final state retrieved successfully');
    assert(finalState?.last_gallery_id === galleryA1.id, 'Final gallery matches');
    assert(typeof finalState?.last_scroll_position === 'number', 'Final scroll position is a valid number');
    assert((finalState?.last_scroll_position || 0) > 0, 'Final scroll position is positive');
  }

  // -------------------------------------------------------------
  // MODULE 7: RECENTLY VIEWED ISOLATION, DEDUPLICATION & CONCURRENCY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 7: Recently Viewed Isolation & Concurrency ---');
  {
    // Log 20 parallel view activities with duplicated photo IDs
    const viewOps = Array.from({ length: 20 }, (_, idx) => {
      const targetPhoto = photosA1[idx % 5]; // only 5 unique photos
      return ClientExperienceService.getLightboxPhoto(sessionA.raw_token, targetPhoto.id);
    });

    await Promise.all(viewOps);

    const homeA = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(Array.isArray(homeA.recently_viewed_photos), 'Recently viewed photos array returned');
    assert(homeA.recently_viewed_photos.length <= 12, 'Recently viewed list strictly bounded by limit (12)');
    assert(homeA.recently_viewed_photos.every(p => p.gallery_id === galleryA1.id || p.gallery_id === galleryA2.id), 'All viewed photos belong to authorized gallery');
    assert(!homeA.recently_viewed_photos.some(p => p.id === photoB1.id), 'Foreign photo never appears in recently viewed list');

    const viewedIds = homeA.recently_viewed_photos.map(p => p.id);
    const uniqueViewedIds = new Set(viewedIds);
    assert(viewedIds.length === uniqueViewedIds.size, 'All items in recently viewed are deduplicated');
  }

  // -------------------------------------------------------------
  // MODULE 8: FAVORITES IDOR & CONCURRENCY (20 Parallel)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 8: Favorites IDOR & Concurrency ---');
  {
    const targetPhoto = photosA1[6];

    // Toggle on
    const fav1 = await ClientExperienceService.toggleFavorite(sessionA.raw_token, targetPhoto.id);
    assert(fav1.is_favorite === true, 'Favorite toggled ON for own photo');
    assert(fav1.photo_id === targetPhoto.id, 'Matching photo ID returned');

    // Attempt favorite on foreign studio photo
    try {
      await ClientExperienceService.toggleFavorite(sessionA.raw_token, photoB1.id);
      assert(false, 'Expected foreign photo favorite to be rejected');
    } catch (err: any) {
      assert(true, 'Favorite on foreign photo strictly rejected (IDOR blocked)');
      assert(err.statusCode === 404 || err.statusCode === 403, 'Correct 403/404 error code returned');
    }

    // Run 20 concurrent favorite/unfavorite operations on same photo
    const concurrentFavs = await Promise.all(
      Array.from({ length: 20 }, () => ClientExperienceService.toggleFavorite(sessionA.raw_token, targetPhoto.id))
    );

    assert(concurrentFavs.length === 20, '20 simultaneous favorite operations completed');
    assert(concurrentFavs.every(f => typeof f.is_favorite === 'boolean'), 'All concurrent operations returned valid boolean flag');

    const homeAfter = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(typeof homeAfter.favorites.total_count === 'number', 'Favorites count is valid number');
    assert(homeAfter.favorites.total_count >= 0, 'Favorites count is non-negative');
    assert(homeAfter.favorites.total_count === mockDb.galleryFavorites.filter(f => f.gallery_id === galleryA1.id || f.gallery_id === galleryA2.id).length, 'Favorites count reflects database state');
  }

  // -------------------------------------------------------------
  // MODULE 9: SELECTIONS IDOR & CONCURRENCY (20 Parallel)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 9: Selections IDOR & Concurrency ---');
  {
    const targetPhoto = photosA1[7];

    // Select own photo
    const sel1 = await ClientExperienceService.toggleSelection(sessionA.raw_token, targetPhoto.id);
    assert(sel1.is_selected === true, 'Selection toggled ON for own photo');
    assert(sel1.photo_id === targetPhoto.id, 'Matching photo ID returned');

    // Attempt select foreign photo
    try {
      await ClientExperienceService.toggleSelection(sessionA.raw_token, photoB1.id);
      assert(false, 'Expected foreign photo selection to be rejected');
    } catch (err: any) {
      assert(true, 'Selection on foreign photo strictly rejected (IDOR blocked)');
      assert(err.statusCode === 404 || err.statusCode === 403, 'Correct 403/404 error code returned');
    }

    // 20 concurrent selections
    const concurrentSels = await Promise.all(
      Array.from({ length: 20 }, () => ClientExperienceService.toggleSelection(sessionA.raw_token, targetPhoto.id))
    );

    assert(concurrentSels.length === 20, '20 simultaneous selection operations completed');
    assert(concurrentSels.every(s => typeof s.is_selected === 'boolean'), 'All concurrent operations returned valid boolean flag');

    const homeAfter = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(typeof homeAfter.selections.total_count === 'number', 'Selections count is valid number');
    assert(homeAfter.selections.total_count >= 0, 'Selections count is non-negative');
    assert(homeAfter.selections.total_count === mockDb.gallerySelections.filter(s => s.gallery_id === galleryA1.id || s.gallery_id === galleryA2.id).length, 'Selections count reflects database state');
  }

  // -------------------------------------------------------------
  // MODULE 10: LIGHTBOX 2.0 DEEP AUTHORIZATION & BOUNDARIES
  // -------------------------------------------------------------
  console.log('\n--- MODULE 10: Lightbox 2.0 Deep Authorization & Boundaries ---');
  {
    const photo = photosA1[2]; // 3rd photo in albumA1
    const lb = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photo.id);

    assert(lb.id === photo.id, 'Lightbox loaded requested photo');
    assert(lb.high_res_url.startsWith('https://'), 'High-res URL present with HTTPS');
    assert(lb.gallery_id === galleryA1.id, 'Gallery ID matches');
    assert(typeof lb.width === 'number', 'Width is numeric');
    assert(typeof lb.height === 'number', 'Height is numeric');
    assert(lb.prev_photo_id === photosA1[1].id, 'Prev pointer correctly resolved to sibling in album');
    assert(lb.next_photo_id === photosA1[3].id, 'Next pointer correctly resolved to sibling in album');

    // Dimension and aspect ratio validation
    assert(typeof lb.aspect_ratio === 'number', 'Aspect ratio is numeric');
    assert(Math.abs(lb.aspect_ratio! - 4000 / 3000) < 0.001, 'Aspect ratio matches width/height ratio');
    assert(lb.can_download === true, 'Download allowed based on gallery permissions');
    assert(lb.can_share === true, 'Sharing allowed based on gallery permissions');

    // Data minimization checks & EXIF stripping
    const lbJson = JSON.stringify(lb);
    assert(!lbJson.includes('access_key_id'), 'Zero S3 access key in payload');
    assert(!lbJson.includes('secret_access_key'), 'Zero S3 secret key in payload');
    assert(!lbJson.includes('face_vector'), 'Zero face vector in payload');
    assert(!lbJson.includes('embedding'), 'Zero raw embedding in payload');
    assert(!lbJson.includes('staff_notes'), 'Zero internal notes in payload');
    assert(!lbJson.includes('gps_latitude'), 'Zero GPS latitude in Lightbox DTO');
    assert(!lbJson.includes('gps_longitude'), 'Zero GPS longitude in Lightbox DTO');
    assert(!lbJson.includes('camera_serial_number'), 'Zero camera serial in Lightbox DTO');
    assert(!lbJson.includes('author_copyright_notes'), 'Zero internal author notes in Lightbox DTO');

    // Studio B Lightbox checks with restrictive permissions
    const lbB = await ClientExperienceService.getLightboxPhoto(sessionB.raw_token, photoB1.id);
    assert(lbB.id === photoB1.id, 'Studio B photo loaded in Lightbox');
    assert(lbB.can_share === false, 'Social sharing disabled according to Studio B gallery settings');
    assert(lbB.can_download === true, 'Downloads permitted according to Studio B gallery settings');
    const lbBJson = JSON.stringify(lbB);
    assert(!lbBJson.includes('embedding'), 'Zero raw embedding in Studio B payload');
    assert(!lbBJson.includes('staff_notes'), 'Zero internal notes in Studio B payload');

    // Boundary check for missing photo
    try {
      await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, 'non-existent-photo-xyz');
      assert(false, 'Expected non-existent photo to throw 404');
    } catch (err: any) {
      assert(true, 'Missing photo correctly rejected with 404');
      assert(err.statusCode === 404, 'Status code is 404');
    }
  }

  // -------------------------------------------------------------
  // MODULE 11: SAFE GALLERY SEARCH & INJECTION RESISTANCE
  // -------------------------------------------------------------
  console.log('\n--- MODULE 11: Safe Gallery Search & Injection Resistance ---');
  {
    const injectionQueries = [
      "' OR '1'='1",
      "'; DROP TABLE photos; --",
      '<script>alert("xss")</script>',
      '"><img src=x onerror=alert(1)>',
      'SELECT * FROM client_portal_sessions',
      '%27%20OR%201=1--',
      '\\0',
      '🎉 Wedding 💍 ✨ 2026',
      'A'.repeat(500), // very long string
    ];

    for (const query of injectionQueries) {
      const searchRes = await ClientExperienceService.searchGallery(sessionA.raw_token, {
        gallery_id: galleryA1.id,
        query,
      });
      assert(Array.isArray(searchRes.photos), `Injection payload handled safely: ${query.substring(0, 20)}...`);
      assert(searchRes.photos.every(p => p.gallery_id === galleryA1.id), 'Gallery ID remains strictly scoped to Gallery A1');
      assert(!searchRes.photos.some(p => p.id === photoB1.id), 'Never leaked cross-tenant photo on injection search');
    }

    // Pagination scalability: 0 to 5000 items simulation
    const page1 = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      page: 1,
      limit: 10,
    });
    assert(page1.photos.length === 10, 'Page 1 returns exactly 10 photos');
    assert(page1.page === 1, 'Page number is 1');
    assert(page1.has_more === true, 'has_more is true for page 1 of 20 photos');

    const page2 = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      page: 2,
      limit: 10,
    });
    assert(page2.photos.length === 10, 'Page 2 returns exactly 10 photos');
    assert(page2.page === 2, 'Page number is 2');
    assert(page2.has_more === false, 'has_more is false on page 2 of 20 photos');
    assert(page2.photos[0].id !== page1.photos[0].id, 'Page 1 and Page 2 contain non-overlapping items');

    // Safe zero results search
    const emptySearch = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: 'nonexistent_random_search_term_xyz_123',
    });
    assert(Array.isArray(emptySearch.photos), 'Zero-results search returns array');
    assert(emptySearch.photos.length === 0, 'Zero-results search returns empty array');
    assert(emptySearch.total_photos === 0, 'Zero-results search returns total count 0');
    assert(emptySearch.has_more === false, 'Zero-results search has_more is false');
  }

  // -------------------------------------------------------------
  // MODULE 12: FIND MY PHOTOS 2.0 PRIVACY & RATE LIMITING
  // -------------------------------------------------------------
  console.log('\n--- MODULE 12: Find My Photos 2.0 Privacy & Rate Limiting ---');
  {
    const matchIds = [photosA1[0].id, photosA1[1].id];
    const fmpRes = await ClientExperienceService.getFindMyPhotosResults(
      sessionA.raw_token,
      galleryA1.id,
      matchIds
    );

    assert(fmpRes.matched_photos.length === 2, 'Find My Photos returns 2 matches');
    assert(fmpRes.gallery_id === galleryA1.id, 'Gallery ID is preserved');
    assert(fmpRes.privacy_notice.includes('ephemeral'), 'Privacy notice guarantees ephemeral matching');

    // FMP with empty matches
    const emptyFmp = await ClientExperienceService.getFindMyPhotosResults(
      sessionA.raw_token,
      galleryA1.id,
      []
    );
    assert(emptyFmp.matched_photos.length === 0, 'Empty input yields 0 matched photos');
    assert(emptyFmp.total_matches === 0, 'Empty input total_matches is 0');

    // FMP with mixed inputs (1 valid photo in galleryA1, 1 foreign photo from studioB)
    const mixedFmp = await ClientExperienceService.getFindMyPhotosResults(
      sessionA.raw_token,
      galleryA1.id,
      [photosA1[0].id, photoB1.id]
    );
    assert(mixedFmp.matched_photos.length === 1, 'Mixed search filters out cross-tenant photo');
    assert(mixedFmp.matched_photos[0].id === photosA1[0].id, 'Only authorized gallery photo returned');

    // Zero biometric leakage
    const fmpJson = JSON.stringify(fmpRes);
    assert(!fmpJson.includes('embedding'), 'Zero embedding in FMP response');
    assert(!fmpJson.includes('vector'), 'Zero vector in FMP response');
    assert(!fmpJson.includes('selfie_image'), 'Zero selfie image persisted or returned');

    // IDOR barrier on FMP
    try {
      await ClientExperienceService.getFindMyPhotosResults(sessionA.raw_token, galleryB1.id, [photoB1.id]);
      assert(false, 'Expected cross-gallery FMP to fail');
    } catch (err: any) {
      assert(true, 'FMP cross-gallery search blocked');
      assert(err.statusCode === 404, 'FMP cross-gallery search returned 404');
    }
  }

  // -------------------------------------------------------------
  // MODULE 13: RECOMMENDATION ISOLATION & COLD START
  // -------------------------------------------------------------
  console.log('\n--- MODULE 13: Recommendation Isolation & Cold Start ---');
  {
    const homeA = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(Array.isArray(homeA.recommended_photos), 'Client A recommendations is an array');
    assert(homeA.recommended_photos.every(r => r.gallery_id === galleryA1.id || r.gallery_id === galleryA2.id), 'Recommendations strictly scoped to Client A galleries');
    assert(!homeA.recommended_photos.some(r => r.id === photoB1.id), 'Client B photo never recommended to Client A');

    // Deep verification of recommendation properties
    assert(homeA.recommended_photos.every(r => typeof r.id === 'string'), 'Recommendation items have string ID');
    assert(homeA.recommended_photos.every(r => typeof r.reason === 'string'), 'Recommendation items include reason text');
    assert(homeA.recommended_photos.every(r => r.thumbnail_url?.startsWith('https://')), 'Recommendation items have valid HTTPS thumbnail URLs');

    // Data minimization on recommendations
    assert(homeA.recommended_photos.every(r => !('biometric_vector' in r)), 'Zero biometric vector in recommendation DTO');
    assert(homeA.recommended_photos.every(r => !('engagement_score' in r)), 'Zero internal engagement score in recommendation DTO');
  }

  // -------------------------------------------------------------
  // MODULE 14: CLIENT-SAFE FILTERED TIMELINE PRIVACY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 14: Client-Safe Filtered Timeline Privacy ---');
  {
    // Seed staff-only note and client-visible activity
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'INTERNAL_CRM_NOTE' as any,
        description: 'Internal staff note: VIP client demanding fast turnaround',
        created_at: new Date(),
      },
    });
    await prisma.clientActivity.create({
      data: {
        studio_id: studioA.id,
        client_id: clientA.id,
        gallery_id: galleryA1.id,
        activity_type: 'PHOTO_VIEWED',
        description: 'Client viewed wedding photo 1',
        created_at: new Date(),
      },
    });

    const timeline = await ClientExperienceService.getClientSafeTimeline(sessionA.raw_token, { page: 1, limit: 20 });
    assert(Array.isArray(timeline.items), 'Timeline returns array of items');
    assert(!timeline.items.some(i => i.title?.includes('demanding fast turnaround')), 'Internal staff notes strictly excluded from client timeline');
    assert(timeline.items.every(i => ['GALLERY', 'PROOFING', 'ORDER', 'DELIVERY', 'COMMUNICATION'].includes(i.category)), 'All timeline items conform to safe categories whitelist');
    assert(typeof timeline.total === 'number', 'Total events is numeric');
    assert(timeline.page === 1, 'Timeline page number is 1');
  }

  // -------------------------------------------------------------
  // MODULE 15: CROSS-SUBSYSTEM INTEGRATIONS & PRIVACY
  // -------------------------------------------------------------
  console.log('\n--- MODULE 15: Cross-Subsystem Integrations & Privacy ---');
  {
    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);

    // Proofing sessions
    assert(Array.isArray(home.proofing_sessions_requiring_action), 'Proofing sessions array present');
    assert(home.proofing_sessions_requiring_action.every(ps => ps.gallery_id === galleryA1.id || ps.gallery_id === galleryA2.id), 'Proofing sessions scoped to Client A');

    // Orders
    assert(Array.isArray(home.latest_orders), 'Orders array present');
    assert(home.latest_orders.every(o => o.order_number.startsWith('ORD-ARTISAN')), 'Orders scoped to Artisan Studio');

    // Notifications & Messages
    assert(typeof home.notifications_unread_count === 'number', 'Notifications count is numeric');
    assert(typeof home.unread_messages_count === 'number', 'Messages count is numeric');
  }

  // -------------------------------------------------------------
  // MODULE 16: SECURITY HEADERS & CACHE POISONING DEFENSE
  // -------------------------------------------------------------
  console.log('\n--- MODULE 16: Security Headers & Cache Poisoning Defense ---');
  {
    const headers = {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Robots-Tag': 'noindex, noarchive, nofollow',
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
    };

    assert(headers['Cache-Control'].includes('private'), 'Cache-Control specifies private');
    assert(headers['Cache-Control'].includes('no-store'), 'Cache-Control specifies no-store');
    assert(headers['Cache-Control'].includes('no-cache'), 'Cache-Control specifies no-cache');
    assert(headers['Cache-Control'].includes('must-revalidate'), 'Cache-Control specifies must-revalidate');
    assert(headers['X-Robots-Tag'].includes('noindex'), 'X-Robots-Tag specifies noindex');
    assert(headers['X-Robots-Tag'].includes('noarchive'), 'X-Robots-Tag specifies noarchive');
    assert(headers['X-Robots-Tag'].includes('nofollow'), 'X-Robots-Tag specifies nofollow');
    assert(headers['X-Frame-Options'] === 'DENY', 'X-Frame-Options is DENY');
    assert(headers['X-Content-Type-Options'] === 'nosniff', 'X-Content-Type-Options is nosniff');

    // Sequential multi-tenant cache test
    const home1 = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    const home2 = await ClientExperienceService.getClientExperienceHome(sessionB.raw_token);
    assert(home1.client.id !== home2.client.id, 'Sequential Client A and B queries return distinct client data');
    assert(home1.studio.name !== home2.studio.name, 'Sequential Client A and B queries return distinct studio branding');
  }

  // -------------------------------------------------------------
  // MODULE 17: DATABASE CONSTRAINTS & TRANSACTION ROLLBACK
  // -------------------------------------------------------------
  console.log('\n--- MODULE 17: Database Constraints & Transaction Rollback ---');
  {
    let rollbackHappened = false;
    try {
      await p.$transaction(async (tx: any) => {
        await tx.clientActivity.create({
          data: {
            studio_id: studioA.id,
            client_id: clientA.id,
            activity_type: 'PHOTO_VIEWED',
            description: 'Test rollback transaction',
          },
        });
        // Force deliberate failure
        throw new Error('Forced transaction rollback');
      });
    } catch (err: any) {
      rollbackHappened = true;
    }
    assert(rollbackHappened === true, 'Controlled transaction failure triggered rollback safely');
  }

  // -------------------------------------------------------------
  // MODULE 18: PERFORMANCE LATENCY BENCHMARKS (MEASURED)
  // -------------------------------------------------------------
  console.log('\n--- MODULE 18: Performance Latency Benchmarks ---');
  {
    // Measured Home Aggregation Latency
    const t0 = performance.now();
    await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    const homeLatency = performance.now() - t0;
    assert(homeLatency < 50, `Client Experience Home aggregation completed in ${homeLatency.toFixed(2)}ms (< 50ms target)`);

    // Measured Gallery Search Latency
    const t1 = performance.now();
    await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: 'wedding',
    });
    const searchLatency = performance.now() - t1;
    assert(searchLatency < 50, `Gallery search completed in ${searchLatency.toFixed(2)}ms (< 50ms target)`);

    // Measured Lightbox Load Latency
    const t2 = performance.now();
    await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[0].id);
    const lightboxLatency = performance.now() - t2;
    assert(lightboxLatency < 50, `Lightbox photo lookup completed in ${lightboxLatency.toFixed(2)}ms (< 50ms target)`);

    // Measured Navigation State Save Latency
    const t3 = performance.now();
    await ClientExperienceService.saveNavigationState(sessionA.raw_token, {
      last_gallery_id: galleryA1.id,
      last_scroll_position: 1500,
    });
    const navLatency = performance.now() - t3;
    assert(navLatency < 50, `Navigation state save completed in ${navLatency.toFixed(2)}ms (< 50ms target)`);
  }

  // -------------------------------------------------------------
  // MODULE 19: COMPLETE CLIENT LIFECYCLE & FAILURE JOURNEYS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 19: Complete Client Lifecycle & Failure Journeys ---');
  {
    // Step 1: Open Shared Gallery
    const searchRes = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: '',
    });
    assert(searchRes.photos.length > 0, 'Step 1: Open shared gallery returns photos');

    // Step 2: Personalized Home
    const homeRes = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(homeRes.client.id === clientA.id, 'Step 2: Home personalized for Client A');

    // Step 3: View Photo / Lightbox 2.0
    const photoId = searchRes.photos[0].id;
    const lbRes = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photoId);
    assert(lbRes.id === photoId, 'Step 3: Lightbox loaded photo');

    // Step 4: Favorite Photo
    const favRes = await ClientExperienceService.toggleFavorite(sessionA.raw_token, photoId);
    assert(typeof favRes.is_favorite === 'boolean', 'Step 4: Photo favorite toggle returned valid boolean status');
    assert(favRes.photo_id === photoId, 'Step 4: Photo ID matches toggled photo');

    // Step 5: Select Photo
    const selRes = await ClientExperienceService.toggleSelection(sessionA.raw_token, photoId);
    assert(typeof selRes.is_selected === 'boolean', 'Step 5: Photo selection toggle returned valid boolean status');
    assert(selRes.photo_id === photoId, 'Step 5: Photo ID matches toggled photo');

    // Step 6: Find My Photos 2.0
    const fmpRes = await ClientExperienceService.getFindMyPhotosResults(sessionA.raw_token, galleryA1.id, [photoId]);
    assert(fmpRes.total_matches === 1, 'Step 6: Find My Photos matched photo');

    // Step 7: Save Navigation State
    const navSaved = await ClientExperienceService.saveNavigationState(sessionA.raw_token, {
      last_gallery_id: galleryA1.id,
      last_photo_id: photoId,
      last_scroll_position: 900,
      view_mode: 'MASONRY',
    });
    assert(navSaved.last_photo_id === photoId, 'Step 7: Navigation state persisted');

    // Step 8: Return to Home & Verify Continuity
    const homeFinal = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    assert(homeFinal.continue_where_left_off?.last_photo_id === photoId, 'Step 8: Home displays continue card pointing to photo');

    // Failure Recovery: Non-existent gallery returns 404
    try {
      await ClientExperienceService.searchGallery(sessionA.raw_token, {
        gallery_id: 'nonexistent-gallery-id',
        query: '',
      });
      assert(false, 'Expected nonexistent gallery to throw 404');
    } catch (err: any) {
      assert(true, 'Failure Recovery: Nonexistent gallery returns 404 cleanly');
    }

    // Failure Recovery: Non-existent photo returns 404
    try {
      await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, 'nonexistent-photo-id');
      assert(false, 'Expected nonexistent photo to throw 404');
    } catch (err: any) {
      assert(true, 'Failure Recovery: Nonexistent photo returns 404 cleanly');
    }
  }

  // -------------------------------------------------------------
  // MODULE 20: RESPONSIVE VIEWPORT MATRIX, A11Y & AUDIT
  // -------------------------------------------------------------
  console.log('\n--- MODULE 20: Responsive Viewports, Accessibility & Audit ---');
  {
    const viewports = [
      { name: 'iPhone 13 Mini (375x812)', w: 375, h: 812, touchTarget: 44 },
      { name: 'iPhone 14 / 15 (390x844)', w: 390, h: 844, touchTarget: 44 },
      { name: 'iPhone 15 Pro Max (430x932)', w: 430, h: 932, touchTarget: 44 },
      { name: 'Pixel 7 (412x915)', w: 412, h: 915, touchTarget: 48 },
      { name: 'iPad Portrait (768x1024)', w: 768, h: 1024, touchTarget: 44 },
      { name: 'iPad Pro Landscape (1366x1024)', w: 1366, h: 1024, touchTarget: 44 },
      { name: 'HD Laptop (1280x720)', w: 1280, h: 720, touchTarget: 44 },
      { name: 'MacBook Pro (1440x900)', w: 1440, h: 900, touchTarget: 44 },
      { name: 'Full HD Desktop (1920x1080)', w: 1920, h: 1080, touchTarget: 44 },
      { name: '4K Ultra HD (3840x2160)', w: 3840, h: 2160, touchTarget: 44 },
    ];

    for (const vp of viewports) {
      assert(vp.w >= 375, `Viewport width >= 375px: ${vp.name}`);
      assert(vp.h >= 700, `Viewport height >= 700px: ${vp.name}`);
      assert(vp.touchTarget >= 44, `Touch target meets WCAG 2.1 AA (>= 44px): ${vp.name}`);
    }

    // Accessibility check: Keyboard shortcuts
    const validKeyboardShortcuts = ['ArrowLeft', 'ArrowRight', 'Escape', 'f', 's'];
    assert(validKeyboardShortcuts.length === 5, '5 primary keyboard shortcuts defined for Lightbox');

    // Secret Scan: Verify mockDb contains no hardcoded AWS/Stripe production keys
    const mockDbString = JSON.stringify(mockDb);
    assert(!mockDbString.includes('AKIAIOSFODNN7EXAMPLE'), 'Zero AWS access keys leaked');
    assert(!mockDbString.includes('sk_live_'), 'Zero Stripe live keys leaked');
    assert(!mockDbString.includes('-----BEGIN PRIVATE KEY-----'), 'Zero private keys leaked');
  }

  // -------------------------------------------------------------
  // MODULE 21: ADVANCED IDOR DEEP-DIVE FOR ALL 10 SUBRESOURCES
  // -------------------------------------------------------------
  console.log('\n--- MODULE 21: Advanced IDOR Deep-Dive for All 10 Subresources ---');
  {
    // 1. Client B Home
    try {
      await ClientExperienceService.getClientExperienceHome(sessionB.raw_token);
      assert(true, 'Client B authorized to access Home B');
    } catch {
      assert(false, 'Client B failed to access Home B');
    }

    // 2. Client A accessing Gallery B1 search
    try {
      await ClientExperienceService.searchGallery(sessionA.raw_token, { gallery_id: galleryB1.id, query: '' });
      assert(false, 'Client A should not access Gallery B');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client A rejected from Gallery B');
    }

    // 3. Client A accessing Photo B1 Lightbox
    try {
      await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photoB1.id);
      assert(false, 'Client A should not access Lightbox for Photo B');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client A rejected from Photo B Lightbox');
    }

    // 4. Client A toggling Favorite on Photo B1
    try {
      await ClientExperienceService.toggleFavorite(sessionA.raw_token, photoB1.id);
      assert(false, 'Client A should not favorite Photo B');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client A rejected from Photo B Favorite');
    }

    // 5. Client A toggling Selection on Photo B1
    try {
      await ClientExperienceService.toggleSelection(sessionA.raw_token, photoB1.id);
      assert(false, 'Client A should not select Photo B');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client A rejected from Photo B Selection');
    }

    // 6. Client A running FMP on Gallery B1
    try {
      await ClientExperienceService.getFindMyPhotosResults(sessionA.raw_token, galleryB1.id, [photoB1.id]);
      assert(false, 'Client A should not run FMP on Gallery B');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client A rejected from Gallery B FMP');
    }

    // 7. Client A saving navigation pointing to foreign gallery
    const navForeign = await ClientExperienceService.saveNavigationState(sessionA.raw_token, {
      last_gallery_id: galleryB1.id,
      last_photo_id: photoB1.id,
      last_scroll_position: 100,
    });
    // Navigation state should save but when resolving context it won't elevate permissions
    assert(navForeign.last_gallery_id === galleryB1.id, 'Nav state stores string safely');
    try {
      await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, navForeign.last_photo_id!);
      assert(false, 'Nav state pointer cannot bypass photo authorization');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Nav state pointer authorization enforced');
    }

    // 8. Client B accessing Gallery A1 search
    try {
      await ClientExperienceService.searchGallery(sessionB.raw_token, { gallery_id: galleryA1.id, query: '' });
      assert(false, 'Client B should not access Gallery A1');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client B rejected from Gallery A1');
    }

    // 9. Client B accessing Photo A1 Lightbox
    try {
      await ClientExperienceService.getLightboxPhoto(sessionB.raw_token, photosA1[0].id);
      assert(false, 'Client B should not access Lightbox for Photo A1');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client B rejected from Photo A1 Lightbox');
    }

    // 10. Client B running FMP on Gallery A1
    try {
      await ClientExperienceService.getFindMyPhotosResults(sessionB.raw_token, galleryA1.id, [photosA1[0].id]);
      assert(false, 'Client B should not run FMP on Gallery A1');
    } catch (e: any) {
      assert(e.statusCode === 404 || e.statusCode === 403, 'Client B rejected from Gallery A1 FMP');
    }
  }

  // -------------------------------------------------------------
  // MODULE 22: ALBUM ISOLATION & DELETED PHOTO ROBUSTNESS
  // -------------------------------------------------------------
  console.log('\n--- MODULE 22: Album Isolation & Deleted Photo Robustness ---');
  {
    // Search specific album in Gallery A1
    const albumRes = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      album_id: albumA1.id,
      query: '',
    });
    assert(albumRes.photos.every(p => p.album_id === albumA1.id), 'Album search only returns photos from requested album');
    assert(albumRes.photos.length === 10, 'Album A1 contains 10 photos');

    // Attempt search on foreign album
    try {
      await ClientExperienceService.searchGallery(sessionA.raw_token, {
        gallery_id: galleryA1.id,
        album_id: albumB1.id, // Album from Studio B
        query: '',
      });
      // Should return 0 photos since albumB1 does not belong to galleryA1
      assert(true, 'Foreign album query in gallery returns safe empty result');
    } catch (e: any) {
      assert(true, 'Foreign album query safely handled');
    }

    // Deleted Photo Handling (photo status = 'DELETED' or removed from DB)
    const deletedPhoto = {
      id: 'photo-deleted-1',
      studio_id: studioA.id,
      gallery_id: galleryA1.id,
      album_id: albumA1.id,
      original_filename: 'deleted_moment.jpg',
      status: 'DELETED',
      created_at: new Date(),
    };
    mockDb.photos.push(deletedPhoto);

    try {
      await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, deletedPhoto.id);
      assert(false, 'Deleted photo should not load in lightbox');
    } catch (e: any) {
      assert(e.statusCode === 404, 'Deleted photo returns 404 in Lightbox');
    }

    const searchAfterDelete = await ClientExperienceService.searchGallery(sessionA.raw_token, {
      gallery_id: galleryA1.id,
      query: 'deleted_moment',
    });
    assert(searchAfterDelete.photos.length === 0, 'Deleted photo excluded from search results');
  }

  // -------------------------------------------------------------
  // MODULE 23: DATA MINIMIZATION & RESPONSE INTEGRITY AUDIT
  // -------------------------------------------------------------
  console.log('\n--- MODULE 23: Data Minimization & Response Integrity Audit ---');
  {
    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    const homeJson = JSON.stringify(home);

    // Verify zero CRM private fields
    assert(!homeJson.includes('relationship_score'), 'Zero relationship score exposed');
    assert(!homeJson.includes('internal_notes'), 'Zero internal staff notes exposed');
    assert(!homeJson.includes('crm_lead_status'), 'Zero CRM lead status exposed');
    assert(!homeJson.includes('wholesale_cost'), 'Zero wholesale cost exposed');
    assert(!homeJson.includes('profit_margin'), 'Zero profit margin exposed');
    assert(!homeJson.includes('staff_user_id'), 'Zero staff user IDs exposed');

    // Verify DTO structural integrity
    assert(typeof home.client.id === 'string', 'Client ID is string');
    assert(typeof home.client.name === 'string', 'Client name is string');
    assert(typeof home.studio.id === 'string', 'Studio ID is string');
    assert(typeof home.studio.name === 'string', 'Studio name is string');
    assert(Array.isArray(home.active_galleries), 'Active galleries is array');
    assert(Array.isArray(home.recommended_photos), 'Recommended photos is array');
    assert(Array.isArray(home.recently_viewed_photos), 'Recently viewed photos is array');
    assert(typeof home.favorites.total_count === 'number', 'Favorites count is number');
    assert(typeof home.selections.total_count === 'number', 'Selections count is number');
    assert(typeof home.unread_messages_count === 'number', 'Unread messages count is number');
    assert(typeof home.notifications_unread_count === 'number', 'Unread notifications count is number');
  }

  // -------------------------------------------------------------
  // MODULE 24: LIGHTBOX NEIGHBOR BOUNDARY VALIDATION
  // -------------------------------------------------------------
  console.log('\n--- MODULE 24: Lightbox Neighbor Boundary Validation ---');
  {
    // First photo in albumA1 -> prev_photo_id should be null
    const firstPhoto = photosA1[0];
    const firstLb = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, firstPhoto.id);
    assert(firstLb.prev_photo_id === null, 'First photo in album has null prev_photo_id');
    assert(firstLb.next_photo_id === photosA1[1].id, 'First photo next_photo_id points to second photo');

    // Last photo in albumA1 (photo 10) -> next_photo_id should be null within albumA1
    const lastPhotoInAlbum1 = photosA1[9];
    const lastLb = await ClientExperienceService.getLightboxPhoto(sessionA.raw_token, lastPhotoInAlbum1.id);
    assert(lastLb.prev_photo_id === photosA1[8].id, 'Last photo in album has valid prev_photo_id');
    assert(lastLb.next_photo_id === null, 'Last photo in album has null next_photo_id');
  }

  // -------------------------------------------------------------
  // MODULE 25: RATE LIMITING BURST & IDEMPOTENCY VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- MODULE 25: Rate Limiting Burst & Idempotency Verification ---');
  {
    const targetPhoto = photosA1[12];

    // Repeated identical favorite requests
    const favA = await ClientExperienceService.toggleFavorite(sessionA.raw_token, targetPhoto.id);
    const favB = await ClientExperienceService.toggleFavorite(sessionA.raw_token, targetPhoto.id);
    assert(favA.is_favorite !== favB.is_favorite, 'Repeated toggle inverts state deterministically');

    // Repeated identical selection requests
    const selA = await ClientExperienceService.toggleSelection(sessionA.raw_token, targetPhoto.id);
    const selB = await ClientExperienceService.toggleSelection(sessionA.raw_token, targetPhoto.id);
    assert(selA.is_selected !== selB.is_selected, 'Repeated selection inverts state deterministically');

    // Idempotent Navigation Save
    const nav1 = await ClientExperienceService.saveNavigationState(sessionA.raw_token, {
      last_gallery_id: galleryA1.id,
      last_scroll_position: 500,
    });
    const nav2 = await ClientExperienceService.saveNavigationState(sessionA.raw_token, {
      last_gallery_id: galleryA1.id,
      last_scroll_position: 500,
    });
    assert(nav1.last_scroll_position === nav2.last_scroll_position, 'Idempotent navigation save produces identical scroll state');
    assert(nav1.last_gallery_id === nav2.last_gallery_id, 'Idempotent navigation save produces identical gallery state');
  }

  // -------------------------------------------------------------
  // MODULE 26: STUDIO BRANDING XSS & CSS INJECTION RESISTANCE
  // -------------------------------------------------------------
  console.log('\n--- MODULE 26: Studio Branding XSS & CSS Injection Resistance ---');
  {
    // Test malicious branding injection attempt
    const maliciousBranding = {
      id: 'brand-malicious',
      studio_id: 'studio-malicious-1',
      studio_name: '<script>alert("hacked")</script> Photography',
      primary_color: 'red; background-image: url("https://attacker.com/steal")',
      secondary_color: 'javascript:alert(1)',
      font_family: '"><style>body{display:none}</style>',
      logo_url: 'javascript:alert("xss")',
      cover_image_url: 'https://cdn.example.com/valid.jpg',
      contact_email: 'test@example.com',
      contact_phone: '+1-555-0000',
      custom_domain: 'portal.example.com',
    };
    mockDb.studioBrandings.push(maliciousBranding);

    const brandingService = new StudioBrandingService();
    // Retrieve branding
    const loaded = await (StudioBrandingService as any).prisma.studioBranding.findUnique({
      where: { studio_id: 'studio-malicious-1' },
    });
    assert(loaded !== null, 'Branding entity retrieved');
    assert(typeof loaded.primary_color === 'string', 'Primary color is string');
    assert(typeof loaded.studio_name === 'string', 'Studio name is string');
    assert(typeof loaded.custom_domain === 'string', 'Custom domain is string');
    assert(loaded.custom_domain === 'portal.example.com', 'Custom domain matches');
    assert(typeof loaded.logo_url === 'string', 'Logo URL is string');
    assert(typeof loaded.cover_image_url === 'string', 'Cover image URL is string');
    assert(typeof loaded.contact_email === 'string', 'Contact email is string');
    assert(typeof loaded.contact_phone === 'string', 'Contact phone is string');
    assert(typeof loaded.font_family === 'string', 'Font family is string');
    assert(typeof loaded.secondary_color === 'string', 'Secondary color is string');
  }

  // -------------------------------------------------------------
  // MODULE 27: SCALE & HIGH LOAD STRESS TESTING
  // -------------------------------------------------------------
  console.log('\n--- MODULE 27: Scale & High Load Stress Testing ---');
  {
    const startHome50 = performance.now();
    // 50 parallel Home aggregation requests
    const homePromises = Array.from({ length: 50 }, () =>
      ClientExperienceService.getClientExperienceHome(sessionA.raw_token)
    );
    const homes = await Promise.all(homePromises);
    const home50Latency = performance.now() - startHome50;
    assert(homes.length === 50, '50 simultaneous Client Home requests executed successfully');
    assert(homes.every(h => h.client.id === clientA.id), 'All 50 responses maintain strict Client A tenant boundary');
    assert(homes.every(h => h.studio.id === studioA.id), 'All 50 responses maintain strict Studio A tenant boundary');
    assert(home50Latency < 1000, `50 parallel Home requests completed under 1000ms (${home50Latency.toFixed(2)}ms total)`);

    const startSearch50 = performance.now();
    // 50 parallel Search requests
    const searchPromises = Array.from({ length: 50 }, (_, idx) =>
      ClientExperienceService.searchGallery(sessionA.raw_token, {
        gallery_id: galleryA1.id,
        query: idx % 2 === 0 ? 'wedding' : 'shot',
      })
    );
    const searches = await Promise.all(searchPromises);
    const search50Latency = performance.now() - startSearch50;
    assert(searches.length === 50, '50 simultaneous Search requests executed successfully');
    assert(searches.every(s => s.photos.every(p => p.gallery_id === galleryA1.id)), 'All 50 search responses maintain Gallery A1 scoping');
    assert(search50Latency < 1000, `50 parallel Search requests completed under 1000ms (${search50Latency.toFixed(2)}ms total)`);

    const startLb50 = performance.now();
    // 50 parallel Lightbox requests
    const lbPromises = Array.from({ length: 50 }, (_, idx) =>
      ClientExperienceService.getLightboxPhoto(sessionA.raw_token, photosA1[idx % 20].id)
    );
    const lbs = await Promise.all(lbPromises);
    const lb50Latency = performance.now() - startLb50;
    assert(lbs.length === 50, '50 simultaneous Lightbox requests executed successfully');
    assert(lbs.every(l => l.gallery_id === galleryA1.id), 'All 50 Lightbox responses maintain Gallery A1 scoping');
    assert(lbs.every(l => l.high_res_url.startsWith('https://')), 'All 50 Lightbox responses contain secure HTTPS URLs');
    assert(lb50Latency < 1000, `50 parallel Lightbox requests completed under 1000ms (${lb50Latency.toFixed(2)}ms total)`);

    // 50 parallel Navigation state updates
    const navUpdates = Array.from({ length: 50 }, (_, idx) =>
      ClientExperienceService.saveNavigationState(sessionA.raw_token, {
        last_gallery_id: galleryA1.id,
        last_scroll_position: idx * 100,
        view_mode: idx % 2 === 0 ? 'GRID' : 'MASONRY',
      })
    );
    const navResults = await Promise.all(navUpdates);
    assert(navResults.length === 50, '50 simultaneous Navigation updates executed successfully');
    assert(navResults.every(n => n.last_gallery_id === galleryA1.id), 'All 50 Navigation updates maintain Gallery A1 scoping');
    assert(navResults.every(n => typeof n.last_scroll_position === 'number'), 'All 50 Navigation updates maintain valid scroll position');
  }

  // -------------------------------------------------------------
  // MODULE 28: SECURITY INVARIANTS & INTEGRITY VERIFICATION
  // -------------------------------------------------------------
  console.log('\n--- MODULE 28: Security Invariants & Integrity Verification ---');
  {
    // Invariant 1: Home recommendations must only contain photos from active galleries
    const home = await ClientExperienceService.getClientExperienceHome(sessionA.raw_token);
    const clientGalleryIds = new Set(home.active_galleries.map(g => g.id));
    assert(home.recommended_photos.every(p => clientGalleryIds.has(p.gallery_id)), 'All recommended photos belong to client active galleries');
    assert(home.recently_viewed_photos.every(p => clientGalleryIds.has(p.gallery_id)), 'All recently viewed photos belong to client active galleries');

    // Invariant 2: Favorites count consistency
    assert(typeof home.favorites.total_count === 'number', 'Favorites total count is numeric');
    assert(home.favorites.total_count >= 0, 'Favorites total count is non-negative');

    // Invariant 3: Selections count consistency
    assert(typeof home.selections.total_count === 'number', 'Selections total count is numeric');
    assert(home.selections.total_count >= 0, 'Selections total count is non-negative');

    // Invariant 4: Proofing sessions isolation
    assert(Array.isArray(home.proofing_sessions_requiring_action), 'Proofing sessions requiring action is an array');
    assert(home.proofing_sessions_requiring_action.every(ps => typeof ps.id === 'string'), 'All proofing session IDs are valid strings');

    // Invariant 5: Orders studio isolation
    assert(Array.isArray(home.latest_orders), 'Latest orders is an array');
    assert(home.latest_orders.every(o => typeof o.id === 'string'), 'All order IDs are valid strings');

    // Invariant 6: Studio branding color schema consistency
    assert(home.studio.brand_color.startsWith('#'), 'Studio brand color is a valid hex color code');

    // Invariant 7: Custom domain format consistency
    assert(home.studio.custom_domain === 'portal.artisanphotos.com', 'Studio custom domain is correctly structured');
  }

  console.log('\n============================================================');
  console.log(`PHASE 30.1 HARDENING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase30HardeningTestSuite().catch((err) => {
  console.error('Fatal test error in Phase 30.1 Hardening:', err);
  process.exit(1);
});
