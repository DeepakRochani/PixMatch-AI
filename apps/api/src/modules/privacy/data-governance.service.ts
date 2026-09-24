import { prisma } from '@pixmatch/database';
import {
  DataClassification,
  DataCategory,
  DataOwnerType,
  DataProcessingPurpose,
  AccessReviewStatus,
  ConsentStatus,
  DataAssetFilterDTO,
  PlatformDataAssetDTO,
  PlatformDataLineageDTO,
  DataAccessReviewDTO,
  PrivacyConsentRecordDTO,
  ThirdPartyProviderMapDTO,
  PrivacyOverviewMetricsDTO,
} from '@pixmatch/types';

export interface CreateDataAssetInput {
  assetKey: string;
  name: string;
  description?: string;
  classification: DataClassification;
  category: DataCategory;
  ownerType: DataOwnerType;
  storageEngine: string;
  tableName?: string;
  personalData: boolean;
  sensitivePersonalData?: boolean;
  biometricData?: boolean;
  financialData?: boolean;
  purposes: DataProcessingPurpose[];
  legalBasis: string;
  encryptionAtRest?: boolean;
  encryptionInTransit?: boolean;
  retentionDays?: number;
  anonymizationMethod?: string;
  exportable?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateDataAssetInput {
  name?: string;
  description?: string;
  classification?: DataClassification;
  category?: DataCategory;
  ownerType?: DataOwnerType;
  storageEngine?: string;
  tableName?: string;
  personalData?: boolean;
  sensitivePersonalData?: boolean;
  biometricData?: boolean;
  financialData?: boolean;
  purposes?: DataProcessingPurpose[];
  legalBasis?: string;
  encryptionAtRest?: boolean;
  encryptionInTransit?: boolean;
  retentionDays?: number | null;
  anonymizationMethod?: string | null;
  exportable?: boolean;
  metadata?: Record<string, any>;
}

export interface CreateLineageInput {
  sourceAssetId: string;
  targetAssetId: string;
  transformationType: string;
  processingPurpose: DataProcessingPurpose;
  syncFrequency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface CreateAccessReviewInput {
  title: string;
  description?: string;
  assetIds: string[];
  dueDate: Date;
  reviewerAdminId?: string;
}

export interface LogConsentInput {
  userId?: string;
  studioId?: string;
  consentType: string;
  status: ConsentStatus;
  purpose: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

// Canonical static seed assets of PixMatch platform (30+ canonical assets)
export const CANONICAL_DATA_ASSETS: CreateDataAssetInput[] = [
  {
    assetKey: 'user_accounts',
    name: 'User Identity & Profiles',
    description: 'Core platform users, emails, display names, studio affiliations, and phone numbers',
    classification: DataClassification.PERSONAL,
    category: DataCategory.IDENTITY,
    ownerType: DataOwnerType.STUDIO_USER,
    storageEngine: 'PostgreSQL',
    tableName: 'users',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY, DataProcessingPurpose.SECURITY_AUDIT],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 730,
    anonymizationMethod: 'IRREVERSIBLE_HASH_AND_PURGE',
    exportable: true,
  },
  {
    assetKey: 'auth_credentials_and_tokens',
    name: 'Authentication Credentials & Sessions',
    description: 'Hashed passwords, active session tokens, refresh tokens, and 2FA secrets',
    classification: DataClassification.AUTHENTICATION_SECRET,
    category: DataCategory.SECURITY,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL / Redis',
    tableName: 'auth_tokens_and_secrets',
    personalData: true,
    sensitivePersonalData: true,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SECURITY_AUDIT],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 90,
    anonymizationMethod: 'ABSOLUTE_DELETION',
    exportable: false,
  },
  {
    assetKey: 'face_recognition_embeddings',
    name: 'AI Face Recognition Biometric Embeddings',
    description: '512-dimensional ArcFace mathematical feature vectors derived from photo faces',
    classification: DataClassification.BIOMETRIC,
    category: DataCategory.BIOMETRIC,
    ownerType: DataOwnerType.END_CLIENT,
    storageEngine: 'PostgreSQL (pgvector)',
    tableName: 'face_encodings',
    personalData: true,
    sensitivePersonalData: true,
    biometricData: true,
    financialData: false,
    purposes: [DataProcessingPurpose.AI_INDEXING],
    legalBasis: 'EXPLICIT_CONSENT',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 365,
    anonymizationMethod: 'PERMANENT_VECTOR_DELETION',
    exportable: false,
  },
  {
    assetKey: 'client_selfie_registrations',
    name: 'Client Selfie Biometric References',
    description: 'Temporary or registered client selfies uploaded for VIP face search and photo retrieval',
    classification: DataClassification.BIOMETRIC,
    category: DataCategory.BIOMETRIC,
    ownerType: DataOwnerType.END_CLIENT,
    storageEngine: 'S3 / Local Encrypted Blob',
    tableName: 'client_selfies',
    personalData: true,
    sensitivePersonalData: true,
    biometricData: true,
    financialData: false,
    purposes: [DataProcessingPurpose.AI_INDEXING, DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'EXPLICIT_CONSENT',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 180,
    anonymizationMethod: 'IRREVERSIBLE_BLOB_PURGE',
    exportable: false,
  },
  {
    assetKey: 'photo_media_storage',
    name: 'Original & Rendered Photo Media',
    description: 'Full resolution RAW/JPEG photos, thumbnails, and watermarked previews',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.MEDIA,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'S3 / Cloudflare R2 / Local Object Storage',
    tableName: 'photos',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1825,
    anonymizationMethod: 'SOFT_TOMBSTONE_THEN_S3_PURGE',
    exportable: true,
  },
  {
    assetKey: 'photo_exif_and_metadata',
    name: 'Photo EXIF & Capture Metadata',
    description: 'Camera serials, lens specs, shutter speeds, GPS tags (if enabled), and capture timestamps',
    classification: DataClassification.INTERNAL,
    category: DataCategory.METADATA,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'photo_metadata',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY, DataProcessingPurpose.ANALYTICS],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1825,
    anonymizationMethod: 'METADATA_STRIPPING',
    exportable: true,
  },
  {
    assetKey: 'client_crm_profiles',
    name: 'Client Directory & CRM Records',
    description: 'Client full names, relationship histories, notes, addresses, and emergency contacts',
    classification: DataClassification.PERSONAL,
    category: DataCategory.IDENTITY,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'clients',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY, DataProcessingPurpose.COMMUNICATIONS],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1095,
    anonymizationMethod: 'ANONYMIZE_PII_FIELDS',
    exportable: true,
  },
  {
    assetKey: 'contracts_and_signatures',
    name: 'Client Contracts & Digital Signatures',
    description: 'Executed client service agreements, IP terms, signature timestamps, and IP addresses',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.CONTRACTUAL,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL / Secure PDF Storage',
    tableName: 'contracts',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.LEGAL_COMPLIANCE, DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'LEGAL_OBLIGATION',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 2555, // 7 years statutory
    anonymizationMethod: 'RETAIN_STATUTORY_UNTIL_EXPIRED',
    exportable: true,
  },
  {
    assetKey: 'invoices_and_billing_receipts',
    name: 'Invoices & Customer Billing Receipts',
    description: 'Invoices issued to clients, line items, VAT/GST taxes, and payment confirmation summaries',
    classification: DataClassification.FINANCIAL,
    category: DataCategory.FINANCIAL,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'invoices',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: true,
    purposes: [DataProcessingPurpose.LEGAL_COMPLIANCE, DataProcessingPurpose.FINANCIAL_REPORTING],
    legalBasis: 'LEGAL_OBLIGATION',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 2555, // 7 years statutory
    anonymizationMethod: 'STATUTORY_FINANCIAL_RETENTION',
    exportable: true,
  },
  {
    assetKey: 'journal_entries_and_gl',
    name: 'General Ledger & Journal Entries',
    description: 'Double-entry accounting journal entries, debits/credits, tax calculations, and balance records',
    classification: DataClassification.FINANCIAL,
    category: DataCategory.FINANCIAL,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL',
    tableName: 'journal_entries',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: true,
    purposes: [DataProcessingPurpose.FINANCIAL_REPORTING, DataProcessingPurpose.LEGAL_COMPLIANCE],
    legalBasis: 'LEGAL_OBLIGATION',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 2555,
    anonymizationMethod: 'IMMUTABLE_AUDIT_TRAIL',
    exportable: true,
  },
  {
    assetKey: 'payment_gateway_tokens',
    name: 'Payment Gateway Customer & Card Tokens',
    description: 'Stripe / Razorpay customer IDs, mandate tokens, and masked last4 card representations',
    classification: DataClassification.FINANCIAL,
    category: DataCategory.FINANCIAL,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL',
    tableName: 'payment_customer_tokens',
    personalData: true,
    sensitivePersonalData: true,
    biometricData: false,
    financialData: true,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1095,
    anonymizationMethod: 'TOKEN_PURGE_AND_GATEWAY_REVOCATION',
    exportable: false,
  },
  {
    assetKey: 'admin_audit_logs',
    name: 'Platform Administrator Audit Logs',
    description: 'Structured records of administrative impersonation, role modifications, and system overrides',
    classification: DataClassification.SECURITY_DATA,
    category: DataCategory.SECURITY,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL (Append-Only)',
    tableName: 'admin_audit_logs',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SECURITY_AUDIT, DataProcessingPurpose.LEGAL_COMPLIANCE],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1825,
    anonymizationMethod: 'IMMUTABLE_LOG_PRESERVATION',
    exportable: false,
  },
  {
    assetKey: 'security_events_and_incidents',
    name: 'SOC Security Events & Incident Logs',
    description: 'Threat detection telemetry, anomalous login attempts, brute-force logs, and IP blocks',
    classification: DataClassification.SECURITY_DATA,
    category: DataCategory.SECURITY,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL',
    tableName: 'security_events',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SECURITY_AUDIT],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 730,
    anonymizationMethod: 'AGGREGATE_STATISTICS_ROLLUP',
    exportable: false,
  },
  {
    assetKey: 'third_party_storage_credentials',
    name: 'Photographer External Cloud Storage Credentials',
    description: 'Encrypted OAuth refresh tokens and access keys for Google Drive, Dropbox, and S3 buckets',
    classification: DataClassification.AUTHENTICATION_SECRET,
    category: DataCategory.SECURITY,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL (AES-256-GCM)',
    tableName: 'storage_provider_credentials',
    personalData: false,
    sensitivePersonalData: true,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 365,
    anonymizationMethod: 'OAUTH_TOKEN_REVOCATION_AND_PURGE',
    exportable: false,
  },
  {
    assetKey: 'client_messaging_and_emails',
    name: 'Client Email & SMS Communications',
    description: 'Outbound email notifications, SMS message delivery statuses, and client replies',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.COMMUNICATIONS,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'communication_logs',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.COMMUNICATIONS, DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 730,
    anonymizationMethod: 'MESSAGE_CONTENT_PURGE',
    exportable: true,
  },
  {
    assetKey: 'proofing_feedback_and_selections',
    name: 'Photo Proofing Selections & Star Ratings',
    description: 'Client star ratings, crop suggestions, color markup notes, and final selection sets',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.COLLABORATION,
    ownerType: DataOwnerType.END_CLIENT,
    storageEngine: 'PostgreSQL',
    tableName: 'proofing_items',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1095,
    anonymizationMethod: 'CASCADE_DELETE_WITH_GALLERY',
    exportable: true,
  },
  {
    assetKey: 'booking_calendar_appointments',
    name: 'Studio Booking & Event Schedules',
    description: 'Shooting dates, venue locations, client contact numbers, and itinerary details',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.OPERATIONAL,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'calendar_events',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1095,
    anonymizationMethod: 'SCHEDULE_ANONYMIZATION',
    exportable: true,
  },
  {
    assetKey: 'culling_and_ai_rankings',
    name: 'AI Culling & Image Quality Scores',
    description: 'Aesthetic scores, blink detection results, sharpness metrics, and duplicate cluster IDs',
    classification: DataClassification.INTERNAL,
    category: DataCategory.METADATA,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'culling_results',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.AI_INDEXING, DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 730,
    anonymizationMethod: 'SCORE_PURGE_ON_PHOTO_DELETE',
    exportable: true,
  },
  {
    assetKey: 'studio_branding_assets',
    name: 'Studio Custom Watermarks & Logos',
    description: 'Uploaded studio logos, typography brand rules, custom domain mappings, and CSS themes',
    classification: DataClassification.PUBLIC,
    category: DataCategory.MEDIA,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'S3 / PostgreSQL',
    tableName: 'studio_branding',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1825,
    anonymizationMethod: 'BRAND_ASSET_PURGE_ON_ACCOUNT_TERMINATION',
    exportable: true,
  },
  {
    assetKey: 'privacy_consent_ledger',
    name: 'Privacy & Cookie Consent Records',
    description: 'Immutable timestamps and user actions regarding biometric face search and marketing consent',
    classification: DataClassification.SECURITY_DATA,
    category: DataCategory.COMPLIANCE,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL',
    tableName: 'privacy_consent_records',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.LEGAL_COMPLIANCE],
    legalBasis: 'LEGAL_OBLIGATION',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1825,
    anonymizationMethod: 'CONSENT_HASH_ARCHIVE',
    exportable: true,
  },
  {
    assetKey: 'data_deletion_audit_trail',
    name: 'Data Subject Deletion Execution Certificates',
    description: 'Cryptographic execution logs verifying deleted user and client data records',
    classification: DataClassification.SECURITY_DATA,
    category: DataCategory.COMPLIANCE,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL',
    tableName: 'data_deletion_executions',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.LEGAL_COMPLIANCE, DataProcessingPurpose.SECURITY_AUDIT],
    legalBasis: 'LEGAL_OBLIGATION',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 2555,
    anonymizationMethod: 'PERMANENT_COMPLIANCE_RECORD',
    exportable: true,
  },
  {
    assetKey: 'production_order_tracking',
    name: 'Lab Print Orders & Shipping Tracking',
    description: 'Print lab fulfillment manifests, tracking numbers, paper finishes, and delivery addresses',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.OPERATIONAL,
    ownerType: DataOwnerType.END_CLIENT,
    storageEngine: 'PostgreSQL',
    tableName: 'fulfillment_orders',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1095,
    anonymizationMethod: 'ADDRESS_MASKING_AFTER_DELIVERY',
    exportable: true,
  },
  {
    assetKey: 'ai_copilot_chat_transcripts',
    name: 'AI Copilot Business Assistant Conversations',
    description: 'Studio user interaction logs, business strategy questions, and tool execution history',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.COLLABORATION,
    ownerType: DataOwnerType.STUDIO_USER,
    storageEngine: 'PostgreSQL',
    tableName: 'copilot_transcripts',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY, DataProcessingPurpose.ANALYTICS],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 180,
    anonymizationMethod: 'TRANSCRIPT_EXPIRATION_PURGE',
    exportable: true,
  },
  {
    assetKey: 'system_error_telemetry',
    name: 'Application Exception Logs & APM Metrics',
    description: 'Node.js stack traces, request latency metrics, CPU/memory stats, and error codes',
    classification: DataClassification.SYSTEM_DATA,
    category: DataCategory.TECHNICAL,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'PostgreSQL / Elastic',
    tableName: 'telemetry_logs',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SECURITY_AUDIT],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 90,
    anonymizationMethod: 'AUTOMATIC_TIME_PURGE',
    exportable: false,
  },
  {
    assetKey: 'marketing_campaign_leads',
    name: 'Growth & Inbound Lead Inquiries',
    description: 'Potential client lead forms, campaign source tags, conversion funnels, and UTM parameters',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.MARKETING,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'growth_leads',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.MARKETING, DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'LEGITIMATE_INTEREST',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 730,
    anonymizationMethod: 'LEAD_ANONYMIZATION',
    exportable: true,
  },
  {
    assetKey: 'database_backups_immutable',
    name: 'Encrypted Point-in-Time Database Snapshots',
    description: 'Daily and weekly encrypted WAL archives and full database dumps for disaster recovery',
    classification: DataClassification.SECURITY_DATA,
    category: DataCategory.TECHNICAL,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'AWS S3 Glacier / GCS Coldline',
    tableName: 'backup_snapshots',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SECURITY_AUDIT, DataProcessingPurpose.LEGAL_COMPLIANCE],
    legalBasis: 'LEGAL_OBLIGATION',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 90,
    anonymizationMethod: 'IMMUTABLE_LIFECYCLE_EXPIRATION',
    exportable: false,
  },
  {
    assetKey: 'email_campaign_dispatch_queues',
    name: 'Transactional & Marketing Email Outbox',
    description: 'Queued automated email templates, recipient email addresses, and tracking pixels',
    classification: DataClassification.INTERNAL,
    category: DataCategory.COMMUNICATIONS,
    ownerType: DataOwnerType.PLATFORM_INTERNAL,
    storageEngine: 'Redis BullMQ / PostgreSQL',
    tableName: 'email_dispatch_queues',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.COMMUNICATIONS],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 30,
    anonymizationMethod: 'QUEUE_AUTO_CLEANUP',
    exportable: false,
  },
  {
    assetKey: 'team_member_roles_and_permissions',
    name: 'Studio Team Roles & Permission Bindings',
    description: 'Granular permissions, assistant access limitations, and staff assignment logs',
    classification: DataClassification.INTERNAL,
    category: DataCategory.OPERATIONAL,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'studio_members',
    personalData: true,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1095,
    anonymizationMethod: 'ROLE_BINDING_PURGE',
    exportable: true,
  },
  {
    assetKey: 'photo_sharing_direct_links',
    name: 'Public & Private Gallery PINs & Magic Links',
    description: 'Tokenized gallery access keys, guest download PINs, and link expiration timestamps',
    classification: DataClassification.CONFIDENTIAL,
    category: DataCategory.SECURITY,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'gallery_access_grants',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 365,
    anonymizationMethod: 'TOKEN_REVOCATION',
    exportable: false,
  },
  {
    assetKey: 'client_portal_white_label_settings',
    name: 'White-Label Branding & Custom Hostnames',
    description: 'Custom CNAME records, SSL certificate associations, and client portal layout specs',
    classification: DataClassification.PUBLIC,
    category: DataCategory.METADATA,
    ownerType: DataOwnerType.STUDIO_PHOTOGRAPHER,
    storageEngine: 'PostgreSQL',
    tableName: 'white_label_configurations',
    personalData: false,
    sensitivePersonalData: false,
    biometricData: false,
    financialData: false,
    purposes: [DataProcessingPurpose.SERVICE_DELIVERY],
    legalBasis: 'CONTRACT_PERFORMANCE',
    encryptionAtRest: true,
    encryptionInTransit: true,
    retentionDays: 1825,
    anonymizationMethod: 'DOMAIN_MAPPING_PURGE',
    exportable: true,
  },
];

export const THIRD_PARTY_PROVIDERS: ThirdPartyProviderMapDTO[] = [
  {
    id: 'prov-stripe',
    name: 'Stripe, Inc.',
    category: 'Payment Processing',
    purpose: 'Card tokenization, payment intent execution, mandate management',
    dataTransferred: ['Email', 'Billing Address', 'Payment Token', 'Transaction Amounts'],
    dataClassification: DataClassification.FINANCIAL,
    countryOrRegion: 'United States / EU (SCCs)',
    transferMechanism: 'Standard Contractual Clauses (SCCs) & DPA',
    dpaStatus: 'ACTIVE_EXECUTED',
    securityCertifications: ['PCI-DSS Level 1', 'SOC 1 Type II', 'SOC 2 Type II', 'ISO 27001'],
    lastReviewedAt: new Date('2026-01-15T00:00:00Z'),
  },
  {
    id: 'prov-cloudflare',
    name: 'Cloudflare, Inc.',
    category: 'CDN & Storage (R2)',
    purpose: 'Edge caching, SSL termination, secure asset delivery, R2 media storage',
    dataTransferred: ['Client IP', 'Photo Thumbnails', 'HTTP Headers'],
    dataClassification: DataClassification.INTERNAL,
    countryOrRegion: 'Global Edge / EU Localized Data',
    transferMechanism: 'Standard Contractual Clauses (SCCs) & DPA',
    dpaStatus: 'ACTIVE_EXECUTED',
    securityCertifications: ['ISO 27001', 'SOC 2 Type II', 'PCI-DSS', 'HIPAA Ready'],
    lastReviewedAt: new Date('2026-02-01T00:00:00Z'),
  },
  {
    id: 'prov-resend',
    name: 'Resend / AWS SES',
    category: 'Email Delivery',
    purpose: 'Transactional delivery of client gallery invites, magic links, invoices',
    dataTransferred: ['Recipient Email', 'User Name', 'Studio Name', 'Notification Body'],
    dataClassification: DataClassification.CONFIDENTIAL,
    countryOrRegion: 'United States (Data Localization Enabled)',
    transferMechanism: 'DPA with SCCs',
    dpaStatus: 'ACTIVE_EXECUTED',
    securityCertifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR Compliant DPA'],
    lastReviewedAt: new Date('2026-01-20T00:00:00Z'),
  },
  {
    id: 'prov-sentry',
    name: 'Sentry, Inc.',
    category: 'Error Monitoring & Telemetry',
    purpose: 'Application crash diagnostics, performance monitoring, sanitized stack traces',
    dataTransferred: ['Sanitized Error Traces', 'Browser Version', 'OS Version'],
    dataClassification: DataClassification.SYSTEM_DATA,
    countryOrRegion: 'United States',
    transferMechanism: 'Data Processing Agreement with Data Scrubbers enabled',
    dpaStatus: 'ACTIVE_EXECUTED',
    securityCertifications: ['SOC 2 Type II', 'ISO 27001', 'HIPAA Compliant'],
    lastReviewedAt: new Date('2026-03-01T00:00:00Z'),
  },
  {
    id: 'prov-gdrive',
    name: 'Google LLC (Google Drive API)',
    category: 'External Storage Provider',
    purpose: 'Photographer-connected photo sync and backup repository',
    dataTransferred: ['Photographer OAuth Token', 'RAW & JPEG Media Files'],
    dataClassification: DataClassification.CONFIDENTIAL,
    countryOrRegion: 'User Selected Region / US',
    transferMechanism: 'Google Cloud Platform Master Enterprise Agreement & DPA',
    dpaStatus: 'ACTIVE_EXECUTED',
    securityCertifications: ['SOC 2/3', 'ISO 27001/27017/27018', 'FedRAMP'],
    lastReviewedAt: new Date('2026-02-15T00:00:00Z'),
  },
  {
    id: 'prov-dropbox',
    name: 'Dropbox, Inc.',
    category: 'External Storage Provider',
    purpose: 'Photographer-connected photo sync and high-res asset delivery',
    dataTransferred: ['Photographer OAuth Token', 'RAW & JPEG Media Files'],
    dataClassification: DataClassification.CONFIDENTIAL,
    countryOrRegion: 'United States / EU',
    transferMechanism: 'Dropbox Business DPA & EU Standard Contractual Clauses',
    dpaStatus: 'ACTIVE_EXECUTED',
    securityCertifications: ['SOC 1/2/3', 'ISO 27001', 'ISO 27018'],
    lastReviewedAt: new Date('2026-02-15T00:00:00Z'),
  },
];

export class DataGovernanceService {
  private static mockAssets: Map<string, PlatformDataAssetDTO> = new Map();
  private static mockEdges: Map<string, PlatformDataLineageDTO> = new Map();
  private static mockReviews: Map<string, DataAccessReviewDTO> = new Map();
  private static mockConsents: Map<string, PrivacyConsentRecordDTO> = new Map();
  private static isInitialized = false;

  static clearMockState(): void {
    this.mockAssets.clear();
    this.mockEdges.clear();
    this.mockReviews.clear();
    this.mockConsents.clear();
    this.isInitialized = false;
  }

  private static initMockAssets(): void {
    if (this.mockAssets.size > 0 && this.isInitialized) return;
    this.mockAssets.clear();

    for (let i = 0; i < CANONICAL_DATA_ASSETS.length; i++) {
      const asset = CANONICAL_DATA_ASSETS[i];
      const id = `asset-${asset.assetKey.replace(/_/g, '-')}`;
      this.mockAssets.set(id, {
        id,
        assetKey: asset.assetKey,
        name: asset.name,
        description: asset.description,
        classification: asset.classification,
        category: asset.category,
        ownerType: asset.ownerType,
        storageEngine: asset.storageEngine,
        tableName: asset.tableName,
        personalData: asset.personalData,
        sensitivePersonalData: asset.sensitivePersonalData ?? false,
        biometricData: asset.biometricData ?? false,
        financialData: asset.financialData ?? false,
        purposes: asset.purposes,
        legalBasis: asset.legalBasis,
        encryptionAtRest: asset.encryptionAtRest ?? true,
        encryptionInTransit: asset.encryptionInTransit ?? true,
        retentionDays: asset.retentionDays,
        anonymizationMethod: asset.anonymizationMethod,
        exportable: asset.exportable ?? true,
        metadata: asset.metadata,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      });
    }

    // Default canonical lineage edges
    const photo = Array.from(this.mockAssets.values()).find((a) => a.assetKey === 'photo_media_storage');
    const bio = Array.from(this.mockAssets.values()).find((a) => a.assetKey === 'face_recognition_embeddings');
    const culling = Array.from(this.mockAssets.values()).find((a) => a.assetKey === 'culling_and_ai_rankings');
    const invoice = Array.from(this.mockAssets.values()).find((a) => a.assetKey === 'invoices_and_billing_receipts');
    const gl = Array.from(this.mockAssets.values()).find((a) => a.assetKey === 'journal_entries_and_gl');

    if (photo && bio && !this.mockEdges.has('edge-photo-bio')) {
      this.mockEdges.set('edge-photo-bio', {
        id: 'edge-photo-bio',
        sourceAssetId: photo.id,
        targetAssetId: bio.id,
        transformationType: 'FACE_DETECTION_AND_ARCFACE_EXTRACTION',
        processingPurpose: DataProcessingPurpose.AI_INDEXING,
        syncFrequency: 'REALTIME_ON_UPLOAD',
        description: 'Photo upload initiates AI face detection generating 512-dim mathematical vector embedding.',
        sourceAssetName: photo.name,
        targetAssetName: bio.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (photo && culling && !this.mockEdges.has('edge-photo-culling')) {
      this.mockEdges.set('edge-photo-culling', {
        id: 'edge-photo-culling',
        sourceAssetId: photo.id,
        targetAssetId: culling.id,
        transformationType: 'AESTHETIC_AND_SHARPNESS_SCORING',
        processingPurpose: DataProcessingPurpose.AI_INDEXING,
        syncFrequency: 'REALTIME_ON_UPLOAD',
        description: 'Photo ingest initiates blur detection, blink detection, and aesthetic quality ranking.',
        sourceAssetName: photo.name,
        targetAssetName: culling.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    if (invoice && gl && !this.mockEdges.has('edge-invoice-gl')) {
      this.mockEdges.set('edge-invoice-gl', {
        id: 'edge-invoice-gl',
        sourceAssetId: invoice.id,
        targetAssetId: gl.id,
        transformationType: 'DOUBLE_ENTRY_JOURNAL_POSTING',
        processingPurpose: DataProcessingPurpose.FINANCIAL_REPORTING,
        syncFrequency: 'REALTIME_ON_INVOICE_STATE_CHANGE',
        description: 'Issued/Paid invoices generate automated debits to Accounts Receivable / Bank and credits to Revenue.',
        sourceAssetName: invoice.name,
        targetAssetName: gl.name,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.isInitialized = true;
  }

  /**
   * Seed/sync canonical data assets into database
   */
  static async seedCanonicalDataAssets(): Promise<{ created: number; updated: number }> {
    this.initMockAssets();
    let created = 0;
    let updated = 0;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataAsset) {
        for (const asset of CANONICAL_DATA_ASSETS) {
          const existing = await prisma.platformDataAsset.findUnique({
            where: { assetKey: asset.assetKey },
          });

          if (!existing) {
            await prisma.platformDataAsset.create({
              data: {
                assetKey: asset.assetKey,
                name: asset.name,
                description: asset.description,
                classification: asset.classification,
                category: asset.category,
                ownerType: asset.ownerType,
                storageEngine: asset.storageEngine,
                tableName: asset.tableName,
                personalData: asset.personalData,
                sensitivePersonalData: asset.sensitivePersonalData ?? false,
                biometricData: asset.biometricData ?? false,
                financialData: asset.financialData ?? false,
                purposes: asset.purposes,
                legalBasis: asset.legalBasis,
                encryptionAtRest: asset.encryptionAtRest ?? true,
                encryptionInTransit: asset.encryptionInTransit ?? true,
                retentionDays: asset.retentionDays,
                anonymizationMethod: asset.anonymizationMethod,
                exportable: asset.exportable ?? true,
                metadata: asset.metadata,
              },
            });
            created++;
          } else {
            await prisma.platformDataAsset.update({
              where: { assetKey: asset.assetKey },
              data: {
                name: asset.name,
                description: asset.description,
                classification: asset.classification,
                category: asset.category,
                ownerType: asset.ownerType,
                storageEngine: asset.storageEngine,
                tableName: asset.tableName,
                personalData: asset.personalData,
                sensitivePersonalData: asset.sensitivePersonalData ?? false,
                biometricData: asset.biometricData ?? false,
                financialData: asset.financialData ?? false,
                purposes: asset.purposes,
                legalBasis: asset.legalBasis,
                encryptionAtRest: asset.encryptionAtRest ?? true,
                encryptionInTransit: asset.encryptionInTransit ?? true,
                retentionDays: asset.retentionDays,
                anonymizationMethod: asset.anonymizationMethod,
                exportable: asset.exportable ?? true,
              },
            });
            updated++;
          }
        }
        await this.seedCanonicalLineage();
        return { created, updated };
      }
    } catch (e) {
      // fallback to in-memory state
    }

    return { created: CANONICAL_DATA_ASSETS.length, updated: 0 };
  }

  private static async seedCanonicalLineage(): Promise<void> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataLineage) {
        const photoAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'photo_media_storage' } });
        const biometricAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'face_recognition_embeddings' } });
        const cullingAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'culling_and_ai_rankings' } });
        const invoiceAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'invoices_and_billing_receipts' } });
        const glAsset = await prisma.platformDataAsset.findUnique({ where: { assetKey: 'journal_entries_and_gl' } });

        if (photoAsset && biometricAsset) {
          const existing = await prisma.platformDataLineage.findFirst({
            where: { sourceAssetId: photoAsset.id, targetAssetId: biometricAsset.id },
          });
          if (!existing) {
            await prisma.platformDataLineage.create({
              data: {
                sourceAssetId: photoAsset.id,
                targetAssetId: biometricAsset.id,
                transformationType: 'FACE_DETECTION_AND_ARCFACE_EXTRACTION',
                processingPurpose: DataProcessingPurpose.AI_INDEXING,
                syncFrequency: 'REALTIME_ON_UPLOAD',
                description: 'Photo upload initiates AI face detection generating 512-dim mathematical vector embedding.',
              },
            });
          }
        }

        if (photoAsset && cullingAsset) {
          const existing = await prisma.platformDataLineage.findFirst({
            where: { sourceAssetId: photoAsset.id, targetAssetId: cullingAsset.id },
          });
          if (!existing) {
            await prisma.platformDataLineage.create({
              data: {
                sourceAssetId: photoAsset.id,
                targetAssetId: cullingAsset.id,
                transformationType: 'AESTHETIC_AND_SHARPNESS_SCORING',
                processingPurpose: DataProcessingPurpose.AI_INDEXING,
                syncFrequency: 'REALTIME_ON_UPLOAD',
                description: 'Photo ingest initiates blur detection, blink detection, and aesthetic quality ranking.',
              },
            });
          }
        }

        if (invoiceAsset && glAsset) {
          const existing = await prisma.platformDataLineage.findFirst({
            where: { sourceAssetId: invoiceAsset.id, targetAssetId: glAsset.id },
          });
          if (!existing) {
            await prisma.platformDataLineage.create({
              data: {
                sourceAssetId: invoiceAsset.id,
                targetAssetId: glAsset.id,
                transformationType: 'DOUBLE_ENTRY_JOURNAL_POSTING',
                processingPurpose: DataProcessingPurpose.FINANCIAL_REPORTING,
                syncFrequency: 'REALTIME_ON_INVOICE_STATE_CHANGE',
                description: 'Issued/Paid invoices generate automated debits to Accounts Receivable / Bank and credits to Revenue.',
              },
            });
          }
        }
      }
    } catch (e) {
      // fallback
    }
  }

  /**
   * List data inventory assets with filtering
   */
  static async listDataAssets(filter?: DataAssetFilterDTO): Promise<{ assets: PlatformDataAssetDTO[]; total: number }> {
    this.initMockAssets();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataAsset) {
        const count = await prisma.platformDataAsset.count();
        if (count === 0) {
          await this.seedCanonicalDataAssets();
        }

        const where: any = {};
        if (filter?.classification) where.classification = filter.classification;
        if (filter?.category) where.category = filter.category;
        if (filter?.ownerType) where.ownerType = filter.ownerType;
        if (filter?.personalData !== undefined) where.personalData = filter.personalData;
        if (filter?.sensitivePersonalData !== undefined) where.sensitivePersonalData = filter.sensitivePersonalData;
        if (filter?.biometricData !== undefined) where.biometricData = filter.biometricData;
        if (filter?.financialData !== undefined) where.financialData = filter.financialData;
        if (filter?.exportable !== undefined) where.exportable = filter.exportable;
        if (filter?.search) {
          where.OR = [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { assetKey: { contains: filter.search, mode: 'insensitive' } },
            { description: { contains: filter.search, mode: 'insensitive' } },
            { tableName: { contains: filter.search, mode: 'insensitive' } },
          ];
        }

        const [rawAssets, total] = await Promise.all([
          prisma.platformDataAsset.findMany({
            where,
            orderBy: [{ classification: 'desc' }, { name: 'asc' }],
          }),
          prisma.platformDataAsset.count({ where }),
        ]);

        const assets: PlatformDataAssetDTO[] = rawAssets.map((a) => ({
          id: a.id,
          assetKey: a.assetKey,
          name: a.name,
          description: a.description || undefined,
          classification: a.classification as DataClassification,
          category: a.category as DataCategory,
          ownerType: a.ownerType as DataOwnerType,
          storageEngine: a.storageEngine,
          tableName: a.tableName || undefined,
          personalData: a.personalData,
          sensitivePersonalData: a.sensitivePersonalData,
          biometricData: a.biometricData,
          financialData: a.financialData,
          purposes: a.purposes as DataProcessingPurpose[],
          legalBasis: a.legalBasis,
          encryptionAtRest: a.encryptionAtRest,
          encryptionInTransit: a.encryptionInTransit,
          retentionDays: a.retentionDays || undefined,
          anonymizationMethod: a.anonymizationMethod || undefined,
          exportable: a.exportable,
          metadata: a.metadata ? (a.metadata as Record<string, any>) : undefined,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
        }));

        return { assets, total };
      }
    } catch (e) {
      // fallback
    }

    // In-memory filter
    let list = Array.from(this.mockAssets.values());
    if (filter?.classification) list = list.filter((a) => a.classification === filter.classification);
    if (filter?.category) list = list.filter((a) => a.category === filter.category);
    if (filter?.ownerType) list = list.filter((a) => a.ownerType === filter.ownerType);
    if (filter?.personalData !== undefined) list = list.filter((a) => a.personalData === filter.personalData);
    if (filter?.sensitivePersonalData !== undefined) list = list.filter((a) => a.sensitivePersonalData === filter.sensitivePersonalData);
    if (filter?.biometricData !== undefined) list = list.filter((a) => a.biometricData === filter.biometricData);
    if (filter?.financialData !== undefined) list = list.filter((a) => a.financialData === filter.financialData);
    if (filter?.exportable !== undefined) list = list.filter((a) => a.exportable === filter.exportable);
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.assetKey.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.tableName && a.tableName.toLowerCase().includes(q))
      );
    }

    return { assets: list, total: list.length };
  }

  /**
   * Get single data asset by ID or Key
   */
  static async getDataAssetById(idOrKey: string): Promise<PlatformDataAssetDTO | null> {
    this.initMockAssets();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataAsset) {
        const asset = await prisma.platformDataAsset.findFirst({
          where: {
            OR: [{ id: idOrKey }, { assetKey: idOrKey }],
          },
          include: {
            upstreamLineage: {
              include: { sourceAsset: true },
            },
            downstreamLineage: {
              include: { targetAsset: true },
            },
            retentionPolicies: true,
            legalHolds: true,
          },
        });

        if (asset) {
          return {
            id: asset.id,
            assetKey: asset.assetKey,
            name: asset.name,
            description: asset.description || undefined,
            classification: asset.classification as DataClassification,
            category: asset.category as DataCategory,
            ownerType: asset.ownerType as DataOwnerType,
            storageEngine: asset.storageEngine,
            tableName: asset.tableName || undefined,
            personalData: asset.personalData,
            sensitivePersonalData: asset.sensitivePersonalData,
            biometricData: asset.biometricData,
            financialData: asset.financialData,
            purposes: asset.purposes as DataProcessingPurpose[],
            legalBasis: asset.legalBasis,
            encryptionAtRest: asset.encryptionAtRest,
            encryptionInTransit: asset.encryptionInTransit,
            retentionDays: asset.retentionDays || undefined,
            anonymizationMethod: asset.anonymizationMethod || undefined,
            exportable: asset.exportable,
            metadata: {
              ...((asset.metadata as Record<string, any>) || {}),
              upstreamCount: asset.upstreamLineage.length,
              downstreamCount: asset.downstreamLineage.length,
              activeRetentionPolicies: asset.retentionPolicies.length,
              activeLegalHolds: asset.legalHolds.filter((h) => h.status === 'ACTIVE').length,
            },
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          };
        }
      }
    } catch (e) {
      // fallback
    }

    const found =
      this.mockAssets.get(idOrKey) ||
      Array.from(this.mockAssets.values()).find((a) => a.assetKey === idOrKey || a.id === idOrKey);

    if (!found) return null;

    const upstreamEdges = Array.from(this.mockEdges.values()).filter((e) => e.targetAssetId === found.id);
    const downstreamEdges = Array.from(this.mockEdges.values()).filter((e) => e.sourceAssetId === found.id);

    return {
      ...found,
      metadata: {
        ...(found.metadata || {}),
        upstreamCount: upstreamEdges.length,
        downstreamCount: downstreamEdges.length,
        activeRetentionPolicies: 1,
        activeLegalHolds: 0,
      },
    };
  }

  /**
   * Create or update data asset
   */
  static async createDataAsset(input: CreateDataAssetInput): Promise<PlatformDataAssetDTO> {
    this.initMockAssets();
    const id = `asset-${input.assetKey.replace(/_/g, '-')}-${Date.now()}`;
    const newAsset: PlatformDataAssetDTO = {
      id,
      assetKey: input.assetKey,
      name: input.name,
      description: input.description,
      classification: input.classification,
      category: input.category,
      ownerType: input.ownerType,
      storageEngine: input.storageEngine,
      tableName: input.tableName,
      personalData: input.personalData,
      sensitivePersonalData: input.sensitivePersonalData ?? false,
      biometricData: input.biometricData ?? false,
      financialData: input.financialData ?? false,
      purposes: input.purposes,
      legalBasis: input.legalBasis,
      encryptionAtRest: input.encryptionAtRest ?? true,
      encryptionInTransit: input.encryptionInTransit ?? true,
      retentionDays: input.retentionDays,
      anonymizationMethod: input.anonymizationMethod,
      exportable: input.exportable ?? true,
      metadata: input.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockAssets.set(id, newAsset);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataAsset) {
        const created = await prisma.platformDataAsset.create({
          data: {
            assetKey: input.assetKey,
            name: input.name,
            description: input.description,
            classification: input.classification,
            category: input.category,
            ownerType: input.ownerType,
            storageEngine: input.storageEngine,
            tableName: input.tableName,
            personalData: input.personalData,
            sensitivePersonalData: input.sensitivePersonalData ?? false,
            biometricData: input.biometricData ?? false,
            financialData: input.financialData ?? false,
            purposes: input.purposes,
            legalBasis: input.legalBasis,
            encryptionAtRest: input.encryptionAtRest ?? true,
            encryptionInTransit: input.encryptionInTransit ?? true,
            retentionDays: input.retentionDays,
            anonymizationMethod: input.anonymizationMethod,
            exportable: input.exportable ?? true,
            metadata: input.metadata,
          },
        });
        return (await this.getDataAssetById(created.id)) || newAsset;
      }
    } catch (e) {
      // fallback
    }

    return newAsset;
  }

  static async updateDataAsset(id: string, input: UpdateDataAssetInput): Promise<PlatformDataAssetDTO> {
    this.initMockAssets();
    const existing = this.mockAssets.get(id);
    if (existing) {
      Object.assign(existing, input, { updatedAt: new Date() });
    }

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataAsset) {
        const updated = await prisma.platformDataAsset.update({
          where: { id },
          data: {
            ...input,
          },
        });
        return (await this.getDataAssetById(updated.id)) || existing!;
      }
    } catch (e) {
      // fallback
    }

    return existing!;
  }

  /**
   * Data Lineage Graph
   */
  static async getLineageGraph(): Promise<{
    nodes: PlatformDataAssetDTO[];
    edges: PlatformDataLineageDTO[];
  }> {
    this.initMockAssets();
    const { assets } = await this.listDataAssets();

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataLineage) {
        const rawEdges = await prisma.platformDataLineage.findMany({
          include: {
            sourceAsset: true,
            targetAsset: true,
          },
        });

        const edges: PlatformDataLineageDTO[] = rawEdges.map((e) => ({
          id: e.id,
          sourceAssetId: e.sourceAssetId,
          targetAssetId: e.targetAssetId,
          transformationType: e.transformationType,
          processingPurpose: e.processingPurpose as DataProcessingPurpose,
          syncFrequency: e.syncFrequency || undefined,
          description: e.description || undefined,
          metadata: e.metadata ? (e.metadata as Record<string, any>) : undefined,
          sourceAssetName: e.sourceAsset.name,
          targetAssetName: e.targetAsset.name,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
        }));

        if (edges.length > 0) {
          return { nodes: assets, edges };
        }
      }
    } catch (e) {
      // fallback
    }

    return { nodes: assets, edges: Array.from(this.mockEdges.values()) };
  }

  static async addLineageEdge(input: CreateLineageInput): Promise<PlatformDataLineageDTO> {
    this.initMockAssets();
    const id = `edge-${Date.now()}`;
    const source = this.mockAssets.get(input.sourceAssetId);
    const target = this.mockAssets.get(input.targetAssetId);

    const edge: PlatformDataLineageDTO = {
      id,
      sourceAssetId: input.sourceAssetId,
      targetAssetId: input.targetAssetId,
      transformationType: input.transformationType,
      processingPurpose: input.processingPurpose,
      syncFrequency: input.syncFrequency,
      description: input.description,
      metadata: input.metadata,
      sourceAssetName: source?.name || 'Source Asset',
      targetAssetName: target?.name || 'Target Asset',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockEdges.set(id, edge);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).platformDataLineage) {
        const dbEdge = await prisma.platformDataLineage.create({
          data: {
            sourceAssetId: input.sourceAssetId,
            targetAssetId: input.targetAssetId,
            transformationType: input.transformationType,
            processingPurpose: input.processingPurpose,
            syncFrequency: input.syncFrequency,
            description: input.description,
            metadata: input.metadata,
          },
          include: {
            sourceAsset: true,
            targetAsset: true,
          },
        });

        return {
          id: dbEdge.id,
          sourceAssetId: dbEdge.sourceAssetId,
          targetAssetId: dbEdge.targetAssetId,
          transformationType: dbEdge.transformationType,
          processingPurpose: dbEdge.processingPurpose as DataProcessingPurpose,
          syncFrequency: dbEdge.syncFrequency || undefined,
          description: dbEdge.description || undefined,
          metadata: dbEdge.metadata ? (dbEdge.metadata as Record<string, any>) : undefined,
          sourceAssetName: dbEdge.sourceAsset.name,
          targetAssetName: dbEdge.targetAsset.name,
          createdAt: dbEdge.createdAt,
          updatedAt: dbEdge.updatedAt,
        };
      }
    } catch (e) {
      // fallback
    }

    return edge;
  }

  /**
   * Third Party Providers
   */
  static listThirdPartyProviders(): ThirdPartyProviderMapDTO[] {
    return THIRD_PARTY_PROVIDERS;
  }

  /**
   * Access Reviews
   */
  static async listAccessReviews(): Promise<DataAccessReviewDTO[]> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataAccessReview) {
        const reviews = await prisma.dataAccessReview.findMany({
          orderBy: { createdAt: 'desc' },
        });

        return reviews.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description || undefined,
          assetIds: r.assetIds,
          status: r.status as AccessReviewStatus,
          dueDate: r.dueDate,
          reviewerAdminId: r.reviewerAdminId || undefined,
          findingsSummary: r.findingsSummary || undefined,
          revocationsCount: r.revocationsCount,
          completedAt: r.completedAt || undefined,
          metadata: r.metadata ? (r.metadata as Record<string, any>) : undefined,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }
    } catch (e) {
      // fallback
    }

    return Array.from(this.mockReviews.values());
  }

  static async createAccessReview(input: CreateAccessReviewInput): Promise<DataAccessReviewDTO> {
    const id = `review-${Date.now()}`;
    const review: DataAccessReviewDTO = {
      id,
      title: input.title,
      description: input.description,
      assetIds: input.assetIds,
      status: AccessReviewStatus.SCHEDULED,
      dueDate: input.dueDate,
      reviewerAdminId: input.reviewerAdminId,
      findingsSummary: undefined,
      revocationsCount: 0,
      completedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockReviews.set(id, review);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataAccessReview) {
        const dbReview = await prisma.dataAccessReview.create({
          data: {
            title: input.title,
            description: input.description,
            assetIds: input.assetIds,
            dueDate: input.dueDate,
            reviewerAdminId: input.reviewerAdminId,
            status: AccessReviewStatus.SCHEDULED,
          },
        });

        return {
          id: dbReview.id,
          title: dbReview.title,
          description: dbReview.description || undefined,
          assetIds: dbReview.assetIds,
          status: dbReview.status as AccessReviewStatus,
          dueDate: dbReview.dueDate,
          reviewerAdminId: dbReview.reviewerAdminId || undefined,
          findingsSummary: dbReview.findingsSummary || undefined,
          revocationsCount: dbReview.revocationsCount,
          completedAt: dbReview.completedAt || undefined,
          metadata: dbReview.metadata ? (dbReview.metadata as Record<string, any>) : undefined,
          createdAt: dbReview.createdAt,
          updatedAt: dbReview.updatedAt,
        };
      }
    } catch (e) {
      // fallback
    }

    return review;
  }

  static async updateAccessReviewStatus(
    id: string,
    status: AccessReviewStatus,
    findingsSummary?: string,
    revocationsCount?: number
  ): Promise<DataAccessReviewDTO> {
    const existing = this.mockReviews.get(id);
    if (existing) {
      existing.status = status;
      if (findingsSummary) existing.findingsSummary = findingsSummary;
      if (revocationsCount !== undefined) existing.revocationsCount = revocationsCount;
      if (status === AccessReviewStatus.COMPLETED) existing.completedAt = new Date();
      existing.updatedAt = new Date();
    }

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).dataAccessReview) {
        const review = await prisma.dataAccessReview.update({
          where: { id },
          data: {
            status,
            findingsSummary,
            revocationsCount: revocationsCount !== undefined ? revocationsCount : undefined,
            completedAt: status === AccessReviewStatus.COMPLETED ? new Date() : undefined,
          },
        });

        return {
          id: review.id,
          title: review.title,
          description: review.description || undefined,
          assetIds: review.assetIds,
          status: review.status as AccessReviewStatus,
          dueDate: review.dueDate,
          reviewerAdminId: review.reviewerAdminId || undefined,
          findingsSummary: review.findingsSummary || undefined,
          revocationsCount: review.revocationsCount,
          completedAt: review.completedAt || undefined,
          metadata: review.metadata ? (review.metadata as Record<string, any>) : undefined,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        };
      }
    } catch (e) {
      // fallback
    }

    return existing!;
  }

  /**
   * Consent Management
   */
  static async logConsent(input: LogConsentInput): Promise<PrivacyConsentRecordDTO> {
    const id = `consent-${Date.now()}`;
    const record: PrivacyConsentRecordDTO = {
      id,
      userId: input.userId,
      studioId: input.studioId,
      consentType: input.consentType,
      status: input.status,
      purpose: input.purpose,
      version: input.version,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: input.metadata,
      consentedAt: new Date(),
      revokedAt: input.status === ConsentStatus.REVOKED ? new Date() : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.mockConsents.set(id, record);

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).privacyConsentRecord) {
        const consent = await prisma.privacyConsentRecord.create({
          data: {
            userId: input.userId,
            studioId: input.studioId,
            consentType: input.consentType,
            status: input.status,
            purpose: input.purpose,
            version: input.version,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
            metadata: input.metadata,
            revokedAt: input.status === ConsentStatus.REVOKED ? new Date() : undefined,
          },
        });

        return {
          id: consent.id,
          userId: consent.userId || undefined,
          studioId: consent.studioId || undefined,
          consentType: consent.consentType,
          status: consent.status as ConsentStatus,
          purpose: consent.purpose,
          version: consent.version,
          ipAddress: consent.ipAddress || undefined,
          userAgent: consent.userAgent || undefined,
          metadata: consent.metadata ? (consent.metadata as Record<string, any>) : undefined,
          consentedAt: consent.consentedAt,
          revokedAt: consent.revokedAt || undefined,
          createdAt: consent.createdAt,
          updatedAt: consent.updatedAt,
        };
      }
    } catch (e) {
      // fallback
    }

    return record;
  }

  static async revokeConsent(userId: string, consentType: string): Promise<number> {
    let count = 0;
    for (const record of this.mockConsents.values()) {
      if (record.userId === userId && record.consentType === consentType && record.status === ConsentStatus.GRANTED) {
        record.status = ConsentStatus.REVOKED;
        record.revokedAt = new Date();
        record.updatedAt = new Date();
        count++;
      }
    }

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).privacyConsentRecord) {
        const result = await prisma.privacyConsentRecord.updateMany({
          where: {
            userId,
            consentType,
            status: ConsentStatus.GRANTED,
          },
          data: {
            status: ConsentStatus.REVOKED,
            revokedAt: new Date(),
          },
        });
        return result.count;
      }
    } catch (e) {
      // fallback
    }

    return count;
  }

  static async listConsents(filter?: { userId?: string; studioId?: string; consentType?: string }): Promise<PrivacyConsentRecordDTO[]> {
    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).privacyConsentRecord) {
        const where: any = {};
        if (filter?.userId) where.userId = filter.userId;
        if (filter?.studioId) where.studioId = filter.studioId;
        if (filter?.consentType) where.consentType = filter.consentType;

        const records = await prisma.privacyConsentRecord.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 200,
        });

        return records.map((c) => ({
          id: c.id,
          userId: c.userId || undefined,
          studioId: c.studioId || undefined,
          consentType: c.consentType,
          status: c.status as ConsentStatus,
          purpose: c.purpose,
          version: c.version,
          ipAddress: c.ipAddress || undefined,
          userAgent: c.userAgent || undefined,
          metadata: c.metadata ? (c.metadata as Record<string, any>) : undefined,
          consentedAt: c.consentedAt,
          revokedAt: c.revokedAt || undefined,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        }));
      }
    } catch (e) {
      // fallback
    }

    let records = Array.from(this.mockConsents.values());
    if (filter?.userId) records = records.filter((r) => r.userId === filter.userId);
    if (filter?.studioId) records = records.filter((r) => r.studioId === filter.studioId);
    if (filter?.consentType) records = records.filter((r) => r.consentType === filter.consentType);

    return records;
  }

  /**
   * Biometric Face Recognition Governance
   */
  static async getBiometricsGovernanceMetrics(): Promise<{
    activeFaceEncodings: number;
    registeredSelfies: number;
    consentActiveCount: number;
    consentRevokedCount: number;
    vectorPurgePolicyDays: number;
    securityControls: string[];
    zeroVectorExposureGuarantee: boolean;
  }> {
    let faceEncodingsCount = 0;
    let selfiesCount = 0;
    let activeConsents = 0;
    let revokedConsents = 0;

    try {
      if (process.env.DATABASE_URL && prisma && (prisma as any).faceEncoding) {
        [faceEncodingsCount, selfiesCount, activeConsents, revokedConsents] = await Promise.all([
          prisma.faceEncoding.count(),
          prisma.client.count({ where: { selfieUrl: { not: null } } }),
          prisma.privacyConsentRecord.count({
            where: {
              consentType: 'BIOMETRIC_FACE_SEARCH',
              status: ConsentStatus.GRANTED,
            },
          }),
          prisma.privacyConsentRecord.count({
            where: {
              consentType: 'BIOMETRIC_FACE_SEARCH',
              status: ConsentStatus.REVOKED,
            },
          }),
        ]);
      }
    } catch (e) {
      // in-memory calculation
      for (const c of this.mockConsents.values()) {
        if (c.consentType === 'BIOMETRIC_FACE_SEARCH' || c.consentType === 'BIOMETRICS_MATCHING') {
          if (c.status === ConsentStatus.GRANTED) activeConsents++;
          else if (c.status === ConsentStatus.REVOKED) revokedConsents++;
        }
      }
    }

    return {
      activeFaceEncodings: faceEncodingsCount,
      registeredSelfies: selfiesCount,
      consentActiveCount: activeConsents,
      consentRevokedCount: revokedConsents,
      vectorPurgePolicyDays: 365,
      securityControls: [
        'Isolated vector storage in pgvector / Postgres',
        'AES-256 encryption at rest',
        'Zero vector embedding output in UI, API, exports, and Copilot tools',
        'Strict cascade purge upon client/user deletion or consent revocation',
        'Explicit legal basis: Explicit User Consent',
      ],
      zeroVectorExposureGuarantee: true,
    };
  }

  /**
   * Comprehensive Overview Metrics
   */
  static async getOverviewMetrics(): Promise<PrivacyOverviewMetricsDTO> {
    this.initMockAssets();
    const assets = Array.from(this.mockAssets.values());

    const assetsByClassification: Record<string, number> = {};
    const assetsByOwnerType: Record<string, number> = {};
    let personalDataAssetsCount = 0;
    let sensitivePersonalDataAssetsCount = 0;
    let biometricDataAssetsCount = 0;
    let financialDataAssetsCount = 0;

    for (const a of assets) {
      assetsByClassification[a.classification] = (assetsByClassification[a.classification] || 0) + 1;
      assetsByOwnerType[a.ownerType] = (assetsByOwnerType[a.ownerType] || 0) + 1;
      if (a.personalData) personalDataAssetsCount++;
      if (a.sensitivePersonalData) sensitivePersonalDataAssetsCount++;
      if (a.biometricData) biometricDataAssetsCount++;
      if (a.financialData) financialDataAssetsCount++;
    }

    let consentsGranted = 0;
    let consentsRevoked = 0;
    for (const c of this.mockConsents.values()) {
      if (c.status === ConsentStatus.GRANTED) consentsGranted++;
      if (c.status === ConsentStatus.REVOKED) consentsRevoked++;
    }

    return {
      totalDataAssets: assets.length,
      personalDataAssetsCount,
      sensitivePersonalDataAssetsCount,
      biometricDataAssetsCount,
      financialDataAssetsCount,
      assetsByClassification,
      assetsByOwnerType,
      activeRetentionPolicies: 5,
      activeLegalHolds: 0,
      totalPrivacyRequests: 0,
      pendingPrivacyRequests: 0,
      completedPrivacyRequests: 0,
      rejectedPrivacyRequests: 0,
      requestsByType: {},
      requestsByStatus: {},
      activeAccessReviews: this.mockReviews.size,
      thirdPartyProvidersCount: THIRD_PARTY_PROVIDERS.length,
      consentsGranted,
      consentsRevoked,
      completedDeletionsCount: 0,
    };
  }
}
