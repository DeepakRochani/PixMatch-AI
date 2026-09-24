import {
  CanonicalService,
  ServiceCriticality,
  ServiceRegistryEntry,
} from '@pixmatch/types';

export class ServiceRegistry {
  private static readonly registry: Map<CanonicalService, ServiceRegistryEntry> = new Map([
    [
      CanonicalService.DATABASE,
      {
        name: CanonicalService.DATABASE,
        service_name: CanonicalService.DATABASE,
        criticality: ServiceCriticality.CRITICAL,
        health_endpoint: '/health/db',
        healthEndpoint: '/health/db',
        timeout_ms: 2000,
        timeoutMs: 2000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Database & Infrastructure SRE',
        enabled: true,
        dependencies: [],
        description: 'PostgreSQL Primary Transactional Cluster & pgvector Store',
      },
    ],
    [
      CanonicalService.API_GATEWAY,
      {
        name: CanonicalService.API_GATEWAY,
        service_name: CanonicalService.API_GATEWAY,
        criticality: ServiceCriticality.CRITICAL,
        health_endpoint: '/health/ready',
        healthEndpoint: '/health/ready',
        timeout_ms: 3000,
        timeoutMs: 3000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Core Backend Platform Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE, CanonicalService.STORAGE],
        description: 'Fastify API Gateway, Authentication & Multi-Tenant Routing Engine',
      },
    ],
    [
      CanonicalService.AI_ENGINE,
      {
        name: CanonicalService.AI_ENGINE,
        service_name: CanonicalService.AI_ENGINE,
        criticality: ServiceCriticality.CRITICAL,
        health_endpoint: '/health/ai',
        healthEndpoint: '/health/ai',
        timeout_ms: 8000,
        timeoutMs: 8000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'AI & Biometrics ML Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE, CanonicalService.STORAGE],
        description: 'InsightFace Vector Inference, Quality Scoring & Culling Pipeline',
      },
    ],
    [
      CanonicalService.STORAGE,
      {
        name: CanonicalService.STORAGE,
        service_name: CanonicalService.STORAGE,
        criticality: ServiceCriticality.CRITICAL,
        health_endpoint: '/health/storage',
        healthEndpoint: '/health/storage',
        timeout_ms: 4000,
        timeoutMs: 4000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Cloud Storage & CDN Team',
        enabled: true,
        dependencies: [],
        description: 'S3 / Cloudflare R2 High-Resolution Media Storage Provider',
      },
    ],
    [
      CanonicalService.SEARCH,
      {
        name: CanonicalService.SEARCH,
        service_name: CanonicalService.SEARCH,
        criticality: ServiceCriticality.HIGH,
        health_endpoint: '/health/search',
        healthEndpoint: '/health/search',
        timeout_ms: 3000,
        timeoutMs: 3000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Search & Indexing Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE],
        description: 'Semantic & Vector Search Indexing Service',
      },
    ],
    [
      CanonicalService.NOTIFICATION,
      {
        name: CanonicalService.NOTIFICATION,
        service_name: CanonicalService.NOTIFICATION,
        criticality: ServiceCriticality.HIGH,
        health_endpoint: '/health/notification',
        healthEndpoint: '/health/notification',
        timeout_ms: 3000,
        timeoutMs: 3000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Notification & Messaging Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE],
        description: 'Multi-Channel Push, SMS & Real-Time Event Dispatcher',
      },
    ],
    [
      CanonicalService.FINANCE,
      {
        name: CanonicalService.FINANCE,
        service_name: CanonicalService.FINANCE,
        criticality: ServiceCriticality.HIGH,
        health_endpoint: '/health/finance',
        healthEndpoint: '/health/finance',
        timeout_ms: 4000,
        timeoutMs: 4000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'FinTech & Billing Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE],
        description: 'Stripe Payments, Automated Invoicing & Revenue Analytics',
      },
    ],
    [
      CanonicalService.FULFILLMENT,
      {
        name: CanonicalService.FULFILLMENT,
        service_name: CanonicalService.FULFILLMENT,
        criticality: ServiceCriticality.HIGH,
        health_endpoint: '/health/fulfillment',
        healthEndpoint: '/health/fulfillment',
        timeout_ms: 5000,
        timeoutMs: 5000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Print Lab & Delivery Operations',
        enabled: true,
        dependencies: [CanonicalService.DATABASE, CanonicalService.STORAGE],
        description: 'Automated Print Lab Routing & High-Res Package Delivery Service',
      },
    ],
    [
      CanonicalService.COLLABORATION,
      {
        name: CanonicalService.COLLABORATION,
        service_name: CanonicalService.COLLABORATION,
        criticality: ServiceCriticality.MEDIUM,
        health_endpoint: '/health/collaboration',
        healthEndpoint: '/health/collaboration',
        timeout_ms: 3500,
        timeoutMs: 3500,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Studio Collaboration Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE],
        description: 'Multi-User Proofing, Comments & Real-Time Client Selection Engine',
      },
    ],
    [
      CanonicalService.COMMUNICATION,
      {
        name: CanonicalService.COMMUNICATION,
        service_name: CanonicalService.COMMUNICATION,
        criticality: ServiceCriticality.MEDIUM,
        health_endpoint: '/health/communication',
        healthEndpoint: '/health/communication',
        timeout_ms: 4000,
        timeoutMs: 4000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Client Communications Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE],
        description: 'In-App Messaging, Email Integration & Client Chat Gateway',
      },
    ],
    [
      CanonicalService.INTELLIGENCE,
      {
        name: CanonicalService.INTELLIGENCE,
        service_name: CanonicalService.INTELLIGENCE,
        criticality: ServiceCriticality.MEDIUM,
        health_endpoint: '/health/intelligence',
        healthEndpoint: '/health/intelligence',
        timeout_ms: 6000,
        timeoutMs: 6000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Business Intelligence & Insights Team',
        enabled: true,
        dependencies: [CanonicalService.DATABASE, CanonicalService.AI_ENGINE],
        description: 'Studio Performance Analytics, Forecasting & Automated Pricing Advice',
      },
    ],
    [
      CanonicalService.ADMIN,
      {
        name: CanonicalService.ADMIN,
        service_name: CanonicalService.ADMIN,
        criticality: ServiceCriticality.MEDIUM,
        health_endpoint: '/health/admin',
        healthEndpoint: '/health/admin',
        timeout_ms: 3000,
        timeoutMs: 3000,
        expected_status: 200,
        expectedStatus: 200,
        owner: 'Platform Operations & Security SRE',
        enabled: true,
        dependencies: [CanonicalService.DATABASE, CanonicalService.API_GATEWAY],
        description: 'Super-Admin Operations, Reliability Center & Audit Governance',
      },
    ],
  ]);

  private static readonly aliasMap: Record<string, CanonicalService> = {
    WEB: CanonicalService.API_GATEWAY,
    API: CanonicalService.API_GATEWAY,
    API_GATEWAY: CanonicalService.API_GATEWAY,
    WORKER: CanonicalService.FULFILLMENT,
    BACKGROUND_WORKER: CanonicalService.FULFILLMENT,
    AI_SERVICE: CanonicalService.AI_ENGINE,
    AI_ENGINE: CanonicalService.AI_ENGINE,
    DATABASE: CanonicalService.DATABASE,
    REDIS: CanonicalService.DATABASE,
    REDIS_CACHE: CanonicalService.DATABASE,
    BULLMQ: CanonicalService.FULFILLMENT,
    STORAGE: CanonicalService.STORAGE,
    STORAGE_SERVICE: CanonicalService.STORAGE,
    SEARCH: CanonicalService.SEARCH,
    SEARCH_SERVICE: CanonicalService.SEARCH,
    NOTIFICATION: CanonicalService.NOTIFICATION,
    NOTIFICATION_ENGINE: CanonicalService.NOTIFICATION,
    EMAIL: CanonicalService.COMMUNICATION,
    EMAIL_SERVICE: CanonicalService.COMMUNICATION,
    FINANCE: CanonicalService.FINANCE,
    PAYMENTS: CanonicalService.FINANCE,
    PAYMENT_GATEWAY: CanonicalService.FINANCE,
    CALENDAR: CanonicalService.COLLABORATION,
    AUTOMATION: CanonicalService.INTELLIGENCE,
    FULFILLMENT: CanonicalService.FULFILLMENT,
    COLLABORATION: CanonicalService.COLLABORATION,
    COMMUNICATION: CanonicalService.COMMUNICATION,
    INTELLIGENCE: CanonicalService.INTELLIGENCE,
    ADMIN: CanonicalService.ADMIN,
  };

  /**
   * Returns all canonical service entries
   */
  static listServices(): ServiceRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Returns a canonical service entry by name
   */
  static getService(serviceName: CanonicalService | string): ServiceRegistryEntry | undefined {
    if (!serviceName) return undefined;
    const directMatch = Array.from(this.registry.keys()).find(
      (k) => k.toUpperCase() === serviceName.toUpperCase()
    );
    if (directMatch) return this.registry.get(directMatch);

    const canonicalAlias = this.aliasMap[serviceName.toUpperCase()];
    if (canonicalAlias) return this.registry.get(canonicalAlias);

    return undefined;
  }

  /**
   * Checks if a service exists in the canonical registry
   */
  static hasService(serviceName: string): boolean {
    return !!this.getService(serviceName);
  }

  /**
   * Returns critical services that dictate system liveness/readiness
   */
  static getCriticalServices(): ServiceRegistryEntry[] {
    return this.listServices().filter((s) => s.criticality === ServiceCriticality.CRITICAL);
  }

  public getAll(): ServiceRegistryEntry[] {
    return ServiceRegistry.listServices();
  }

  public get(serviceName: CanonicalService | string): ServiceRegistryEntry | undefined {
    return ServiceRegistry.getService(serviceName);
  }

  public has(serviceName: string): boolean {
    return ServiceRegistry.hasService(serviceName);
  }

  public getCriticalServices(): ServiceRegistryEntry[] {
    return ServiceRegistry.getCriticalServices();
  }

  public isCritical(serviceName: CanonicalService | string): boolean {
    const service = this.get(serviceName);
    return service ? service.criticality === ServiceCriticality.CRITICAL : false;
  }
}

export const serviceRegistry = new ServiceRegistry();
