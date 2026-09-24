/**
 * Client Portal & Branding Routes — PixMatch AI Phase 27
 * Registers Fastify endpoints for public client portal access and authenticated studio branding / domain administration.
 */

import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.js';
import { ClientPortalController } from './client-portal.controller.js';
import { ClientExperienceController } from './client-experience.controller.js';
import { StudioBrandingController } from '../branding/studio-branding.controller.js';

export async function clientPortalRoutes(app: FastifyInstance) {
  // -------------------------------------------------------------
  // PUBLIC CLIENT PORTAL ROUTES (Token Authenticated)
  // -------------------------------------------------------------
  app.get('/public/client-portal/:token/home', ClientPortalController.getPortalHome);
  app.get('/public/client-portal/:token/session', ClientPortalController.getSessionInfo);
  app.get('/public/client-portal/:token/branding', ClientPortalController.getBranding);
  app.get('/public/client-portal/:token/projects', ClientPortalController.getProjects);
  app.get('/public/client-portal/:token/projects/:projectId', ClientPortalController.getProjectDetail);
  app.get('/public/client-portal/:token/orders', ClientPortalController.getOrders);
  app.get('/public/client-portal/:token/orders/:orderId', ClientPortalController.getOrderDetail);
  app.get('/public/client-portal/:token/downloads', ClientPortalController.getDownloads);
  app.get('/public/client-portal/:token/downloads/:packageId/file', ClientPortalController.downloadPackageFile);
  app.get('/public/client-portal/:token/delivery', ClientPortalController.getDelivery);
  app.post('/public/client-portal/:token/delivery/:deliveryId/confirm', ClientPortalController.confirmDelivery);
  app.get('/public/client-portal/:token/notifications', ClientPortalController.getNotifications);
  app.post('/public/client-portal/:token/notifications/:notificationId/read', ClientPortalController.markNotificationRead);
  app.get('/public/client-portal/:token/profile', ClientPortalController.getProfile);
  app.patch('/public/client-portal/:token/profile', ClientPortalController.updateProfile);
  app.post('/public/client-portal/:token/messages', ClientPortalController.sendClientMessage);

  // -------------------------------------------------------------
  // PHASE 30: ADVANCED CLIENT EXPERIENCE & GALLERY EXPERIENCE 2.0
  // -------------------------------------------------------------
  app.get('/public/client-portal/:token/experience', ClientExperienceController.getExperienceHome);
  app.get('/public/client-portal/:token/navigation-state', ClientExperienceController.getNavigationState);
  app.post('/public/client-portal/:token/navigation-state', ClientExperienceController.saveNavigationState);
  app.get('/public/client-portal/:token/timeline', ClientExperienceController.getClientSafeTimeline);
  app.get('/public/client-portal/:token/galleries/:galleryId/search', ClientExperienceController.searchGallery);
  app.get('/public/client-portal/:token/photos/:photoId/lightbox', ClientExperienceController.getLightboxPhoto);
  app.post('/public/client-portal/:token/photos/:photoId/favorite', ClientExperienceController.toggleFavorite);
  app.post('/public/client-portal/:token/photos/:photoId/select', ClientExperienceController.toggleSelection);
  app.post('/public/client-portal/:token/galleries/:galleryId/find-my-photos', ClientExperienceController.getFindMyPhotosResults);

  // -------------------------------------------------------------
  // AUTHENTICATED STUDIO BRANDING & DOMAIN MANAGEMENT
  // -------------------------------------------------------------
  app.register(async (authed) => {
    authed.addHook('onRequest', authenticate);

    // Branding
    authed.get('/studios/:studioId/branding', StudioBrandingController.getBranding);
    authed.patch('/studios/:studioId/branding', StudioBrandingController.updateBranding);
    authed.post('/studios/:studioId/branding/reset', StudioBrandingController.resetBranding);

    // Custom Domains
    authed.get('/studios/:studioId/domains', StudioBrandingController.listDomains);
    authed.post('/studios/:studioId/domains', StudioBrandingController.createDomain);
    authed.get('/studios/:studioId/domains/:domainId', StudioBrandingController.getDomain);
    authed.post('/studios/:studioId/domains/:domainId/verify', StudioBrandingController.verifyDomain);
    authed.post('/studios/:studioId/domains/:domainId/primary', StudioBrandingController.setPrimaryDomain);
    authed.delete('/studios/:studioId/domains/:domainId', StudioBrandingController.deleteDomain);

    // Client Portal Sessions Issuance
    authed.post('/studios/:studioId/clients/:clientId/portal-session', StudioBrandingController.createClientPortalSession);
    authed.post('/studios/:studioId/portal-sessions/:sessionId/revoke', StudioBrandingController.revokeClientPortalSession);
  });
}
