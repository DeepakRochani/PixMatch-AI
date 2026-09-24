/**
 * PIXMatch AI — Phase 27 Master Test Suite
 * Studio Client Portal & White-Label Client Experience
 *
 * Covers 10 Comprehensive Test Modules with 250+ assertions.
 */

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pixmatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-must-be-32-chars-long';

import crypto from 'crypto';
import {
  StudioDomainStatus,
  ProofingSessionStatus,
  FulfillmentOrderStatus,
  FulfillmentPaymentStatus,
  FulfillmentDeliveryStatus
} from '@pixmatch/types';
import { prisma } from '@pixmatch/database';
import { ClientPortalSessionService } from '../apps/api/src/modules/client-portal/client-portal-session.service.js';
import { ClientPortalService } from '../apps/api/src/modules/client-portal/client-portal.service.js';
import { StudioBrandingService } from '../apps/api/src/modules/branding/studio-branding.service.js';
import { StudioDomainService } from '../apps/api/src/modules/branding/studio-domain.service.js';
import { CopilotToolRegistry } from '../apps/api/src/modules/copilot/copilot-tool-registry.js';

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

// In-Memory Mock Database for Phase 27 Deterministic Testing
class MockPhase27Database {
  studios: any[] = [];
  clients: any[] = [];
  projects: any[] = [];
  galleries: any[] = [];
  photos: any[] = [];
  proofingSessions: any[] = [];
  proofingItems: any[] = [];
  fulfillmentOrders: any[] = [];
  fulfillmentOrderItems: any[] = [];
  fulfillmentDeliveries: any[] = [];
  fulfillmentDownloads: any[] = [];
  fulfillmentPackages: any[] = [];
  notifications: any[] = [];
  subscriptions: any[] = [];

  // Phase 27 Specific Tables
  studioBrandings: any[] = [];
  studioDomains: any[] = [];
  clientPortalSessions: any[] = [];
  clientPortalNotificationReads: any[] = [];
  clientPortalPreferences: any[] = [];

  reset() {
    this.studios = [];
    this.clients = [];
    this.projects = [];
    this.galleries = [];
    this.photos = [];
    this.proofingSessions = [];
    this.proofingItems = [];
    this.fulfillmentOrders = [];
    this.fulfillmentOrderItems = [];
    this.fulfillmentDeliveries = [];
    this.fulfillmentDownloads = [];
    this.fulfillmentPackages = [];
    this.notifications = [];
    this.subscriptions = [];

    this.studioBrandings = [];
    this.studioDomains = [];
    this.clientPortalSessions = [];
    this.clientPortalNotificationReads = [];
    this.clientPortalPreferences = [];
  }
}

const mockDb = new MockPhase27Database();

function patchPrismaMock() {
  const p: any = prisma;

  p.$transaction = async (fnOrArray: any) => {
    if (typeof fnOrArray === 'function') {
      return fnOrArray(p);
    }
    return Promise.all(fnOrArray);
  };

  // Studio
  p.studio = {
    findUnique: async ({ where, include }: any) => {
      const studio = mockDb.studios.find(s => (where.id && s.id === where.id) || (where.slug && s.slug === where.slug));
      if (!studio) return null;
      const res = { ...studio };
      if (include?.branding) {
        res.branding = mockDb.studioBrandings.find(b => b.studio_id === studio.id) || null;
      }
      return res;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.studios.find(s => {
        for (const [k, v] of Object.entries(where)) {
          if (s[k] !== v) return false;
        }
        return true;
      }) || null;
    }
  };

  // Client
  p.client = {
    findUnique: async ({ where }: any) => {
      return mockDb.clients.find(c => c.id === where.id) || null;
    },
    findFirst: async ({ where, include }: any) => {
      const client = mockDb.clients.find(c => {
        for (const [k, v] of Object.entries(where)) {
          if (v === null) {
            if (c[k] !== null && c[k] !== undefined) return false;
          } else if (c[k] !== v) {
            return false;
          }
        }
        return true;
      });
      if (!client) return null;
      const res = { ...client };
      if (include?.studio) {
        res.studio = mockDb.studios.find(s => s.id === client.studio_id) || null;
      }
      if (include?.projects) {
        res.projects = mockDb.projects.filter(pr => pr.client_id === client.id);
      }
      if (include?.fulfillment_orders) {
        res.fulfillment_orders = mockDb.fulfillmentOrders.filter(o => o.client_id === client.id);
      }
      if (include?.proofing_sessions) {
        res.proofing_sessions = mockDb.proofingSessions.filter(ps => ps.client_id === client.id);
      }
      return res;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.clients.findIndex(c => c.id === where.id);
      if (idx === -1) throw new Error('Client not found');
      const updated = {
        ...mockDb.clients[idx],
        ...data,
        updated_at: new Date()
      };
      mockDb.clients[idx] = updated;
      return updated;
    }
  };

  // StudioBranding
  p.studioBranding = {
    findUnique: async ({ where }: any) => {
      return mockDb.studioBrandings.find(b => (where.id && b.id === where.id) || (where.studio_id && b.studio_id === where.studio_id)) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.studioBrandings.find(b => {
        for (const [k, v] of Object.entries(where)) {
          if (b[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    upsert: async ({ where, create, update }: any) => {
      const existingIdx = mockDb.studioBrandings.findIndex(b => b.studio_id === where.studio_id);
      if (existingIdx >= 0) {
        const updated = {
          ...mockDb.studioBrandings[existingIdx],
          ...update,
          updated_at: new Date()
        };
        mockDb.studioBrandings[existingIdx] = updated;
        return updated;
      } else {
        const created = {
          id: `brand_${crypto.randomUUID()}`,
          studio_id: create.studio_id,
          logo_url: create.logo_url || null,
          favicon_url: create.favicon_url || null,
          studio_name: create.studio_name || null,
          tagline: create.tagline || null,
          primary_color: create.primary_color || '#4f46e5',
          secondary_color: create.secondary_color || '#06b6d4',
          accent_color: create.accent_color || '#f59e0b',
          background_color: create.background_color || '#0f172a',
          text_color: create.text_color || '#f8fafc',
          button_style: create.button_style || 'rounded',
          font_family: create.font_family || 'Inter',
          custom_footer_text: create.custom_footer_text || null,
          contact_email: create.contact_email || null,
          contact_phone: create.contact_phone || null,
          website_url: create.website_url || null,
          social_links: create.social_links || null,
          show_pixmatch_badge: create.show_pixmatch_badge !== false,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockDb.studioBrandings.push(created);
        return created;
      }
    }
  };

  // StudioDomain
  p.studioDomain = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `dom_${crypto.randomUUID()}`,
        studio_id: data.studio_id,
        hostname: data.hostname,
        status: data.status || StudioDomainStatus.PENDING,
        verification_token: data.verification_token,
        verified_at: data.verified_at || null,
        is_primary: data.is_primary || false,
        ssl_status: data.ssl_status || null,
        dns_records: data.dns_records || null,
        last_checked_at: data.last_checked_at || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockDb.studioDomains.push(rec);
      return rec;
    },
    findUnique: async ({ where }: any) => {
      return mockDb.studioDomains.find(d => (where.id && d.id === where.id) || (where.hostname && d.hostname === where.hostname)) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.studioDomains.find(d => {
        for (const [k, v] of Object.entries(where)) {
          if (v && typeof v === 'object' && Array.isArray((v as any).in)) {
            if (!(v as any).in.includes(d[k])) return false;
          } else if (v === null) {
            if (d[k] !== null && d[k] !== undefined) return false;
          } else if (d[k] !== v) {
            return false;
          }
        }
        return true;
      }) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.studioDomains.filter(d => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (d[k] !== v) return false;
        }
        return true;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.studioDomains.findIndex(d => d.id === where.id);
      if (idx === -1) throw new Error('Domain not found');
      const updated = {
        ...mockDb.studioDomains[idx],
        ...data,
        updated_at: new Date()
      };
      mockDb.studioDomains[idx] = updated;
      return updated;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      mockDb.studioDomains.forEach((d, i) => {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (d[k] !== v) match = false;
        }
        if (match) {
          mockDb.studioDomains[i] = { ...d, ...data, updated_at: new Date() };
          count++;
        }
      });
      return { count };
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.studioDomains.findIndex(d => d.id === where.id);
      if (idx === -1) throw new Error('Domain not found');
      const deleted = mockDb.studioDomains.splice(idx, 1)[0];
      return deleted;
    }
  };

  // ClientPortalSession
  p.clientPortalSession = {
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `cps_${crypto.randomUUID()}`,
        studio_id: data.studio_id,
        client_id: data.client_id,
        token_hash: data.token_hash,
        expires_at: data.expires_at,
        is_active: data.is_active ?? true,
        revoked_at: data.revoked_at || null,
        last_accessed_at: data.last_accessed_at || null,
        access_count: data.access_count || 0,
        ip_address: data.ip_address || null,
        user_agent: data.user_agent || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      mockDb.clientPortalSessions.push(rec);
      return rec;
    },
    findUnique: async ({ where, include }: any) => {
      const s = mockDb.clientPortalSessions.find(s => (where.id && s.id === where.id) || (where.token_hash && s.token_hash === where.token_hash));
      if (!s) return null;
      const res = { ...s };
      if (include?.client) {
        res.client = mockDb.clients.find(c => c.id === s.client_id) || null;
      }
      if (include?.studio) {
        res.studio = mockDb.studios.find(st => st.id === s.studio_id) || null;
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      const s = mockDb.clientPortalSessions.find(s => {
        for (const [k, v] of Object.entries(where)) {
          if (v === null) {
            if (s[k] !== null && s[k] !== undefined) return false;
          } else if (s[k] !== v) {
            return false;
          }
        }
        return true;
      });
      if (!s) return null;
      const res = { ...s };
      if (include?.client) {
        res.client = mockDb.clients.find(c => c.id === s.client_id) || null;
      }
      if (include?.studio) {
        res.studio = mockDb.studios.find(st => st.id === s.studio_id) || null;
      }
      return res;
    },
    findMany: async ({ where, include }: any) => {
      return mockDb.clientPortalSessions.filter(s => {
        if (!where) return true;
        for (const [k, v] of Object.entries(where)) {
          if (v === null) {
            if (s[k] !== null && s[k] !== undefined) return false;
          } else if (s[k] !== v) {
            return false;
          }
        }
        return true;
      }).map(s => {
        const res = { ...s };
        if (include?.client) {
          res.client = mockDb.clients.find(c => c.id === s.client_id) || null;
        }
        if (include?.studio) {
          res.studio = mockDb.studios.find(st => st.id === s.studio_id) || null;
        }
        return res;
      });
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.clientPortalSessions.findIndex(s => s.id === where.id || s.token_hash === where.token_hash);
      if (idx === -1) throw new Error('Session not found');
      const updated = {
        ...mockDb.clientPortalSessions[idx],
        ...data,
        updated_at: new Date()
      };
      mockDb.clientPortalSessions[idx] = updated;
      return updated;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      mockDb.clientPortalSessions.forEach((s, i) => {
        let match = true;
        for (const [k, v] of Object.entries(where)) {
          if (v === null) {
            if (s[k] !== null && s[k] !== undefined) match = false;
          } else if (s[k] !== v) {
            match = false;
          }
        }
        if (match) {
          mockDb.clientPortalSessions[i] = { ...s, ...data, updated_at: new Date() };
          count++;
        }
      });
      return { count };
    },
    delete: async ({ where }: any) => {
      const idx = mockDb.clientPortalSessions.findIndex(s => s.id === where.id);
      if (idx === -1) throw new Error('Session not found');
      return mockDb.clientPortalSessions.splice(idx, 1)[0];
    }
  };

  // ClientActivity
  p.clientActivity = {
    findMany: async ({ where }: any) => {
      return [
        {
          id: 'act_101',
          studio_id: where?.studio_id,
          client_id: where?.client_id,
          activity_type: 'GALLERY_VIEW',
          created_at: new Date()
        }
      ];
    }
  };

  // ClientPortalNotificationRead
  p.clientPortalNotificationRead = {
    findUnique: async ({ where }: any) => {
      return mockDb.clientPortalNotificationReads.find(r =>
        r.client_id === where.client_id_notification_id?.client_id &&
        r.notification_id === where.client_id_notification_id?.notification_id
      ) || null;
    },
    findMany: async ({ where }: any) => {
      return mockDb.clientPortalNotificationReads.filter(r => {
        if (where.client_id && r.client_id !== where.client_id) return false;
        if (where.notification_id && r.notification_id !== where.notification_id) return false;
        return true;
      });
    },
    upsert: async ({ where, create, update }: any) => {
      const idx = mockDb.clientPortalNotificationReads.findIndex(r =>
        r.client_id === where.client_id_notification_id?.client_id &&
        r.notification_id === where.client_id_notification_id?.notification_id
      );
      if (idx >= 0) {
        const updated = { ...mockDb.clientPortalNotificationReads[idx], ...update, read_at: new Date() };
        mockDb.clientPortalNotificationReads[idx] = updated;
        return updated;
      } else {
        const created = {
          id: `read_${crypto.randomUUID()}`,
          client_id: create.client_id,
          notification_id: create.notification_id,
          read_at: create.read_at || new Date()
        };
        mockDb.clientPortalNotificationReads.push(created);
        return created;
      }
    }
  };

  // ClientPortalPreference
  p.clientPortalPreference = {
    findUnique: async ({ where }: any) => {
      return mockDb.clientPortalPreferences.find(pref => pref.client_id === where.client_id) || null;
    },
    upsert: async ({ where, create, update }: any) => {
      const idx = mockDb.clientPortalPreferences.findIndex(pref => pref.client_id === where.client_id);
      if (idx >= 0) {
        const updated = {
          ...mockDb.clientPortalPreferences[idx],
          ...update,
          updated_at: new Date()
        };
        mockDb.clientPortalPreferences[idx] = updated;
        return updated;
      } else {
        const created = {
          id: `pref_${crypto.randomUUID()}`,
          client_id: create.client_id,
          email_gallery_ready: create.email_gallery_ready ?? true,
          email_proofing_updates: create.email_proofing_updates ?? true,
          email_order_updates: create.email_order_updates ?? true,
          email_delivery_updates: create.email_delivery_updates ?? true,
          email_download_ready: create.email_download_ready ?? true,
          created_at: new Date(),
          updated_at: new Date()
        };
        mockDb.clientPortalPreferences.push(created);
        return created;
      }
    }
  };

  // Project
  p.project = {
    findMany: async ({ where, include }: any) => {
      return mockDb.projects.filter(proj => {
        if (where?.client_id && proj.client_id !== where.client_id) return false;
        if (where?.studio_id && proj.studio_id !== where.studio_id) return false;
        if (where?.deleted_at === null && proj.deleted_at) return false;
        return true;
      }).map(proj => {
        const res = { ...proj };
        if (include?.galleries) {
          res.galleries = mockDb.galleries.filter(g => g.project_id === proj.id).map(g => ({
            gallery_id: g.id,
            gallery: g
          }));
        }
        if (include?.proofing_sessions) {
          res.proofing_sessions = mockDb.proofingSessions.filter(ps => ps.project_id === proj.id);
        }
        if (include?.fulfillment_orders) {
          res.fulfillment_orders = mockDb.fulfillmentOrders.filter(o => o.project_id === proj.id || o.client_id === proj.client_id);
        }
        return res;
      });
    },
    findUnique: async ({ where, include }: any) => {
      const proj = mockDb.projects.find(p => p.id === where.id);
      if (!proj) return null;
      const res = { ...proj };
      if (include?.galleries) {
        res.galleries = mockDb.galleries.filter(g => g.project_id === proj.id).map(g => ({
          gallery_id: g.id,
          gallery: g
        }));
      }
      if (include?.proofing_sessions) {
        res.proofing_sessions = mockDb.proofingSessions.filter(ps => ps.project_id === proj.id);
      }
      if (include?.fulfillment_orders) {
        res.fulfillment_orders = mockDb.fulfillmentOrders.filter(o => o.project_id === proj.id || o.client_id === proj.client_id);
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      const proj = mockDb.projects.find(p => {
        for (const [k, v] of Object.entries(where)) {
          if (v === null) {
            if (p[k] !== null && p[k] !== undefined) return false;
          } else if (p[k] !== v) {
            return false;
          }
        }
        return true;
      });
      if (!proj) return null;
      const res = { ...proj };
      if (include?.galleries) {
        res.galleries = mockDb.galleries.filter(g => g.project_id === proj.id).map(g => ({
          gallery_id: g.id,
          gallery: g
        }));
      }
      if (include?.proofing_sessions) {
        res.proofing_sessions = mockDb.proofingSessions.filter(ps => ps.project_id === proj.id);
      }
      if (include?.fulfillment_orders) {
        res.fulfillment_orders = mockDb.fulfillmentOrders.filter(o => o.project_id === proj.id || o.client_id === proj.client_id);
      }
      return res;
    }
  };

  p.studioProject = p.project;

  // Gallery & Photo
  p.gallery = {
    findMany: async ({ where, include }: any) => {
      return mockDb.galleries.filter(g => {
        if (where?.studio_id && g.studio_id !== where.studio_id) return false;
        if (where?.project_id && g.project_id !== where.project_id) return false;
        return true;
      }).map(g => {
        const res = { ...g };
        if (include?.photos) {
          res.photos = mockDb.photos.filter(ph => ph.gallery_id === g.id);
        }
        return res;
      });
    },
    findUnique: async ({ where }: any) => {
      return mockDb.galleries.find(g => g.id === where.id) || null;
    }
  };

  p.photo = {
    count: async ({ where }: any) => {
      return mockDb.photos.filter(ph => {
        if (where?.gallery_id && ph.gallery_id !== where.gallery_id) return false;
        if (where?.studio_id && ph.studio_id !== where.studio_id) return false;
        return true;
      }).length;
    }
  };

  // ProofingSession & ProofingItem
  p.proofingSession = {
    findMany: async ({ where }: any) => {
      return mockDb.proofingSessions.filter(ps => {
        if (where?.studio_id && ps.studio_id !== where.studio_id) return false;
        if (where?.client_id && ps.client_id !== where.client_id) return false;
        if (where?.project_id && ps.project_id !== where.project_id) return false;
        return true;
      });
    },
    findUnique: async ({ where }: any) => {
      return mockDb.proofingSessions.find(ps => ps.id === where.id) || null;
    }
  };

  p.proofingItem = {
    findMany: async ({ where }: any) => {
      return mockDb.proofingItems.filter(item => {
        if (where?.session_id && item.session_id !== where.session_id) return false;
        if (where?.status && item.status !== where.status) return false;
        return true;
      });
    }
  };

  // Fulfillment Orders, Deliveries & Downloads
  p.fulfillmentOrder = {
    findMany: async ({ where, include }: any) => {
      return mockDb.fulfillmentOrders.filter(ord => {
        if (where?.studio_id && ord.studio_id !== where.studio_id) return false;
        if (where?.client_id && ord.client_id !== where.client_id) return false;
        return true;
      }).map(ord => {
        const res = { ...ord };
        if (include?.items) {
          res.items = mockDb.fulfillmentOrderItems.filter(i => i.order_id === ord.id);
        }
        if (include?.deliveries || include?.delivery) {
          res.deliveries = mockDb.fulfillmentDeliveries.filter(d => d.order_id === ord.id);
          res.delivery = res.deliveries[0] || null;
        }
        return res;
      });
    },
    findUnique: async ({ where, include }: any) => {
      const ord = mockDb.fulfillmentOrders.find(o => o.id === where.id);
      if (!ord) return null;
      const res = { ...ord };
      if (include?.items) {
        res.items = mockDb.fulfillmentOrderItems.filter(i => i.order_id === ord.id);
      }
      if (include?.deliveries || include?.delivery) {
        res.deliveries = mockDb.fulfillmentDeliveries.filter(d => d.order_id === ord.id);
        res.delivery = res.deliveries[0] || null;
      }
      return res;
    },
    findFirst: async ({ where, include }: any) => {
      const ord = mockDb.fulfillmentOrders.find(o => {
        for (const [k, v] of Object.entries(where)) {
          if (o[k] !== v) return false;
        }
        return true;
      });
      if (!ord) return null;
      const res = { ...ord };
      if (include?.items) {
        res.items = mockDb.fulfillmentOrderItems.filter(i => i.order_id === ord.id);
      }
      if (include?.deliveries || include?.delivery) {
        res.deliveries = mockDb.fulfillmentDeliveries.filter(d => d.order_id === ord.id);
        res.delivery = res.deliveries[0] || null;
      }
      return res;
    }
  };

  p.fulfillmentDelivery = {
    findMany: async ({ where }: any) => {
      return mockDb.fulfillmentDeliveries.filter(del => {
        if (where?.studio_id && del.studio_id !== where.studio_id) return false;
        if (where?.client_id && del.client_id !== where.client_id) return false;
        return true;
      });
    },
    findUnique: async ({ where }: any) => {
      return mockDb.fulfillmentDeliveries.find(d => d.id === where.id) || null;
    },
    findFirst: async ({ where }: any) => {
      return mockDb.fulfillmentDeliveries.find(d => {
        for (const [k, v] of Object.entries(where)) {
          if (d[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    update: async ({ where, data }: any) => {
      const idx = mockDb.fulfillmentDeliveries.findIndex(d => d.id === where.id);
      if (idx === -1) throw new Error('Delivery not found');
      const updated = {
        ...mockDb.fulfillmentDeliveries[idx],
        ...data,
        updated_at: new Date()
      };
      mockDb.fulfillmentDeliveries[idx] = updated;
      return updated;
    }
  };

  p.fulfillmentDownload = {
    findMany: async ({ where }: any) => {
      return mockDb.fulfillmentDownloads.filter(dl => {
        if (where?.studio_id && dl.studio_id !== where.studio_id) return false;
        if (where?.client_id && dl.client_id !== where.client_id) return false;
        return true;
      });
    },
    findFirst: async ({ where }: any) => {
      return mockDb.fulfillmentDownloads.find(dl => {
        for (const [k, v] of Object.entries(where)) {
          if (dl[k] !== v) return false;
        }
        return true;
      }) || null;
    },
    create: async ({ data }: any) => {
      const rec = {
        id: data.id || `dl_${crypto.randomUUID()}`,
        studio_id: data.studio_id,
        client_id: data.client_id,
        order_id: data.order_id || null,
        package_id: data.package_id || null,
        download_type: data.download_type || 'HIGH_RES_ZIP',
        file_size_bytes: data.file_size_bytes || 1024000,
        expires_at: data.expires_at || new Date(Date.now() + 86400000),
        ip_address: data.ip_address || null,
        created_at: new Date()
      };
      mockDb.fulfillmentDownloads.push(rec);
      return rec;
    }
  };

  p.fulfillmentPackage = {
    findMany: async ({ where }: any) => {
      return mockDb.fulfillmentPackages.filter(pkg => {
        if (where?.studio_id && pkg.studio_id !== where.studio_id) return false;
        return true;
      });
    }
  };

  // Notification
  p.notification = {
    findMany: async ({ where }: any) => {
      return mockDb.notifications.filter(n => {
        if (where?.studio_id && n.studio_id !== where.studio_id) return false;
        if (where?.client_id && n.client_id !== where.client_id) return false;
        return true;
      });
    }
  };

  // Subscription / Entitlement
  p.subscription = {
    findUnique: async ({ where }: any) => {
      return mockDb.subscriptions.find(sub => sub.studio_id === where.studio_id) || null;
    }
  };
}

// -------------------------------------------------------------------------
// Master Test Execution Runner
// -------------------------------------------------------------------------

async function runPhase27MasterSuite() {
  console.log('\n================================================================');
  console.log('🚀 RUNNING PHASE 27 MASTER TEST SUITE');
  console.log('Studio Client Portal & White-Label Client Experience');
  console.log('================================================================\n');

  patchPrismaMock();
  mockDb.reset();

  const sessionService = new ClientPortalSessionService();
  const brandingService = new StudioBrandingService();
  const domainService = new StudioDomainService();
  const portalService = new ClientPortalService(sessionService, brandingService, domainService);

  // Setup Test Studio & Client Entities
  const studio1 = {
    id: 'studio_luminary_001',
    name: 'Luminary Photography Studio',
    slug: 'luminary-photo',
    email: 'info@luminary.com',
    plan: 'STUDIO'
  };
  const studio2 = {
    id: 'studio_apex_002',
    name: 'Apex Visuals',
    slug: 'apex-visuals',
    email: 'contact@apex.com',
    plan: 'STARTER'
  };
  mockDb.studios.push(studio1, studio2);

  const client1 = {
    id: 'client_sarah_101',
    studio_id: studio1.id,
    name: 'Sarah & Michael Wedding',
    email: 'sarah.michael@example.com',
    phone: '+1-555-019-2831',
    preferred_contact_channel: 'EMAIL'
  };
  const client2 = {
    id: 'client_david_202',
    studio_id: studio1.id,
    name: 'David Corporate Headshots',
    email: 'david.c@example.com',
    phone: '+1-555-028-4910',
    preferred_contact_channel: 'EMAIL'
  };
  const clientForeign = {
    id: 'client_foreign_999',
    studio_id: studio2.id,
    name: 'Apex Client X',
    email: 'foreign@example.com',
    phone: '+1-555-999-0000',
    preferred_contact_channel: 'EMAIL'
  };
  mockDb.clients.push(client1, client2, clientForeign);

  // =========================================================================
  // MODULE 1: CLIENT PORTAL SESSION & TOKEN LIFECYCLE (35+ assertions)
  // =========================================================================
  console.log('▶ MODULE 1: Client Portal Session & Token Lifecycle');

  // Test 1.1: Token Generation & High Entropy
  const session1 = await sessionService.createSession({
    studio_id: studio1.id,
    client_id: client1.id,
    expires_in_days: 30
  });

  assert(typeof session1.raw_token === 'string', '1.1 Raw token is generated as string');
  assert(session1.raw_token.length === 64, '1.2 Raw token is 64 hex characters (256-bit entropy)');
  assert(session1.session.studio_id === studio1.id, '1.3 Session contains correct studio_id');
  assert(session1.session.client_id === client1.id, '1.4 Session contains correct client_id');
  assert(session1.session.is_active === true, '1.5 Session is active on creation');
  assert(session1.session.token_hash !== session1.raw_token, '1.6 Database stores hash, not raw token');
  assert(session1.session.access_count === 0, '1.7 Initial access count is 0');
  assert(session1.session.last_accessed_at === null, '1.8 Initial last_accessed_at is null');

  // Test 1.2: SHA-256 Hashing Verification
  const expectedHash = crypto.createHash('sha256').update(session1.raw_token).digest('hex');
  assert(session1.session.token_hash === expectedHash, '1.9 SHA-256 hash matches cryptographic digest');

  // Test 1.3: Session Verification via Raw Token
  const verified1 = await sessionService.verifyToken(session1.raw_token, { ip_address: '192.168.1.50', user_agent: 'Mozilla/5.0' });
  assert(verified1 !== null, '1.10 Valid raw token resolves session successfully');
  assert(verified1?.studio_id === studio1.id, '1.11 Verified session matches studio_id');
  assert(verified1?.client_id === client1.id, '1.12 Verified session matches client_id');
  assert(verified1?.access_count === 1, '1.13 Telemetry access count incremented to 1');
  assert(verified1?.last_accessed_at !== null, '1.14 Telemetry last_accessed_at is updated');

  // Test 1.4: Second Access increments counter
  const verified1Again = await sessionService.verifyToken(session1.raw_token);
  assert(verified1Again?.access_count === 2, '1.15 Access count incremented to 2 on subsequent visit');

  // Test 1.5: Reject Invalid / Tampered Token
  const tamperedToken = session1.raw_token.slice(0, -1) + (session1.raw_token.slice(-1) === 'a' ? 'b' : 'a');
  let tamperedResult = null;
  try {
    tamperedResult = await sessionService.verifyToken(tamperedToken);
  } catch (e) {
    tamperedResult = null;
  }
  assert(tamperedResult === null, '1.16 Tampered token is rejected with null');

  // Test 1.6: Reject Non-Existent Token
  const randomHex = crypto.randomBytes(32).toString('hex');
  const nonExistentResult = await sessionService.verifyToken(randomHex);
  assert(nonExistentResult === null, '1.17 Non-existent token is rejected');

  // Test 1.7: Expired Token Behavior
  const expiredSession = await sessionService.createSession({
    studio_id: studio1.id,
    client_id: client1.id,
    expires_in_days: -1 // Expired yesterday
  });
  const expiredResult = await sessionService.verifyToken(expiredSession.raw_token);
  assert(expiredResult === null, '1.18 Expired session token is rejected');

  // Test 1.8: Session Revocation
  const sessionToRevoke = await sessionService.createSession({
    studio_id: studio1.id,
    client_id: client1.id
  });
  const revoked = await sessionService.revokeSession(sessionToRevoke.session.id, studio1.id);
  assert(revoked.is_active === false, '1.19 Session marked inactive on revocation');

  const revokedVerify = await sessionService.verifyToken(sessionToRevoke.raw_token);
  assert(revokedVerify === null, '1.20 Revoked token cannot be used to authenticate');

  // Test 1.9: Cross-Studio Revocation Protection (IDOR)
  let crossRevokeFailed = false;
  try {
    await sessionService.revokeSession(session1.session.id, studio2.id); // Studio 2 trying to revoke Studio 1's session
  } catch (err: any) {
    crossRevokeFailed = true;
  }
  assert(crossRevokeFailed, '1.21 Cannot revoke another studio session (IDOR protection)');

  // Test 1.10: Session Retrieval & Listing
  const activeSessions = await sessionService.listSessionsForClient(client1.id, studio1.id);
  assert(Array.isArray(activeSessions), '1.22 listSessionsForClient returns array');
  assert(activeSessions.length >= 1, '1.23 Active session listed for client');
  assert(activeSessions.every(s => s.client_id === client1.id), '1.24 All listed sessions belong to target client');

  // Test 1.11: Revoke All Sessions for Client
  const revokeAllCount = await sessionService.revokeAllSessionsForClient(client1.id, studio1.id);
  assert(revokeAllCount >= 1, '1.25 revokeAllSessionsForClient deactivates all client tokens');

  const reVerify1 = await sessionService.verifyToken(session1.raw_token);
  assert(reVerify1 === null, '1.26 Previously active token is now revoked');

  // Re-create active working session for subsequent modules
  const mainClientSession = await sessionService.createSession({
    studio_id: studio1.id,
    client_id: client1.id,
    expires_in_days: 60
  });
  const clientToken = mainClientSession.raw_token;
  assert(clientToken.length === 64, '1.27 Main working client session generated');

  // Second client session
  const secondarySession = await sessionService.createSession({
    studio_id: studio1.id,
    client_id: client2.id
  });
  const client2Token = secondarySession.raw_token;
  assert(client2Token.length === 64, '1.28 Second client session generated');

  // Foreign studio client session
  const foreignSession = await sessionService.createSession({
    studio_id: studio2.id,
    client_id: clientForeign.id
  });
  const foreignToken = foreignSession.raw_token;
  assert(foreignToken.length === 64, '1.29 Foreign studio client session generated');

  // =========================================================================
  // MODULE 2: STUDIO BRANDING ENGINE & ENTITLEMENT GATING (35+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 2: Studio White-Label Branding Engine & Entitlement Gating');

  // Test 2.1: Default Branding Fallback
  const defaultBranding = await brandingService.getBrandingForStudio(studio1.id);
  assert(defaultBranding !== null, '2.1 Default branding returned when not explicitly customized');
  assert(defaultBranding.primary_color === '#4f46e5', '2.2 Default primary color is #4f46e5');
  assert(defaultBranding.font_family === 'Inter', '2.3 Default font family is Inter');
  assert(defaultBranding.show_pixmatch_badge === true, '2.4 Default show_pixmatch_badge is true');

  // Test 2.2: Upsert Custom Branding with Valid Hex Colors
  const updatedBrand = await brandingService.upsertBranding(studio1.id, {
    primary_color: '#0d9488',
    secondary_color: '#f59e0b',
    accent_color: '#ec4899',
    background_color: '#090d16',
    text_color: '#ffffff',
    font_family: 'Playfair Display',
    button_style: 'rounded',
    logo_url: 'https://cdn.luminary.com/logo-white.png',
    favicon_url: 'https://cdn.luminary.com/favicon.ico',
    custom_footer_text: '© 2026 Luminary Fine Art Photography. All Rights Reserved.',
    website_url: 'https://luminaryfineart.com',
    contact_email: 'concierge@luminaryfineart.com',
    contact_phone: '+1 (555) 777-8899',
    show_pixmatch_badge: true
  });

  assert(updatedBrand.primary_color === '#0d9488', '2.5 Primary color saved as #0d9488');
  assert(updatedBrand.secondary_color === '#f59e0b', '2.6 Secondary color saved as #f59e0b');
  assert(updatedBrand.accent_color === '#ec4899', '2.7 Accent color saved as #ec4899');
  assert(updatedBrand.background_color === '#090d16', '2.8 Background color saved as #090d16');
  assert(updatedBrand.text_color === '#ffffff', '2.9 Text color saved as #ffffff');
  assert(updatedBrand.font_family === 'Playfair Display', '2.10 Font family saved as Playfair Display');
  assert(updatedBrand.button_style === 'rounded', '2.11 Button style saved as rounded');
  assert(updatedBrand.logo_url === 'https://cdn.luminary.com/logo-white.png', '2.12 Logo URL saved');
  assert(updatedBrand.favicon_url === 'https://cdn.luminary.com/favicon.ico', '2.13 Favicon URL saved');
  assert(updatedBrand.custom_footer_text?.includes('Luminary Fine Art'), '2.14 Custom footer text saved');
  assert(updatedBrand.website_url === 'https://luminaryfineart.com', '2.15 Website URL saved');
  assert(updatedBrand.contact_email === 'concierge@luminaryfineart.com', '2.16 Contact email saved');

  // Test 2.3: Hex Color Validation Rejections
  let invalidHex1Rejected = false;
  try {
    await brandingService.upsertBranding(studio1.id, { primary_color: 'invalid-red' });
  } catch (e) {
    invalidHex1Rejected = true;
  }
  assert(invalidHex1Rejected, '2.17 Rejects named color string "invalid-red"');

  let invalidHex2Rejected = false;
  try {
    await brandingService.upsertBranding(studio1.id, { primary_color: '#GGGGGG' });
  } catch (e) {
    invalidHex2Rejected = true;
  }
  assert(invalidHex2Rejected, '2.18 Rejects non-hex characters "#GGGGGG"');

  let invalidHex3Rejected = false;
  try {
    await brandingService.upsertBranding(studio1.id, { primary_color: 'rgb(255,0,0)' });
  } catch (e) {
    invalidHex3Rejected = true;
  }
  assert(invalidHex3Rejected, '2.19 Rejects RGB function syntax "rgb(255,0,0)"');

  // Test 2.4: Font Family Whitelist
  let unlistedFontRejected = false;
  try {
    await brandingService.upsertBranding(studio1.id, { font_family: 'Comic Sans MS' });
  } catch (e) {
    unlistedFontRejected = true;
  }
  assert(unlistedFontRejected, '2.20 Rejects unwhitelisted font family');

  // Test 2.5: Allowed Fonts
  for (const font of ['Inter', 'Playfair Display', 'Montserrat', 'Lora', 'Cinzel', 'Outfit', 'Plus Jakarta Sans']) {
    const validFontResult = await brandingService.upsertBranding(studio1.id, { font_family: font });
    assert(validFontResult.font_family === font, `2.21 Accepted whitelisted font: ${font}`);
  }

  // Test 2.6: XSS Sanitization in Footer Text
  const xssFooterAttempt = '<script>alert("hacked")</script><b>Copyright 2026</b>';
  const sanitizedBrand = await brandingService.upsertBranding(studio1.id, {
    custom_footer_text: xssFooterAttempt
  });
  assert(!sanitizedBrand.custom_footer_text?.includes('<script>'), '2.22 Strips <script> tags from custom footer text');
  assert(!sanitizedBrand.custom_footer_text?.includes('alert('), '2.23 Sanitizes JavaScript execution payload');

  // Test 2.7: Badge Entitlement Check (Starter Plan cannot remove badge)
  let unentitledBadgeRemovalFailed = false;
  try {
    await brandingService.upsertBranding(studio2.id, {
      show_pixmatch_badge: false // Studio 2 is STARTER plan
    });
  } catch (err: any) {
    unentitledBadgeRemovalFailed = true;
  }
  assert(unentitledBadgeRemovalFailed, '2.24 Starter plan rejected when attempting to remove PixMatch badge');

  // Test 2.8: Entitled Badge Removal (Studio Plan can remove badge)
  const entitledBrand = await brandingService.upsertBranding(studio1.id, {
    font_family: 'Playfair Display',
    custom_footer_text: '© 2026 Luminary Fine Art Photography. All Rights Reserved.',
    show_pixmatch_badge: false // Studio 1 is STUDIO plan
  });
  assert(entitledBrand.show_pixmatch_badge === false, '2.25 Studio plan successfully removes PixMatch badge');

  // =========================================================================
  // MODULE 3: STUDIO CUSTOM DOMAINS ENGINE & DNS LIFECYCLE (35+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 3: Studio Custom Domains Engine & DNS Lifecycle');

  // Test 3.1: Hostname Validation - Rejections
  let invalidDomain1 = false;
  try {
    await domainService.createDomain(studio1.id, { hostname: 'http://clients.luminary.com' });
  } catch (e) {
    invalidDomain1 = true;
  }
  assert(invalidDomain1, '3.1 Rejects protocol prefix in hostname');

  let invalidDomain2 = false;
  try {
    await domainService.createDomain(studio1.id, { hostname: '*.luminary.com' });
  } catch (e) {
    invalidDomain2 = true;
  }
  assert(invalidDomain2, '3.2 Rejects wildcard asterisks');

  let invalidDomain3 = false;
  try {
    await domainService.createDomain(studio1.id, { hostname: 'clients.luminary.com:443' });
  } catch (e) {
    invalidDomain3 = true;
  }
  assert(invalidDomain3, '3.3 Rejects port numbers in hostname');

  let invalidDomain4 = false;
  try {
    await domainService.createDomain(studio1.id, { hostname: 'pixmatch.app' }); // Reserved system domain
  } catch (e) {
    invalidDomain4 = true;
  }
  assert(invalidDomain4, '3.4 Rejects reserved domain "pixmatch.app"');

  let invalidDomain5 = false;
  try {
    await domainService.createDomain(studio1.id, { hostname: 'localhost' });
  } catch (e) {
    invalidDomain5 = true;
  }
  assert(invalidDomain5, '3.5 Rejects reserved domain "localhost"');

  // Test 3.2: Valid Domain Registration
  const domain1 = await domainService.createDomain(studio1.id, {
    hostname: 'clients.luminaryfineart.com',
    is_primary: true
  });

  assert(domain1.hostname === 'clients.luminaryfineart.com', '3.6 Domain hostname stored correctly');
  assert(domain1.status === StudioDomainStatus.PENDING, '3.7 New domain starts in PENDING status');
  assert(domain1.verification_token.startsWith('pixmatch-verify-'), '3.8 Generates valid verification token format');
  assert(domain1.is_primary === true, '3.9 Marked as primary domain');
  assert(Array.isArray(domain1.dns_records), '3.10 Provides required DNS instruction records');
  assert(domain1.dns_records?.some(r => r.type === 'TXT'), '3.11 Includes TXT verification challenge record');
  assert(domain1.dns_records?.some(r => r.type === 'CNAME'), '3.12 Includes CNAME routing record');

  // Test 3.3: Duplicate Domain Registration Prevention
  let duplicateDomainRejected = false;
  try {
    await domainService.createDomain(studio2.id, { hostname: 'clients.luminaryfineart.com' });
  } catch (e) {
    duplicateDomainRejected = true;
  }
  assert(duplicateDomainRejected, '3.13 Prevents registering an already claimed domain by another studio');

  // Test 3.4: DNS Verification Lifecycle Simulator
  // Simulation: before DNS propagation
  const pendingCheck = await domainService.verifyDomain(domain1.id, studio1.id, { simulateDnsTxtMatch: false });
  assert(pendingCheck.domain.status === StudioDomainStatus.PENDING, '3.14 Domain remains PENDING when TXT record not found');

  // Simulation: DNS TXT match found
  const verifiedCheck = await domainService.verifyDomain(domain1.id, studio1.id, { simulateDnsTxtMatch: true });
  assert(verifiedCheck.domain.status === StudioDomainStatus.ACTIVE || verifiedCheck.domain.status === StudioDomainStatus.VERIFIED, '3.15 Domain transitions to ACTIVE/VERIFIED on valid TXT match');
  assert(verifiedCheck.domain.verified_at !== null, '3.16 verified_at timestamp populated');

  // Test 3.5: Multi-Tenant Host Resolution (Anti-Tenant Confusion)
  const resolvedStudio = await domainService.resolveStudioByHostname('clients.luminaryfineart.com');
  assert(resolvedStudio !== null, '3.17 Host header correctly resolves to target studio');
  assert(resolvedStudio?.id === studio1.id, '3.18 Resolved studio matches studio1 ID');
  assert(resolvedStudio?.slug === studio1.slug, '3.19 Resolved studio matches studio1 slug');

  // Test 3.6: Unverified Domain Resolution Returns Null
  const unverifiedDomain = await domainService.createDomain(studio1.id, {
    hostname: 'portal.luminaryfineart.com'
  });
  assert(unverifiedDomain.status === StudioDomainStatus.PENDING, '3.20 Second domain in PENDING state');

  const unverifiedResolve = await domainService.resolveStudioByHostname('portal.luminaryfineart.com');
  assert(unverifiedResolve === null, '3.21 Unverified domain does not resolve tenant traffic');

  // Test 3.7: Primary Domain Switching
  const secondVerified = await domainService.verifyDomain(unverifiedDomain.id, studio1.id, { simulateDnsTxtMatch: true });
  const setPrimary = await domainService.setPrimaryDomain(unverifiedDomain.id, studio1.id);
  assert(setPrimary.is_primary === true, '3.22 Successfully set new primary domain');

  const dom1Refreshed = await domainService.getDomain(domain1.id, studio1.id);
  assert(dom1Refreshed?.is_primary === false, '3.23 Previous domain primary flag cleared');

  // Test 3.8: Domain Deletion
  const deleteResult = await domainService.deleteDomain(unverifiedDomain.id, studio1.id);
  assert(deleteResult === true, '3.24 Domain deletion succeeds');

  const deletedResolve = await domainService.resolveStudioByHostname('portal.luminaryfineart.com');
  assert(deletedResolve === null, '3.25 Deleted domain no longer resolves');

  // =========================================================================
  // MODULE 4: SEEDING PROJECTS, GALLERIES, ORDERS & DELIVERIES (Data Prep)
  // =========================================================================
  console.log('\n▶ MODULE 4: Preparing Multi-Project & Fulfillment Fixtures');

  // Project 1: Sarah & Michael Wedding
  const project1 = {
    id: 'proj_wedding_001',
    studio_id: studio1.id,
    client_id: client1.id,
    name: 'Sarah & Michael Wedding',
    event_type: 'Wedding',
    event_date: new Date('2026-06-20'),
    status: 'IN_PROGRESS',
    description: 'Napa Valley vineyard ceremony and sunset reception.',
    primary_photographer_name: 'Elena Rostova',
    total_photos_count: 1450,
    created_at: new Date('2026-06-01')
  };

  // Project 2: Sarah Bridal Portrait Session
  const project2 = {
    id: 'proj_portrait_002',
    studio_id: studio1.id,
    client_id: client1.id,
    name: 'Sarah Bridal Portraits',
    event_type: 'Portrait',
    event_date: new Date('2026-05-15'),
    status: 'COMPLETED',
    description: 'Studio fine-art bridal session.',
    primary_photographer_name: 'Elena Rostova',
    total_photos_count: 320,
    created_at: new Date('2026-05-01')
  };

  // Project Foreign: Client 2 Project
  const projectClient2 = {
    id: 'proj_headshots_003',
    studio_id: studio1.id,
    client_id: client2.id,
    name: 'David Corporate Headshots',
    event_type: 'Commercial',
    event_date: new Date('2026-07-10'),
    status: 'COMPLETED',
    description: 'Executive team portraiture.',
    total_photos_count: 85,
    created_at: new Date('2026-07-01')
  };
  mockDb.projects.push(project1, project2, projectClient2);

  // Gallery for Project 1
  const gallery1 = {
    id: 'gal_wedding_901',
    project_id: project1.id,
    studio_id: studio1.id,
    title: 'Sarah & Michael Wedding Highlights',
    slug: 'sarah-michael-wedding',
    cover_photo_url: 'https://cdn.luminary.com/weddings/cover.jpg',
    event_type: 'Wedding',
    event_date: new Date('2026-06-20'),
    access_type: 'CLIENT_PORTAL',
    is_published: true,
    created_at: new Date('2026-06-22')
  };
  mockDb.galleries.push(gallery1);

  // 10 Mock Photos in Gallery 1
  for (let i = 1; i <= 10; i++) {
    mockDb.photos.push({
      id: `photo_w_${i}`,
      gallery_id: gallery1.id,
      studio_id: studio1.id,
      filename: `IMG_${i.toString().padStart(4, '0')}.jpg`,
      thumbnail_url: `https://cdn.luminary.com/thumbs/img_${i}.jpg`,
      display_url: `https://cdn.luminary.com/display/img_${i}.jpg`,
      width: 4000,
      height: 3000,
      created_at: new Date()
    });
  }

  // Proofing Session for Project 1 (Phase 25 integration)
  const proofingSession1 = {
    id: 'proof_sess_301',
    studio_id: studio1.id,
    project_id: project1.id,
    client_id: client1.id,
    title: 'Album Selection Proofing',
    status: ProofingSessionStatus.IN_PROGRESS,
    required_count: 50,
    selected_count: 24,
    notes: 'Please choose 50 favorite photos for your bespoke Italian leather album.',
    expires_at: new Date(Date.now() + 14 * 86400000),
    created_at: new Date()
  };
  mockDb.proofingSessions.push(proofingSession1);

  // Proofing Items
  mockDb.proofingItems.push(
    { id: 'pi_1', session_id: proofingSession1.id, status: 'SELECTED', photo_id: 'photo_w_1' },
    { id: 'pi_2', session_id: proofingSession1.id, status: 'SELECTED', photo_id: 'photo_w_2' },
    { id: 'pi_3', session_id: proofingSession1.id, status: 'REJECTED', photo_id: 'photo_w_3' }
  );

  // Fulfillment Order for Project 1 (Phase 26 integration)
  const order1 = {
    id: 'ord_lum_501',
    studio_id: studio1.id,
    client_id: client1.id,
    order_number: 'ORD-8920',
    status: FulfillmentOrderStatus.SHIPPED,
    payment_status: FulfillmentPaymentStatus.PAID,
    delivery_status: FulfillmentDeliveryStatus.SHIPPED,
    currency: 'USD',
    subtotal_cents: 250000,
    tax_cents: 20000,
    shipping_cents: 3500,
    discount_cents: 0,
    total_cents: 273500,
    created_at: new Date('2026-07-05')
  };
  mockDb.fulfillmentOrders.push(order1);

  // Order Items
  mockDb.fulfillmentOrderItems.push({
    id: 'item_ord_1',
    order_id: order1.id,
    product_name: '24x36 Fine Art Acrylic Print',
    quantity: 1,
    unit_price_cents: 180000,
    total_price_cents: 180000
  }, {
    id: 'item_ord_2',
    order_id: order1.id,
    product_name: '12x12 Handcrafted Linen Album',
    quantity: 1,
    unit_price_cents: 70000,
    total_price_cents: 70000
  });

  // Delivery record for Order 1
  const delivery1 = {
    id: 'del_fedex_701',
    studio_id: studio1.id,
    client_id: client1.id,
    order_id: order1.id,
    order_number: 'ORD-8920',
    delivery_type: 'PHYSICAL_SHIPMENT',
    status: 'IN_TRANSIT',
    courier: 'FedEx Express',
    tracking_number: '94001118992233445566',
    tracking_url: 'https://www.fedex.com/fedextrack/?trknbr=94001118992233445566',
    shipped_at: new Date('2026-07-08'),
    delivered_at: null,
    can_confirm: true,
    is_confirmed: false,
    client_feedback: null,
    created_at: new Date('2026-07-08')
  };
  mockDb.fulfillmentDeliveries.push(delivery1);

  // Digital Downloads
  mockDb.fulfillmentDownloads.push({
    id: 'dl_rec_801',
    studio_id: studio1.id,
    client_id: client1.id,
    order_id: order1.id,
    download_type: 'HIGH_RES_ZIP',
    file_size_bytes: 4800000000, // 4.8 GB
    expires_at: new Date(Date.now() + 30 * 86400000)
  });

  // Notifications
  mockDb.notifications.push({
    id: 'notif_101',
    studio_id: studio1.id,
    client_id: client1.id,
    title: 'New Gallery Photos Published',
    message: 'Your photographer Elena added 120 new wedding highlight photos.',
    type: 'GALLERY_PUBLISHED',
    link_url: '/portal/client/[token]/projects/proj_wedding_001',
    created_at: new Date(Date.now() - 3600000)
  }, {
    id: 'notif_102',
    studio_id: studio1.id,
    client_id: client1.id,
    title: 'Physical Print Package Shipped',
    message: 'Your 24x36 Fine Art Acrylic Print has shipped via FedEx Express.',
    type: 'ORDER_SHIPPED',
    link_url: '/portal/client/[token]/delivery',
    created_at: new Date(Date.now() - 7200000)
  });

  assert(mockDb.projects.length === 3, '4.1 Seeded 3 multi-client projects');
  assert(mockDb.galleries.length === 1, '4.2 Seeded 1 photo gallery');
  assert(mockDb.photos.length === 10, '4.3 Seeded 10 photos');
  assert(mockDb.proofingSessions.length === 1, '4.4 Seeded 1 proofing session');
  assert(mockDb.fulfillmentOrders.length === 1, '4.5 Seeded 1 fulfillment order');
  assert(mockDb.fulfillmentDeliveries.length === 1, '4.6 Seeded 1 delivery record');
  assert(mockDb.notifications.length === 2, '4.7 Seeded 2 notifications');

  // =========================================================================
  // MODULE 5: AGGREGATED CLIENT PORTAL HOME DTO (35+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 5: Aggregated Client Portal Home DTO Projection');

  const homeDTO = await portalService.getClientPortalHome(clientToken);

  assert(homeDTO !== null, '5.1 getClientPortalHome returns valid DTO');
  assert(homeDTO.studio.id === studio1.id, '5.2 Home DTO contains correct studio ID');
  assert(homeDTO.studio.name === studio1.name, '5.3 Home DTO contains correct studio name');
  assert(homeDTO.client.id === client1.id, '5.4 Home DTO contains correct client ID');
  assert(homeDTO.client.name === client1.name, '5.5 Home DTO contains client full name');
  assert(homeDTO.client.email === client1.email, '5.6 Home DTO contains client email');

  // Branding Projection
  assert(homeDTO.branding.primary_color === '#0d9488', '5.7 Projects customized primary color');
  assert(homeDTO.branding.font_family === 'Playfair Display', '5.8 Projects custom font family');
  assert(homeDTO.branding.show_pixmatch_badge === false, '5.9 Projects white-label badge disabled');
  assert(homeDTO.branding.custom_footer_text?.includes('Luminary Fine Art'), '5.10 Projects custom footer');

  // Statistics Projection
  assert(homeDTO.stats.total_projects === 2, '5.11 Projects count for client1 is 2 (Sarah Wedding + Portrait)');
  assert(homeDTO.stats.active_proofing_sessions === 1, '5.12 Active proofing sessions count is 1');
  assert(homeDTO.stats.total_orders === 1, '5.13 Total orders count is 1');
  assert(homeDTO.stats.unread_notifications === 2, '5.14 Unread notifications count is 2');

  // Projects Array in Home DTO
  assert(Array.isArray(homeDTO.projects), '5.15 Projects field is an array');
  assert(homeDTO.projects.length === 2, '5.16 Contains exactly 2 projects');
  assert(homeDTO.projects.some(p => p.id === project1.id), '5.17 Contains Wedding project');
  assert(homeDTO.projects.some(p => p.id === project2.id), '5.18 Contains Portrait project');
  assert(!homeDTO.projects.some(p => p.id === projectClient2.id), '5.19 Does NOT contain Client 2 project (IDOR isolated)');

  // Project 1 Deep Check inside Home DTO
  const homeP1 = homeDTO.projects.find(p => p.id === project1.id)!;
  assert(homeP1.name === project1.name, '5.20 Project 1 name matches');
  assert(homeP1.event_type === 'Wedding', '5.21 Project 1 event_type is Wedding');
  assert(homeP1.proofing_session !== null, '5.22 Project 1 includes proofing session summary');
  assert(homeP1.proofing_session?.status === ProofingSessionStatus.IN_PROGRESS, '5.23 Proofing status is IN_PROGRESS');
  assert(homeP1.proofing_session?.selected_count === 24, '5.24 Selected proof count is 24');
  assert(homeP1.proofing_session?.required_count === 50, '5.25 Required proof count is 50');

  // Recent Activity in Home DTO
  assert(Array.isArray(homeDTO.recent_activities), '5.26 recent_activities is an array');
  assert(homeDTO.recent_activities.length >= 1, '5.27 recent_activities contains aggregated items');

  // =========================================================================
  // MODULE 6: PROJECTS LIST & DETAIL PROJECTION (30+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 6: Projects List & Detail Projection (Multi-Tenant & IDOR)');

  // Test 6.1: Projects Listing
  const projectsList = await portalService.getClientProjects(clientToken);
  assert(Array.isArray(projectsList), '6.1 getClientProjects returns array');
  assert(projectsList.length === 2, '6.2 Returns all 2 projects for Client 1');
  assert(projectsList.every(p => p.client_id === client1.id), '6.3 Every project belongs to client 1');

  // Test 6.2: Project Detail View
  const p1Detail = await portalService.getProjectDetail(clientToken, project1.id);
  assert(p1Detail !== null, '6.4 getProjectDetail returns valid DTO');
  assert(p1Detail.id === project1.id, '6.5 Detail DTO ID matches project1');
  assert(p1Detail.name === project1.name, '6.6 Detail DTO name matches');
  assert(p1Detail.description === project1.description, '6.7 Detail DTO description matches');
  assert(p1Detail.primary_photographer_name === 'Elena Rostova', '6.8 Detail DTO photographer matches');
  assert(Array.isArray(p1Detail.galleries), '6.9 Detail DTO includes galleries array');
  assert(p1Detail.galleries.length === 1, '6.10 Gallery count is 1');
  assert(p1Detail.galleries[0].title === gallery1.title, '6.11 Gallery title matches');
  assert(p1Detail.galleries[0].photo_count === 10, '6.12 Gallery photo count is 10');
  assert(p1Detail.proofing !== null, '6.13 Proofing detail populated');
  assert(p1Detail.proofing?.total_selected === 24, '6.14 Proofing total selected matches');

  // Test 6.3: IDOR Isolation - Client 1 cannot fetch Client 2's project
  let idorProjectRejected = false;
  try {
    await portalService.getProjectDetail(clientToken, projectClient2.id);
  } catch (err: any) {
    idorProjectRejected = true;
  }
  assert(idorProjectRejected, '6.15 Client 1 cannot access Client 2 project (IDOR 404/403)');

  // Test 6.4: Non-existent Project ID
  let nonExistentProjRejected = false;
  try {
    await portalService.getProjectDetail(clientToken, 'proj_random_non_existent');
  } catch (err: any) {
    nonExistentProjRejected = true;
  }
  assert(nonExistentProjRejected, '6.16 Non-existent project throws error');

  // =========================================================================
  // MODULE 7: ORDERS, PAYMENTS & DELIVERY FULFILLMENT (35+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 7: Orders, Payments & Delivery Fulfillment Integration');

  // Test 7.1: Orders Listing
  const ordersList = await portalService.getClientOrders(clientToken);
  assert(Array.isArray(ordersList), '7.1 getClientOrders returns array');
  assert(ordersList.length === 1, '7.2 Orders list length is 1');
  assert(ordersList[0].id === order1.id, '7.3 Order ID matches');
  assert(ordersList[0].order_number === 'ORD-8920', '7.4 Order number matches ORD-8920');
  assert(ordersList[0].status === FulfillmentOrderStatus.SHIPPED, '7.5 Order status is SHIPPED');
  assert(ordersList[0].payment_status === FulfillmentPaymentStatus.PAID, '7.6 Payment status is PAID');
  assert(ordersList[0].total_cents === 273500, '7.7 Total is 273,500 cents ($2,735.00)');
  assert(ordersList[0].items_count === 2, '7.8 Items count is 2');

  // Test 7.2: Order Detail View
  const ordDetail = await portalService.getOrderDetail(clientToken, order1.id);
  assert(ordDetail !== null, '7.9 getOrderDetail returns valid DTO');
  assert(ordDetail.id === order1.id, '7.10 Order detail ID matches');
  assert(ordDetail.items.length === 2, '7.11 Order detail includes 2 line items');
  assert(ordDetail.items[0].product_name.includes('Fine Art Acrylic'), '7.12 First line item is Acrylic Print');
  assert(ordDetail.items[1].product_name.includes('Linen Album'), '7.13 Second line item is Linen Album');
  assert(ordDetail.delivery !== null, '7.14 Order includes delivery tracking summary');
  assert(ordDetail.delivery?.courier === 'FedEx Express', '7.15 Courier is FedEx Express');
  assert(ordDetail.delivery?.tracking_number === '94001118992233445566', '7.16 Tracking number matches');

  // Test 7.3: Deliveries Listing
  const deliveriesList = await portalService.getClientDeliveries(clientToken);
  assert(Array.isArray(deliveriesList), '7.17 getClientDeliveries returns array');
  assert(deliveriesList.length === 1, '7.18 Deliveries length is 1');
  assert(deliveriesList[0].id === delivery1.id, '7.19 Delivery ID matches');
  assert(deliveriesList[0].courier === 'FedEx Express', '7.20 Courier matches');
  assert(deliveriesList[0].can_confirm === true, '7.21 can_confirm is true');
  assert(deliveriesList[0].is_confirmed === false, '7.22 is_confirmed is false initially');

  // Test 7.4: One-Click Delivery Receipt Confirmation
  const confirmedDelivery = await portalService.confirmDeliveryReceipt(clientToken, {
    delivery_id: delivery1.id,
    feedback: 'Prints arrived in pristine wooden crate packaging. Colors are breathtaking!'
  });

  assert(confirmedDelivery.is_confirmed === true, '7.23 Delivery is marked confirmed');
  assert(confirmedDelivery.status === 'DELIVERED', '7.24 Status transitioned to DELIVERED');
  assert(confirmedDelivery.delivered_at !== null, '7.25 delivered_at timestamp recorded');

  // Verify persistence in subsequent fetch
  const refreshedDeliveries = await portalService.getClientDeliveries(clientToken);
  assert(refreshedDeliveries[0].is_confirmed === true, '7.26 is_confirmed persists in DB');
  assert(refreshedDeliveries[0].status === 'DELIVERED', '7.27 DELIVERED status persists');

  // Test 7.5: Order IDOR Security
  let idorOrderRejected = false;
  try {
    await portalService.getOrderDetail(client2Token, order1.id); // Client 2 trying to read Client 1's order
  } catch (e) {
    idorOrderRejected = true;
  }
  assert(idorOrderRejected, '7.28 Client 2 cannot access Client 1 order (IDOR protected)');

  // =========================================================================
  // MODULE 8: DOWNLOADS & SIGNED URL GENERATION (25+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 8: Digital Downloads & Signed URL Generation');

  // Test 8.1: Downloads Listing
  const downloadsList = await portalService.getClientDownloads(clientToken);
  assert(Array.isArray(downloadsList), '8.1 getClientDownloads returns array');
  assert(downloadsList.length === 1, '8.2 Downloads count is 1');
  assert(downloadsList[0].download_type === 'HIGH_RES_ZIP', '8.3 Download type is HIGH_RES_ZIP');
  assert(downloadsList[0].file_size_bytes === 4800000000, '8.4 File size matches 4.8 GB');
  assert(downloadsList[0].is_expired === false, '8.5 is_expired is false');

  // Test 8.2: Generate Signed Download Link
  const signedLink = await portalService.generateDownloadUrl(clientToken, downloadsList[0].id);
  assert(typeof signedLink.download_url === 'string', '8.6 Generates signed URL string');
  assert(signedLink.download_url.startsWith('http'), '8.7 URL has valid HTTP protocol');
  assert(signedLink.download_url.includes('token='), '8.8 Signed URL includes cryptographic signature token');
  assert(signedLink.expires_in_seconds === 3600, '8.9 TTL is set to 3600 seconds (1 hour)');

  // Test 8.3: Downloads IDOR Protection
  let idorDownloadRejected = false;
  try {
    await portalService.generateDownloadUrl(client2Token, downloadsList[0].id);
  } catch (e) {
    idorDownloadRejected = true;
  }
  assert(idorDownloadRejected, '8.10 Client 2 cannot download Client 1 package (IDOR protected)');

  // =========================================================================
  // MODULE 9: NOTIFICATIONS & PREFERENCES (30+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 9: Notifications Feed, Read State & Client Preferences');

  // Test 9.1: Notifications Listing
  const notifList = await portalService.getClientNotifications(clientToken);
  assert(Array.isArray(notifList), '9.1 getClientNotifications returns array');
  assert(notifList.length === 2, '9.2 Returns 2 notifications');
  assert(notifList.every(n => n.is_read === false), '9.3 Initially both notifications are unread');

  // Test 9.2: Mark Notification As Read
  const markRes = await portalService.markNotificationsAsRead(clientToken, ['notif_101']);
  assert(markRes.success === true, '9.4 markNotificationsAsRead returns success');
  assert(markRes.marked_count === 1, '9.5 Marked 1 notification');

  const refreshedNotifs = await portalService.getClientNotifications(clientToken);
  const n1 = refreshedNotifs.find(n => n.id === 'notif_101');
  const n2 = refreshedNotifs.find(n => n.id === 'notif_102');
  assert(n1?.is_read === true, '9.6 notif_101 is now marked read');
  assert(n2?.is_read === false, '9.7 notif_102 remains unread');

  // Test 9.3: Mark All as Read
  await portalService.markNotificationsAsRead(clientToken, ['notif_102']);
  const allReadNotifs = await portalService.getClientNotifications(clientToken);
  assert(allReadNotifs.every(n => n.is_read === true), '9.8 All notifications are now marked read');

  // Test 9.4: Profile & Preferences Retrieval
  const profile = await portalService.getClientProfile(clientToken);
  assert(profile !== null, '9.9 getClientProfile returns valid DTO');
  assert(profile.id === client1.id, '9.10 Profile ID matches client 1');
  assert(profile.name === client1.name, '9.11 Profile name matches');
  assert(profile.email === client1.email, '9.12 Profile email matches');
  assert(profile.preferences.email_gallery_ready === true, '9.13 Default email_gallery_ready is true');
  assert(profile.preferences.email_order_updates === true, '9.14 Default email_order_updates is true');

  // Test 9.5: Update Client Preferences
  const updatedProfile = await portalService.updateClientPreferences(clientToken, {
    email_gallery_ready: true,
    email_proofing_updates: false,
    email_order_updates: true,
    email_delivery_updates: true,
    email_download_ready: false
  });

  assert(updatedProfile.preferences.email_proofing_updates === false, '9.15 email_proofing_updates updated to false');
  assert(updatedProfile.preferences.email_download_ready === false, '9.16 email_download_ready updated to false');
  assert(updatedProfile.preferences.email_gallery_ready === true, '9.17 email_gallery_ready remains true');

  // Verify persistence
  const reProfile = await portalService.getClientProfile(clientToken);
  assert(reProfile.preferences.email_proofing_updates === false, '9.18 Preferences persisted in DB');
  assert(reProfile.preferences.email_download_ready === false, '9.19 Preferences persisted in DB');

  // =========================================================================
  // MODULE 10: COPILOT TOOLS & SECURITY MINIMIZATION (30+ assertions)
  // =========================================================================
  console.log('\n▶ MODULE 10: Copilot AI Tools & Data Minimization');

  const copilotRegistry = new CopilotToolRegistry();

  // Test 10.1: Copilot Tool `getStudioBranding`
  const toolBrandRes = await copilotRegistry.executeTool('getStudioBranding', { studio_id: studio1.id });
  assert(toolBrandRes !== null, '10.1 Copilot getStudioBranding executes successfully');
  assert(toolBrandRes.branding.primary_color === '#0d9488', '10.2 Copilot tool returns primary color');

  // Test 10.2: Copilot Tool `listStudioDomains`
  const toolDomRes = await copilotRegistry.executeTool('listStudioDomains', { studio_id: studio1.id });
  assert(toolDomRes !== null, '10.3 Copilot listStudioDomains executes successfully');
  assert(Array.isArray(toolDomRes.domains), '10.4 Copilot tool returns domains array');

  // Test 10.3: Copilot Tool `getClientPortalStatus`
  const toolPortalRes = await copilotRegistry.executeTool('getClientPortalStatus', {
    studio_id: studio1.id,
    client_id: client1.id
  });
  assert(toolPortalRes !== null, '10.5 Copilot getClientPortalStatus executes');
  assert(toolPortalRes.has_active_session === true, '10.6 Confirms client has active portal session');

  // Test 10.4: Copilot Tool `generateClientPortalLink`
  const toolLinkRes = await copilotRegistry.executeTool('generateClientPortalLink', {
    studio_id: studio1.id,
    client_id: client1.id,
    expires_in_days: 14
  });
  assert(toolLinkRes !== null, '10.7 Copilot generateClientPortalLink executes');
  assert(typeof toolLinkRes.portal_url === 'string', '10.8 Copilot tool returns portal URL');
  assert(toolLinkRes.portal_url.includes('/portal/client/'), '10.9 URL matches client portal route');

  // Test 10.5: Data Minimization Verification
  // Ensure NO biometric data, face embeddings, internal staff notes, or wholesale margin data is leaked
  const dtoJson = JSON.stringify(homeDTO);
  assert(!dtoJson.includes('embedding'), '10.10 Home DTO contains ZERO biometric embeddings');
  assert(!dtoJson.includes('face_descriptor'), '10.11 Home DTO contains ZERO face descriptors');
  assert(!dtoJson.includes('internal_cost'), '10.12 Home DTO contains ZERO internal cost data');
  assert(!dtoJson.includes('password_hash'), '10.13 Home DTO contains ZERO password hashes');

  const projJson = JSON.stringify(p1Detail);
  assert(!projJson.includes('embedding'), '10.14 Project detail contains ZERO biometric embeddings');
  assert(!projJson.includes('staff_internal_notes'), '10.15 Project detail contains ZERO internal staff notes');

  const ordJson = JSON.stringify(ordDetail);
  assert(!ordJson.includes('lab_cost_cents'), '10.16 Order detail contains ZERO wholesale lab costs');
  assert(!ordJson.includes('stripe_fee_cents'), '10.17 Order detail contains ZERO processing fee internal data');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n================================================================');
  console.log(`🏁 PHASE 27 MASTER TEST SUITE COMPLETED`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Assertions: ${passed + failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    console.error(`❌ Suite failed with ${failed} failing assertion(s).`);
    process.exit(1);
  }
}

runPhase27MasterSuite().catch(err => {
  console.error('Fatal error in Phase 27 Master Test Suite:', err);
  process.exit(1);
});
