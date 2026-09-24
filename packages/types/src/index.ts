// ==========================================
// USER & ROLE ENUMS AND INTERFACES
// ==========================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
  PLATFORM_FINANCE = 'PLATFORM_FINANCE',
  PLATFORM_OPERATIONS = 'PLATFORM_OPERATIONS',
  PLATFORM_SECURITY = 'PLATFORM_SECURITY',
  PLATFORM_ANALYST = 'PLATFORM_ANALYST',
  PLATFORM_VIEWER = 'PLATFORM_VIEWER',
  STUDIO_OWNER = 'STUDIO_OWNER',
  STUDIO_MEMBER = 'STUDIO_MEMBER',
  CLIENT = 'CLIENT',
}

export enum PlatformAdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  PLATFORM_SUPPORT = 'PLATFORM_SUPPORT',
  PLATFORM_FINANCE = 'PLATFORM_FINANCE',
  PLATFORM_OPERATIONS = 'PLATFORM_OPERATIONS',
  PLATFORM_SECURITY = 'PLATFORM_SECURITY',
  PLATFORM_ANALYST = 'PLATFORM_ANALYST',
  PLATFORM_VIEWER = 'PLATFORM_VIEWER',
}

export enum StudioMemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  ASSISTANT = 'ASSISTANT',
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// ==========================================
// STUDIO & MULTI-TENANT TYPES
// ==========================================

export interface StudioDTO {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  website?: string | null;
  currency?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface StudioMembershipDTO {
  id: string;
  user_id: string;
  studio_id: string;
  role: StudioMemberRole;
  created_at: Date | string;
  user?: UserDTO;
  studio?: StudioDTO;
}

// ==========================================
// GALLERY TYPES
// ==========================================

export enum GalleryAccessType {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PASSWORD = 'PASSWORD',
  PRIVATE = 'PRIVATE',
}

export enum GalleryStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface GalleryDTO {
  id: string;
  studio_id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: Date | string;
  description?: string | null;
  cover_photo_url?: string | null;
  access_type: GalleryAccessType;
  status: GalleryStatus;
  password_hash?: string | null;
  enable_ai_face_search?: boolean;
  ai_indexing_status?: ProcessingStatus;
  face_match_sensitivity?: string;
  total_faces_detected?: number;
  ai_indexed_photos_count?: number;
  photo_count?: number;
  total_size_bytes?: number;
  is_unlisted?: boolean;
  expires_at?: Date | string | null;
  downloads_enabled?: boolean;
  download_originals_enabled?: boolean;
  bulk_download_enabled?: boolean;
  client_views_count?: number;
  created_at: Date | string;
  updated_at: Date | string;
  studio?: StudioDTO;
  photos?: PhotoDTO[];
  albums?: AlbumDTO[];
}

export interface AlbumDTO {
  id: string;
  gallery_id: string;
  studio_id: string;
  title: string;
  description?: string | null;
  sort_order: number;
  cover_photo_id?: string | null;
  photo_count?: number;
  cover_photo_url?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface GalleryOverviewStatsDTO {
  gallery_id: string;
  photo_count: number;
  processed_photos_count: number;
  ai_indexed_photos_count: number;
  total_faces_detected: number;
  client_views_count: number;
  favorites_count: number;
  selections_count: number;
  downloads_count: number;
  storage_used_bytes: number;
  processing_status: ProcessingStatus;
  ai_indexing_status: ProcessingStatus;
  recent_activity: Array<{
    id: string;
    action: string;
    description: string;
    timestamp: Date | string;
  }>;
}

export interface StudioDashboardStatsDTO {
  total_galleries: number;
  total_photos: number;
  ai_indexed_photos: number;
  client_views: number;
  total_favorites: number;
  total_selections: number;
  storage_used_bytes: number;
  active_jobs_count: number;
  failed_jobs_count: number;
}

export interface BulkPhotoActionRequest {
  action: 'DELETE' | 'MOVE_TO_ALBUM' | 'REPROCESS' | 'REINDEX_AI';
  photo_ids: string[];
  target_album_id?: string | null;
}

export interface PhotoReorderRequest {
  orders: Array<{
    photo_id: string;
    sort_order: number;
  }>;
}

// ==========================================
// CLIENT GALLERY & SESSION TYPES (PHASE 5)
// ==========================================

export interface GalleryClientSessionDTO {
  id: string;
  gallery_id: string;
  session_token: string;
  expires_at: Date | string;
  created_at: Date | string;
}

export interface PublicPhotoItemDTO {
  id: string;
  thumbnail_url: string;
  original_url?: string;
  sm_url?: string;
  md_url?: string;
  lg_url?: string;
  width?: number | null;
  height?: number | null;
  original_filename?: string | null;
  file_size?: number;
  aspect_ratio?: number;
  is_favorite?: boolean;
  is_selected?: boolean;
}

export interface PublicGalleryMetadataDTO {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  event_date: Date | string;
  description?: string | null;
  cover_photo_url?: string | null;
  access_type: GalleryAccessType;
  is_password_protected: boolean;
  enable_ai_face_search: boolean;
  face_match_sensitivity: string;
  downloads_enabled: boolean;
  download_originals_enabled: boolean;
  bulk_download_enabled: boolean;
  watermark_mode: string;
  expires_at?: Date | string | null;
  studio_name: string;
  studio_logo?: string | null;
  studio_website?: string | null;
  photo_count: number;
}

export interface PublicGalleryResponseDTO {
  gallery: PublicGalleryMetadataDTO;
  photos: PublicPhotoItemDTO[];
  session_token?: string;
  has_more: boolean;
  next_cursor?: string | null;
  total_count: number;
}

export enum DownloadJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export interface ClientDownloadJobDTO {
  id: string;
  gallery_id: string;
  status: DownloadJobStatus;
  photo_count: number;
  file_size: number;
  download_url?: string | null;
  expires_at: Date | string;
  created_at: Date | string;
}

// ==========================================
// PHOTO TYPES
// ==========================================

export enum StorageProviderType {
  PLATFORM = 'PLATFORM',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  DROPBOX = 'DROPBOX',
  ONEDRIVE = 'ONEDRIVE',
  S3 = 'S3',
  CLOUDFLARE_R2 = 'CLOUDFLARE_R2',
  GENERIC_S3 = 'GENERIC_S3',
  EXTERNAL_URL = 'EXTERNAL_URL',
}

export interface S3StorageConfig {
  bucket: string;
  region?: string;
  endpoint?: string;
  prefix?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  customDomain?: string;
  forcePathStyle?: boolean;
}

export interface ExternalUrlStorageConfig {
  baseUrlOrManifestUrl: string;
  mode?: 'SINGLE_IMAGE' | 'MANIFEST' | 'DIRECTORY';
  headers?: Record<string, string>;
}

export enum ProcessingStatus {
  PENDING = 'PENDING',
  UPLOADING = 'UPLOADING',
  UPLOADED = 'UPLOADED',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum PhotoVersionType {
  ORIGINAL = 'ORIGINAL',
  THUMBNAIL_SM = 'THUMBNAIL_SM',
  THUMBNAIL_MD = 'THUMBNAIL_MD',
  THUMBNAIL_LG = 'THUMBNAIL_LG',
}

export interface PhotoVersionDTO {
  id: string;
  photo_id: string;
  version_type: PhotoVersionType;
  storage_path: string;
  url: string;
  width?: number | null;
  height?: number | null;
  file_size: number;
  mime_type: string;
  created_at: Date | string;
}

export interface PhotoDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  storage_provider: StorageProviderType;
  storage_path: string;
  external_file_id?: string | null;
  source_provider?: StorageProviderType | null;
  source_file_id?: string | null;
  source_path?: string | null;
  source_modified_at?: Date | string | null;
  source_status?: string;
  storage_connection_id?: string | null;
  original_url: string;
  thumbnail_url?: string | null;
  original_filename?: string | null;
  file_hash?: string | null;
  width?: number | null;
  height?: number | null;
  file_size: number;
  mime_type: string;
  processing_status: ProcessingStatus;
  face_count?: number;
  is_face_indexed?: boolean;
  album_id?: string | null;
  sort_order?: number;
  created_at: Date | string;
  updated_at?: Date | string;
  versions?: PhotoVersionDTO[];
  face_detections?: FaceDetectionDTO[];
}

// ==========================================
// AI FACE RECOGNITION & PGVECTOR TYPES
// ==========================================

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionDTO {
  id: string;
  photo_id: string;
  gallery_id: string;
  studio_id: string;
  bounding_box: FaceBoundingBox;
  confidence: number;
  face_quality_score: number;
  embedding?: number[];
  embedding_model: string;
  embedding_dimension: number;
  created_at: Date | string;
  updated_at?: Date | string;
}

export interface FaceSearchMatchDTO {
  photo_id: string;
  gallery_id: string;
  similarity_score: number;
  match_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  original_url?: string;
  thumbnail_url: string;
  sm_url?: string;
  md_url?: string;
  lg_url?: string;
  width?: number | null;
  height?: number | null;
  original_filename?: string | null;
  file_size?: number;
}

export interface FaceSearchResponseDTO {
  query_faces_detected: number;
  gallery_id: string;
  total_matches: number;
  matches: FaceSearchMatchDTO[];
  processing_time_ms: number;
  sensitivity_used: string;
}

export interface GalleryAiStatusDTO {
  gallery_id: string;
  enable_ai_face_search: boolean;
  ai_indexing_status: ProcessingStatus;
  face_match_sensitivity: string;
  total_photos: number;
  ai_indexed_photos_count: number;
  total_faces_detected: number;
  progress_percent: number;
  is_ready_for_search: boolean;
}

// ==========================================
// CLIENT CRM & DELIVERY TYPES (PHASE 7)
// ==========================================

export enum ClientStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum DeliveryStatus {
  NOT_SENT = 'NOT_SENT',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  OPENED = 'OPENED',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
}

export interface ClientGalleryDTO {
  id: string;
  client_id: string;
  gallery_id: string;
  studio_id: string;
  relationship_type: string;
  created_at: Date | string;
  gallery?: GalleryDTO;
}

export interface ClientActivityDTO {
  id: string;
  studio_id: string;
  client_id: string;
  gallery_id?: string | null;
  activity_type: string;
  description: string;
  metadata?: any;
  created_at: Date | string;
  gallery_title?: string | null;
}

export interface GalleryDeliveryDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  client_id: string;
  recipient_email: string;
  recipient_name?: string | null;
  custom_message?: string | null;
  delivery_type: string;
  status: DeliveryStatus;
  sent_at: Date | string;
  opened_at?: Date | string | null;
  last_accessed_at?: Date | string | null;
  access_count: number;
  error_message?: string | null;
  idempotency_key?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  client?: ClientDTO;
  gallery?: GalleryDTO;
}

export interface ClientDTO {
  id: string;
  studio_id: string;
  gallery_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  tags?: string[];
  status: ClientStatus;
  deleted_at?: Date | string | null;
  created_at: Date | string;
  updated_at?: Date | string;
  gallery?: GalleryDTO;
  galleries?: ClientGalleryDTO[];
  galleries_count?: number;
  photos_count?: number;
  favorites_count?: number;
  selections_count?: number;
  downloads_count?: number;
  last_activity_at?: Date | string | null;
  latest_gallery_title?: string | null;
}

export interface ClientListStatsDTO {
  total: number;
  active: number;
  with_galleries: number;
  recent_activity: number;
}

export interface ClientListResponseDTO {
  clients: ClientDTO[];
  has_more: boolean;
  next_cursor?: string | null;
  total_count: number;
  stats: ClientListStatsDTO;
}

export interface CreateClientRequest {
  first_name?: string;
  last_name?: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  gallery_id?: string;
  relationship_type?: string;
}

export interface UpdateClientRequest {
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  tags?: string[];
  status?: ClientStatus;
}

export interface SendGalleryDeliveryRequest {
  client_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  custom_message?: string;
  send_email?: boolean;
  idempotency_key?: string;
}

export interface AssignClientGalleryRequest {
  client_id: string;
  relationship_type?: string;
}

export enum StorageMode {
  IMPORT = 'IMPORT',
  CONNECTED = 'CONNECTED',
}

export enum StorageConnectionStatus {
  ACTIVE = 'ACTIVE',
  CONNECTED = 'CONNECTED',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
  REAUTH_REQUIRED = 'REAUTH_REQUIRED',
  DISCONNECTED = 'DISCONNECTED',
  READY = 'READY',
}

export enum StorageSyncStatus {
  IDLE = 'IDLE',
  QUEUED = 'QUEUED',
  SYNCING = 'SYNCING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface StorageFolderItem {
  id: string;
  name: string;
  path: string;
  parentId?: string | null;
  hasChildren?: boolean;
}

export interface StorageFileItem {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: Date | string;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

export interface StorageFileListResult {
  files: StorageFileItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface StorageConnectionDTO {
  id: string;
  studio_id: string;
  provider: StorageProviderType;
  display_name: string;
  provider_account_id?: string | null;
  provider_account_email?: string | null;
  status: StorageConnectionStatus;
  storage_mode: StorageMode;
  storage_used_bytes?: number;
  metadata?: Record<string, unknown> | null;
  last_sync_at?: Date | string | null;
  last_successful_sync_at?: Date | string | null;
  last_error?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface StorageSyncJobDTO {
  id: string;
  storage_connection_id: string;
  gallery_id: string;
  studio_id: string;
  status: StorageSyncStatus;
  storage_mode: StorageMode;
  files_discovered: number;
  files_imported: number;
  files_skipped: number;
  files_updated: number;
  files_deleted: number;
  files_failed: number;
  current_cursor?: string | null;
  error_message?: string | null;
  started_at?: Date | string | null;
  completed_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// ==========================================
// PROCESSING JOBS & WORKERS
// ==========================================

export enum JobType {
  PHOTO_PROCESSING = 'PHOTO_PROCESSING',
  IMAGE_UPLOAD = 'IMAGE_UPLOAD',
  THUMBNAIL_GENERATION = 'THUMBNAIL_GENERATION',
  METADATA_EXTRACTION = 'METADATA_EXTRACTION',
  FACE_INDEXING = 'FACE_INDEXING',
  AI_PROCESSING = 'AI_PROCESSING',
  AI_FACE_SEARCH = 'AI_FACE_SEARCH',
  STORAGE_SYNC = 'STORAGE_SYNC',
  GALLERY_CLEANUP = 'GALLERY_CLEANUP',
}

export interface ProcessingJobDTO {
  id: string;
  studio_id: string;
  gallery_id?: string | null;
  photo_id?: string | null;
  job_type: JobType;
  status: ProcessingStatus;
  progress: number;
  error_message?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

// ==========================================
// SUBSCRIPTION & BILLING (PHASE 9)
// ==========================================

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  STUDIO = 'STUDIO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  TRIALING = 'TRIALING',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  UNPAID = 'UNPAID',
  PAUSED = 'PAUSED',
}

export enum BillingInterval {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  PAID = 'PAID',
  VOID = 'VOID',
  UNCOLLECTIBLE = 'UNCOLLECTIBLE',
}

export enum WebhookProcessingStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  IGNORED = 'IGNORED',
}

export type PlanFeatureKey =
  | 'CLIENT_GALLERY'
  | 'AI_FACE_SEARCH'
  | 'ADVANCED_ANALYTICS'
  | 'CUSTOM_BRANDING'
  | 'CUSTOM_DOMAIN'
  | 'CLOUD_STORAGE'
  | 'MULTI_STORAGE'
  | 'CLIENT_CRM'
  | 'GALLERY_DELIVERY'
  | 'BULK_DOWNLOAD'
  | 'ORIGINAL_DOWNLOAD'
  | 'TEAM_MEMBERS'
  | 'API_ACCESS'
  | 'WEBHOOKS';

export interface PlanLimitsDTO {
  max_galleries: number | null; // null = unlimited
  max_active_galleries: number | null;
  max_photos: number | null;
  max_clients: number | null;
  max_storage_bytes: number | null;
  max_ai_searches: number | null;
  max_ai_indexed_photos: number | null;
  max_team_members: number | null;
  max_downloads: number | null;
  max_monthly_bandwidth: number | null;
  max_delivery_emails: number | null;
}

export interface PlanPricingDTO {
  currency: string;
  monthly_amount: number; // In minor units (e.g. 0 for Free, 149900 for ₹1,499)
  yearly_amount: number;  // In minor units (e.g. 1499000 for ₹14,990)
  provider_price_id_monthly?: string;
  provider_price_id_yearly?: string;
  display_monthly: string;
  display_yearly: string;
}

export interface PlanDefinitionDTO {
  id: SubscriptionPlan;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  display_order: number;
  badge?: string;
  popular?: boolean;
  pricing: {
    INR: PlanPricingDTO;
    USD: PlanPricingDTO;
  };
  features: PlanFeatureKey[];
  limits: PlanLimitsDTO;
}

export interface SubscriptionDTO {
  id: string;
  studio_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  currency: string;
  provider: string;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  provider_price_id?: string | null;
  cancel_at_period_end: boolean;
  current_period_start: Date | string;
  current_period_end: Date | string;
  trial_start?: Date | string | null;
  trial_end?: Date | string | null;
  canceled_at?: Date | string | null;
  storage_limit_bytes: bigint | number;
  photo_limit: number;
  ai_search_limit: number;
  max_galleries?: number | null;
  max_clients?: number | null;
  max_team_members?: number | null;
}

export interface InvoiceDTO {
  id: string;
  studio_id: string;
  subscription_id?: string | null;
  provider_invoice_id: string;
  amount: number; // in minor units
  currency: string;
  status: InvoiceStatus;
  invoice_date: Date | string;
  paid_at?: Date | string | null;
  hosted_invoice_url?: string | null;
  pdf_url?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UsageMetricItemDTO {
  used: number;
  limit: number | null; // null = unlimited
  remaining: number | null;
  usage_percent: number; // 0 to 100
  is_unlimited: boolean;
  unit?: string;
}

export interface StudioBillingUsageDTO {
  storage: UsageMetricItemDTO;
  photos: UsageMetricItemDTO;
  galleries: UsageMetricItemDTO;
  clients: UsageMetricItemDTO;
  ai_searches: UsageMetricItemDTO;
  team_members: UsageMetricItemDTO;
  delivery_emails: UsageMetricItemDTO;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  current_usage?: number;
  limit?: number | null;
  upgrade_recommended_plan?: SubscriptionPlan;
}

export interface CreateCheckoutSessionRequest {
  plan: SubscriptionPlan;
  interval?: BillingInterval;
  currency?: string;
  success_url?: string;
  cancel_url?: string;
}

export interface CreateCheckoutSessionResponse {
  session_id: string;
  checkout_url: string;
}

export interface CreatePortalSessionRequest {
  return_url?: string;
}

export interface CreatePortalSessionResponse {
  portal_url: string;
}

export interface ChangePlanRequest {
  plan: SubscriptionPlan;
  interval?: BillingInterval;
}

export interface BillingWebhookEventDTO {
  id: string;
  provider: string;
  provider_event_id: string;
  event_type: string;
  status: WebhookProcessingStatus;
  error_message?: string | null;
  received_at: Date | string;
  processed_at?: Date | string | null;
}

// ==========================================
// AUDIT LOG
// ==========================================

export interface AuditLogDTO {
  id: string;
  studio_id: string;
  user_id?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date | string;
}

// ==========================================
// API ENVELOPES & AUTH TOKEN PAYLOADS
// ==========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  studioId?: string | null;
  studioMemberRole?: StudioMemberRole | null;
}

export interface AuthSession {
  user: UserDTO;
  studio?: StudioDTO | null;
  token: string;
  refreshToken?: string;
}

// ==========================================
// ANALYTICS & BUSINESS INTELLIGENCE (PHASE 8)
// ==========================================

export type AnalyticsDateRangePreset = 'today' | '7d' | '30d' | '90d' | 'year' | 'custom';

export interface AnalyticsMetricComparison {
  current: number;
  previous: number;
  change_percentage: number;
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
}

export interface AnalyticsOverviewDTO {
  period: {
    from: string;
    to: string;
    preset?: AnalyticsDateRangePreset;
    previous_from: string;
    previous_to: string;
  };
  metrics: {
    total_galleries: number;
    total_photos: number;
    total_clients: number;
    gallery_views: AnalyticsMetricComparison;
    unique_visitors: AnalyticsMetricComparison;
    favorites: AnalyticsMetricComparison;
    selections: AnalyticsMetricComparison;
    downloads: AnalyticsMetricComparison;
    download_bytes: AnalyticsMetricComparison;
    find_my_photos_searches: AnalyticsMetricComparison;
    find_my_photos_matches: AnalyticsMetricComparison;
    match_rate_percentage: AnalyticsMetricComparison;
    delivery_open_rate_percentage: AnalyticsMetricComparison;
    storage_used_bytes: number;
  };
  engagement_funnel: {
    delivered: number;
    opened: number;
    viewed: number;
    favorited: number;
    selected: number;
    downloaded: number;
  };
  deterministic_insights: string[];
}

export interface AnalyticsTimeseriesPointDTO {
  date: string;
  gallery_views: number;
  unique_visitors: number;
  favorites: number;
  selections: number;
  downloads: number;
  find_my_photos_searches: number;
  find_my_photos_matches: number;
  delivery_sends: number;
  delivery_opens: number;
  photos_processed: number;
}

export interface GalleryAnalyticsItemDTO {
  id: string;
  title: string;
  slug: string;
  cover_photo_url?: string | null;
  event_type: string;
  event_date: string;
  status: string;
  photo_count: number;
  views_count: number;
  unique_visitors_count: number;
  favorites_count: number;
  selections_count: number;
  downloads_count: number;
  download_bytes: number;
  ai_searches_count: number;
  ai_matches_count: number;
  engagement_score: number;
  engagement_rate_percentage: number;
  last_activity_at?: string | null;
}

export interface ClientAnalyticsSummaryDTO {
  total_clients: number;
  new_clients_in_period: number;
  active_clients_in_period: number;
  returning_clients_count: number;
  clients_with_galleries_count: number;
  top_active_clients: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    galleries_count: number;
    favorites_count: number;
    selections_count: number;
    downloads_count: number;
    last_activity_at?: string | null;
  }>;
}

export interface AiAnalyticsSummaryDTO {
  total_searches: number;
  searches_with_matches: number;
  searches_with_no_match: number;
  match_rate_percentage: number;
  total_matches: number;
  avg_matches_per_search: number;
  avg_processing_time_ms: number;
  photos_indexed_count: number;
  faces_indexed_count: number;
  jobs_completed: number;
  jobs_failed: number;
  success_rate_percentage: number;
}

export interface StorageAnalyticsSummaryDTO {
  total_storage_bytes: number;
  photos_stored_count: number;
  storage_limit_bytes: number;
  usage_percentage: number;
  estimated_monthly_growth_bytes: number;
  galleries_breakdown: Array<{
    gallery_id: string;
    title: string;
    photo_count: number;
    storage_bytes: number;
    percentage_of_total: number;
  }>;
  connected_storage_providers: Array<{
    provider: string;
    display_name: string;
    status: string;
    storage_used_bytes: number;
  }>;
}

export interface DownloadAnalyticsSummaryDTO {
  total_download_jobs: number;
  total_photos_downloaded: number;
  total_download_bytes: number;
  single_downloads_count: number;
  bulk_downloads_count: number;
  top_downloaded_galleries: Array<{
    gallery_id: string;
    title: string;
    downloads_count: number;
    download_bytes: number;
  }>;
}

// =========================================================================
// PHASE 10: SUPER ADMIN CONTROL CENTER TYPES
// =========================================================================

export interface AdminAlertItemDTO {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  category: 'STORAGE' | 'BILLING' | 'AI' | 'JOBS' | 'SYSTEM' | 'STUDIO';
  timestamp: Date | string;
  metadata?: Record<string, any>;
}

export interface AdminOverviewDTO {
  kpis: {
    total_studios: number;
    active_studios: number;
    suspended_studios: number;
    total_users: number;
    active_subscriptions: number;
    mrr_inr: number;
    mrr_usd: number;
    arr_estimate_inr: number;
    arr_estimate_usd: number;
    trial_accounts: number;
    past_due_accounts: number;
    total_galleries: number;
    total_photos: number;
    ai_indexed_photos: number;
    ai_searches_period: number;
    storage_used_bytes: number;
    client_contacts: number;
  };
  charts: {
    studio_growth: Array<{ date: string; value: number }>;
    subscription_growth: Array<{ date: string; value: number }>;
    mrr_trend: Array<{ date: string; inr: number; usd: number }>;
    storage_growth: Array<{ date: string; bytes: number }>;
    ai_usage: Array<{ date: string; searches: number; indexed: number }>;
    photos_processed: Array<{ date: string; count: number }>;
    gallery_creation: Array<{ date: string; count: number }>;
    user_growth: Array<{ date: string; value: number }>;
  };
  alerts: AdminAlertItemDTO[];
}

export interface AdminStudioItemDTO {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  owner_name?: string;
  owner_email?: string;
  plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  is_suspended: boolean;
  suspended_at?: Date | string | null;
  gallery_count: number;
  photo_count: number;
  storage_used_bytes: number;
  ai_search_count: number;
  created_at: Date | string;
  last_activity_at?: Date | string | null;
}

export interface AdminStudioDetailDTO {
  studio: AdminStudioItemDTO;
  members: Array<{
    id: string;
    user_id: string;
    name: string;
    email: string;
    role: StudioMemberRole;
    created_at: Date | string;
  }>;
  subscription: SubscriptionDTO | null;
  usage: StudioBillingUsageDTO;
  galleries: Array<{
    id: string;
    title: string;
    slug: string;
    status: GalleryStatus;
    photo_count: number;
    created_at: Date | string;
  }>;
  storage_connections: Array<{
    id: string;
    provider: StorageProviderType;
    status: string;
    storage_used_bytes: number;
    created_at: Date | string;
  }>;
  invoices: InvoiceDTO[];
  recent_audit_logs: Array<{
    id: string;
    action: string;
    resource_type: string;
    created_at: Date | string;
    metadata?: any;
  }>;
}

export interface AdminUserItemDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar_url?: string | null;
  is_suspended: boolean;
  suspended_at?: Date | string | null;
  studios_count: number;
  primary_studio_name?: string | null;
  primary_studio_id?: string | null;
  created_at: Date | string;
  last_activity_at?: Date | string | null;
}

export interface AdminUserDetailDTO {
  user: AdminUserItemDTO;
  memberships: Array<{
    id: string;
    studio_id: string;
    studio_name: string;
    studio_slug: string;
    role: StudioMemberRole;
    created_at: Date | string;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    resource_type: string;
    studio_id?: string | null;
    created_at: Date | string;
    metadata?: any;
  }>;
}

export interface AdminSubscriptionItemDTO {
  id: string;
  studio_id: string;
  studio_name: string;
  studio_slug: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currency: string;
  amount: number;
  interval: BillingInterval;
  provider: string;
  provider_subscription_id?: string | null;
  current_period_start: Date | string;
  current_period_end: Date | string;
  cancel_at_period_end: boolean;
  canceled_at?: Date | string | null;
}

export interface AdminPlanDTO {
  id: string;
  name: string;
  description: string;
  monthly_price_inr: number;
  annual_price_inr: number;
  monthly_price_usd: number;
  annual_price_usd: number;
  storage_limit_bytes: number | null;
  photo_limit: number | null;
  gallery_limit: number | null;
  client_limit: number | null;
  ai_search_limit: number | null;
  team_member_limit: number | null;
  features: PlanFeatureKey[];
  is_active: boolean;
  is_archived: boolean;
  subscriber_count: number;
}

export interface AdminRevenueDTO {
  kpis: {
    mrr_inr: number;
    mrr_usd: number;
    arr_estimate_inr: number;
    arr_estimate_usd: number;
    monthly_collected_revenue_inr: number;
    annual_collected_revenue_inr: number;
    new_subscriptions_period: number;
    upgrades_period: number;
    downgrades_period: number;
    cancellations_period: number;
    failed_payments_period: number;
    recovered_payments_period: number;
  };
  charts: {
    mrr_trend: Array<{ date: string; inr: number; usd: number }>;
    revenue_by_plan: Array<{ plan: string; inr: number; count: number }>;
    revenue_by_currency: Array<{ currency: string; amount: number }>;
    subscription_velocity: Array<{ date: string; new_subs: number; churn: number }>;
    payment_health: Array<{ date: string; success: number; failed: number }>;
  };
}

export interface AdminPlatformUsageDTO {
  totals: {
    storage_bytes: number;
    photos_count: number;
    galleries_count: number;
    clients_count: number;
    ai_indexed_photos_count: number;
    ai_searches_count: number;
    downloads_count: number;
    delivery_emails_count: number;
  };
  top_consumers: {
    storage: Array<{ studio_id: string; studio_name: string; bytes: number; percentage: number }>;
    photos: Array<{ studio_id: string; studio_name: string; count: number }>;
    ai_searches: Array<{ studio_id: string; studio_name: string; count: number }>;
    downloads: Array<{ studio_id: string; studio_name: string; count: number }>;
  };
  usage_warnings: Array<{
    studio_id: string;
    studio_name: string;
    metric: string;
    usage_percent: number;
    tier: '80%' | '90%' | '100%';
  }>;
}

export interface AdminAiOperationsDTO {
  stats: {
    total_indexed_photos: number;
    total_face_detections: number;
    total_searches: number;
    successful_searches: number;
    failed_searches: number;
    avg_latency_ms: number;
    ai_queue_depth: number;
    failed_jobs_count: number;
  };
  model_metadata: {
    engine: string;
    model_name: string;
    embedding_dimension: number;
    model_version: string;
    device: string;
    batch_size: number;
  };
}

export interface AdminStorageOperationsDTO {
  totals: {
    total_bytes: number;
    platform_bytes: number;
    google_drive_bytes: number;
    dropbox_bytes: number;
    onedrive_bytes: number;
    s3_bytes: number;
    r2_bytes: number;
    external_url_bytes: number;
  };
  connections: {
    connected_studios_count: number;
    stale_connections_count: number;
    sync_failures_count: number;
    missing_files_count: number;
  };
  recent_sync_errors: Array<{
    id: string;
    studio_id: string;
    studio_name: string;
    provider: StorageProviderType;
    error_message: string;
    timestamp: Date | string;
  }>;
}

export interface AdminJobItemDTO {
  id: string;
  job_type: JobType;
  status: ProcessingStatus;
  studio_id: string;
  studio_name?: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  progress: number;
  error_message?: string | null;
  retry_count: number;
  created_at: Date | string;
  started_at?: Date | string | null;
  completed_at?: Date | string | null;
}

export interface AdminSystemHealthDTO {
  timestamp: Date | string;
  overall_status: 'OK' | 'DEGRADED' | 'DOWN';
  services: {
    postgresql: { status: 'OK' | 'DEGRADED' | 'DOWN'; latency_ms: number; message?: string };
    pgvector: { status: 'OK' | 'DEGRADED' | 'DOWN'; index_count: number; message?: string };
    redis: { status: 'OK' | 'DEGRADED' | 'DOWN'; memory_used_mb: number; message?: string };
    bullmq: { status: 'OK' | 'DEGRADED' | 'DOWN'; active_workers: number; queue_depth: number };
    workers: { status: 'OK' | 'DEGRADED' | 'DOWN'; total: number; healthy: number };
    ai_service: { status: 'OK' | 'DEGRADED' | 'DOWN'; latency_ms: number; model: string };
    storage: { status: 'OK' | 'DEGRADED' | 'DOWN'; writable: boolean };
    email: { status: 'OK' | 'DEGRADED' | 'DOWN'; provider: string };
    billing: { status: 'OK' | 'DEGRADED' | 'DOWN'; provider: string };
  };
}

export interface AdminAuditLogDTO {
  id: string;
  timestamp: Date | string;
  actor_id?: string | null;
  actor_name?: string | null;
  actor_email?: string | null;
  actor_role?: UserRole;
  action: string;
  entity: string;
  entity_id?: string | null;
  studio_id?: string | null;
  studio_name?: string | null;
  metadata?: Record<string, any> | null;
}

export interface AdminSearchResultDTO {
  studios: Array<{ id: string; name: string; slug: string; plan: string; status: string }>;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  subscriptions: Array<{ id: string; studio_id: string; studio_name: string; plan: string; status: string }>;
  galleries: Array<{ id: string; studio_id: string; title: string; slug: string; status: string }>;
}

// ==========================================
// PHASE 11: EMAIL & NOTIFICATION TYPES & DTOS
// ==========================================

export enum EmailDeliveryStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  BOUNCED = 'BOUNCED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum NotificationEventType {
  USER_REGISTERED = 'USER_REGISTERED',
  EMAIL_VERIFICATION_REQUESTED = 'EMAIL_VERIFICATION_REQUESTED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  GALLERY_DELIVERY_REQUESTED = 'GALLERY_DELIVERY_REQUESTED',
  GALLERY_REMINDER_REQUESTED = 'GALLERY_REMINDER_REQUESTED',
  GALLERY_READY = 'GALLERY_READY',
  FAVORITE_CREATED = 'FAVORITE_CREATED',
  SELECTION_CREATED = 'SELECTION_CREATED',
  DOWNLOAD_COMPLETED = 'DOWNLOAD_COMPLETED',
  SUBSCRIPTION_STARTED = 'SUBSCRIPTION_STARTED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  PAYMENT_SUCCEEDED = 'PAYMENT_SUCCEEDED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  TRIAL_STARTED = 'TRIAL_STARTED',
  TRIAL_ENDING = 'TRIAL_ENDING',
  STORAGE_SYNC_FAILED = 'STORAGE_SYNC_FAILED',
  AI_PROCESSING_FAILED = 'AI_PROCESSING_FAILED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  ADMIN_ALERT = 'ADMIN_ALERT',
}

export enum EmailProviderType {
  CONSOLE_DEV = 'CONSOLE_DEV',
  RESEND = 'RESEND',
  SMTP = 'SMTP',
  SES = 'SES',
  MOCK = 'MOCK',
}

export interface EmailDeliveryDTO {
  id: string;
  studio_id?: string | null;
  studio_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  user_id?: string | null;
  template_key: string;
  event_type?: NotificationEventType | null;
  recipient: string;
  subject: string;
  provider: string;
  provider_message_id?: string | null;
  status: EmailDeliveryStatus;
  attempts: number;
  last_error?: string | null;
  idempotency_key?: string | null;
  metadata?: Record<string, any> | null;
  sent_at?: Date | string | null;
  delivered_at?: Date | string | null;
  failed_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface NotificationPreferenceDTO {
  id: string;
  user_id: string;
  studio_id: string;
  email_gallery_delivery: boolean;
  email_gallery_reminder: boolean;
  email_client_favorites: boolean;
  email_client_selections: boolean;
  email_client_downloads: boolean;
  email_subscription_updates: boolean;
  email_payment_failures: boolean;
  email_storage_sync_failures: boolean;
  email_ai_processing_failures: boolean;
  email_product_announcements: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UpdateNotificationPreferencesDTO {
  email_gallery_delivery?: boolean;
  email_gallery_reminder?: boolean;
  email_client_favorites?: boolean;
  email_client_selections?: boolean;
  email_client_downloads?: boolean;
  email_subscription_updates?: boolean;
  email_payment_failures?: boolean;
  email_storage_sync_failures?: boolean;
  email_ai_processing_failures?: boolean;
  email_product_announcements?: boolean;
}

export interface EmailTemplateDTO {
  id: string;
  template_key: string;
  name: string;
  description?: string | null;
  subject_template: string;
  html_template: string;
  text_template: string;
  category: 'TRANSACTIONAL' | 'GALLERY' | 'BILLING' | 'SYSTEM';
  is_active: boolean;
  variables?: Record<string, string> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EmailTemplateUpdateDTO {
  name?: string;
  description?: string;
  subject_template?: string;
  html_template?: string;
  text_template?: string;
  is_active?: boolean;
}

export interface EmailSuppressionDTO {
  id: string;
  email: string;
  reason: 'UNSUBSCRIBED' | 'BOUNCED' | 'COMPLAINT';
  token_hash?: string | null;
  created_at: Date | string;
}

export interface AdminEmailOverviewDTO {
  totals: {
    total_emails: number;
    queued: number;
    processing: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
    delivery_rate_pct: number;
    failure_rate_pct: number;
    bounce_rate_pct: number;
    queue_depth: number;
  };
  provider: {
    type: string;
    status: 'CONNECTED' | 'NOT_CONFIGURED' | 'DEGRADED';
    from_name: string;
    from_address: string;
    reply_to?: string;
    last_health_check?: Date | string;
  };
  timeseries: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }>;
  recent_activity: EmailDeliveryDTO[];
}

export interface AdminEmailLogItemDTO extends EmailDeliveryDTO {}

export interface AdminEmailSettingsDTO {
  provider: string;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'DEGRADED';
  from_name: string;
  from_address: string;
  reply_to?: string;
  has_api_key: boolean;
  has_smtp_password: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_secure?: boolean;
  last_health_check?: Date | string;
  is_production_ready: boolean;
}

export interface DispatchNotificationRequestDTO {
  event: NotificationEventType | string;
  recipient: string;
  recipient_name?: string;
  studio_id?: string;
  client_id?: string;
  user_id?: string;
  template_key?: string;
  idempotency_key?: string;
  variables?: Record<string, any>;
}

export interface EmailTestRequestDTO {
  recipient: string;
  template_key?: string;
  custom_variables?: Record<string, any>;
}

// ==========================================
// PHASE 12: ADVANCED AI PHOTO INTELLIGENCE & SMART ALBUMS
// ==========================================

export type ExposureClass = 'UNDEREXPOSED' | 'NORMAL' | 'OVEREXPOSED';
export type SmartAlbumType = 'SYSTEM' | 'CUSTOM';
export type ModelType = 'FACE_EMBEDDING' | 'PHOTO_QUALITY' | 'SCENE_CLASSIFIER' | 'DUPLICATE_DETECTOR';

export type SceneCategory =
  | 'Wedding'
  | 'Ceremony'
  | 'Reception'
  | 'Portrait'
  | 'Group'
  | 'Couple'
  | 'Dance'
  | 'Stage'
  | 'Food'
  | 'Decoration'
  | 'Outdoor'
  | 'Indoor'
  | 'Travel'
  | 'Family'
  | 'Kids'
  | 'Corporate'
  | 'Product'
  | 'Unknown';

export type MomentCategory =
  | 'Ceremony'
  | 'Entry'
  | 'Ring Exchange'
  | 'Garland'
  | 'Family Portrait'
  | 'Couple Portrait'
  | 'Group Photo'
  | 'Cake Cutting'
  | 'Dance'
  | 'Stage'
  | 'Speech'
  | 'Candid'
  | 'Departure'
  | 'Unknown';

export interface PhotoAIAnalysisDTO {
  id: string;
  photo_id: string;
  gallery_id: string;
  studio_id: string;
  model_version: string;
  quality_score: number;
  sharpness_score: number;
  blur_score: number;
  is_blurry: boolean;
  exposure_score: number;
  exposure_class: ExposureClass;
  contrast_score: number;
  noise_score: number;
  composition_score: number;
  scene_category: string;
  scene_confidence: number;
  moment_category: string;
  moment_confidence: number;
  duplicate_group_id?: string | null;
  near_duplicate_group_id?: string | null;
  perceptual_hash?: string | null;
  is_best_shot: boolean;
  best_shot_score: number;
  eyes_open_score: number;
  smile_score: number;
  people_count: number;
  analysis_status: ProcessingStatus;
  analysis_error?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PersonClusterMemberDTO {
  id: string;
  cluster_id: string;
  face_detection_id: string;
  photo_id: string;
  confidence: number;
  created_at: Date | string;
}

export interface PersonClusterDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  name: string;
  cover_face_id?: string | null;
  cover_photo_id?: string | null;
  cover_photo_url?: string | null;
  face_count: number;
  photo_count: number;
  is_hidden: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  sample_photos?: Array<{
    id: string;
    thumbnail_url: string;
    original_url: string;
  }>;
}

export interface SmartAlbumFilterCondition {
  field:
    | 'quality_score'
    | 'is_best_shot'
    | 'is_blurry'
    | 'exposure_class'
    | 'scene_category'
    | 'moment_category'
    | 'people_count'
    | 'duplicate_group_id'
    | 'near_duplicate_group_id'
    | 'person_cluster_id';
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'is_null' | 'not_null';
  value: any;
}

export interface SmartAlbumRuleAST {
  conjunction: 'AND' | 'OR';
  conditions: SmartAlbumFilterCondition[];
}

export interface SmartAlbumDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  name: string;
  description?: string | null;
  type: SmartAlbumType;
  rule_json: SmartAlbumRuleAST;
  is_system: boolean;
  is_visible_to_client: boolean;
  sort_mode: string;
  cover_photo_url?: string | null;
  photo_count?: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface DuplicateGroupDTO {
  group_id: string;
  type: 'EXACT' | 'NEAR_DUPLICATE';
  count: number;
  primary_photo_id: string;
  photos: Array<{
    id: string;
    original_filename?: string | null;
    thumbnail_url?: string | null;
    original_url: string;
    quality_score: number;
    best_shot_score: number;
    is_best_shot: boolean;
    file_size: number;
    created_at: string;
  }>;
}

export interface BestShotCandidateDTO {
  photo_id: string;
  original_filename?: string | null;
  thumbnail_url: string;
  original_url: string;
  quality_score: number;
  best_shot_score: number;
  scene_category: string;
  moment_category: string;
  people_count: number;
  exposure_class: ExposureClass;
  is_best_shot: boolean;
  rank: number;
}

export interface QualitySummaryDTO {
  total_analyzed: number;
  excellent_count: number; // >= 0.85
  good_count: number;      // 0.70 - 0.84
  fair_count: number;      // 0.50 - 0.69
  poor_count: number;      // < 0.50
  blurry_count: number;
  underexposed_count: number;
  normal_exposure_count: number;
  overexposed_count: number;
}

export interface AiOverviewDTO {
  gallery_id: string;
  total_photos: number;
  analyzed_photos_count: number;
  faces_detected_count: number;
  people_clusters_count: number;
  smart_albums_count: number;
  duplicates_count: number;
  near_duplicates_count: number;
  best_shots_count: number;
  blurry_photos_count: number;
  analysis_status: ProcessingStatus;
  progress_percent: number;
  is_ready: boolean;
  models_used: Array<{
    type: string;
    name: string;
    version: string;
  }>;
}

// ==========================================
// PHASE 13: AI EVENT INTELLIGENCE & STORYTELLING
// ==========================================

export enum EventType {
  WEDDING = 'WEDDING',
  ENGAGEMENT = 'ENGAGEMENT',
  BIRTHDAY = 'BIRTHDAY',
  ANNIVERSARY = 'ANNIVERSARY',
  BABY_SHOWER = 'BABY_SHOWER',
  CORPORATE = 'CORPORATE',
  CONFERENCE = 'CONFERENCE',
  FAMILY = 'FAMILY',
  PORTRAIT = 'PORTRAIT',
  PRODUCT = 'PRODUCT',
  GENERAL_EVENT = 'GENERAL_EVENT',
  UNKNOWN = 'UNKNOWN',
  OTHER = 'OTHER',
}

export enum ChapterCategory {
  PREPARATION = 'PREPARATION',
  ARRIVAL = 'ARRIVAL',
  PORTRAIT = 'PORTRAIT',
  PORTRAITS = 'PORTRAITS',
  CEREMONY = 'CEREMONY',
  RITUAL = 'RITUAL',
  FAMILY = 'FAMILY',
  COUPLE = 'COUPLE',
  COUPLE_SESSION = 'COUPLE_SESSION',
  GROUP = 'GROUP',
  RECEPTION = 'RECEPTION',
  PARTY = 'PARTY',
  DINNER = 'DINNER',
  DANCE = 'DANCE',
  SPEECH = 'SPEECH',
  STAGE = 'STAGE',
  CANDID = 'CANDID',
  CELEBRATION = 'CELEBRATION',
  DEPARTURE = 'DEPARTURE',
  DETAILS = 'DETAILS',
  KEY_MOMENTS = 'KEY_MOMENTS',
  GENERAL = 'GENERAL',
  OTHER = 'OTHER',
}

export enum EventIntelligenceStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
}

export enum StoryStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum StoryTone {
  EDITORIAL = 'EDITORIAL',
  ELEGANT = 'ELEGANT',
  SIMPLE = 'SIMPLE',
  PROFESSIONAL = 'PROFESSIONAL',
  WARM = 'WARM',
}

export enum StoryLength {
  SHORT = 'SHORT',
  MEDIUM = 'MEDIUM',
  LONG = 'LONG',
}

export enum ConfidenceLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export interface EventChapterDTO {
  id: string;
  event_intelligence_id: string;
  gallery_id: string;
  studio_id: string;
  title: string;
  category: ChapterCategory;
  sequence_index: number;
  start_photo_id?: string | null;
  end_photo_id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  photo_count: number;
  confidence: ConfidenceLevel;
  confidence_score: number;
  cover_photo_id?: string | null;
  cover_photo_url?: string | null;
  description?: string | null;
  is_hidden: boolean;
  smart_album_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  sample_photos?: Array<{
    id: string;
    thumbnail_url?: string | null;
    original_url: string;
    original_filename?: string | null;
  }>;
}

export interface EventHighlightDTO {
  id: string;
  event_intelligence_id: string;
  gallery_id: string;
  studio_id: string;
  photo_id: string;
  chapter_id?: string | null;
  chapter_title?: string | null;
  rank: number;
  score: number;
  reason?: string | null;
  is_selected: boolean;
  photo: {
    id: string;
    thumbnail_url?: string | null;
    original_url: string;
    original_filename?: string | null;
    quality_score?: number;
    best_shot_score?: number;
    scene_category?: string;
    moment_category?: string;
  };
  created_at: Date | string;
}

export interface EventStoryDTO {
  id: string;
  gallery_id: string;
  studio_id: string;
  event_intelligence_id: string;
  title: string;
  summary: string;
  body: string;
  tone: StoryTone;
  length: StoryLength;
  model_version: string;
  status: StoryStatus;
  is_published: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EventIntelligenceDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  event_type: EventType;
  event_confidence: ConfidenceLevel;
  confidence_score: number;
  status: EventIntelligenceStatus;
  model_version: string;
  start_time?: string | null;
  end_time?: string | null;
  photo_count: number;
  chapter_count: number;
  highlight_count: number;
  is_timeline_enabled: boolean;
  is_story_enabled: boolean;
  is_highlights_enabled: boolean;
  client_story_visible: boolean;
  default_highlight_limit: number;
  story_tone: StoryTone;
  story_length: StoryLength;
  suggested_cover_photo_id?: string | null;
  suggested_cover_photo_url?: string | null;
  error_message?: string | null;
  chapters?: EventChapterDTO[];
  story?: EventStoryDTO | null;
  highlights?: EventHighlightDTO[];
  created_at: Date | string;
  updated_at: Date | string;
}

export interface EventTimelineDTO {
  gallery_id: string;
  event_type: EventType;
  event_confidence: ConfidenceLevel;
  has_timestamps: boolean;
  start_time?: string | null;
  end_time?: string | null;
  total_photos: number;
  chapters: EventChapterDTO[];
}

export interface EventStoryPublicDTO {
  gallery_id: string;
  gallery_title: string;
  event_type: EventType;
  story?: {
    title: string;
    summary: string;
    body: string;
    tone: string;
  } | null;
  chapters: Array<{
    id: string;
    title: string;
    category: string;
    sequence_index: number;
    photo_count: number;
    cover_photo_url?: string | null;
    description?: string | null;
  }>;
  highlights: Array<{
    id: string;
    photo_id: string;
    thumbnail_url?: string | null;
    original_url: string;
    rank: number;
  }>;
}

// ==========================================
// PHASE 14: AI PERSONALIZED CLIENT EXPERIENCE & INTELLIGENT DISCOVERY
// ==========================================

export type RecommendationReasonType =
  | 'FAVORITE_SIMILAR'
  | 'MOMENT_PROXIMITY'
  | 'EVENT_HIGHLIGHT'
  | 'BEST_SHOT'
  | 'SCENE_RELEVANT'
  | 'POPULAR_MOMENT'
  | 'CHAPTER_RELEVANT'
  | 'SELECTION_MATCH';

export interface PhotoRecommendationDTO {
  id: string;
  photo_id: string;
  thumbnail_url?: string | null;
  original_url: string;
  width?: number | null;
  height?: number | null;
  reason: string;
  reason_type: RecommendationReasonType;
  chapter_id?: string | null;
  chapter_title?: string | null;
  score?: number;
}

export interface SimilarPhotoDTO {
  id: string;
  photo_id: string;
  thumbnail_url?: string | null;
  original_url: string;
  width?: number | null;
  height?: number | null;
  reason: string;
  similarity_reason?: string;
  similarity_category?: string;
}

export interface SimilarPhotosResponseDTO {
  source_photo_id: string;
  reference_photo_id?: string;
  photos: SimilarPhotoDTO[];
  similar_photos?: SimilarPhotoDTO[];
  total: number;
}

export interface GallerySearchResultItemDTO {
  id: string;
  photo_id: string;
  thumbnail_url?: string | null;
  original_url: string;
  width?: number | null;
  height?: number | null;
  matched_tags: string[];
  matched_scene?: string | null;
  chapter_title?: string | null;
  created_at?: Date | string;
}

export interface GallerySearchResultDTO {
  query: string;
  sanitized_query?: string;
  results: GallerySearchResultItemDTO[];
  total: number;
  total_matches?: number;
  is_selfie_suggested?: boolean;
  redirect_to_find_my_photos?: boolean;
  suggested_chips: string[];
}

export interface ClientPersonalizationSettingsDTO {
  enable_client_ai_home: boolean;
  enable_recommendations: boolean;
  enable_more_like_this: boolean;
  enable_semantic_search: boolean;
  enable_recently_viewed: boolean;
  enable_activity_recommendations: boolean;
  default_recommendation_limit: number;
}

export interface PersonalizedClientHomeDTO {
  is_first_time: boolean;
  gallery_id: string;
  gallery_title: string;
  studio_name: string;
  cover_photo_url?: string | null;
  hero_photo?: PhotoRecommendationDTO | null;
  event_type?: string;
  event_date?: Date | string;
  has_published_story: boolean;
  story_headline?: string | null;
  story_summary?: string | null;
  has_find_my_photos: boolean;
  total_photos: number;
  stats: {
    favorites_count: number;
    selections_count: number;
    recently_viewed_count: number;
  };
  user_activity_summary?: {
    favorites_count: number;
    selections_count: number;
    recently_viewed_count: number;
  };
  highlights: PhotoRecommendationDTO[];
  recommendations: PhotoRecommendationDTO[];
  recently_viewed: PhotoRecommendationDTO[];
  chapters: Array<{
    id: string;
    title: string;
    category: string;
    photo_count: number;
    cover_photo_url?: string | null;
  }>;
  smart_albums: Array<{
    id: string;
    name: string;
    type: string;
    photo_count: number;
    cover_photo_url?: string | null;
  }>;
}

export interface ClientActivityEventDTO {
  event_type: 'PHOTO_VIEW' | 'CHAPTER_VIEW' | 'SMART_ALBUM_VIEW' | 'RECOMMENDATION_CLICK' | 'SEARCH_PERFORMED' | 'STORY_OPEN';
  photo_id?: string;
  chapter_id?: string;
  smart_album_id?: string;
  query?: string;
  metadata?: Record<string, any>;
}

// ==========================================
// PHASE 15: AI PHOTOGRAPHER COPILOT & ASSISTANT TYPES
// ==========================================

export enum CopilotMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum CopilotRecommendationType {
  GALLERY_NOT_READY = 'GALLERY_NOT_READY',
  PROCESSING_FAILURE = 'PROCESSING_FAILURE',
  PROCESSING_PENDING = 'PROCESSING_PENDING',
  MISSING_AI_INDEX = 'MISSING_AI_INDEX',
  LOW_QUALITY_PHOTOS = 'LOW_QUALITY_PHOTOS',
  DUPLICATES_FOUND = 'DUPLICATES_FOUND',
  BURST_CLUSTER_FOUND = 'BURST_CLUSTER_FOUND',
  COVER_RECOMMENDATION = 'COVER_RECOMMENDATION',
  SMART_ALBUM_RECOMMENDATION = 'SMART_ALBUM_RECOMMENDATION',
  EVENT_STORY_RECOMMENDATION = 'EVENT_STORY_RECOMMENDATION',
  HIGHLIGHT_RECOMMENDATION = 'HIGHLIGHT_RECOMMENDATION',
  STORAGE_WARNING = 'STORAGE_WARNING',
  CLIENT_DELIVERY_WARNING = 'CLIENT_DELIVERY_WARNING',
  GALLERY_COMPLETENESS = 'GALLERY_COMPLETENESS',
  GENERAL_ACTION = 'GENERAL_ACTION',
}

export enum CopilotRecommendationSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CopilotRecommendationStatus {
  OPEN = 'OPEN',
  DISMISSED = 'DISMISSED',
  RESOLVED = 'RESOLVED',
  SNOOZED = 'SNOOZED',
}

export enum CopilotActionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum GalleryHealthStatus {
  READY = 'READY',
  ALMOST_READY = 'ALMOST_READY',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  BLOCKED = 'BLOCKED',
}

export interface GalleryHealthIssueDTO {
  id: string;
  severity: CopilotRecommendationSeverity;
  message: string;
  suggested_action?: string;
  action_type?: string;
  payload?: Record<string, any>;
}

export interface GalleryHealthCategoryDTO {
  key: string;
  label: string;
  score: number;
  status: GalleryHealthStatus;
  explanation: string;
  weight: number;
  issues: GalleryHealthIssueDTO[];
}

export interface GalleryHealthDTO {
  gallery_id: string;
  gallery_title: string;
  score: number;
  status: GalleryHealthStatus;
  status_explanation: string;
  categories: GalleryHealthCategoryDTO[];
  recommendations: CopilotRecommendationDTO[];
  calculated_at: Date | string;
}

export interface CompletenessCheckItemDTO {
  key: string;
  title: string;
  is_complete: boolean;
  is_blocker: boolean;
  description: string;
  details?: string;
  suggested_action?: string;
}

export interface GalleryCompletenessDTO {
  gallery_id: string;
  ready: boolean;
  score: number;
  completed_checks: number;
  total_checks: number;
  blockers: CompletenessCheckItemDTO[];
  warnings: CompletenessCheckItemDTO[];
  completed_items: CompletenessCheckItemDTO[];
  recommendations: CopilotRecommendationDTO[];
}

export interface CoverRecommendationDTO {
  photo_id: string;
  preview_url: string;
  score: number;
  confidence: number;
  reason: string;
  quality_score: number;
  chapter_title?: string | null;
  scene_category?: string | null;
}

export interface SmartAlbumSuggestionDTO {
  type: string;
  name: string;
  reason: string;
  photo_count: number;
  confidence: number;
  evidence: string[];
}

export interface EventStoryRecommendationDTO {
  can_generate: boolean;
  has_existing_story: boolean;
  event_type: string;
  chapter_count: number;
  confidence: number;
  reason: string;
  suggested_tone: string;
}

export interface CopilotRecommendationDTO {
  id: string;
  studio_id: string;
  gallery_id?: string | null;
  type: CopilotRecommendationType;
  severity: CopilotRecommendationSeverity;
  title: string;
  description: string;
  reason: string;
  confidence?: number | null;
  status: CopilotRecommendationStatus;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
  resolved_at?: Date | string | null;
  suggested_action?: {
    action_type: string;
    label: string;
    requires_approval: boolean;
    is_destructive?: boolean;
    payload?: Record<string, any>;
  };
}

export interface CopilotAttentionItemDTO {
  id: string;
  title: string;
  description: string;
  severity: CopilotRecommendationSeverity;
  type: CopilotRecommendationType;
  blocking_impact: boolean;
  gallery_id: string;
  gallery_title: string;
  confidence: number;
  created_at: Date | string;
  action_label: string;
  action_type: string;
  action_payload?: Record<string, any>;
}

export interface CopilotAttentionSummaryDTO {
  studio_id: string;
  total_unresolved: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  top_attention_items: CopilotAttentionItemDTO[];
  galleries_needing_attention: Array<{
    gallery_id: string;
    gallery_title: string;
    health_score: number;
    health_status: GalleryHealthStatus;
    issue_count: number;
  }>;
}

export interface CopilotMessageDTO {
  id: string;
  conversation_id: string;
  role: CopilotMessageRole;
  content: string;
  intent?: string | null;
  created_at: Date | string;
  suggested_actions?: Array<{
    action_type: string;
    label: string;
    requires_approval: boolean;
    is_destructive?: boolean;
    payload?: Record<string, any>;
  }>;
}

export interface CopilotConversationDTO {
  id: string;
  studio_id: string;
  user_id: string;
  gallery_id?: string | null;
  title?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  messages: CopilotMessageDTO[];
}

export interface CopilotActionDTO {
  id: string;
  studio_id: string;
  user_id: string;
  gallery_id?: string | null;
  recommendation_id?: string | null;
  action_type: string;
  status: CopilotActionStatus;
  payload?: Record<string, any> | null;
  result?: Record<string, any> | null;
  created_at: Date | string;
  completed_at?: Date | string | null;
}

export interface CopilotActionRequestDTO {
  action_type: string;
  gallery_id?: string;
  recommendation_id?: string;
  payload?: Record<string, any>;
}

export interface CopilotPrepareGalleryRequestDTO {
  gallery_id: string;
  auto_select_cover?: boolean;
  generate_smart_albums?: boolean;
  generate_event_story?: boolean;
  retry_failed_jobs?: boolean;
}

export interface CopilotPrepareGalleryResponseDTO {
  gallery_id: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NEEDS_APPROVAL';
  steps_completed: string[];
  steps_pending_approval: Array<{
    action_type: string;
    title: string;
    description: string;
    payload: Record<string, any>;
  }>;
  health_before: number;
  health_projected: number;
}

export interface CopilotContextFactsDTO {
  gallery: {
    id: string;
    title: string;
    status: string;
    access_type: string;
    event_type: string;
    event_date: string;
    has_cover: boolean;
    cover_photo_id?: string | null;
    photo_count: number;
    downloads_enabled: boolean;
    is_unlisted: boolean;
    expires_at?: string | null;
  };
  processing: {
    total_photos: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
    processing_pct: number;
  };
  ai_indexing: {
    is_enabled: boolean;
    indexed_count: number;
    unindexed_count: number;
    faces_detected: number;
    indexing_pct: number;
  };
  quality: {
    analyzed_count: number;
    average_score: number;
    low_quality_count: number;
    blur_count: number;
    dark_count: number;
  };
  duplicates: {
    duplicate_groups: number;
    duplicate_photos_count: number;
    burst_clusters_count: number;
  };
  event_intelligence: {
    has_intelligence: boolean;
    detected_event_type?: string;
    chapter_count: number;
    highlight_count: number;
    has_story: boolean;
    story_published: boolean;
    story_headline?: string | null;
  };
  smart_albums: {
    total_albums: number;
    active_albums_count: number;
  };
  clients: {
    assigned_clients_count: number;
    favorites_count: number;
    selections_count: number;
    total_views: number;
    total_downloads: number;
  };
  readiness: {
    score: number;
    status: GalleryHealthStatus;
    blockers: string[];
    warnings: string[];
  };
}

export interface CopilotTelemetryDTO {
  total_conversations: number;
  total_messages: number;
  total_recommendations_generated: number;
  recommendations_accepted: number;
  recommendations_dismissed: number;
  actions_approved: number;
  actions_rejected: number;
  actions_completed: number;
  actions_failed: number;
  avg_response_latency_ms: number;
  active_provider: string;
  is_chat_enabled: boolean;
  queue_status: {
    active_jobs: number;
    waiting_jobs: number;
    failed_jobs: number;
  };
}

// ==========================================
// PHASE 16: AI STUDIO AUTOMATION & WORKFLOW ORCHESTRATOR TYPES
// ==========================================

export enum AutomationTriggerType {
  UPLOAD_COMPLETED = 'UPLOAD_COMPLETED',
  PROCESSING_COMPLETED = 'PROCESSING_COMPLETED',
  AI_INDEXING_COMPLETED = 'AI_INDEXING_COMPLETED',
  GALLERY_CREATED = 'GALLERY_CREATED',
  GALLERY_READY = 'GALLERY_READY',
  GALLERY_NEEDS_ATTENTION = 'GALLERY_NEEDS_ATTENTION',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  STORAGE_SYNC_COMPLETED = 'STORAGE_SYNC_COMPLETED',
  STORAGE_SYNC_FAILED = 'STORAGE_SYNC_FAILED',
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
  CLIENT_ACTIVITY_THRESHOLD = 'CLIENT_ACTIVITY_THRESHOLD',
  GALLERY_EXPIRING = 'GALLERY_EXPIRING',
  MEDIA_INGESTION_COMPLETED = 'MEDIA_INGESTION_COMPLETED',
  CULLING_READY = 'CULLING_READY',
  CULLING_COMPLETED = 'CULLING_COMPLETED',
  EDITING_READY = 'EDITING_READY',
  EDITING_COMPLETED = 'EDITING_COMPLETED',
  PROOFING_SESSION_ACTIVATED = 'PROOFING_SESSION_ACTIVATED',
  PROOFING_DEADLINE_APPROACHING = 'PROOFING_DEADLINE_APPROACHING',
  PROOFING_SELECTIONS_SUBMITTED = 'PROOFING_SELECTIONS_SUBMITTED',
  PROOFING_SELECTIONS_APPROVED = 'PROOFING_SELECTIONS_APPROVED',
  PROOFING_EXTRA_PURCHASE_INTENT = 'PROOFING_EXTRA_PURCHASE_INTENT',
  ORDER_PAID = 'ORDER_PAID',
  ORDER_READY_FOR_DELIVERY = 'ORDER_READY_FOR_DELIVERY',
  ORDER_DELIVERED = 'ORDER_DELIVERED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  CLIENT_MESSAGE_RECEIVED = 'CLIENT_MESSAGE_RECEIVED',
  STUDIO_MESSAGE_RECEIVED = 'STUDIO_MESSAGE_RECEIVED',
  CONVERSATION_UNANSWERED = 'CONVERSATION_UNANSWERED',
  CONVERSATION_RESOLVED = 'CONVERSATION_RESOLVED',
  // Phase 29: CRM & Client Intelligence Triggers
  LEAD_CONVERTED = 'LEAD_CONVERTED',
  CLIENT_CREATED = 'CLIENT_CREATED',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  CLIENT_ACTION_PENDING = 'CLIENT_ACTION_PENDING',
  FOLLOW_UP_DUE = 'FOLLOW_UP_DUE',
  FOLLOW_UP_OVERDUE = 'FOLLOW_UP_OVERDUE',
  CLIENT_MESSAGE_UNANSWERED = 'CLIENT_MESSAGE_UNANSWERED',
  NEW_PROJECT_CREATED = 'NEW_PROJECT_CREATED',
}

export enum AutomationActionType {
  PROCESS_PHOTOS = 'PROCESS_PHOTOS',
  RETRY_FAILED_PROCESSING = 'RETRY_FAILED_PROCESSING',
  RUN_PHOTO_INTELLIGENCE = 'RUN_PHOTO_INTELLIGENCE',
  RUN_FACE_INDEXING = 'RUN_FACE_INDEXING',
  RUN_EVENT_INTELLIGENCE = 'RUN_EVENT_INTELLIGENCE',
  GENERATE_SMART_ALBUMS = 'GENERATE_SMART_ALBUMS',
  GENERATE_EVENT_STORY = 'GENERATE_EVENT_STORY',
  RUN_GALLERY_HEALTH_CHECK = 'RUN_GALLERY_HEALTH_CHECK',
  RUN_COMPLETENESS_CHECK = 'RUN_COMPLETENESS_CHECK',
  GENERATE_COVER_RECOMMENDATION = 'GENERATE_COVER_RECOMMENDATION',
  GENERATE_HIGHLIGHT_RECOMMENDATIONS = 'GENERATE_HIGHLIGHT_RECOMMENDATIONS',
  SEND_STUDIO_NOTIFICATION = 'SEND_STUDIO_NOTIFICATION',
  CREATE_APPROVAL_REQUEST = 'CREATE_APPROVAL_REQUEST',
  SYNC_STORAGE = 'SYNC_STORAGE',
  REINDEX_GALLERY = 'REINDEX_GALLERY',
  RUN_FULL_GALLERY_PREPARATION = 'RUN_FULL_GALLERY_PREPARATION',
  APPLY_COVER = 'APPLY_COVER',
  DELETE_PHOTOS = 'DELETE_PHOTOS',
  PUBLISH_GALLERY = 'PUBLISH_GALLERY',
  SEND_CLIENT_EMAIL = 'SEND_CLIENT_EMAIL',
  CHANGE_VISIBILITY = 'CHANGE_VISIBILITY',
  CHANGE_GALLERY_SETTINGS = 'CHANGE_GALLERY_SETTINGS',
}

export enum AutomationRunStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AutomationStepRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AutomationApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum AutomationTemplateCategory {
  WEDDING = 'WEDDING',
  BIRTHDAY = 'BIRTHDAY',
  CORPORATE = 'CORPORATE',
  PRE_WEDDING = 'PRE_WEDDING',
  ENGAGEMENT = 'ENGAGEMENT',
  FAMILY = 'FAMILY',
  GENERAL = 'GENERAL',
  CUSTOM = 'CUSTOM',
}

export interface AutomationStepConfigDTO {
  id: string;
  name?: string;
  action: AutomationActionType;
  dependsOn?: string[];
  requiresApproval?: boolean;
  params?: Record<string, any>;
}

export interface AutomationFailureConfigDTO {
  retryFailedStep?: boolean;
  maxRetries?: number; // 1 to 5
  continueOnNonCriticalFailure?: boolean;
  notifyOnFailure?: boolean;
  pauseOnFailure?: boolean;
}

export interface AutomationNotificationConfigDTO {
  notifyOnStart?: boolean;
  notifyOnComplete?: boolean;
  notifyOnApprovalRequired?: boolean;
  notifyOnFailure?: boolean;
}

export interface AutomationWorkflowConfigDTO {
  version: number;
  steps: AutomationStepConfigDTO[];
  failureHandling?: AutomationFailureConfigDTO;
  notifications?: AutomationNotificationConfigDTO;
  schedule?: {
    cadence: 'HOURLY' | 'DAILY' | 'WEEKLY';
    time?: string; // e.g. "08:00"
    dayOfWeek?: number; // 0-6
    timezone?: string;
  };
}

export interface AutomationWorkflowDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  trigger_type: AutomationTriggerType;
  trigger_config?: Record<string, any> | null;
  workflow_config: AutomationWorkflowConfigDTO;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  last_run_at?: Date | string | null;
  runs_count?: number;
  success_rate?: number;
}

export interface CreateAutomationWorkflowDTO {
  name: string;
  description?: string;
  enabled?: boolean;
  trigger_type: AutomationTriggerType;
  trigger_config?: Record<string, any>;
  workflow_config: AutomationWorkflowConfigDTO;
}

export interface UpdateAutomationWorkflowDTO {
  name?: string;
  description?: string;
  enabled?: boolean;
  trigger_type?: AutomationTriggerType;
  trigger_config?: Record<string, any>;
  workflow_config?: AutomationWorkflowConfigDTO;
}

export interface AutomationStepRunDTO {
  id: string;
  automation_run_id: string;
  step_key: string;
  action_type: AutomationActionType;
  status: AutomationStepRunStatus;
  attempt: number;
  started_at: Date | string;
  completed_at?: Date | string | null;
  error_message?: string | null;
  result?: Record<string, any> | null;
  approval?: AutomationApprovalDTO | null;
}

export interface AutomationRunDTO {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  studio_id: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  trigger: AutomationTriggerType;
  status: AutomationRunStatus;
  current_step?: string | null;
  started_at: Date | string;
  completed_at?: Date | string | null;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
  step_runs?: AutomationStepRunDTO[];
  approvals?: AutomationApprovalDTO[];
}

export interface AutomationApprovalDTO {
  id: string;
  studio_id: string;
  automation_run_id: string;
  step_run_id: string;
  action_type: AutomationActionType;
  title: string;
  description: string;
  payload?: Record<string, any> | null;
  status: AutomationApprovalStatus;
  requested_at: Date | string;
  resolved_at?: Date | string | null;
  resolved_by?: string | null;
  run?: {
    id: string;
    workflow_id: string;
    gallery_id?: string | null;
  };
}

export interface ResolveAutomationApprovalDTO {
  decision: 'APPROVE' | 'REJECT';
  note?: string;
}

export interface AutomationTemplateDTO {
  id: string;
  studio_id?: string | null;
  name: string;
  description: string;
  category: AutomationTemplateCategory;
  workflow_config: AutomationWorkflowConfigDTO;
  is_system: boolean;
  enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AutomationExecutionLogDTO {
  id: string;
  studio_id: string;
  workflow_id?: string | null;
  automation_run_id: string;
  event_type: string;
  message: string;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
}

export interface AutomationTelemetryDTO {
  total_workflows: number;
  active_workflows: number;
  total_runs: number;
  runs_today: number;
  runs_by_status: {
    queued: number;
    running: number;
    waiting_approval: number;
    completed: number;
    partial: number;
    failed: number;
    cancelled: number;
  };
  success_rate: number;
  failure_rate: number;
  pending_approvals_count: number;
  queue_depth: number;
  avg_execution_duration_ms: number;
  avg_approval_wait_time_ms: number;
  most_used_templates: {
    template_id: string;
    name: string;
    usage_count: number;
  }[];
  most_failed_actions: {
    action: AutomationActionType;
    failure_count: number;
  }[];
}

export interface GalleryAutomationSettingsDTO {
  enabled: boolean;
  workflow_id?: string | null;
  auto_process: boolean;
  auto_ai_indexing: boolean;
  auto_intelligence: boolean;
  auto_story: boolean;
  notify_when_ready: boolean;
}

export interface BulkAutomationRunRequestDTO {
  gallery_ids: string[];
  workflow_id?: string;
  action_type?: AutomationActionType;
}

// ==========================================
// PHASE 17: AI CLIENT ENGAGEMENT, RETENTION & CRM INTELLIGENCE
// ==========================================

export enum ClientEngagementState {
  NEW = 'NEW',
  ACTIVE = 'ACTIVE',
  ENGAGED = 'ENGAGED',
  LOW_ENGAGEMENT = 'LOW_ENGAGEMENT',
  AT_RISK = 'AT_RISK',
  INACTIVE = 'INACTIVE',
  COMPLETED = 'COMPLETED',
}

export enum ClientJourneyStage {
  NEW_CLIENT = 'NEW_CLIENT',
  GALLERY_DELIVERED = 'GALLERY_DELIVERED',
  FIRST_VISIT = 'FIRST_VISIT',
  ACTIVE_VIEWING = 'ACTIVE_VIEWING',
  FAVORITING = 'FAVORITING',
  SELECTING = 'SELECTING',
  DOWNLOADING = 'DOWNLOADING',
  COMPLETED = 'COMPLETED',
  RE_ENGAGEMENT = 'RE_ENGAGEMENT',
  RETURN_CLIENT = 'RETURN_CLIENT',
}

export enum ClientInsightType {
  PENDING_SELECTION = 'PENDING_SELECTION',
  LOW_ENGAGEMENT = 'LOW_ENGAGEMENT',
  INACTIVE_GALLERY = 'INACTIVE_GALLERY',
  HIGH_ENGAGEMENT = 'HIGH_ENGAGEMENT',
  DOWNLOAD_COMPLETE = 'DOWNLOAD_COMPLETE',
  RETURN_CLIENT = 'RETURN_CLIENT',
  MULTIPLE_GALLERIES = 'MULTIPLE_GALLERIES',
  GALLERY_NOT_OPENED = 'GALLERY_NOT_OPENED',
  RECENT_ACTIVITY = 'RECENT_ACTIVITY',
  FOLLOW_UP_RECOMMENDED = 'FOLLOW_UP_RECOMMENDED',
  TESTIMONIAL_RECOMMENDED = 'TESTIMONIAL_RECOMMENDED',
  REFERRAL_RECOMMENDED = 'REFERRAL_RECOMMENDED',
}

export enum ClientInsightSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ClientInsightStatus {
  OPEN = 'OPEN',
  DISMISSED = 'DISMISSED',
  RESOLVED = 'RESOLVED',
}

export enum ClientFollowUpType {
  GALLERY_REMINDER = 'GALLERY_REMINDER',
  SELECTION_REMINDER = 'SELECTION_REMINDER',
  DOWNLOAD_REMINDER = 'DOWNLOAD_REMINDER',
  INACTIVE_CLIENT = 'INACTIVE_CLIENT',
  TESTIMONIAL_REQUEST = 'TESTIMONIAL_REQUEST',
  REFERRAL_REQUEST = 'REFERRAL_REQUEST',
  GENERAL_FOLLOW_UP = 'GENERAL_FOLLOW_UP',
}

export enum ClientFollowUpPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ClientFollowUpStatus {
  OPEN = 'OPEN',
  PENDING = 'PENDING',
  DRAFTED = 'DRAFTED',
  DISMISSED = 'DISMISSED',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum ClientCommunicationChannel {
  IN_APP = 'IN_APP',
  PORTAL = 'PORTAL',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export { ClientCommunicationChannel as CommunicationChannel };

export enum ClientCommunicationStatus {
  DRAFT = 'DRAFT',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  SCHEDULED = 'SCHEDULED',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export interface ClientEngagementProfileDTO {
  id: string;
  studio_id: string;
  client_id: string;
  engagement_score: number;
  engagement_state: ClientEngagementState;
  last_activity_at?: Date | string | null;
  first_activity_at?: Date | string | null;
  total_gallery_views: number;
  total_photo_views: number;
  total_favorites: number;
  total_selections: number;
  total_downloads: number;
  total_find_my_photos: number;
  total_galleries: number;
  completed_galleries: number;
  updated_at: Date | string;

  // UI / camelCase compatibility aliases
  state?: ClientEngagementState;
  engagementScore?: number;
  totalVisits?: number;
  totalFavorites?: number;
  totalSelections?: number;
  totalDownloads?: number;
  recencyCategory?: string;
  scoreComponents?: {
    visitsScore: number;
    curationScore: number;
    downloadScore: number;
    recencyMultiplier: number;
  };
}

export interface ClientJourneyStateDTO {
  id: string;
  studio_id: string;
  client_id: string;
  current_stage: ClientJourneyStage;
  previous_stage?: ClientJourneyStage | null;
  stage_entered_at: Date | string;
  first_seen_at?: Date | string | null;
  first_gallery_delivered_at?: Date | string | null;
  first_selection_at?: Date | string | null;
  first_download_at?: Date | string | null;
  first_purchase_at?: Date | string | null;
  last_active_at?: Date | string | null;
  history?: Array<{
    stage: ClientJourneyStage;
    entered_at: string;
    reason?: string;
  }> | null;
  created_at: Date | string;
  updated_at: Date | string;

  // UI / camelCase compatibility aliases
  clientId?: string;
  studioId?: string;
  stage?: ClientJourneyStage;
  currentStage?: ClientJourneyStage;
  previousStage?: ClientJourneyStage | null;
  entered_at?: Date | string;
  enteredStageAt?: Date | string;
  stageEnteredAt?: Date | string;
  firstSeenAt?: Date | string | null;
  firstGalleryDeliveredAt?: Date | string | null;
  firstSelectionAt?: Date | string | null;
  firstDownloadAt?: Date | string | null;
  firstPurchaseAt?: Date | string | null;
  lastActiveAt?: Date | string | null;
  stageTransitions?: Array<{
    fromStage?: string;
    toStage: string;
    transitionedAt?: Date | string;
  }>;
  metadata?: Record<string, any> | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ClientInsightDTO {
  id: string;
  studio_id: string;
  client_id: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  type: ClientInsightType;
  severity: ClientInsightSeverity;
  title: string;
  description: string;
  evidence?: Record<string, any> | null;
  status: ClientInsightStatus;
  created_at: Date | string;
  updated_at: Date | string;
  resolved_at?: Date | string | null;

  // UI / camelCase compatibility aliases
  clientId?: string;
  studioId?: string;
  galleryId?: string | null;
  galleryTitle?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  resolvedAt?: Date | string | null;
  message?: string;
}

export interface ClientFollowUpRecommendationDTO {
  id: string;
  studio_id: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  type: ClientFollowUpType;
  reason: string;
  title: string;
  description?: string;
  message_suggestion?: string | null;
  suggestedSubject?: string | null;
  suggestedBody?: string | null;
  priority: ClientFollowUpPriority | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: ClientFollowUpStatus;
  created_at: Date | string;
  updated_at: Date | string;
  resolved_at?: Date | string | null;
  drafts_count?: number;

  // UI & camelCase compatibility aliases
  clientId?: string;
  studioId?: string;
  clientName?: string;
  clientEmail?: string;
  galleryId?: string | null;
  galleryTitle?: string | null;
  messageSuggestion?: string | null;
  draftsCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  resolvedAt?: Date | string | null;
}

export interface ClientCommunicationDraftDTO {
  id: string;
  studio_id: string;
  client_id: string;
  client_name?: string;
  client_email?: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  recommendation_id?: string | null;
  channel: ClientCommunicationChannel;
  subject?: string | null;
  body: string;
  status: ClientCommunicationStatus;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  approved_at?: Date | string | null;
  sent_at?: Date | string | null;

  // UI & camelCase compatibility aliases
  clientId?: string;
  studioId?: string;
  galleryId?: string | null;
  galleryTitle?: string | null;
  clientName?: string;
  clientEmail?: string;
  recipientEmail?: string;
  recommendationId?: string | null;
  followUpRecommendationId?: string | null;
  bodyText?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  approvedAt?: Date | string | null;
  sentAt?: Date | string | null;
}

export interface GalleryClientEngagementDTO {
  gallery_id: string;
  gallery_title: string;
  gallery_status: string;
  delivery_status?: string | null;
  delivered_at?: Date | string | null;
  last_activity_at?: Date | string | null;
  views_count: number;
  unique_sessions_count: number;
  photo_views_count: number;
  favorites_count: number;
  selections_count: number;
  downloads_count: number;
  find_my_photos_count: number;
  is_selection_completed: boolean;
  is_download_completed: boolean;
  completion_percentage: number;

  // UI / camelCase compatibility aliases
  galleryId?: string;
  galleryTitle?: string;
  galleryStatus?: string;
  visitCount?: number;
  favoriteCount?: number;
  selectionCount?: number;
  downloadCount?: number;
}

export interface ClientActivityTimelineItemDTO {
  id: string;
  activity_type: string;
  description: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;

  // UI compatibility aliases
  title?: string;
  action?: string;
  timestamp?: Date | string;
  createdAt?: Date | string;
}

export interface Client360DTO {
  client: ClientDTO;
  engagement: ClientEngagementProfileDTO;
  journey: ClientJourneyStateDTO;
  galleries: GalleryClientEngagementDTO[];
  timeline: ClientActivityTimelineItemDTO[];
  insights: ClientInsightDTO[];
  follow_ups: ClientFollowUpRecommendationDTO[];
  communications: ClientCommunicationDraftDTO[];
  is_return_client: boolean;
  previous_galleries_count: number;

  // UI compatibility aliases
  stats?: {
    totalGalleries?: number;
    lastActiveAt?: Date | string | null;
    isRepeatClient?: boolean;
    lifetimeValue?: number;
    firstSeenAt?: Date | string | null;
  };
  activeFollowUps?: ClientFollowUpRecommendationDTO[];
  pendingDrafts?: ClientCommunicationDraftDTO[];
}

export interface ClientIntelligenceOverviewDTO {
  total_clients: number;
  active_clients: number;
  engaged_clients: number;
  clients_needing_followup: number;
  pending_selections: number;
  inactive_clients: number;
  return_clients: number;
  pending_communications: number;
  engagement_distribution: {
    state: ClientEngagementState;
    count: number;
    percentage: number;
  }[];
  journey_distribution: {
    stage: ClientJourneyStage;
    count: number;
  }[];
  top_followups: ClientFollowUpRecommendationDTO[];
  recent_activity: ClientActivityTimelineItemDTO[];
  return_clients_list: {
    client_id: string;
    name: string;
    email: string;
    galleries_count: number;
    last_activity_at?: Date | string | null;
    engagement_score: number;
  }[];

  // UI / camelCase compatibility aliases
  totalClients?: number;
  activeClients?: number;
  engagedClients?: number;
  clientsNeedingFollowup?: number;
  averageEngagementScore?: number;
  pendingFollowUpsCount?: number;
  pendingDraftsCount?: number;
  pendingSelections?: number;
  inactiveClients?: number;
  returnClients?: number;
  pendingCommunications?: number;
  engagementDistribution?: {
    state: ClientEngagementState;
    count: number;
    percentage: number;
  }[] | Record<string, number> | any;
  journeyDistribution?: {
    stage: ClientJourneyStage;
    count: number;
  }[];
  topFollowups?: ClientFollowUpRecommendationDTO[];
  recentActivity?: ClientActivityTimelineItemDTO[];
  recentStageTransitions?: Array<{
    clientId: string;
    clientName: string;
    previousStage?: string | null;
    currentStage: string;
    enteredStageAt: string | Date;
  }>;
  repeatClients?: Array<{
    clientId: string;
    name: string;
    email: string;
    galleriesCount: number;
    lastActiveAt?: Date | string | null;
    engagementScore: number;
  }>;
  returnClientsList?: {
    client_id: string;
    clientId?: string;
    name: string;
    email: string;
    galleries_count: number;
    galleriesCount?: number;
    last_activity_at?: Date | string | null;
    lastActivityAt?: Date | string | null;
    engagement_score: number;
    engagementScore?: number;
  }[];
}

export interface ClientFollowUpFilterDTO {
  type?: ClientFollowUpType;
  status?: ClientFollowUpStatus;
  priority?: string;
  gallery_id?: string;
  client_id?: string;
  limit?: number;
  offset?: number;
}

export interface ClientCommunicationsFilterDTO {
  status?: ClientCommunicationStatus;
  channel?: ClientCommunicationChannel;
  client_id?: string;
  gallery_id?: string;
  limit?: number;
  offset?: number;
}

export interface AdminClientIntelligenceTelemetryDTO {
  total_studios: number;
  total_clients_indexed: number;
  avg_engagement_score: number;
  total_followup_recommendations: number;
  followups_approved_count: number;
  followups_dismissed_count: number;
  followups_expired_count: number;
  approval_conversion_rate: number;
  total_communications_drafted: number;
  total_communications_sent: number;
  total_communications_failed: number;
  total_return_clients: number;
  active_scans_today: number;

  // Optional camelCase and dashboard telemetry aliases
  totalProfilesScored?: number;
  globalAverageEngagementScore?: number;
  followUpsGenerated?: number;
  communicationsSent?: number;
  globalStateDistribution?: Record<string, number>;
  topActiveStudios?: Array<{
    studioId: string;
    studioName?: string;
    name?: string;
    clientCount?: number;
    activeClients?: number;
    averageEngagement?: number;
    avgScore?: number;
  }>;
}

// ==========================================
// PHASE 18: STUDIO BUSINESS INTELLIGENCE & REVENUE INTELLIGENCE
// ==========================================

export enum BusinessTransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  REFUND = 'REFUND',
}

export enum BusinessTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum BusinessGoalPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
}

export enum BusinessGoalMetricType {
  REVENUE = 'REVENUE',
  PROFIT = 'PROFIT',
  BOOKINGS_COUNT = 'BOOKINGS_COUNT',
  GALLERIES_DELIVERED = 'GALLERIES_DELIVERED',
  AVERAGE_ORDER_VALUE = 'AVERAGE_ORDER_VALUE',
}

export enum BusinessGoalStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

export enum BusinessInsightType {
  REVENUE_DROP = 'REVENUE_DROP',
  REVENUE_SPIKE = 'REVENUE_SPIKE',
  EXPENSE_SURGE = 'EXPENSE_SURGE',
  UNPAID_INVOICE_AGING = 'UNPAID_INVOICE_AGING',
  TURNAROUND_INCREASE = 'TURNAROUND_INCREASE',
  ENGAGEMENT_DIP = 'ENGAGEMENT_DIP',
  HIGH_MARGIN_SERVICE = 'HIGH_MARGIN_SERVICE',
  LOW_MARGIN_SERVICE = 'LOW_MARGIN_SERVICE',
}

export enum BusinessInsightSeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum BusinessInsightStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum BusinessForecastMetric {
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  PROFIT = 'PROFIT',
  BOOKINGS_COUNT = 'BOOKINGS_COUNT',
}

export enum BusinessForecastPeriod {
  NEXT_MONTH = 'NEXT_MONTH',
  NEXT_QUARTER = 'NEXT_QUARTER',
  NEXT_YEAR = 'NEXT_YEAR',
}

export enum BusinessForecastConfidence {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

export interface StudioBusinessTransactionDTO {
  id: string;
  studio_id: string;
  gallery_id?: string | null;
  gallery_title?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  type: BusinessTransactionType;
  category: string;
  amount: number;
  currency: string;
  status: BusinessTransactionStatus;
  payment_method?: string | null;
  reference_number?: string | null;
  transaction_date: Date | string;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  is_void: boolean;
  void_reason?: string | null;
  voided_at?: Date | string | null;
  voided_by?: string | null;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  galleryId?: string | null;
  galleryTitle?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  transactionDate?: Date | string;
  isVoid?: boolean;
  voidReason?: string | null;
  voidedAt?: Date | string | null;
  voidedBy?: string | null;
  createdBy?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateBusinessTransactionDTO {
  gallery_id?: string | null;
  client_id?: string | null;
  type: BusinessTransactionType;
  category: string;
  amount: number;
  currency?: string;
  status?: BusinessTransactionStatus;
  payment_method?: string | null;
  reference_number?: string | null;
  transaction_date: Date | string;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
}

export interface UpdateBusinessTransactionDTO {
  gallery_id?: string | null;
  client_id?: string | null;
  type?: BusinessTransactionType;
  category?: string;
  amount?: number;
  currency?: string;
  status?: BusinessTransactionStatus;
  payment_method?: string | null;
  reference_number?: string | null;
  transaction_date?: Date | string;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
}

export interface VoidBusinessTransactionDTO {
  void_reason: string;
}

export interface BusinessOverviewDTO {
  studio_id: string;
  currency: string;
  has_financial_data: boolean;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_pct: number;
  average_order_value: number;
  total_completed_bookings: number;
  pending_payments_amount: number;
  refunds_amount: number;
  period: {
    start_date: string;
    end_date: string;
    label: string;
  };
  mom_growth: {
    revenue_growth_pct: number;
    expense_growth_pct: number;
    profit_growth_pct: number;
  };
  recent_transactions: StudioBusinessTransactionDTO[];
  active_insights: StudioBusinessInsightDTO[];
  active_goals: StudioBusinessGoalDTO[];

  // CamelCase UI aliases
  studioId?: string;
  hasFinancialData?: boolean;
  totalRevenue?: number;
  totalExpenses?: number;
  netProfit?: number;
  profitMarginPct?: number;
  averageOrderValue?: number;
  totalCompletedBookings?: number;
  pendingPaymentsAmount?: number;
  refundsAmount?: number;
  momGrowth?: {
    revenueGrowthPct: number;
    expenseGrowthPct: number;
    profitGrowthPct: number;
  };
  recentTransactions?: StudioBusinessTransactionDTO[];
  activeInsights?: StudioBusinessInsightDTO[];
  activeGoals?: StudioBusinessGoalDTO[];
}

export interface BusinessTrendPointDTO {
  date: string;
  period_label: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin_pct: number;
  transaction_count: number;

  // CamelCase UI aliases
  periodLabel?: string;
  marginPct?: number;
  transactionCount?: number;
}

export interface BusinessRevenueBreakdownDTO {
  category: string;
  amount: number;
  percentage: number;
  transaction_count: number;
  average_amount: number;

  // CamelCase UI aliases
  transactionCount?: number;
  averageAmount?: number;
}

export interface StudioPerformanceMetricsDTO {
  studio_id: string;
  period_label: string;
  total_galleries_created: number;
  total_galleries_delivered: number;
  delivery_rate_pct: number;
  average_turnaround_days: number;
  median_turnaround_days: number;
  total_photos_processed: number;
  total_client_favorites: number;
  total_client_downloads: number;
  total_client_selections: number;
  client_engagement_index: number;
  repeat_client_rate_pct: number;
  average_revenue_per_gallery: number;
  average_revenue_per_client: number;

  // CamelCase UI aliases
  studioId?: string;
  periodLabel?: string;
  totalGalleriesCreated?: number;
  totalGalleriesDelivered?: number;
  deliveryRatePct?: number;
  averageTurnaroundDays?: number;
  medianTurnaroundDays?: number;
  totalPhotosProcessed?: number;
  totalClientFavorites?: number;
  totalClientDownloads?: number;
  totalClientSelections?: number;
  clientEngagementIndex?: number;
  repeatClientRatePct?: number;
  averageRevenuePerGallery?: number;
  averageRevenuePerClient?: number;
}

export interface ServicePerformanceDTO {
  service_category: string;
  revenue: number;
  expenses: number;
  net_profit: number;
  profit_margin_pct: number;
  galleries_count: number;
  average_turnaround_days: number;
  average_revenue_per_job: number;
  client_satisfaction_rating?: number | null;

  // CamelCase UI aliases
  serviceCategory?: string;
  netProfit?: number;
  profitMarginPct?: number;
  galleriesCount?: number;
  averageTurnaroundDays?: number;
  averageRevenuePerJob?: number;
  clientSatisfactionRating?: number | null;
}

export interface GalleryToBusinessFunnelDTO {
  gallery_id: string;
  gallery_title: string;
  client_name?: string | null;
  event_date?: Date | string | null;
  created_at: Date | string;
  delivered_at?: Date | string | null;
  total_photos: number;
  views_count: number;
  favorites_count: number;
  selections_count: number;
  downloads_count: number;
  recorded_revenue: number;
  recorded_expenses: number;
  net_profit: number;
  currency: string;
  payment_status: BusinessTransactionStatus | 'UNTRACKED';

  // CamelCase UI aliases
  galleryId?: string;
  galleryTitle?: string;
  clientName?: string | null;
  eventDate?: Date | string | null;
  createdAt?: Date | string;
  deliveredAt?: Date | string | null;
  totalPhotos?: number;
  viewsCount?: number;
  favoritesCount?: number;
  selectionsCount?: number;
  downloadsCount?: number;
  recordedRevenue?: number;
  recordedExpenses?: number;
  netProfit?: number;
  paymentStatus?: BusinessTransactionStatus | 'UNTRACKED';
}

export interface ClientBusinessSummaryDTO {
  client_id: string;
  name: string;
  email: string;
  phone?: string | null;
  first_booking_date?: Date | string | null;
  latest_booking_date?: Date | string | null;
  total_bookings: number;
  total_revenue: number;
  total_refunds: number;
  net_revenue: number;
  currency: string;
  average_order_value: number;
  is_repeat_client: boolean;
  engagement_score: number;
  journey_stage?: string;

  // CamelCase UI aliases
  clientId?: string;
  firstBookingDate?: Date | string | null;
  latestBookingDate?: Date | string | null;
  totalBookings?: number;
  totalRevenue?: number;
  totalRefunds?: number;
  netRevenue?: number;
  averageOrderValue?: number;
  isRepeatClient?: boolean;
  engagementScore?: number;
  journeyStage?: string;
}

export interface StudioBusinessGoalDTO {
  id: string;
  studio_id: string;
  title: string;
  metric_type: BusinessGoalMetricType;
  target_value: number;
  current_value: number;
  currency: string;
  period_type: BusinessGoalPeriodType;
  start_date: Date | string;
  end_date: Date | string;
  status: BusinessGoalStatus;
  progress_pct: number;
  notes?: string | null;
  achieved_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  metricType?: BusinessGoalMetricType;
  targetValue?: number;
  currentValue?: number;
  periodType?: BusinessGoalPeriodType;
  startDate?: Date | string;
  endDate?: Date | string;
  progressPct?: number;
  achievedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateBusinessGoalDTO {
  title: string;
  metric_type: BusinessGoalMetricType;
  target_value: number;
  currency?: string;
  period_type: BusinessGoalPeriodType;
  start_date: Date | string;
  end_date: Date | string;
  notes?: string | null;
}

export interface UpdateBusinessGoalDTO {
  title?: string;
  target_value?: number;
  status?: BusinessGoalStatus;
  notes?: string | null;
}

export interface StudioBusinessForecastDTO {
  metric: BusinessForecastMetric;
  period: BusinessForecastPeriod;
  forecast_value: number;
  lower_bound: number;
  upper_bound: number;
  confidence: BusinessForecastConfidence;
  confidence_score: number;
  data_points_analyzed: number;
  currency: string;
  model_name: string;
  growth_rate_pct: number;
  historical_baseline_avg: number;
  generated_at: Date | string;
  explanation: string;

  // CamelCase UI aliases
  forecastValue?: number;
  lowerBound?: number;
  upperBound?: number;
  confidenceScore?: number;
  dataPointsAnalyzed?: number;
  modelName?: string;
  growthRatePct?: number;
  historicalBaselineAvg?: number;
  generatedAt?: Date | string;
}

export interface StudioBusinessInsightDTO {
  id: string;
  studio_id: string;
  type: BusinessInsightType;
  severity: BusinessInsightSeverity;
  status: BusinessInsightStatus;
  title: string;
  description: string;
  action_recommendation?: string | null;
  impact_amount?: number | null;
  impact_currency?: string | null;
  metric_key?: string | null;
  metric_change_pct?: number | null;
  metadata?: Record<string, any> | null;
  acknowledged_at?: Date | string | null;
  resolved_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  actionRecommendation?: string | null;
  impactAmount?: number | null;
  impactCurrency?: string | null;
  metricKey?: string | null;
  metricChangePct?: number | null;
  acknowledgedAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface AdminStudioBusinessTelemetryDTO {
  total_studios: number;
  studios_with_business_data: number;
  business_intelligence_adoption_pct: number;
  aggregate_tracked_revenue: number;
  aggregate_tracked_expenses: number;
  aggregate_tracked_net_profit: number;
  aggregate_transactions_count: number;
  total_active_goals: number;
  total_insights_generated: number;
  insights_acknowledged_pct: number;
  top_studios_by_revenue: Array<{
    studio_id: string;
    studio_name: string;
    recorded_revenue: number;
    transaction_count: number;
    currency: string;
  }>;
  currency_distribution: Array<{
    currency: string;
    count: number;
    total_volume: number;
  }>;
  transaction_volume_timeseries: Array<{
    date: string;
    income_volume: number;
    expense_volume: number;
    transaction_count: number;
  }>;

  // CamelCase UI aliases
  totalStudios?: number;
  studiosWithBusinessData?: number;
  businessIntelligenceAdoptionPct?: number;
  aggregateTrackedRevenue?: number;
  aggregateTrackedExpenses?: number;
  aggregateTrackedNetProfit?: number;
  aggregateTransactionsCount?: number;
  totalActiveGoals?: number;
  totalInsightsGenerated?: number;
  insightsAcknowledgedPct?: number;
  topStudiosByRevenue?: Array<{
    studioId: string;
    studioName: string;
    recordedRevenue: number;
    transactionCount: number;
    currency: string;
  }>;
  currencyDistribution?: Array<{
    currency: string;
    count: number;
    totalVolume: number;
  }>;
  transactionVolumeTimeseries?: Array<{
    date: string;
    incomeVolume: number;
    expenseVolume: number;
    transactionCount: number;
  }>;
}

// ==========================================
// PHASE 19: AI BUSINESS GROWTH & MARKETING INTELLIGENCE
// ==========================================

export enum GrowthOpportunityType {
  CLIENT_REACTIVATION = 'CLIENT_REACTIVATION',
  SEASONAL_DEMAND = 'SEASONAL_DEMAND',
  SERVICE_CROSS_SELL = 'SERVICE_CROSS_SELL',
  ANNIVERSARY_MILESTONE = 'ANNIVERSARY_MILESTONE',
  VIP_CARE = 'VIP_CARE',
  REFERRAL_POTENTIAL = 'REFERRAL_POTENTIAL',
  PACKAGE_UPGRADE = 'PACKAGE_UPGRADE',
  UNFINISHED_INTERACTION = 'UNFINISHED_INTERACTION',
}

export enum GrowthOpportunityPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum GrowthOpportunityStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  CAMPAIGN_CREATED = 'CAMPAIGN_CREATED',
  COMPLETED = 'COMPLETED',
  DISMISSED = 'DISMISSED',
  EXPIRED = 'EXPIRED',
}

export enum MarketingCampaignChannel {
  EMAIL = 'EMAIL',
}

export enum MarketingCampaignStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum MarketingRecipientStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  OPENED = 'OPENED',
  CLICKED = 'CLICKED',
  CONVERTED = 'CONVERTED',
  BOUNCED = 'BOUNCED',
  SUPPRESSED = 'SUPPRESSED',
  UNSUBSCRIBED = 'UNSUBSCRIBED',
  FAILED = 'FAILED',
}

export interface GrowthOpportunityDTO {
  id: string;
  studio_id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  gallery_id?: string | null;
  gallery_title?: string | null;
  type: GrowthOpportunityType;
  priority: GrowthOpportunityPriority;
  status: GrowthOpportunityStatus;
  title: string;
  description: string;
  evidence?: {
    days_since_activity?: number;
    past_galleries_count?: number;
    recorded_revenue?: number;
    engagement_score?: number;
    historical_peak_month?: number;
    historical_peak_season?: string;
    lead_time_days?: number;
    detected_gap?: string;
    details?: string;
    [key: string]: any;
  } | null;
  recommended_action: string;
  confidence_score: number; // 0.0 - 1.0 (evidence quality)
  confidence_level: 'HIGH' | 'MODERATE' | 'LOW';
  expires_at?: Date | string | null;
  completed_at?: Date | string | null;
  dismissed_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  galleryId?: string | null;
  galleryTitle?: string | null;
  recommendedAction?: string;
  confidenceScore?: number;
  confidenceLevel?: 'HIGH' | 'MODERATE' | 'LOW';
  expiresAt?: Date | string | null;
  completedAt?: Date | string | null;
  dismissedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface GrowthOverviewDTO {
  kpis: {
    active_opportunities_count: number;
    urgent_opportunities_count: number;
    reactivation_candidates_count: number;
    active_campaigns_count: number;
    total_campaign_conversions: number;
    total_attributed_revenue: number;
    currency: string;
    campaign_delivery_rate_pct: number | null;
    campaign_open_rate_pct: number | null;
    campaign_click_rate_pct: number | null;
    campaign_conversion_rate_pct: number | null;
  };
  aggregate_metrics?: {
    delivery_rate_pct: number | null;
    open_rate_pct: number | null;
    click_rate_pct: number | null;
    conversion_rate_pct: number | null;
    campaign_roi_pct: number | null;
  };
  total_campaigns?: number;
  total_conversions?: number;
  total_attributed_revenue?: number;
  top_opportunities: GrowthOpportunityDTO[];
  recent_campaigns: MarketingCampaignDTO[];
  service_growth_highlights: Array<{
    category: string;
    booking_count: number;
    revenue: number;
    trend_pct: number;
    status: 'SURGING' | 'STEADY' | 'DECLINING';
  }>;
  seasonal_alerts: Array<{
    season_name: string;
    months: number[];
    recommended_campaign_prep_days: number;
    message: string;
  }>;

  // CamelCase UI aliases
  topOpportunities?: GrowthOpportunityDTO[];
  recentCampaigns?: MarketingCampaignDTO[];
  serviceGrowthHighlights?: Array<{
    category: string;
    bookingCount: number;
    revenue: number;
    trendPct: number;
    status: 'SURGING' | 'STEADY' | 'DECLINING';
  }>;
  seasonalAlerts?: Array<{
    seasonName: string;
    months: number[];
    recommendedCampaignPrepDays: number;
    message: string;
  }>;
}

export interface ClientReactivationCandidateDTO {
  client_id: string;
  name: string;
  email: string;
  phone?: string | null;
  last_activity_at?: Date | string | null;
  days_inactive: number;
  past_galleries_count: number;
  recorded_revenue: number;
  currency: string;
  engagement_score: number;
  reengagement_score: number; // Deterministic 0-100 score
  recommended_angle: string;
  suppression_status: 'AVAILABLE' | 'UNSUBSCRIBED' | 'BOUNCED' | 'OPTED_OUT';
  opportunity_id?: string | null;

  // CamelCase UI aliases
  clientId?: string;
  lastActivityAt?: Date | string | null;
  daysInactive?: number;
  pastGalleriesCount?: number;
  recordedRevenue?: number;
  engagementScore?: number;
  reengagementScore?: number;
  recommendedAngle?: string;
  suppressionStatus?: 'AVAILABLE' | 'UNSUBSCRIBED' | 'BOUNCED' | 'OPTED_OUT';
  opportunityId?: string | null;
}

export interface ReactivationCandidatesFilterDTO {
  min_days_inactive?: number;
  max_days_inactive?: number;
  min_engagement_score?: number;
  category?: string;
  search?: string;
  exclude_suppressed?: boolean;
}

export interface MarketingCampaignDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  objective: string;
  channel: MarketingCampaignChannel;
  status: MarketingCampaignStatus;
  segment_definition?: {
    type?: string;
    min_days_inactive?: number;
    category?: string;
    client_ids?: string[];
    [key: string]: any;
  } | null;
  subject: string;
  content: string;
  preview_text?: string | null;
  offer_text?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  cost: number;
  scheduled_at?: Date | string | null;
  started_at?: Date | string | null;
  completed_at?: Date | string | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: Date | string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;

  recipient_count?: number;
  sent_count?: number;
  delivered_count?: number;
  opened_count?: number;
  clicked_count?: number;
  converted_count?: number;
  unsubscribed_count?: number;
  bounced_count?: number;
  failed_count?: number;
  total_revenue?: number;

  // CamelCase UI aliases
  studioId?: string;
  segmentDefinition?: Record<string, any> | null;
  previewText?: string | null;
  offerText?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  scheduledAt?: Date | string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  recipientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  convertedCount?: number;
  unsubscribedCount?: number;
  bouncedCount?: number;
  failedCount?: number;
  totalRevenue?: number;
}

export interface MarketingCampaignRecipientDTO {
  id: string;
  campaign_id: string;
  client_id?: string | null;
  email: string;
  client_name?: string | null;
  status: MarketingRecipientStatus;
  sent_at?: Date | string | null;
  delivered_at?: Date | string | null;
  opened_at?: Date | string | null;
  clicked_at?: Date | string | null;
  unsubscribed_at?: Date | string | null;
  bounced_at?: Date | string | null;
  conversion_at?: Date | string | null;
  conversion_value?: number | null;
  conversion_type?: string | null;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  campaignId?: string;
  clientId?: string | null;
  clientName?: string | null;
  sentAt?: Date | string | null;
  deliveredAt?: Date | string | null;
  openedAt?: Date | string | null;
  clickedAt?: Date | string | null;
  unsubscribedAt?: Date | string | null;
  bouncedAt?: Date | string | null;
  conversionAt?: Date | string | null;
  conversionValue?: number | null;
  conversionType?: string | null;
  errorMessage?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CampaignRecipientPreviewDTO {
  total_matching: number;
  eligible_recipients: Array<{
    client_id?: string | null;
    email: string;
    client_name?: string | null;
    days_inactive?: number;
  }>;
  suppressed_count: number;
  suppressed_reasons: {
    unsubscribed: number;
    bounced: number;
    opted_out: number;
  };
}

export interface CreateCampaignDraftDTO {
  name: string;
  description?: string;
  objective?: string;
  channel?: MarketingCampaignChannel;
  segment_definition?: Record<string, any>;
  subject: string;
  content: string;
  preview_text?: string;
  offer_text?: string;
  cta_text?: string;
  cta_url?: string;
  cost?: number;
  scheduled_at?: Date | string | null;
  recipients?: Array<{
    client_id?: string;
    email: string;
    client_name?: string;
  }>;
}

export interface UpdateCampaignDraftDTO {
  name?: string;
  description?: string;
  objective?: string;
  segment_definition?: Record<string, any>;
  subject?: string;
  content?: string;
  preview_text?: string;
  offer_text?: string;
  cta_text?: string;
  cta_url?: string;
  cost?: number;
  scheduled_at?: Date | string | null;
}

export interface ApproveCampaignDTO {
  approval_note?: string;
}

export interface ScheduleCampaignDTO {
  scheduled_at: Date | string;
}

export interface CampaignPerformanceDTO {
  campaign_id: string;
  campaign_name: string;
  status: MarketingCampaignStatus;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  unsubscribed_count: number;
  bounced_count: number;
  failed_count: number;
  delivery_rate_pct: number | null; // delivered / sent
  open_rate_pct: number | null; // opened / delivered
  click_rate_pct: number | null; // clicked / delivered
  conversion_rate_pct: number | null; // converted / delivered
  unsubscribe_rate_pct: number | null; // unsubscribed / delivered
  bounce_rate_pct: number | null; // bounced / sent
  cost: number;
  attributed_revenue: number;
  net_revenue: number;
  roi_pct: number | null; // (revenue - cost) / cost * 100
  timeline: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  }>;

  // CamelCase UI aliases
  campaignId?: string;
  campaignName?: string;
  sentCount?: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  convertedCount?: number;
  unsubscribedCount?: number;
  bouncedCount?: number;
  failedCount?: number;
  deliveryRatePct?: number | null;
  openRatePct?: number | null;
  clickRatePct?: number | null;
  conversionRatePct?: number | null;
  unsubscribeRatePct?: number | null;
  bounceRatePct?: number | null;
  attributedRevenue?: number;
  netRevenue?: number;
  roiPct?: number | null;
}

export interface GrowthGoalDTO {
  id: string;
  title: string;
  target_metric: string; // e.g., 'REACTIVATION_COUNT', 'ATTRIBUTED_REVENUE', 'CAMPAIGN_CONVERSIONS'
  target_value: number;
  current_value: number;
  progress_pct: number;
  period_start: Date | string;
  period_end: Date | string;
  status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'ACHIEVED';
}

export interface CreateGrowthGoalDTO {
  title: string;
  target_metric: string;
  target_value: number;
  period_start: Date | string;
  period_end: Date | string;
}

export interface ServiceGrowthDTO {
  service_name: string;
  category: string;
  gallery_count: number;
  booking_frequency?: number;
  total_revenue: number;
  average_revenue_per_gallery: number;
  repeat_client_rate_pct: number | null;
  growth_trend_pct: number;
  status: 'SURGING' | 'STEADY' | 'DECLINING';
  seasonal_patterns: Array<{
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    volume_share_pct: number;
    revenue_share_pct: number;
  }>;
  seasonal_pattern?: {
    peak_quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    patterns: Array<{
      quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
      volume_share_pct: number;
      revenue_share_pct: number;
    }>;
  };
  recommended_growth_action?: string;

  // CamelCase UI aliases
  serviceName?: string;
  galleryCount?: number;
  bookingFrequency?: number;
  totalRevenue?: number;
  averageRevenuePerGallery?: number;
  repeatClientRatePct?: number | null;
  growthTrendPct?: number;
  seasonalPatterns?: Array<{
    quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    volumeSharePct: number;
    revenueSharePct: number;
  }>;
  seasonalPattern?: {
    peakQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    patterns: Array<{
      quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
      volume_share_pct: number;
      revenue_share_pct: number;
    }>;
  };
  recommendedGrowthAction?: string;
}

export interface AdminGrowthTelemetryDTO {
  total_studios: number;
  studios_with_growth_adoption: number;
  growth_adoption_rate_pct: number;
  total_opportunities_generated: number;
  total_opportunities_converted: number;
  total_campaigns_created: number;
  total_campaigns_approved: number;
  total_campaigns_dispatched: number;
  total_marketing_emails_sent: number;
  total_marketing_emails_delivered: number;
  total_marketing_conversions: number;
  total_attributed_growth_revenue: number;
  average_campaign_roi_pct: number | null;
  top_growth_studios: Array<{
    studio_id: string;
    studio_name: string;
    campaigns_count: number;
    attributed_revenue: number;
    conversions_count: number;
  }>;
  campaign_objective_distribution: Array<{
    objective: string;
    count: number;
    revenue: number;
  }>;
  opportunity_type_distribution: Array<{
    type: string;
    count: number;
    converted_count: number;
  }>;

  // CamelCase UI aliases
  totalStudios?: number;
  studiosWithGrowthAdoption?: number;
  growthAdoptionRatePct?: number;
  totalOpportunitiesGenerated?: number;
  totalOpportunitiesConverted?: number;
  totalCampaignsCreated?: number;
  totalCampaignsApproved?: number;
  totalCampaignsDispatched?: number;
  totalMarketingEmailsSent?: number;
  totalMarketingEmailsDelivered?: number;
  totalMarketingConversions?: number;
  totalAttributedGrowthRevenue?: number;
  averageCampaignRoiPct?: number | null;
  topGrowthStudios?: Array<{
    studioId: string;
    studioName: string;
    campaignsCount: number;
    attributedRevenue: number;
    conversionsCount: number;
  }>;
  campaignObjectiveDistribution?: Array<{
    objective: string;
    count: number;
    revenue: number;
  }>;
  opportunityTypeDistribution?: Array<{
    type: string;
    count: number;
    convertedCount: number;
  }>;
}

// ==========================================
// PHASE 20: STUDIO OPERATIONS, BOOKING & PROJECT MANAGEMENT
// ==========================================

export enum StudioLeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATING = 'NEGOTIATING',
  WON = 'WON',
  LOST = 'LOST',
  ARCHIVED = 'ARCHIVED',
}

export enum StudioLeadSource {
  WEBSITE = 'WEBSITE',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK = 'FACEBOOK',
  REFERRAL = 'REFERRAL',
  GOOGLE = 'GOOGLE',
  WHATSAPP = 'WHATSAPP',
  WALK_IN = 'WALK_IN',
  EXISTING_CLIENT = 'EXISTING_CLIENT',
  OTHER = 'OTHER',
}

export enum StudioProjectType {
  WEDDING = 'WEDDING',
  PRE_WEDDING = 'PRE_WEDDING',
  PORTRAIT = 'PORTRAIT',
  EVENT = 'EVENT',
  CORPORATE = 'CORPORATE',
  PRODUCT = 'PRODUCT',
  FAMILY = 'FAMILY',
  OTHER = 'OTHER',
}

export enum StudioProjectStatus {
  INQUIRY = 'INQUIRY',
  BOOKED = 'BOOKED',
  PREPARATION = 'PREPARATION',
  SHOOT_SCHEDULED = 'SHOOT_SCHEDULED',
  SHOOT_COMPLETED = 'SHOOT_COMPLETED',
  PROCESSING = 'PROCESSING',
  GALLERY_PREPARATION = 'GALLERY_PREPARATION',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectTaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ProjectTaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ProjectMilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export interface StudioLeadDTO {
  id: string;
  studio_id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  source?: StudioLeadSource | null;
  service_type?: string | null;
  project_type?: StudioProjectType | string | null;
  status: StudioLeadStatus;
  estimated_value?: number | null; // Estimated Opportunity Value (NOT recorded actual revenue)
  currency?: string | null;
  inquiry_date: Date | string;
  target_event_date?: Date | string | null;
  last_contacted_at?: Date | string | null;
  next_follow_up_at?: Date | string | null;
  notes?: string | null;
  assigned_member_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  clientId?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  serviceType?: string | null;
  projectType?: StudioProjectType | string | null;
  estimatedValue?: number | null;
  inquiryDate?: Date | string;
  targetEventDate?: Date | string | null;
  lastContactedAt?: Date | string | null;
  nextFollowUpAt?: Date | string | null;
  assignedMemberId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateStudioLeadDTO {
  name: string;
  email?: string;
  phone?: string;
  source?: StudioLeadSource;
  service_type?: string;
  project_type?: StudioProjectType | string;
  estimated_value?: number;
  currency?: string;
  inquiry_date?: Date | string;
  target_event_date?: Date | string;
  next_follow_up_at?: Date | string;
  notes?: string;
  assigned_member_id?: string;
  client_id?: string;

  // CamelCase support
  serviceType?: string;
  projectType?: StudioProjectType | string;
  estimatedValue?: number;
  inquiryDate?: Date | string;
  targetEventDate?: Date | string;
  nextFollowUpAt?: Date | string;
  assignedMemberId?: string;
  clientId?: string;
}

export interface UpdateStudioLeadDTO {
  name?: string;
  email?: string | null;
  phone?: string | null;
  source?: StudioLeadSource;
  service_type?: string | null;
  project_type?: StudioProjectType | string | null;
  status?: StudioLeadStatus;
  estimated_value?: number | null;
  currency?: string;
  inquiry_date?: Date | string;
  target_event_date?: Date | string | null;
  last_contacted_at?: Date | string | null;
  next_follow_up_at?: Date | string | null;
  notes?: string | null;
  assigned_member_id?: string | null;
  client_id?: string | null;

  // CamelCase support
  serviceType?: string | null;
  projectType?: StudioProjectType | string | null;
  estimatedValue?: number | null;
  inquiryDate?: Date | string;
  targetEventDate?: Date | string | null;
  lastContactedAt?: Date | string | null;
  nextFollowUpAt?: Date | string | null;
  assignedMemberId?: string | null;
  clientId?: string | null;
}

export interface ConvertLeadDTO {
  project_name?: string;
  project_title?: string;
  project_type?: StudioProjectType;
  create_project?: boolean;
  start_date?: Date | string;
  shoot_date?: Date | string;
  location?: string;
  description?: string;
  estimated_value?: number;
  total_amount?: number;
  deposit_amount?: number;
  currency?: string;
  existing_client_id?: string;

  // CamelCase support
  projectName?: string;
  projectTitle?: string;
  projectType?: StudioProjectType;
  createProject?: boolean;
  startDate?: Date | string;
  shootDate?: Date | string;
  estimatedValue?: number;
  totalAmount?: number;
  depositAmount?: number;
  existingClientId?: string;
}

export interface StudioProjectDTO {
  id: string;
  studio_id: string;
  client_id: string;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client?: { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  lead_id?: string | null;
  name: string;
  title?: string;
  project_type: StudioProjectType;
  status: StudioProjectStatus;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  shoot_date?: Date | string | null;
  estimated_delivery_date?: Date | string | null;
  location?: string | null;
  shoot_location?: string | null;
  description?: string | null;
  estimated_value?: number | null; // Estimated Opportunity Value (NOT recorded actual revenue)
  total_amount?: number | null;
  paid_amount?: number | null;
  currency?: string | null;
  actual_revenue: number; // Derived strictly from linked Phase 18 StudioBusinessTransaction records
  primary_photographer_id?: string | null;
  payment_due_date?: Date | string | null;
  payment_status: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'INCOMPLETE';
  tasks_count: number;
  tasks_completed_count: number;
  milestones_count: number;
  milestones_completed_count: number;
  galleries_count: number;
  shoot_duration_hours?: number | null;
  equipment_notes?: string | null;
  milestones?: ProjectMilestoneDTO[];
  tasks?: ProjectTaskDTO[];
  galleries?: ProjectGalleryLinkDTO[];
  notes?: ProjectNoteDTO[];
  payments?: ProjectPaymentDTO[];
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  clientId?: string;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  leadId?: string | null;
  projectType?: StudioProjectType;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  shootDate?: Date | string | null;
  estimatedDeliveryDate?: Date | string | null;
  shootDurationHours?: number | null;
  equipmentNotes?: string | null;
  estimatedValue?: number | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  actualRevenue?: number;
  primaryPhotographerId?: string | null;
  paymentDueDate?: Date | string | null;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE' | 'INCOMPLETE';
  tasksCount?: number;
  tasksCompletedCount?: number;
  milestonesCount?: number;
  milestonesCompletedCount?: number;
  galleriesCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateStudioProjectDTO {
  client_id?: string;
  lead_id?: string;
  name?: string;
  title?: string;
  project_type?: StudioProjectType;
  status?: StudioProjectStatus;
  start_date?: Date | string;
  end_date?: Date | string;
  shoot_date?: Date | string;
  estimated_delivery_date?: Date | string;
  shoot_duration_hours?: number;
  equipment_notes?: string;
  location?: string;
  shoot_location?: string;
  description?: string;
  estimated_value?: number;
  total_amount?: number;
  paid_amount?: number;
  currency?: string;
  primary_photographer_id?: string;
  payment_due_date?: Date | string;

  // CamelCase support
  clientId?: string;
  leadId?: string;
  projectType?: StudioProjectType;
  startDate?: Date | string;
  endDate?: Date | string;
  shootDate?: Date | string;
  estimatedDeliveryDate?: Date | string;
  shootDurationHours?: number;
  equipmentNotes?: string;
  estimatedValue?: number;
  totalAmount?: number;
  paidAmount?: number;
  primaryPhotographerId?: string;
  paymentDueDate?: Date | string;
}

export interface UpdateStudioProjectDTO {
  name?: string;
  title?: string;
  project_type?: StudioProjectType;
  status?: StudioProjectStatus;
  start_date?: Date | string | null;
  end_date?: Date | string | null;
  shoot_date?: Date | string | null;
  estimated_delivery_date?: Date | string | null;
  shoot_duration_hours?: number | null;
  equipment_notes?: string | null;
  location?: string | null;
  shoot_location?: string | null;
  description?: string | null;
  estimated_value?: number | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  currency?: string;
  primary_photographer_id?: string | null;
  payment_due_date?: Date | string | null;

  // CamelCase support
  projectType?: StudioProjectType;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  shootDate?: Date | string | null;
  estimatedDeliveryDate?: Date | string | null;
  shootDurationHours?: number | null;
  equipmentNotes?: string | null;
  estimatedValue?: number | null;
  totalAmount?: number | null;
  paidAmount?: number | null;
  primaryPhotographerId?: string | null;
  paymentDueDate?: Date | string | null;
}

export interface ProjectTimelineStageDTO {
  stage: StudioProjectStatus;
  label: string;
  is_current: boolean;
  is_completed: boolean;
  completed_at?: Date | string | null;
  description: string;
}

export interface ProjectTimelineDTO {
  project_id: string;
  current_status: StudioProjectStatus;
  stages: ProjectTimelineStageDTO[];
  recommended_next_action?: string;
  can_advance: boolean;
}

export interface ProjectTaskDTO {
  id: string;
  studio_id: string;
  project_id?: string | null;
  project_name?: string | null;
  project?: { id: string; name?: string | null; title?: string | null } | null;
  title: string;
  description?: string | null;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  assigned_to?: string | null;
  due_at?: Date | string | null;
  due_date?: Date | string | null;
  completed_at?: Date | string | null;
  is_overdue: boolean;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  projectId?: string | null;
  projectName?: string | null;
  assignedTo?: string | null;
  dueAt?: Date | string | null;
  dueDate?: Date | string | null;
  completedAt?: Date | string | null;
  isOverdue?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateProjectTaskDTO {
  project_id?: string;
  title: string;
  description?: string;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigned_to?: string;
  due_at?: Date | string;
  due_date?: Date | string;

  // CamelCase support
  projectId?: string;
  assignedTo?: string;
  dueAt?: Date | string;
  dueDate?: Date | string;
}

export interface UpdateProjectTaskDTO {
  title?: string;
  description?: string | null;
  status?: ProjectTaskStatus;
  priority?: ProjectTaskPriority;
  assigned_to?: string | null;
  due_at?: Date | string | null;
  due_date?: Date | string | null;
  completed_at?: Date | string | null;

  // CamelCase support
  assignedTo?: string | null;
  dueAt?: Date | string | null;
  dueDate?: Date | string | null;
  completedAt?: Date | string | null;
}

export interface ProjectMilestoneDTO {
  id: string;
  studio_id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: ProjectMilestoneStatus;
  target_date?: Date | string | null;
  completed_at?: Date | string | null;
  order_index: number;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  projectId?: string;
  targetDate?: Date | string | null;
  completedAt?: Date | string | null;
  orderIndex?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateProjectMilestoneDTO {
  project_id: string;
  title: string;
  description?: string;
  status?: ProjectMilestoneStatus;
  target_date?: Date | string;
  order_index?: number;

  // CamelCase support
  projectId?: string;
  targetDate?: Date | string;
  orderIndex?: number;
}

export interface UpdateProjectMilestoneDTO {
  title?: string;
  description?: string | null;
  status?: ProjectMilestoneStatus;
  target_date?: Date | string | null;
  completed_at?: Date | string | null;
  order_index?: number;

  // CamelCase support
  targetDate?: Date | string | null;
  completedAt?: Date | string | null;
  orderIndex?: number;
}

export interface ProjectGalleryLinkDTO {
  id: string;
  studio_id: string;
  project_id: string;
  gallery_id: string;
  gallery_title: string;
  gallery_slug: string;
  gallery_photo_count: number;
  gallery_published: boolean;
  gallery_delivered: boolean;
  role: string;
  created_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  projectId?: string;
  galleryId?: string;
  galleryTitle?: string;
  gallerySlug?: string;
  galleryPhotoCount?: number;
  galleryPublished?: boolean;
  galleryDelivered?: boolean;
  createdAt?: Date | string;
}

export interface ProjectNoteDTO {
  id: string;
  studio_id: string;
  project_id: string;
  author_id?: string | null;
  author_name?: string | null;
  content: string; // Sanitized private note
  is_pinned: boolean;
  created_at: Date | string;
  updated_at: Date | string;

  // CamelCase UI aliases
  studioId?: string;
  projectId?: string;
  authorId?: string | null;
  authorName?: string | null;
  isPinned?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateProjectNoteDTO {
  content: string;
  is_pinned?: boolean;

  // CamelCase support
  isPinned?: boolean;
}

export interface ProjectPaymentDTO {
  transaction_id: string;
  amount: number;
  currency: string;
  transaction_date: Date | string;
  transaction_type: string;
  category: string;
  description: string;
  reference?: string | null;
  is_advance: boolean;
  is_final: boolean;

  // CamelCase UI aliases
  transactionId?: string;
  transactionDate?: Date | string;
  transactionType?: string;
  isAdvance?: boolean;
  isFinal?: boolean;
}

export interface OperationsOverviewDTO {
  leads?: {
    total_leads: number;
    active_leads: number;
    converted_leads: number;
    conversion_rate_percent: number;
    pipeline_value: number;
    leads_by_status: Record<string, number>;
  };
  projects?: {
    total_projects: number;
    active_projects: number;
    shoots_next_7_days: number;
    shoots_next_30_days: number;
    projects_by_status: Record<string, number>;
  };
  tasks?: {
    pending_tasks: number;
    overdue_tasks: number;
    tasks_completed_this_month: number;
  };
  financials?: {
    total_booked_value: number;
    total_collected_revenue: number;
    total_outstanding_balance: number;
    currency: string;
  };

  open_leads_count?: number;
  booked_projects_count?: number;
  upcoming_shoots_count?: number;
  active_projects_count?: number;
  tasks_due_count?: number;
  pending_payments_count?: number;
  pending_payments_total?: number;
  galleries_awaiting_delivery_count?: number;

  todays_work?: Array<{
    type: 'SHOOT' | 'TASK' | 'FOLLOW_UP' | 'PAYMENT' | 'DELIVERY';
    id: string;
    title: string;
    description?: string;
    time?: string;
    project_id?: string;
    client_name?: string;
    status: string;
    priority?: string;
  }>;

  upcoming_shoots?: Array<{
    id?: string;
    project_id?: string;
    project_name?: string;
    title?: string;
    client_name: string;
    shoot_date: Date | string;
    location?: string | null;
    shoot_location?: string | null;
    project_type: StudioProjectType;
    status: StudioProjectStatus;
  }>;

  urgent_tasks?: Array<{
    id: string;
    title: string;
    project_title?: string;
    due_date?: string | null;
    priority?: string;
    status: string;
    is_overdue?: boolean;
  }>;

  recent_leads?: Array<StudioLeadDTO | {
    id: string;
    name: string;
    project_type?: StudioProjectType;
    status: StudioLeadStatus;
    estimated_value?: number;
    next_follow_up_date?: string | null;
  }>;
  active_projects?: StudioProjectDTO[];
  delivery_backlog?: Array<{
    gallery_id: string;
    gallery_title: string;
    project_id?: string | null;
    project_name?: string | null;
    client_name?: string | null;
    photo_count: number;
    days_since_shoot?: number | null;
    delivery_status: 'READY' | 'PROCESSING' | 'PENDING_APPROVAL';
  }>;

  // CamelCase UI aliases
  openLeadsCount?: number;
  bookedProjectsCount?: number;
  upcomingShootsCount?: number;
  activeProjectsCount?: number;
  tasksDueCount?: number;
  pendingPaymentsCount?: number;
  pendingPaymentsTotal?: number;
  galleriesAwaitingDeliveryCount?: number;
  todaysWork?: Array<any>;
  upcomingShootsList?: Array<any>;
  recentLeadsList?: StudioLeadDTO[];
  activeProjectsList?: StudioProjectDTO[];
  deliveryBacklogList?: Array<any>;
}

export interface OperationsCalendarEventDTO {
  id: string;
  type?: 'SHOOT' | 'TASK_DUE' | 'LEAD_FOLLOW_UP' | 'MILESTONE' | 'PAYMENT_DUE' | 'GALLERY_DELIVERY' | string;
  event_type?: string;
  title: string;
  start?: Date | string;
  end?: Date | string | null;
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  is_all_day?: boolean;
  project_id?: string | null;
  project_name?: string | null;
  project_title?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  status: string;
  priority?: string | null;
  location?: string | null;
  amount?: number | null;
  currency?: string | null;
  color?: string;

  // CamelCase UI aliases
  allDay?: boolean;
  projectId?: string | null;
  projectName?: string | null;
  clientId?: string | null;
  clientName?: string | null;
}

export interface OperationsCalendarQueryDTO {
  start_date?: string;
  end_date?: string;
  event_type?: string;
  project_id?: string;
  client_id?: string;
}

export interface OperationsCalendarResponseDTO {
  start_date: string;
  end_date: string;
  total_events: number;
  events: OperationsCalendarEventDTO[];
}

export interface OperationsSearchDTO {
  projects: StudioProjectDTO[];
  leads: StudioLeadDTO[];
  tasks: ProjectTaskDTO[];
  total_results: number;

  // CamelCase UI aliases
  totalResults?: number;
}

export type StudioOperationsOverviewDTO = OperationsOverviewDTO;

// ==========================================
// PHASE 21: CONTRACTS, PROPOSALS & CLIENT BOOKING PORTAL
// ==========================================

export enum StudioProposalStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  SUPERSEDED = 'SUPERSEDED',
  VOID = 'VOID',
}

export enum StudioContractStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  SIGNED = 'SIGNED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  VOID = 'VOID',
}

export enum StudioContractCategory {
  WEDDING = 'WEDDING',
  PORTRAIT = 'PORTRAIT',
  COMMERCIAL = 'COMMERCIAL',
  EVENT = 'EVENT',
  STANDARD = 'STANDARD',
  CUSTOM = 'CUSTOM',
}

export enum ProjectPaymentScheduleStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
}

export interface StudioProposalItemDTO {
  id: string;
  proposal_id: string;
  title: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_optional: boolean;
  is_selected: boolean;
  sort_order: number;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface StudioProposalRevisionDTO {
  id: string;
  proposal_id: string;
  revision_number: number;
  snapshot_data: Record<string, any>;
  change_summary?: string | null;
  created_by_user_id?: string | null;
  created_at: Date | string;
}

export interface StudioProposalDTO {
  id: string;
  studio_id: string;
  client_id: string;
  lead_id?: string | null;
  project_id?: string | null;
  proposal_number: string;
  title: string;
  status: StudioProposalStatus;
  currency: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  valid_until?: Date | string | null;
  notes?: string | null;
  terms_and_conditions?: string | null;
  cover_image_url?: string | null;
  public_token?: string | null;
  token_expires_at?: Date | string | null;
  viewed_at?: Date | string | null;
  view_count: number;
  accepted_at?: Date | string | null;
  accepted_by_client_name?: string | null;
  accepted_ip?: string | null;
  rejected_at?: Date | string | null;
  rejection_reason?: string | null;
  current_revision: number;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;

  // Populated relations
  items?: StudioProposalItemDTO[];
  revisions?: StudioProposalRevisionDTO[];
  client?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    company_name?: string | null;
  } | null;
  lead?: {
    id: string;
    name: string;
    project_type?: StudioProjectType;
    status: StudioLeadStatus;
  } | null;
  project?: {
    id: string;
    title: string;
    status: StudioProjectStatus;
  } | null;
  contract?: StudioContractDTO | null;
}

export interface CreateProposalItemDTO {
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  is_optional?: boolean;
  is_selected?: boolean;
  sort_order?: number;
  metadata?: Record<string, any>;
}

export interface CreateProposalDTO {
  client_id: string;
  lead_id?: string;
  project_id?: string;
  title: string;
  currency?: string;
  discount_amount?: number;
  tax_amount?: number;
  valid_until?: string;
  notes?: string;
  terms_and_conditions?: string;
  cover_image_url?: string;
  items: CreateProposalItemDTO[];
  metadata?: Record<string, any>;
}

export interface UpdateProposalDTO {
  title?: string;
  client_id?: string;
  lead_id?: string;
  project_id?: string;
  currency?: string;
  discount_amount?: number;
  tax_amount?: number;
  valid_until?: string;
  notes?: string;
  terms_and_conditions?: string;
  cover_image_url?: string;
  items?: CreateProposalItemDTO[];
  change_summary?: string;
  metadata?: Record<string, any>;
}

export interface SendProposalDTO {
  recipient_email?: string;
  message?: string;
  valid_days?: number;
}

export interface ProposalListQueryDTO {
  status?: StudioProposalStatus;
  client_id?: string;
  lead_id?: string;
  project_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProposalPublicViewDTO {
  proposal: StudioProposalDTO;
  studio: {
    id: string;
    name: string;
    slug: string;
    website?: string | null;
    logo_url?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  client: {
    id: string;
    name?: string;
    full_name: string;
    email: string;
    phone?: string | null;
    company_name?: string | null;
  };
  has_contract: boolean;
  contract_token?: string | null;
}

export interface ProposalAcceptRequestDTO {
  client_name: string;
  client_email?: string;
  selected_item_ids?: string[];
  selected_optional_item_ids?: string[];
  notes?: string;
}

export interface ProposalRejectRequestDTO {
  rejection_reason?: string;
}

// ---------------- CONTRACT INTERFACES ----------------

export interface StudioContractTemplateDTO {
  id: string;
  studio_id: string;
  title: string;
  category: StudioContractCategory;
  description?: string | null;
  body_content: string;
  is_default: boolean;
  supported_variables: string[];
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateContractTemplateDTO {
  title: string;
  category?: StudioContractCategory;
  description?: string;
  body_content: string;
  is_default?: boolean;
  supported_variables?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateContractTemplateDTO {
  title?: string;
  category?: StudioContractCategory;
  description?: string;
  body_content?: string;
  is_default?: boolean;
  supported_variables?: string[];
  metadata?: Record<string, any>;
}

export interface StudioContractDTO {
  id: string;
  studio_id: string;
  client_id: string;
  project_id?: string | null;
  proposal_id?: string | null;
  template_id?: string | null;
  contract_number: string;
  title: string;
  category: StudioContractCategory;
  status: StudioContractStatus;
  version: number;
  body_content: string;
  rendered_content: string;
  interpolated_variables?: Record<string, any> | null;
  public_token?: string | null;
  token_expires_at?: Date | string | null;
  sent_at?: Date | string | null;
  viewed_at?: Date | string | null;
  view_count: number;
  signed_at?: Date | string | null;
  signed_by_name?: string | null;
  signed_by_email?: string | null;
  signature_ip?: string | null;
  signature_user_agent?: string | null;
  signature_hash?: string | null;
  countersigned_at?: Date | string | null;
  countersigned_by_user_id?: string | null;
  rejected_at?: Date | string | null;
  rejection_reason?: string | null;
  voided_at?: Date | string | null;
  void_reason?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;

  // Populated relations
  client?: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    company_name?: string | null;
  } | null;
  project?: {
    id: string;
    title: string;
    status: StudioProjectStatus;
    start_date?: Date | string | null;
    location?: string | null;
  } | null;
  proposal?: StudioProposalDTO | null;
  template?: StudioContractTemplateDTO | null;
}

export interface CreateContractDTO {
  client_id: string;
  project_id?: string;
  proposal_id?: string;
  template_id?: string;
  title: string;
  category?: StudioContractCategory;
  body_content?: string;
  variables_override?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface UpdateContractDTO {
  title?: string;
  category?: StudioContractCategory;
  body_content?: string;
  variables_override?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface SendContractDTO {
  recipient_email?: string;
  message?: string;
  valid_days?: number;
}

export interface ContractListQueryDTO {
  status?: StudioContractStatus;
  category?: StudioContractCategory;
  client_id?: string;
  project_id?: string;
  proposal_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ContractPublicViewDTO {
  contract: StudioContractDTO;
  studio: {
    id: string;
    name: string;
    slug: string;
    website?: string | null;
    logo_url?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  client: {
    id: string;
    full_name: string;
    email: string;
    phone?: string | null;
    company_name?: string | null;
  };
  proposal_token?: string | null;
  booking_token?: string | null;
}

export interface ContractSignRequestDTO {
  full_legal_name: string;
  email: string;
  agreed_to_terms: boolean;
  notes?: string;
}

export interface ContractRejectRequestDTO {
  rejection_reason?: string;
}

// ---------------- PAYMENT SCHEDULE INTERFACES ----------------

export interface ProjectPaymentScheduleDTO {
  id: string;
  studio_id: string;
  project_id: string;
  installment_number: number;
  title: string;
  description?: string | null;
  due_date: Date | string;
  amount: number;
  currency: string;
  status: ProjectPaymentScheduleStatus;
  paid_amount: number;
  paid_at?: Date | string | null;
  transaction_id?: string | null;
  reminder_sent_at?: Date | string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;

  // Populated
  project?: {
    id: string;
    title: string;
    client_name?: string;
  };
  transaction?: {
    id: string;
    amount: number;
    currency: string;
    transaction_date: Date | string;
    payment_method: string;
  } | null;
}

export interface CreatePaymentScheduleDTO {
  title: string;
  description?: string;
  installment_number?: number;
  due_date: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentScheduleDTO {
  title?: string;
  description?: string;
  installment_number?: number;
  due_date?: string;
  amount?: number;
  currency?: string;
  status?: ProjectPaymentScheduleStatus;
  metadata?: Record<string, any>;
}

export interface RecordPaymentSchedulePaymentDTO {
  paid_amount: number;
  payment_method: string;
  transaction_date?: string;
  notes?: string;
  create_business_transaction?: boolean;
}

// ---------------- BOOKING CONFIRMATION INTERFACES ----------------

export interface ConfirmBookingRequestDTO {
  lead_id?: string;
  client_id: string;
  proposal_id?: string;
  contract_id?: string;
  project_title: string;
  project_type?: StudioProjectType;
  start_date?: string;
  end_date?: string;
  location?: string;
  total_amount?: number;
  currency?: string;
  payment_schedules?: CreatePaymentScheduleDTO[];
  notes?: string;
}

export interface BookingConfirmationDTO {
  project_id: string;
  lead_id?: string | null;
  proposal_id?: string | null;
  contract_id?: string | null;
  client_id: string;
  project: StudioProjectDTO;
  proposal?: StudioProposalDTO | null;
  contract?: StudioContractDTO | null;
  payment_schedules: ProjectPaymentScheduleDTO[];
  booking_public_token?: string | null;
}

export interface PublicBookingViewDTO {
  booking: {
    project: {
      id: string;
      title: string;
      project_type: StudioProjectType;
      status: StudioProjectStatus;
      start_date?: Date | string | null;
      end_date?: Date | string | null;
      location?: string | null;
    };
    proposal?: {
      id: string;
      proposal_number: string;
      total_amount: number;
      currency: string;
      status: StudioProposalStatus;
    } | null;
    contract?: {
      id: string;
      contract_number: string;
      status: StudioContractStatus;
      signed_at?: Date | string | null;
      signed_by_name?: string | null;
      signature_hash?: string | null;
    } | null;
    payment_schedules: Array<{
      installment_number: number;
      title: string;
      due_date: Date | string;
      amount: number;
      currency: string;
      status: ProjectPaymentScheduleStatus;
      paid_amount: number;
      paid_at?: Date | string | null;
    }>;
  };
  project?: {
    id: string;
    title: string;
    project_type: StudioProjectType;
    status: StudioProjectStatus;
    start_date?: Date | string | null;
    end_date?: Date | string | null;
    location?: string | null;
  };
  proposal?: {
    id: string;
    proposal_number: string;
    total_amount: number;
    currency: string;
    status: StudioProposalStatus;
  } | null;
  contract?: {
    id: string;
    contract_number: string;
    status: StudioContractStatus;
    signed_at?: Date | string | null;
    signed_by_name?: string | null;
    signature_hash?: string | null;
  } | null;
  schedules?: Array<{
    installment_number: number;
    title: string;
    due_date: Date | string;
    amount: number;
    currency: string;
    status: ProjectPaymentScheduleStatus;
    paid_amount: number;
    paid_at?: Date | string | null;
  }>;
  payment_schedules?: Array<{
    installment_number: number;
    title: string;
    due_date: Date | string;
    amount: number;
    currency: string;
    status: ProjectPaymentScheduleStatus;
    paid_amount: number;
    paid_at?: Date | string | null;
  }>;
  studio: {
    name: string;
    slug: string;
    logo_url?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  client: {
    name?: string;
    full_name: string;
    email: string;
  };
}

export interface BookingPipelineSummaryDTO {
  total_leads: number;
  total_proposals: number;
  total_contracts: number;
  total_booked_projects: number;
  total_booked_revenue: number;
  active_proposals: number;
  pending_contracts: number;
  confirmed_bookings: number;
  total_proposal_value: number;
  total_contract_value: number;
  conversion_rate_pct: number;
  proposals_by_status: Record<StudioProposalStatus, number>;
  contracts_by_status: Record<StudioContractStatus, number>;
}

// ==========================================
// PHASE 22: STUDIO SCHEDULING, CALENDAR & RESOURCE MANAGEMENT
// ==========================================

export enum CalendarEventType {
  SHOOT = 'SHOOT',
  MEETING = 'MEETING',
  CONSULTATION = 'CONSULTATION',
  DELIVERY = 'DELIVERY',
  EDITING = 'EDITING',
  PRE_PRODUCTION = 'PRE_PRODUCTION',
  POST_PRODUCTION = 'POST_PRODUCTION',
  TRAVEL = 'TRAVEL',
  PERSONAL = 'PERSONAL',
  BLOCKED = 'BLOCKED',
  OTHER = 'OTHER',
}

export enum CalendarEventStatus {
  TENTATIVE = 'TENTATIVE',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum CalendarVisibility {
  PRIVATE = 'PRIVATE',
  TEAM = 'TEAM',
  CLIENT = 'CLIENT',
}

export enum AvailabilityRuleType {
  WORKING_HOURS = 'WORKING_HOURS',
  BREAK = 'BREAK',
  BLOCKED = 'BLOCKED',
  HOLIDAY = 'HOLIDAY',
  CUSTOM = 'CUSTOM',
}

export enum ResourceType {
  PHOTOGRAPHER = 'PHOTOGRAPHER',
  STAFF = 'STAFF',
  EQUIPMENT = 'EQUIPMENT',
  LOCATION = 'LOCATION',
  ROOM = 'ROOM',
  VEHICLE = 'VEHICLE',
  OTHER = 'OTHER',
}

export enum ResourceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

export enum BookingSlotStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD',
  BOOKED = 'BOOKED',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED',
}

export enum BookingRequestStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  RESCHEDULED = 'RESCHEDULED',
}

export enum CalendarProvider {
  GOOGLE = 'GOOGLE',
  MICROSOFT = 'MICROSOFT',
  ICAL = 'ICAL',
}

export enum CalendarSyncStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
}

export enum CalendarSyncDirection {
  IMPORT = 'IMPORT',
  EXPORT = 'EXPORT',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum CancellationReason {
  CLIENT_REQUEST = 'CLIENT_REQUEST',
  PHOTOGRAPHER_REQUEST = 'PHOTOGRAPHER_REQUEST',
  WEATHER = 'WEATHER',
  CONFLICT = 'CONFLICT',
  OTHER = 'OTHER',
}

export interface CalendarResourceAssignmentDTO {
  id: string;
  studio_id: string;
  calendar_event_id: string;
  resource_id: string;
  role?: string | null;
  start_at: Date | string;
  end_at: Date | string;
  created_at: Date | string;
  resource?: StudioResourceDTO;
}

export interface StudioCalendarEventDTO {
  id: string;
  studio_id: string;
  project_id?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  title: string;
  description?: string | null;
  event_type: CalendarEventType;
  status: CalendarEventStatus;
  visibility: CalendarVisibility;
  start_at: Date | string;
  end_at: Date | string;
  timezone: string;
  all_day: boolean;
  location?: string | null;
  location_details?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  cancelled_at?: Date | string | null;
  cancelled_by?: string | null;
  cancellation_reason?: CancellationReason | null;
  cancellation_note?: string | null;
  external_provider?: CalendarProvider | null;
  external_event_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  resource_assignments?: CalendarResourceAssignmentDTO[];
  project?: {
    id: string;
    name: string;
    status: StudioProjectStatus;
    project_type: StudioProjectType;
  } | null;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  lead?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export interface CreateCalendarEventDTO {
  project_id?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  title: string;
  description?: string | null;
  event_type?: CalendarEventType;
  status?: CalendarEventStatus;
  visibility?: CalendarVisibility;
  start_at: Date | string;
  end_at: Date | string;
  timezone?: string;
  all_day?: boolean;
  location?: string | null;
  location_details?: string | null;
  notes?: string | null;
  resource_ids?: string[];
  assigned_resources?: Array<{
    resource_id: string;
    role?: string;
    start_at?: Date | string;
    end_at?: Date | string;
  }>;
}

export interface UpdateCalendarEventDTO {
  title?: string;
  description?: string | null;
  event_type?: CalendarEventType;
  status?: CalendarEventStatus;
  visibility?: CalendarVisibility;
  start_at?: Date | string;
  end_at?: Date | string;
  timezone?: string;
  all_day?: boolean;
  location?: string | null;
  location_details?: string | null;
  notes?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  resource_ids?: string[];
  assigned_resources?: Array<{
    resource_id: string;
    role?: string;
    start_at?: Date | string;
    end_at?: Date | string;
  }>;
}

export interface StudioResourceDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  resource_type: ResourceType;
  status: ResourceStatus;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
  upcoming_assignments_count?: number;
  utilization_rate?: number;
}

export interface CreateResourceDTO {
  name: string;
  description?: string | null;
  resource_type: ResourceType;
  status?: ResourceStatus;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateResourceDTO {
  name?: string;
  description?: string | null;
  resource_type?: ResourceType;
  status?: ResourceStatus;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StudioAvailabilityRuleDTO {
  id: string;
  studio_id: string;
  resource_id?: string | null;
  type: AvailabilityRuleType;
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  timezone: string;
  specific_date?: Date | string | null;
  priority: number;
  is_active: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
  resource?: {
    id: string;
    name: string;
    resource_type: ResourceType;
  } | null;
}

export interface CreateAvailabilityRuleDTO {
  resource_id?: string | null;
  type?: AvailabilityRuleType;
  day_of_week?: number | null;
  start_time?: string | null;
  end_time?: string | null;
  timezone?: string;
  specific_date?: Date | string | null;
  priority?: number;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface StudioBlackoutPeriodDTO {
  id: string;
  studio_id: string;
  resource_id?: string | null;
  title: string;
  start_at: Date | string;
  end_at: Date | string;
  timezone: string;
  reason?: string | null;
  is_all_day: boolean;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  resource?: {
    id: string;
    name: string;
    resource_type: ResourceType;
  } | null;
}

export interface CreateBlackoutPeriodDTO {
  resource_id?: string | null;
  title: string;
  start_at: Date | string;
  end_at: Date | string;
  timezone?: string;
  reason?: string | null;
  is_all_day?: boolean;
}

export interface StudioBookingSettingsDTO {
  id: string;
  studio_id: string;
  timezone: string;
  minimum_notice_minutes: number;
  maximum_booking_days_ahead: number;
  default_slot_duration_minutes: number;
  default_buffer_before_minutes: number;
  default_buffer_after_minutes: number;
  allow_client_booking: boolean;
  allow_client_reschedule: boolean;
  allow_client_cancel: boolean;
  minimum_reschedule_notice_minutes: number;
  minimum_cancel_notice_minutes: number;
  require_manual_confirmation: boolean;
  default_calendar_visibility: CalendarVisibility;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UpdateBookingSettingsDTO {
  timezone?: string;
  minimum_notice_minutes?: number;
  maximum_booking_days_ahead?: number;
  default_slot_duration_minutes?: number;
  default_buffer_before_minutes?: number;
  default_buffer_after_minutes?: number;
  allow_client_booking?: boolean;
  allow_client_reschedule?: boolean;
  allow_client_cancel?: boolean;
  minimum_reschedule_notice_minutes?: number;
  minimum_cancel_notice_minutes?: number;
  require_manual_confirmation?: boolean;
  default_calendar_visibility?: CalendarVisibility;
}

export interface StudioBookingTypeDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price?: number | null;
  currency?: string | null;
  requires_resource_type?: ResourceType | null;
  requires_manual_confirmation: boolean;
  is_active: boolean;
  public_bookable: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateBookingTypeDTO {
  name: string;
  description?: string | null;
  duration_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  price?: number | null;
  currency?: string | null;
  requires_resource_type?: ResourceType | null;
  requires_manual_confirmation?: boolean;
  is_active?: boolean;
  public_bookable?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface UpdateBookingTypeDTO {
  name?: string;
  description?: string | null;
  duration_minutes?: number;
  buffer_before_minutes?: number;
  buffer_after_minutes?: number;
  price?: number | null;
  currency?: string | null;
  requires_resource_type?: ResourceType | null;
  requires_manual_confirmation?: boolean;
  is_active?: boolean;
  public_bookable?: boolean;
  metadata?: Record<string, unknown> | null;
}

export interface StudioBookingLinkDTO {
  id: string;
  studio_id: string;
  booking_type_id?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  public_token_hash?: string;
  token_expires_at?: Date | string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  raw_token?: string; // Only returned once on creation
  booking_url?: string;
  booking_type?: StudioBookingTypeDTO | null;
  client?: {
    id: string;
    name: string;
    email: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateBookingLinkDTO {
  booking_type_id?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  lead_id?: string | null;
  expires_in_days?: number | null;
}

export interface StudioBookingRequestDTO {
  id: string;
  studio_id: string;
  booking_link_id?: string | null;
  booking_type_id?: string | null;
  lead_id?: string | null;
  client_id?: string | null;
  project_id?: string | null;
  requested_start_at: Date | string;
  requested_end_at: Date | string;
  timezone: string;
  status: BookingRequestStatus;
  client_name: string;
  client_email: string;
  client_phone?: string | null;
  message?: string | null;
  confirmed_event_id?: string | null;
  hold_expires_at?: Date | string | null;
  cancellation_reason?: CancellationReason | null;
  cancellation_note?: string | null;
  reschedule_count: number;
  created_at: Date | string;
  updated_at: Date | string;
  booking_type?: StudioBookingTypeDTO | null;
  confirmed_event?: StudioCalendarEventDTO | null;
  client?: {
    id: string;
    name: string;
    email: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateBookingRequestDTO {
  start_at: Date | string;
  end_at?: Date | string;
  timezone: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  message?: string;
  hold_token?: string;
  booking_type_id?: string;
}

export interface RescheduleBookingRequestDTO {
  new_start_at: Date | string;
  new_end_at?: Date | string;
  timezone: string;
  reason?: string;
}

export interface CancelBookingRequestDTO {
  reason?: CancellationReason;
  note?: string;
}

export interface BookingSlotHoldDTO {
  id: string;
  studio_id: string;
  booking_request_id?: string | null;
  start_at: Date | string;
  end_at: Date | string;
  expires_at: Date | string;
  hold_token: string;
  status: BookingSlotStatus;
}

export interface AvailabilitySlotDTO {
  start_at: string;
  end_at: string;
  formatted_start: string;
  formatted_end: string;
  duration_minutes: number;
  available?: boolean;
  available_resources: Array<{
    id: string;
    name: string;
    resource_type: ResourceType;
  }>;
}

export interface AvailabilityResponseDTO {
  studio_id: string;
  timezone: string;
  duration_minutes?: number;
  booking_type?: {
    id: string;
    name: string;
    duration_minutes: number;
    buffer_before_minutes: number;
    buffer_after_minutes: number;
    price?: number | null;
    currency?: string | null;
  } | null;
  date_range: {
    start: string;
    end: string;
  };
  slots: AvailabilitySlotDTO[];
  total_slots: number;
}

export interface CalendarConflictItemDTO {
  resource_id?: string | null;
  resource_name?: string | null;
  resource_type?: ResourceType | null;
  event_id?: string | null;
  event_title?: string | null;
  start_at: Date | string;
  end_at: Date | string;
  conflict_type: 'EVENT_OVERLAP' | 'RESOURCE_OVERLAP' | 'BLACKOUT_OVERLAP' | 'BUFFER_OVERLAP' | 'OUTSIDE_WORKING_HOURS';
  description: string;
}

export interface CalendarConflictDTO {
  has_conflict: boolean;
  conflicts: CalendarConflictItemDTO[];
}

export interface CalendarConnectionDTO {
  id: string;
  studio_id: string;
  provider: CalendarProvider;
  status: CalendarSyncStatus;
  calendar_id?: string | null;
  calendar_name?: string | null;
  sync_direction: CalendarSyncDirection;
  ical_url?: string | null;
  last_synced_at?: Date | string | null;
  last_sync_error?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PublicBookingPortalDTO {
  token_valid: boolean;
  studio: {
    name: string;
    slug: string;
    logo_url?: string | null;
    website?: string | null;
    timezone: string;
  };
  booking_type?: {
    id: string;
    name: string;
    description?: string | null;
    duration_minutes: number;
    buffer_before_minutes: number;
    buffer_after_minutes: number;
    price?: number | null;
    currency?: string | null;
    requires_manual_confirmation: boolean;
  } | null;
  booking_request?: {
    id: string;
    status: BookingRequestStatus;
    requested_start_at: string;
    requested_end_at: string;
    timezone: string;
    client_name: string;
    client_email: string;
    client_phone?: string | null;
    confirmed_event_id?: string | null;
  } | null;
  settings: {
    timezone: string;
    minimum_notice_minutes: number;
    maximum_booking_days_ahead: number;
    allow_client_reschedule: boolean;
    allow_client_cancel: boolean;
    minimum_reschedule_notice_minutes: number;
    minimum_cancel_notice_minutes: number;
    require_manual_confirmation: boolean;
  };
}

export interface CalendarSummaryDTO {
  total_events: number;
  events_by_type: Record<CalendarEventType, number>;
  events_by_status: Record<CalendarEventStatus, number>;
  active_resources: number;
  upcoming_shoots: number;
  conflicts_detected: number;
  pending_booking_requests: number;
}

// -------------------------------------------------------------
// PHASE 23: STUDIO PRODUCTION, SHOOT MANAGEMENT & WORKFLOW
// -------------------------------------------------------------

export enum ProductionStage {
  PRE_PRODUCTION = 'PRE_PRODUCTION',
  READY_FOR_SHOOT = 'READY_FOR_SHOOT',
  SHOOT_IN_PROGRESS = 'SHOOT_IN_PROGRESS',
  SHOOT_COMPLETED = 'SHOOT_COMPLETED',
  MEDIA_INGESTION = 'MEDIA_INGESTION',
  CULLING = 'CULLING',
  EDITING = 'EDITING',
  AI_PROCESSING = 'AI_PROCESSING',
  GALLERY_PREPARATION = 'GALLERY_PREPARATION',
  READY_FOR_GALLERY = 'READY_FOR_GALLERY',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

export enum ShootType {
  WEDDING = 'WEDDING',
  PRE_WEDDING = 'PRE_WEDDING',
  PORTRAIT = 'PORTRAIT',
  COMMERCIAL = 'COMMERCIAL',
  PRODUCT = 'PRODUCT',
  EVENT = 'EVENT',
  MATERNITY = 'MATERNITY',
  NEWBORN = 'NEWBORN',
  CORPORATE = 'CORPORATE',
  OTHER = 'OTHER',
}

export enum ProductionTaskType {
  CLIENT_PREPARATION = 'CLIENT_PREPARATION',
  EQUIPMENT = 'EQUIPMENT',
  TRAVEL = 'TRAVEL',
  LOCATION = 'LOCATION',
  SHOT_LIST = 'SHOT_LIST',
  SECOND_SHOOTER = 'SECOND_SHOOTER',
  ASSISTANT = 'ASSISTANT',
  MEDIA_BACKUP = 'MEDIA_BACKUP',
  MEDIA_INGESTION = 'MEDIA_INGESTION',
  CULLING = 'CULLING',
  EDITING = 'EDITING',
  AI_PROCESSING = 'AI_PROCESSING',
  GALLERY = 'GALLERY',
  DELIVERY = 'DELIVERY',
  OTHER = 'OTHER',
}

export enum ChecklistItemStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
  BLOCKED = 'BLOCKED',
}

export enum ShotListItemStatus {
  PENDING = 'PENDING',
  CAPTURED = 'CAPTURED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  MISSED = 'MISSED',
}

export enum ShotListCategory {
  COUPLE = 'COUPLE',
  FAMILY = 'FAMILY',
  FRIENDS = 'FRIENDS',
  DETAILS = 'DETAILS',
  CEREMONY = 'CEREMONY',
  DECOR = 'DECOR',
  PORTRAITS = 'PORTRAITS',
  GROUPS = 'GROUPS',
  CANDIDS = 'CANDIDS',
  CUSTOM = 'CUSTOM',
}

export enum MediaIngestionStatus {
  NOT_STARTED = 'NOT_STARTED',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ProductionApprovalStatus {
  NOT_REQUIRED = 'NOT_REQUIRED',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ProductionHealthStatus {
  READY = 'READY',
  ATTENTION = 'ATTENTION',
  BLOCKED = 'BLOCKED',
}

export enum MediaBackupStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export interface StudioProductionProfileDTO {
  id: string;
  studio_id: string;
  default_shoot_buffer_minutes: number;
  default_travel_buffer_minutes: number;
  default_backup_policy: string;
  default_gallery_target_days: number;
  default_culling_target_days: number;
  default_editing_target_days: number;
  default_delivery_target_days: number;
  default_shoot_checklist?: any;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ProjectProductionDTO {
  id: string;
  studio_id: string;
  project_id: string;
  shoot_type: ShootType;
  production_stage: ProductionStage;
  shoot_start_at?: Date | string | null;
  shoot_end_at?: Date | string | null;
  primary_photographer_id?: string | null;
  lead_photographer_id?: string | null;
  location?: string | null;
  location_details?: string | null;
  travel_notes?: string | null;
  client_instructions?: string | null;
  internal_notes?: string | null;
  production_health_score: number;
  production_health_status: ProductionHealthStatus;
  media_ingestion_status: MediaIngestionStatus;
  media_backup_status: MediaBackupStatus;
  raw_captured_count?: number;
  culled_count?: number;
  gallery_target_date?: Date | string | null;
  culling_target_date?: Date | string | null;
  editing_target_date?: Date | string | null;
  delivery_target_date?: Date | string | null;
  production_started_at?: Date | string | null;
  production_completed_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  project?: {
    id: string;
    name: string;
    client?: {
      id: string;
      name: string;
      email: string;
      phone?: string | null;
    } | null;
  } | null;
  shoot_sessions?: ProjectShootSessionDTO[];
}

export interface CreateProjectProductionDTO {
  shoot_type?: ShootType;
  production_stage?: ProductionStage;
  shoot_start_at?: Date | string | null;
  shoot_end_at?: Date | string | null;
  primary_photographer_id?: string | null;
  lead_photographer_id?: string | null;
  location?: string | null;
  location_details?: string | null;
  travel_notes?: string | null;
  client_instructions?: string | null;
  internal_notes?: string | null;
  gallery_target_date?: Date | string | null;
}

export interface UpdateProjectProductionDTO {
  shoot_type?: ShootType;
  production_stage?: ProductionStage;
  shoot_start_at?: Date | string | null;
  shoot_end_at?: Date | string | null;
  primary_photographer_id?: string | null;
  lead_photographer_id?: string | null;
  location?: string | null;
  location_details?: string | null;
  travel_notes?: string | null;
  client_instructions?: string | null;
  internal_notes?: string | null;
  media_ingestion_status?: MediaIngestionStatus;
  media_backup_status?: MediaBackupStatus;
  gallery_target_date?: Date | string | null;
  culling_target_date?: Date | string | null;
  editing_target_date?: Date | string | null;
  delivery_target_date?: Date | string | null;
}

export interface ProjectShootSessionDTO {
  id: string;
  studio_id: string;
  project_id: string;
  production_id: string;
  calendar_event_id?: string | null;
  title: string;
  shoot_type: ShootType;
  start_at: Date | string;
  end_at: Date | string;
  timezone: string;
  location?: string | null;
  location_details?: string | null;
  status: CalendarEventStatus;
  primary_photographer_resource_id?: string | null;
  notes?: string | null;
  weather_notes?: string | null;
  parking_notes?: string | null;
  travel_time_minutes?: number | null;
  created_at: Date | string;
  updated_at: Date | string;
  crew_assignments?: ProjectCrewAssignmentDTO[];
  equipment_checklists?: ProjectEquipmentChecklistDTO[];
}

export interface CreateShootSessionDTO {
  title: string;
  shoot_type?: ShootType;
  start_at: Date | string;
  end_at: Date | string;
  timezone?: string;
  location?: string | null;
  location_details?: string | null;
  primary_photographer_resource_id?: string | null;
  notes?: string | null;
  weather_notes?: string | null;
  parking_notes?: string | null;
  travel_time_minutes?: number | null;
  create_calendar_event?: boolean;
}

export interface UpdateShootSessionDTO {
  title?: string;
  shoot_type?: ShootType;
  start_at?: Date | string;
  end_at?: Date | string;
  timezone?: string;
  location?: string | null;
  location_details?: string | null;
  status?: CalendarEventStatus;
  primary_photographer_resource_id?: string | null;
  notes?: string | null;
  weather_notes?: string | null;
  parking_notes?: string | null;
  travel_time_minutes?: number | null;
}

export interface ProjectCrewAssignmentDTO {
  id: string;
  studio_id: string;
  project_id: string;
  shoot_session_id?: string | null;
  resource_id: string;
  role: string;
  status: string;
  notes?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  resource?: {
    id: string;
    name: string;
    resource_type: ResourceType;
    email?: string | null;
    phone?: string | null;
  } | null;
}

export interface CreateCrewAssignmentDTO {
  resource_id: string;
  shoot_session_id?: string | null;
  role: string;
  status?: string;
  notes?: string | null;
}

export interface ProjectEquipmentChecklistDTO {
  id: string;
  studio_id: string;
  project_id: string;
  shoot_session_id?: string | null;
  name: string;
  description?: string | null;
  status: ChecklistItemStatus;
  required: boolean;
  assigned_resource_id?: string | null;
  checked_by?: string | null;
  checked_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  assigned_resource?: {
    id: string;
    name: string;
    resource_type: ResourceType;
  } | null;
}

export interface CreateEquipmentChecklistDTO {
  name: string;
  description?: string | null;
  shoot_session_id?: string | null;
  required?: boolean;
  assigned_resource_id?: string | null;
}

export interface ProjectChecklistDTO {
  id: string;
  studio_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  category: string;
  status: ChecklistItemStatus;
  priority: string;
  due_at?: Date | string | null;
  assigned_to?: string | null;
  completed_at?: Date | string | null;
  completed_by?: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateProjectChecklistDTO {
  name: string;
  description?: string | null;
  category?: string;
  priority?: string;
  due_at?: Date | string | null;
  assigned_to?: string | null;
  sort_order?: number;
}

export interface UpdateProjectChecklistDTO {
  name?: string;
  description?: string | null;
  category?: string;
  status?: ChecklistItemStatus;
  priority?: string;
  due_at?: Date | string | null;
  assigned_to?: string | null;
  sort_order?: number;
}

export interface ProjectShotListDTO {
  id: string;
  studio_id: string;
  project_id: string;
  name: string;
  description?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  items?: ProjectShotListItemDTO[];
}

export interface CreateProjectShotListDTO {
  name: string;
  description?: string | null;
  template?: 'WEDDING_STANDARD' | 'WEDDING_EXTENDED' | 'PORTRAIT' | 'COMMERCIAL' | 'CUSTOM';
}

export interface ProjectShotListItemDTO {
  id: string;
  studio_id: string;
  shot_list_id: string;
  category: ShotListCategory;
  title: string;
  description?: string | null;
  priority: string;
  status: ShotListItemStatus;
  sort_order: number;
  notes?: string | null;
  captured_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateProjectShotListItemDTO {
  category?: ShotListCategory;
  title: string;
  description?: string | null;
  priority?: string;
  sort_order?: number;
  notes?: string | null;
}

export interface UpdateProjectShotListItemDTO {
  category?: ShotListCategory;
  title?: string;
  description?: string | null;
  priority?: string;
  status?: ShotListItemStatus;
  sort_order?: number;
  notes?: string | null;
}

export interface ProjectQuestionnaireDTO {
  id: string;
  studio_id: string;
  project_id: string;
  title: string;
  description?: string | null;
  status: string;
  public_token_hash: string;
  public_token?: string;
  public_url?: string;
  expires_at?: Date | string | null;
  submitted_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  questions?: ProjectQuestionDTO[];
}

export interface CreateProjectQuestionnaireDTO {
  title: string;
  description?: string | null;
  expires_at?: Date | string | null;
  template?: 'WEDDING' | 'PORTRAIT' | 'COMMERCIAL' | 'EVENT' | 'CUSTOM';
}

export interface ProjectQuestionDTO {
  id: string;
  studio_id: string;
  questionnaire_id: string;
  question_type: string;
  question: string;
  description?: string | null;
  required: boolean;
  options?: any;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
  answers?: ProjectQuestionAnswerDTO[];
  answer?: ProjectQuestionAnswerDTO | null;
}

export interface ProjectQuestionAnswerDTO {
  id: string;
  studio_id: string;
  question_id: string;
  answer: any;
  created_at: Date | string;
}

export interface PublicQuestionnairePortalDTO {
  token_valid: boolean;
  questionnaire: {
    id: string;
    title: string;
    description?: string | null;
    status: string;
    expires_at?: string | null;
    submitted_at?: string | null;
  };
  studio: {
    name: string;
    slug: string;
    logo_url?: string | null;
  };
  project: {
    name: string;
    shoot_date?: string | null;
    location?: string | null;
  };
  questions: Array<{
    id: string;
    question_type: string;
    question: string;
    description?: string | null;
    required: boolean;
    options?: any;
    sort_order: number;
    existing_answer?: any;
  }>;
}

export interface SubmitQuestionnaireDTO {
  answers: Array<{
    question_id: string;
    answer: any;
  }>;
}

export interface ProjectTimelineItemDTO {
  id: string;
  studio_id: string;
  project_id: string;
  shoot_session_id?: string | null;
  event_type: string;
  title: string;
  description?: string | null;
  start_at: Date | string;
  end_at: Date | string;
  location?: string | null;
  assigned_resource_id?: string | null;
  status: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateProjectTimelineItemDTO {
  shoot_session_id?: string | null;
  event_type?: string;
  title: string;
  description?: string | null;
  start_at: Date | string;
  end_at: Date | string;
  location?: string | null;
  assigned_resource_id?: string | null;
  status?: string;
}

export interface ProductionHealthDimensionScore {
  dimension: string;
  weight: number;
  score: number;
  max_score: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
}

export interface ProductionHealthDTO {
  project_id: string;
  production_id: string;
  score: number; // 0 - 100
  status: ProductionHealthStatus; // READY, ATTENTION, BLOCKED
  dimensions: ProductionHealthDimensionScore[];
  missing_items: string[];
  warnings: string[];
  blockers: string[];
  updated_at: string;
}

export interface ProductionDeadlineDTO {
  project_id: string;
  shoot_date?: string | null;
  culling_target_date?: string | null;
  editing_target_date?: string | null;
  gallery_target_date?: string | null;
  delivery_target_date?: string | null;
  is_culling_overdue: boolean;
  is_editing_overdue: boolean;
  is_gallery_overdue: boolean;
  is_delivery_overdue: boolean;
  next_deadline_name?: string | null;
  next_deadline_date?: string | null;
  days_until_next_deadline?: number | null;
}

export interface MediaProductionStatusDTO {
  project_id: string;
  media_ingestion_status: MediaIngestionStatus;
  media_backup_status: MediaBackupStatus;
  total_photos: number;
  uploaded_photos: number;
  processed_photos: number;
  pending_photos: number;
  failed_photos: number;
  faces_indexed: number;
  smart_albums_count: number;
  event_chapters_count: number;
  galleries_linked: number;
  is_ready_for_gallery: boolean;
}

export interface ProductionKanbanBoardDTO {
  columns: Record<ProductionStage, ProjectProductionDTO[]>;
  total_projects: number;
  active_shoots_today: number;
  upcoming_shoots_7d: number;
  overdue_tasks_count: number;
}

export interface ProductionSummaryDTO {
  total_productions: number;
  by_stage: Record<ProductionStage, number>;
  by_shoot_type: Record<ShootType, number>;
  shoots_today: number;
  shoots_this_week: number;
  overdue_deadlines_count: number;
  average_health_score: number;
}

export interface OfflineSyncQueueItemDTO {
  id: string;
  type: 'CHECKLIST_TOGGLE' | 'SHOT_STATUS_TOGGLE' | 'SHOOT_NOTE_CREATE' | 'STAGE_UPDATE';
  project_id: string;
  payload: any;
  created_at: string;
  attempt_count: number;
}

export interface OfflineSyncResultDTO {
  processed_count: number;
  success_count: number;
  conflict_count: number;
  failed_items: Array<{
    id: string;
    error: string;
  }>;
}

// =============================================================
// PHASE 24: ADVANCED MEDIA CULLING, EDITING & POST-PRODUCTION TYPES
// =============================================================

export enum CullSessionStatus {
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum CullDecisionType {
  UNREVIEWED = 'UNREVIEWED',
  AI_RECOMMENDED_KEEP = 'AI_RECOMMENDED_KEEP',
  AI_RECOMMENDED_REJECT = 'AI_RECOMMENDED_REJECT',
  AI_RECOMMENDED_MAYBE = 'AI_RECOMMENDED_MAYBE',
  PHOTOGRAPHER_KEEP = 'PHOTOGRAPHER_KEEP',
  PHOTOGRAPHER_REJECT = 'PHOTOGRAPHER_REJECT',
  PHOTOGRAPHER_MAYBE = 'PHOTOGRAPHER_MAYBE',
  LOCKED = 'LOCKED',
  EXPORTED = 'EXPORTED',
}

export enum CullFilter {
  ALL = 'ALL',
  AI_KEEP = 'AI_KEEP',
  AI_REJECT = 'AI_REJECT',
  AI_MAYBE = 'AI_MAYBE',
  PHOTOGRAPHER_KEEP = 'PHOTOGRAPHER_KEEP',
  PHOTOGRAPHER_REJECT = 'PHOTOGRAPHER_REJECT',
  PHOTOGRAPHER_MAYBE = 'PHOTOGRAPHER_MAYBE',
  UNREVIEWED = 'UNREVIEWED',
  BEST_SHOTS = 'BEST_SHOTS',
  DUPLICATES = 'DUPLICATES',
  BURSTS = 'BURSTS',
  BLURRED = 'BLURRED',
  UNDEREXPOSED = 'UNDEREXPOSED',
  OVEREXPOSED = 'OVEREXPOSED',
  FACES = 'FACES',
  NO_FACES = 'NO_FACES',
}

export enum EditJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  AI_SUGGESTED = 'AI_SUGGESTED',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  RENDERING = 'RENDERING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum EditPresetType {
  SYSTEM = 'SYSTEM',
  STUDIO = 'STUDIO',
  USER = 'USER',
}

export enum EditVersionType {
  ORIGINAL = 'ORIGINAL',
  EDIT_PREVIEW = 'EDIT_PREVIEW',
  EDITED = 'EDITED',
  EXPORT = 'EXPORT',
}

export enum ExportJobStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ExportFormat {
  JPEG = 'JPEG',
  WEBP = 'WEBP',
  PNG = 'PNG',
}

export enum ExportQuality {
  WEB = 'WEB',
  HIGH_QUALITY = 'HIGH_QUALITY',
  PRINT = 'PRINT',
}

export enum MetadataPolicy {
  PRESERVE_ALL = 'PRESERVE_ALL',
  KEEP_ALL = 'KEEP_ALL',
  STRIP_LOCATION = 'STRIP_LOCATION',
  STRIP_GPS_PERSONAL = 'STRIP_GPS_PERSONAL',
  STRIP_ALL = 'STRIP_ALL',
  COPYRIGHT_ONLY = 'COPYRIGHT_ONLY',
  CUSTOM = 'CUSTOM',
}

export interface EditParametersDTO {
  exposure?: number; // -5 to +5 EV
  contrast?: number; // -100 to +100
  highlights?: number; // -100 to +100
  shadows?: number; // -100 to +100
  whites?: number; // -100 to +100
  blacks?: number; // -100 to +100
  temperature?: number; // 2000K to 12000K (or -100 to +100 offset)
  tint?: number; // -100 to +100
  saturation?: number; // -100 to +100
  vibrance?: number; // -100 to +100
  clarity?: number; // -100 to +100
  sharpness?: number; // 0 to 100
  noise_reduction?: number; // 0 to 100
  crop?: {
    x: number; // 0-1 percentage
    y: number; // 0-1 percentage
    width: number; // 0-1 percentage
    height: number; // 0-1 percentage
  };
  rotation?: number; // degrees (-180 to 180 or 0, 90, 180, 270)
  flip_horizontal?: boolean;
  flip_vertical?: boolean;
  curves?: {
    rgb?: Array<{ x: number; y: number }>;
  };
  hsl?: Record<string, { hue?: number; sat?: number; lum?: number }>;
  vignette?: number; // -100 to +100
  grain?: number; // 0 to 100
}

export interface CullScoreBreakdownDTO {
  technical_quality: number; // 0-100 (25% weight)
  sharpness: number; // 0-100 (15% weight)
  exposure: number; // 0-100 (10% weight)
  composition: number; // 0-100 (10% weight)
  eyes_expressions: number; // 0-100 (10% weight)
  duplicate_penalty: number; // 0-100 (15% weight)
  event_relevance: number; // 0-100 (10% weight)
  best_shot_signal: number; // 0-100 (5% weight)
  total_score: number; // 0-100 composite
  recommendation: 'KEEP' | 'REJECT' | 'MAYBE';
  confidence: number;
  reasons: string[];
  warnings: string[];
}

export interface PhotoCullDecisionDTO {
  id: string;
  studio_id: string;
  session_id: string;
  photo_id: string;
  decision: CullDecisionType;
  ai_score: number;
  ai_recommendation?: string | null;
  ai_confidence: number;
  ai_reasons?: string[] | null;
  ai_warnings?: string[] | null;
  notes?: string | null;
  decided_by?: string | null;
  decided_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  photo?: any;
}

export enum CullRecommendation {
  KEEP = 'KEEP',
  REJECT = 'REJECT',
  MAYBE = 'MAYBE',
}

export interface PhotoCullCandidateDTO {
  photo_id: string;
  filename: string;
  storage_key?: string;
  url?: string;
  preview_url?: string;
  ai_score: number;
  ai_recommendation: CullRecommendation | string;
  score_breakdown?: CullScoreBreakdownDTO;
  is_burst_member?: boolean;
  burst_group_id?: string | null;
  is_burst_best?: boolean;
  camera_make?: string | null;
  camera_model?: string | null;
  lens?: string | null;
  focal_length?: string | null;
  iso?: number | null;
  aperture?: string | null;
  shutter_speed?: string | null;
  captured_at?: Date | string | null;
  decision?: {
    decision: CullDecisionType | string;
    rating?: number | null;
    color_label?: string | null;
    notes?: string | null;
    decided_at?: Date | string | null;
  };
}

export interface PhotoCullSessionDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  project_id?: string | null;
  name: string;
  status: CullSessionStatus;
  total_photos: number;
  reviewed_count: number;
  keep_count: number;
  kept_count?: number;
  reject_count: number;
  rejected_count?: number;
  maybe_count: number;
  created_at: Date | string;
  updated_at: Date | string;
  decisions?: PhotoCullDecisionDTO[];
}

export interface PhotoBurstGroupMemberDTO {
  id: string;
  studio_id: string;
  burst_group_id: string;
  photo_id: string;
  rank: number;
  similarity_score: number;
  capture_order: number;
  created_at: Date | string;
  photo?: any;
}

export interface PhotoBurstGroupDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  project_id?: string | null;
  representative_photo_id?: string | null;
  photo_count: number;
  avg_similarity: number;
  created_at: Date | string;
  updated_at: Date | string;
  members?: PhotoBurstGroupMemberDTO[];
}

export interface PhotoSelectionLockDTO {
  id: string;
  studio_id: string;
  photo_id: string;
  locked_by: string;
  expires_at: Date | string;
  created_at: Date | string;
}

export interface PhotoReviewActionDTO {
  id: string;
  studio_id: string;
  session_id: string;
  photo_id: string;
  action_type: string;
  previous_decision: CullDecisionType;
  new_decision: CullDecisionType;
  actor_id?: string | null;
  undone: boolean;
  created_at: Date | string;
}

export interface PhotoEditPresetDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  preset_type: EditPresetType;
  parameters: EditParametersDTO;
  is_default: boolean;
  is_system?: boolean;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PhotoEditSuggestionDTO {
  id: string;
  studio_id: string;
  edit_job_id: string;
  photo_id: string;
  provider: string;
  parameter_changes: Partial<EditParametersDTO>;
  suggested_params?: Partial<EditParametersDTO>;
  reason: string;
  explanation?: string;
  confidence: number;
  is_applied: boolean;
  created_at: Date | string;
}

export interface PhotoEditVersionDTO {
  id: string;
  studio_id: string;
  edit_job_id: string;
  photo_id: string;
  version_number: number;
  version_type: EditVersionType;
  parameters: EditParametersDTO;
  storage_path?: string | null;
  preview_url?: string | null;
  render_status: string;
  created_by?: string | null;
  created_at: Date | string;
}

export interface PhotoEditJobDTO {
  id: string;
  studio_id: string;
  project_id?: string | null;
  gallery_id: string;
  photo_id: string;
  cull_decision_id?: string | null;
  status: EditJobStatus;
  priority: string;
  created_at: Date | string;
  updated_at: Date | string;
  suggestions?: PhotoEditSuggestionDTO[];
  versions?: PhotoEditVersionDTO[];
  photo?: any;
}

export interface PhotoExportPresetDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  format: ExportFormat;
  max_width?: number | null;
  max_height?: number | null;
  quality: number;
  metadata_policy: MetadataPolicy;
  watermark_policy: string;
  is_system?: boolean;
  watermark_enabled?: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PhotoExportArtifactDTO {
  id: string;
  studio_id: string;
  export_job_id: string;
  photo_id: string;
  edit_version_id?: string | null;
  storage_key: string;
  url: string;
  file_size: number | bigint;
  checksum?: string | null;
  format: ExportFormat;
  width?: number | null;
  height?: number | null;
  created_at: Date | string;
}

export interface PhotoExportJobDTO {
  id: string;
  studio_id: string;
  project_id?: string | null;
  gallery_id: string;
  preset_id?: string | null;
  status: ExportJobStatus;
  total_items: number;
  total_photos?: number;
  processed_items: number;
  processed_photos?: number;
  target_format: ExportFormat;
  quality_level: ExportQuality;
  metadata_policy: MetadataPolicy;
  watermark_enabled: boolean;
  output_path?: string | null;
  download_url?: string | null;
  created_by?: string | null;
  created_at: Date | string;
  completed_at?: Date | string | null;
  artifacts?: PhotoExportArtifactDTO[];
}

export interface CullingSummaryDTO {
  total_sessions: number;
  active_sessions: number;
  total_photos_culled: number;
  keep_rate: number;
  keep_rate_percent?: number;
  reject_rate: number;
  maybe_rate: number;
  burst_groups_count: number;
  burst_groups_detected?: number;
  duplicates_detected_count: number;
  ai_recommended_keep?: number;
  ai_agreement_rate_percent?: number;
  avg_cull_velocity_photos_per_min?: number;
  hours_saved_by_ai?: number;
}

export interface EditingSummaryDTO {
  total_jobs: number;
  queued_jobs: number;
  processing_jobs: number;
  ai_suggested_jobs: number;
  waiting_approval_jobs: number;
  completed_jobs: number;
  presets_count: number;
  total_photos_edited?: number;
  ai_suggestions_generated?: number;
  ai_suggestions_approved_percent?: number;
  avg_processing_time_sec?: number;
}

export interface ExportSummaryDTO {
  total_export_jobs: number;
  completed_export_jobs: number;
  queued_export_jobs: number;
  total_artifacts_generated: number;
  total_artifacts_rendered?: number;
  presets_count: number;
  success_rate_percent?: number;
  total_bytes_exported_formatted?: string;
}

export interface CreateCullSessionDTO {
  name: string;
  gallery_id: string;
  project_id?: string;
  run_ai_analysis?: boolean;
}

export interface UpdateCullDecisionDTO {
  decision: CullDecisionType;
  notes?: string;
}

export interface BulkCullDecisionDTO {
  photo_ids: string[];
  decision: CullDecisionType;
  notes?: string;
}

export interface CreateEditJobDTO {
  photo_id: string;
  gallery_id: string;
  project_id?: string;
  cull_decision_id?: string;
  preset_id?: string;
  initial_parameters?: EditParametersDTO;
}

export interface CreateEditPresetDTO {
  name: string;
  description?: string;
  preset_type?: EditPresetType;
  parameters: EditParametersDTO;
  is_default?: boolean;
}

export interface ApplyEditSuggestionDTO {
  parameters?: Partial<EditParametersDTO>;
  approve?: boolean;
}

export interface CreateExportJobDTO {
  gallery_id: string;
  project_id?: string;
  preset_id?: string;
  target_format?: ExportFormat;
  quality_level?: ExportQuality;
  metadata_policy?: MetadataPolicy;
  watermark_enabled?: boolean;
  photo_ids?: string[];
}

export interface CreateExportPresetDTO {
  name: string;
  description?: string;
  format?: ExportFormat;
  max_width?: number;
  max_height?: number;
  quality?: number;
  metadata_policy?: MetadataPolicy;
  watermark_policy?: string;
}

// ==========================================
// PHASE 25: CLIENT PROOFING & SELECTION
// ==========================================

export enum ProofingSessionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  CLIENT_REVIEWING = 'CLIENT_REVIEWING',
  SUBMITTED = 'SUBMITTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  APPROVED = 'APPROVED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ProofingItemStatus {
  UNREVIEWED = 'UNREVIEWED',
  FAVORITE = 'FAVORITE',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED',
}

export enum ProofingCommentType {
  GENERAL = 'GENERAL',
  COLOR_CORRECTION = 'COLOR_CORRECTION',
  RETOUCH_BLEMISH = 'RETOUCH_BLEMISH',
  RETOUCH_BODY_OBJECT = 'RETOUCH_BODY_OBJECT',
  CROP_ALIGNMENT = 'CROP_ALIGNMENT',
  LIGHTING_EXPOSURE = 'LIGHTING_EXPOSURE',
  SPECIAL_INSTRUCTION = 'SPECIAL_INSTRUCTION',
}

export enum ProofingReviewDecision {
  APPROVED_FOR_EDITING = 'APPROVED_FOR_EDITING',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  REJECTED = 'REJECTED',
  DIRECT_FULFILLMENT = 'DIRECT_FULFILLMENT',
}

export interface ProofingSelectionRuleDTO {
  id: string;
  session_id: string;
  included_count: number;
  min_selections: number;
  max_selections?: number | null;
  allow_extras: boolean;
  extra_price_cents: number;
  currency: string;
  allow_client_notes: boolean;
  allow_pinpoint_feedback: boolean;
  allow_favorite_starring: boolean;
  allow_side_by_side_compare: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PhotoProofingCommentDTO {
  id: string;
  item_id: string;
  session_id: string;
  parent_id?: string | null;
  comment_type: ProofingCommentType;
  comment_text: string;
  pin_x?: number | null;
  pin_y?: number | null;
  author_type: 'CLIENT' | 'PHOTOGRAPHER' | 'STUDIO_STAFF' | 'AI_ASSISTANT';
  author_name?: string | null;
  author_id?: string | null;
  is_resolved: boolean;
  resolved_at?: Date | string | null;
  resolved_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  replies?: PhotoProofingCommentDTO[];
}

export interface PhotoProofingItemDTO {
  id: string;
  session_id: string;
  photo_id: string;
  status: ProofingItemStatus;
  is_favorite: boolean;
  selection_order?: number | null;
  client_note?: string | null;
  flag_color?: string | null;
  rating?: number | null;
  created_at: Date | string;
  updated_at: Date | string;
  photo?: {
    id: string;
    gallery_id?: string;
    original_filename?: string | null;
    thumbnail_url?: string | null;
    preview_url?: string | null;
    original_url: string;
    width?: number | null;
    height?: number | null;
    aspect_ratio?: number | null;
  };
  comments?: PhotoProofingCommentDTO[];
  comment_count?: number;
}

export interface PhotoProofingComparisonDTO {
  id: string;
  session_id: string;
  name?: string | null;
  photo_ids: string[];
  winner_photo_id?: string | null;
  notes?: string | null;
  created_at: Date | string;
}

export interface PhotoProofingReviewDTO {
  id: string;
  session_id: string;
  reviewed_by: string;
  decision: ProofingReviewDecision;
  feedback_notes?: string | null;
  action_summary?: any;
  edit_job_ids?: string[];
  created_at: Date | string;
}

export interface PhotoProofingAuditLogDTO {
  id: string;
  session_id: string;
  action: string;
  actor_type: string;
  actor_id?: string | null;
  actor_name?: string | null;
  payload?: any;
  created_at: Date | string;
}

export interface ProofingQuotaEvaluationDTO {
  included_count: number;
  min_selections: number;
  max_selections?: number | null;
  selected_count: number;
  favorites_count: number;
  unreviewed_count: number;
  rejected_count: number;
  total_items: number;
  is_min_met: boolean;
  is_max_exceeded: boolean;
  is_valid_for_submission: boolean;
  extra_count: number;
  extra_price_cents: number;
  extra_total_cents: number;
  currency: string;
  formatted_extra_total: string;
}

export interface PhotoProofingSessionDTO {
  id: string;
  studio_id: string;
  gallery_id: string;
  project_id?: string | null;
  client_id?: string | null;
  name: string;
  description?: string | null;
  token_hash: string;
  has_pin: boolean;
  status: ProofingSessionStatus;
  deadline_at?: Date | string | null;
  expires_at?: Date | string | null;
  allow_download_previews: boolean;
  watermark_enabled: boolean;
  submitted_at?: Date | string | null;
  completed_at?: Date | string | null;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  rules?: ProofingSelectionRuleDTO | null;
  items?: PhotoProofingItemDTO[];
  comparisons?: PhotoProofingComparisonDTO[];
  reviews?: PhotoProofingReviewDTO[];
  quota?: ProofingQuotaEvaluationDTO;
  gallery?: {
    id: string;
    title: string;
    slug: string;
    cover_photo_url?: string | null;
  };
  client?: {
    id: string;
    name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

export interface ProofingSummaryDTO {
  total_sessions: number;
  active_sessions: number;
  submitted_sessions: number;
  approved_sessions: number;
  total_selections_made: number;
  total_favorites_marked: number;
  total_comments_placed: number;
  extra_photos_ordered: number;
  extra_revenue_cents: number;
  formatted_extra_revenue: string;
  avg_time_to_submission_days: number;
  compliance_rate_percent: number;
}

export interface CreateProofingSessionDTO {
  name: string;
  gallery_id: string;
  project_id?: string;
  client_id?: string;
  description?: string;
  pin_code?: string;
  deadline_at?: Date | string;
  expires_at?: Date | string;
  allow_download_previews?: boolean;
  watermark_enabled?: boolean;
  photo_ids?: string[];
  rules?: Partial<UpdateProofingRulesDTO>;
}

export interface UpdateProofingSessionDTO {
  name?: string;
  description?: string;
  status?: ProofingSessionStatus;
  deadline_at?: Date | string | null;
  expires_at?: Date | string | null;
  allow_download_previews?: boolean;
  watermark_enabled?: boolean;
  pin_code?: string;
}

export interface UpdateProofingRulesDTO {
  included_count?: number;
  min_selections?: number;
  max_selections?: number | null;
  allow_extras?: boolean;
  extra_price_cents?: number;
  currency?: string;
  allow_client_notes?: boolean;
  allow_pinpoint_feedback?: boolean;
  allow_favorite_starring?: boolean;
  allow_side_by_side_compare?: boolean;
}

export interface ToggleProofingItemDTO {
  status?: ProofingItemStatus;
  is_favorite?: boolean;
  client_note?: string;
  flag_color?: string;
  rating?: number;
}

export interface BulkToggleProofingItemDTO {
  item_ids: string[];
  status?: ProofingItemStatus;
  is_favorite?: boolean;
}

export interface CreateProofingCommentDTO {
  comment_type: ProofingCommentType;
  comment_text: string;
  pin_x?: number;
  pin_y?: number;
  author_type?: 'CLIENT' | 'PHOTOGRAPHER' | 'STUDIO_STAFF' | 'AI_ASSISTANT';
  author_name?: string;
  author_id?: string;
  parent_id?: string;
}

export interface UpdateProofingCommentDTO {
  comment_text?: string;
  is_resolved?: boolean;
}

export interface CreateProofingComparisonDTO {
  name?: string;
  photo_ids: string[];
  notes?: string;
  winner_photo_id?: string;
}

export interface SubmitClientSelectionsDTO {
  client_name?: string;
  client_email?: string;
  final_notes?: string;
  confirm_extra_charges?: boolean;
}

export interface ReviewProofingSelectionsDTO {
  decision: ProofingReviewDecision;
  feedback_notes?: string;
  auto_create_edit_jobs?: boolean;
  advance_production_stage?: boolean;
}

export interface ProofingPublicSessionDTO {
  id: string;
  name: string;
  description?: string | null;
  status: ProofingSessionStatus;
  requires_pin: boolean;
  is_pin_verified?: boolean;
  deadline_at?: Date | string | null;
  allow_download_previews: boolean;
  watermark_enabled: boolean;
  rules: ProofingSelectionRuleDTO;
  items: PhotoProofingItemDTO[];
  comparisons: PhotoProofingComparisonDTO[];
  quota: ProofingQuotaEvaluationDTO;
  gallery: {
    id: string;
    title: string;
    cover_photo_url?: string | null;
  };
}

export interface VerifyProofingPinDTO {
  pin_code: string;
}

// =============================================================
// PHASE 26: PHOTO FULFILLMENT, DELIVERY & ORDER MANAGEMENT TYPES
// =============================================================

export enum FulfillmentProductType {
  DIGITAL_DOWNLOAD = 'DIGITAL_DOWNLOAD',
  PRINT = 'PRINT',
  PRINTS = 'PRINTS',
  ALBUM = 'ALBUM',
  PHOTO_BOOK = 'PHOTO_BOOK',
  CANVAS = 'CANVAS',
  FRAMED_PRINT = 'FRAMED_PRINT',
  WALL_ART = 'WALL_ART',
  USB_DELIVERY = 'USB_DELIVERY',
  CUSTOM_PRODUCT = 'CUSTOM_PRODUCT',
  OTHER = 'OTHER',
}

export enum FulfillmentOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  IN_PRODUCTION = 'IN_PRODUCTION',
  PRINTING_LAB = 'PRINTING_LAB',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  PARTIALLY_DELIVERED = 'PARTIALLY_DELIVERED',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum FulfillmentPaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export enum FulfillmentDeliveryStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum FulfillmentItemStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum FulfillmentDeliveryType {
  DIGITAL = 'DIGITAL',
  DIGITAL_DOWNLOAD = 'DIGITAL_DOWNLOAD',
  DIGITAL_ONLY = 'DIGITAL_ONLY',
  PHYSICAL = 'PHYSICAL',
  PHYSICAL_SHIPMENT = 'PHYSICAL_SHIPMENT',
  STUDIO_PICKUP = 'STUDIO_PICKUP',
  MIXED = 'MIXED',
  HYBRID = 'HYBRID',
}

export enum FulfillmentAuditAction {
  ORDER_CREATED = 'ORDER_CREATED',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  ITEM_UPDATED = 'ITEM_UPDATED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  STATUS_UPDATED = 'STATUS_UPDATED',
  PACKAGE_CREATED = 'PACKAGE_CREATED',
  DELIVERY_CREATED = 'DELIVERY_CREATED',
  FILE_DELIVERED = 'FILE_DELIVERED',
  TRACKING_UPDATED = 'TRACKING_UPDATED',
  DOWNLOAD_STARTED = 'DOWNLOAD_STARTED',
  DOWNLOAD_COMPLETED = 'DOWNLOAD_COMPLETED',
  DOWNLOAD_GENERATED = 'DOWNLOAD_GENERATED',
  DELIVERY_CONFIRMED = 'DELIVERY_CONFIRMED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  REFUND_RECORDED = 'REFUND_RECORDED',
}

export interface FulfillmentProductDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  type: FulfillmentProductType;
  product_type?: FulfillmentProductType;
  is_active: boolean;
  is_digital: boolean;
  base_price: number;
  base_price_cents?: number;
  currency: string;
  tax_rate: number;
  sku?: string | null;
  delivery_method?: string | null;
  metadata?: any;
  created_at: Date | string;
  updated_at: Date | string;
  variants?: FulfillmentProductVariantDTO[];
}

export interface FulfillmentProductVariantDTO {
  id: string;
  studio_id?: string;
  product_id: string;
  name: string;
  size?: string | null;
  dimensions?: string | null;
  material?: string | null;
  finish?: string | null;
  price_delta?: number;
  price: number;
  price_cents?: number;
  cost_cents?: number;
  sku?: string | null;
  is_active: boolean;
  metadata?: any;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateFulfillmentProductDTO {
  name: string;
  description?: string;
  type?: FulfillmentProductType;
  product_type?: FulfillmentProductType;
  is_active?: boolean;
  is_digital?: boolean;
  base_price?: number;
  base_price_cents?: number;
  currency?: string;
  tax_rate?: number;
  sku?: string;
  delivery_method?: string;
  metadata?: any;
  variants?: {
    name: string;
    size?: string;
    dimensions?: string;
    material?: string;
    finish?: string;
    price_delta?: number;
    price?: number;
    price_cents?: number;
    sku?: string;
    is_active?: boolean;
  }[];
}

export interface UpdateFulfillmentProductDTO {
  name?: string;
  description?: string;
  type?: FulfillmentProductType;
  product_type?: FulfillmentProductType;
  is_active?: boolean;
  is_digital?: boolean;
  base_price?: number;
  base_price_cents?: number;
  currency?: string;
  tax_rate?: number;
  sku?: string;
  delivery_method?: string;
  metadata?: any;
}

export interface CreateProductVariantDTO {
  name: string;
  size?: string;
  dimensions?: string;
  material?: string;
  finish?: string;
  price_delta?: number;
  price?: number;
  price_cents?: number;
  sku?: string;
  is_active?: boolean;
  metadata?: any;
}

export interface FulfillmentOrderItemPhotoDTO {
  id: string;
  order_item_id: string;
  photo_id: string;
  photo_version_id?: string | null;
  notes?: string | null;
  created_at: Date | string;
  photo?: {
    id: string;
    file_name: string;
    original_url: string;
    thumbnail_url?: string | null;
    width?: number | null;
    height?: number | null;
  };
}

export interface FulfillmentOrderItemDTO {
  id: string;
  order_id: string;
  product_id?: string | null;
  variant_id?: string | null;
  item_name: string;
  product_type: FulfillmentProductType;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  unit_price_cents?: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: FulfillmentItemStatus;
  notes?: string | null;
  metadata?: any;
  photos: FulfillmentOrderItemPhotoDTO[];
  product?: FulfillmentProductDTO | null;
  variant?: FulfillmentProductVariantDTO | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FulfillmentPaymentDTO {
  id: string;
  order_id: string;
  studio_id?: string;
  transaction_id?: string | null;
  gateway_payment_id?: string | null;
  gateway_transaction_id?: string | null;
  amount: number;
  amount_cents: number;
  currency: string;
  payment_method?: string | null;
  reference?: string | null;
  status: FulfillmentPaymentStatus | string;
  idempotency_key?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: Date | string;
}

export interface FulfillmentDeliveryDTO {
  id: string;
  order_id: string;
  delivery_type: FulfillmentDeliveryType;
  status: FulfillmentDeliveryStatus;
  tracking_number?: string | null;
  tracking_url?: string | null;
  courier?: string | null;
  courier_name?: string | null;
  shipped_at?: Date | string | null;
  estimated_delivery_at?: Date | string | null;
  delivered_at?: Date | string | null;
  recipient_name?: string | null;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  notes?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FulfillmentPackageDTO {
  id: string;
  order_id: string;
  name: string;
  format?: string;
  signed_url?: string | null;
  storage_key?: string | null;
  file_size?: number | string;
  file_size_bytes?: number;
  photo_count?: number;
  max_downloads?: number | null;
  download_count: number;
  expires_at?: Date | string | null;
  is_ready?: boolean;
  items: any[];
  downloads?: any[];
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FulfillmentAddressDTO {
  id: string;
  order_id: string;
  full_name: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state?: string | null;
  postal_code: string;
  country: string;
  phone?: string | null;
}

export interface FulfillmentOrderDTO {
  id: string;
  studio_id: string;
  order_number: string;
  proofing_session_id?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  gallery_id?: string | null;
  status: FulfillmentOrderStatus;
  payment_status: FulfillmentPaymentStatus;
  delivery_type: FulfillmentDeliveryType;
  currency: string;
  subtotal: number;
  subtotal_cents?: number;
  tax_total: number;
  tax_cents?: number;
  discount_total: number;
  discount_cents?: number;
  shipping_cents?: number;
  total_amount: number;
  total_price_cents?: number;
  paid_amount: number;
  paid_amount_cents?: number;
  raw_token?: string;
  token_hash?: string | null;
  expires_at?: Date | string | null;
  notes?: string | null;
  internal_notes?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  client_confirmed_at?: Date | string | null;
  client_confirmed_by?: string | null;
  fulfilled_at?: Date | string | null;
  delivered_at?: Date | string | null;
  cancelled_at?: Date | string | null;
  items: FulfillmentOrderItemDTO[];
  payments?: FulfillmentPaymentDTO[];
  deliveries?: FulfillmentDeliveryDTO[];
  packages?: FulfillmentPackageDTO[];
  address?: FulfillmentAddressDTO | null;
  shipping_address?: FulfillmentAddressDTO | null;
  project?: { id: string; name: string } | null;
  client?: { id: string; name: string; email: string } | null;
  gallery?: { id: string; title: string } | null;
  studio_name?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateFulfillmentOrderFromProofingDTO {
  proofing_session_id: string;
  digital_product_id?: string;
  custom_order_number?: string;
  notes?: string;
}

export interface CreateManualFulfillmentOrderDTO {
  project_id?: string;
  client_id?: string;
  gallery_id?: string;
  currency?: string;
  delivery_type?: FulfillmentDeliveryType;
  notes?: string;
  internal_notes?: string;
  shipping_address?: {
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country?: string;
    phone?: string;
  };
  items?: {
    product_id?: string;
    variant_id?: string;
    item_name: string;
    product_type: FulfillmentProductType;
    quantity: number;
    unit_price: number;
    tax?: number;
    discount?: number;
    notes?: string;
    photo_ids?: string[];
  }[];
}

export interface AddOrderItemDTO {
  product_id?: string;
  variant_id?: string;
  item_name: string;
  product_type: FulfillmentProductType;
  quantity?: number;
  unit_price: number;
  tax?: number;
  discount?: number;
  notes?: string;
  photo_ids?: string[];
}

export interface UpdateOrderItemDTO {
  quantity?: number;
  unit_price?: number;
  tax?: number;
  discount?: number;
  status?: FulfillmentItemStatus;
  notes?: string;
  photo_ids?: string[];
}

export interface RecordFulfillmentPaymentDTO {
  amount: number;
  currency?: string;
  payment_method?: string;
  reference?: string;
  idempotency_key?: string;
  notes?: string;
}

export interface CreateDigitalPackageDTO {
  name: string;
  photo_ids?: string[];
  max_downloads?: number;
  expires_in_hours?: number;
}

export interface CreatePhysicalDeliveryDTO {
  delivery_type?: FulfillmentDeliveryType;
  tracking_number?: string;
  courier?: string;
  shipped_at?: Date | string;
  estimated_delivery_at?: Date | string;
  recipient_name?: string;
  recipient_email?: string;
  recipient_phone?: string;
  notes?: string;
  item_ids?: string[];
}

export interface UpdatePhysicalDeliveryDTO {
  status?: FulfillmentDeliveryStatus;
  tracking_number?: string;
  courier?: string;
  shipped_at?: Date | string;
  delivered_at?: Date | string;
  notes?: string;
}

export interface FulfillmentPublicOrderDTO {
  id: string;
  order_number: string;
  status: FulfillmentOrderStatus;
  payment_status: FulfillmentPaymentStatus;
  delivery_type: FulfillmentDeliveryType;
  currency: string;
  subtotal: number;
  subtotal_cents?: number;
  tax_total: number;
  tax_cents?: number;
  discount_total: number;
  discount_cents?: number;
  shipping_cents?: number;
  total_amount: number;
  total_price_cents?: number;
  paid_amount: number;
  paid_amount_cents?: number;
  balance_due: number;
  is_fully_paid: boolean;
  client_confirmed_at?: Date | string | null;
  client_name?: string | null;
  client_email?: string | null;
  items: {
    id: string;
    item_name: string;
    product_type: FulfillmentProductType;
    quantity: number;
    unit_price: number;
    unit_price_cents?: number;
    variant_name?: string | null;
    notes?: string | null;
    total: number;
    status: FulfillmentItemStatus;
    photo_count: number;
    photos: {
      id: string;
      file_name: string;
      thumbnail_url?: string | null;
      download_url?: string | null;
      photo?: {
        id?: string;
        file_name?: string;
        thumbnail_url?: string | null;
        download_url?: string | null;
      };
    }[];
  }[];
  digital_packages: {
    id: string;
    name: string;
    photo_count: number;
    file_size_formatted: string;
    download_url: string;
    downloads_remaining?: number | null;
    expires_at?: Date | string | null;
    is_ready: boolean;
  }[];
  packages?: {
    id: string;
    name: string;
    photo_count?: number;
    file_size_formatted?: string;
    download_url?: string;
    downloads_remaining?: number | null;
    expires_at?: Date | string | null;
    is_ready?: boolean;
  }[];
  deliveries: {
    id: string;
    delivery_type: FulfillmentDeliveryType;
    status: FulfillmentDeliveryStatus;
    courier?: string | null;
    courier_name?: string | null;
    tracking_number?: string | null;
    tracking_url?: string | null;
    shipped_at?: Date | string | null;
    delivered_at?: Date | string | null;
  }[];
  studio: {
    id: string;
    name: string;
    logo_url?: string | null;
  };
  studio_name?: string | null;
  project?: {
    id: string;
    name: string;
  } | null;
}

export interface FulfillmentAnalyticsSummaryDTO {
  total_orders: number;
  open_orders: number;
  awaiting_payment_orders: number;
  in_production_orders: number;
  ready_orders: number;
  delivered_orders: number;
  total_revenue: number;
  digital_revenue: number;
  physical_revenue: number;
  average_order_value: number;
  total_downloads: number;
  delivery_confirmation_rate: number;
  formatted_revenue?: string;
  formatted_collected?: string;
  formatted_aov?: string;
  by_status?: Record<string, number>;
  top_products: {
    product_id: string;
    name: string;
    units_sold: number;
    revenue: number;
  }[];
}

export type IFulfillmentProduct = FulfillmentProductDTO;
export type IFulfillmentProductVariant = FulfillmentProductVariantDTO;
export type IFulfillmentOrder = FulfillmentOrderDTO;
export type IFulfillmentOrderItem = FulfillmentOrderItemDTO;
export type IFulfillmentOrderItemPhoto = FulfillmentOrderItemPhotoDTO;
export type IFulfillmentPayment = FulfillmentPaymentDTO;
export type IFulfillmentDelivery = FulfillmentDeliveryDTO;
export type IFulfillmentPackage = FulfillmentPackageDTO;
export type IFulfillmentAddress = FulfillmentAddressDTO;
export type IFulfillmentPublicOrderDTO = FulfillmentPublicOrderDTO;
export type IFulfillmentAnalyticsSummaryDTO = FulfillmentAnalyticsSummaryDTO;

// ==========================================
// PHASE 27: STUDIO CLIENT PORTAL & WHITE-LABEL BRANDING
// ==========================================

export enum StudioDomainStatus {
  PENDING = 'PENDING',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REMOVED = 'REMOVED',
}

export interface IStudioBranding {
  id: string;
  studio_id: string;
  logo_url?: string | null;
  favicon_url?: string | null;
  studio_name?: string | null;
  tagline?: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  button_style: string;
  font_family: string;
  custom_footer_text?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  social_links?: Record<string, string> | null;
  show_pixmatch_badge: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IUpdateStudioBrandingDTO {
  logo_url?: string | null;
  favicon_url?: string | null;
  studio_name?: string | null;
  tagline?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  text_color?: string;
  button_style?: string;
  font_family?: string;
  custom_footer_text?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website_url?: string | null;
  social_links?: Record<string, string> | null;
  show_pixmatch_badge?: boolean;
}

export interface IStudioDomain {
  id: string;
  studio_id: string;
  hostname: string;
  status: StudioDomainStatus;
  verification_token: string;
  verified_at?: Date | string | null;
  is_primary: boolean;
  ssl_status?: string | null;
  dns_records?: Array<{ type: string; name: string; value: string; status?: string }> | null;
  last_checked_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ICreateStudioDomainDTO {
  hostname: string;
  is_primary?: boolean;
}

export interface IVerifyStudioDomainDTO {
  domain_id: string;
}

export interface IClientPortalSessionDTO {
  id: string;
  studio_id: string;
  client_id: string;
  token_preview?: string;
  expires_at: Date | string;
  is_valid: boolean;
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  studio: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
  };
  branding?: IStudioBranding | null;
}

export interface IClientPortalHomeDTO {
  session: {
    token: string;
    client_name: string;
    client_email: string;
    expires_at: Date | string;
  };
  studio: {
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    website?: string | null;
  };
  branding: IStudioBranding;
  active_project?: IClientPortalProjectDTO | null;
  projects: IClientPortalProjectDTO[];
  recent_activity: IClientPortalActivityDTO[];
  orders_summary: {
    total_orders: number;
    pending_payment_count: number;
    in_production_count: number;
    ready_for_delivery_count: number;
    delivered_count: number;
    recent_orders: IClientPortalOrderDTO[];
  };
  notifications_summary: {
    unread_count: number;
    recent: IClientPortalNotificationDTO[];
  };
  quick_stats: {
    total_projects: number;
    total_galleries: number;
    total_downloads_available: number;
    pending_proofing_sessions: number;
  };
}

export interface IClientPortalProjectDTO {
  id: string;
  name: string;
  project_type: string;
  event_type?: string | null;
  client_id?: string | null;
  status: string;
  event_date?: Date | string | null;
  location?: string | null;
  description?: string | null;
  primary_photographer_name?: string | null;
  galleries_count: number;
  primary_gallery_id?: string | null;
  primary_gallery_slug?: string | null;
  has_active_proofing: boolean;
  proofing_status?: string | null;
  proofing_session_id?: string | null;
  has_orders: boolean;
  orders_count: number;
  available_downloads_count: number;
  last_activity_at?: Date | string | null;
  proofing_session?: {
    id: string;
    title: string;
    status: string;
    required_count?: number | null;
    selected_count: number;
  } | null;
}

export interface IClientPortalProjectDetailDTO {
  project: IClientPortalProjectDTO;
  galleries: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    cover_photo_url?: string | null;
    photo_count: number;
    access_type: string;
    has_find_my_photos: boolean;
    created_at: Date | string;
  }>;
  proofing_sessions: Array<{
    id: string;
    title: string;
    status: string;
    selected_count: number;
    required_count?: number | null;
    min_photos?: number | null;
    max_photos?: number | null;
    deadline?: Date | string | null;
    completed_at?: Date | string | null;
    public_token?: string | null;
  }>;
  selections_summary: {
    favorites_count: number;
    selected_count: number;
    rejected_count: number;
  };
  orders: IClientPortalOrderDTO[];
  downloads: IClientPortalDownloadDTO[];
  delivery_items: IClientPortalDeliveryDTO[];
  recent_activities: IClientPortalActivityDTO[];
}

export interface IClientPortalOrderDTO {
  id: string;
  order_number: string;
  project_id?: string | null;
  project_name?: string | null;
  status: string;
  payment_status: string;
  delivery_type: string;
  total_amount: number;
  paid_amount: number;
  currency: string;
  items_count: number;
  created_at: Date | string;
  portal_token?: string | null;
}

export interface IClientPortalDownloadDTO {
  id: string;
  name: string;
  project_id?: string | null;
  project_name?: string | null;
  order_id?: string | null;
  photo_count: number;
  file_size_formatted: string;
  download_url: string;
  downloads_remaining?: number | null;
  expires_at?: Date | string | null;
  is_ready: boolean;
  is_expired: boolean;
  created_at: Date | string;
}

export interface IClientPortalDeliveryDTO {
  id: string;
  order_id: string;
  order_number: string;
  delivery_type: string;
  status: string;
  courier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  shipped_at?: Date | string | null;
  delivered_at?: Date | string | null;
  can_confirm: boolean;
  is_confirmed: boolean;
}

export interface IClientPortalNotificationDTO {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string | null;
  is_read: boolean;
  created_at: Date | string;
}

export interface IClientPortalActivityDTO {
  id: string;
  event_type: string;
  title: string;
  description: string;
  project_name?: string | null;
  occurred_at: Date | string;
}

export interface IClientPortalProfileDTO {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  company?: string | null;
  preferred_contact_channel: string;
  preferences: {
    email_gallery_ready: boolean;
    email_proofing_updates: boolean;
    email_order_updates: boolean;
    email_delivery_updates: boolean;
    email_download_ready: boolean;
  };
}

export interface IUpdateClientPortalProfileDTO {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company?: string;
}

export interface IUpdateClientPortalPreferenceDTO {
  email_gallery_ready?: boolean;
  email_proofing_updates?: boolean;
  email_order_updates?: boolean;
  email_delivery_updates?: boolean;
  email_download_ready?: boolean;
  preferred_contact_channel?: string;
}

export type StudioBrandingDTO = IStudioBranding;
export type StudioDomainDTO = IStudioDomain;
export type ClientPortalSessionDTO = IClientPortalSessionDTO;
export type ClientPortalHomeDTO = IClientPortalHomeDTO;
export type ClientPortalProjectDTO = IClientPortalProjectDTO;
export type ClientPortalProjectDetailDTO = IClientPortalProjectDetailDTO;
export type ClientPortalOrderDTO = IClientPortalOrderDTO;
export type ClientPortalDownloadDTO = IClientPortalDownloadDTO;
export type ClientPortalDeliveryDTO = IClientPortalDeliveryDTO;
export type ClientPortalNotificationDTO = IClientPortalNotificationDTO;
export type ClientPortalActivityDTO = IClientPortalActivityDTO;
export type ClientPortalProfileDTO = IClientPortalProfileDTO;

// -------------------------------------------------------------
// PHASE 28: CLIENT COMMUNICATION & RELATIONSHIP CENTER
// -------------------------------------------------------------

export enum ConversationStatus {
  OPEN = 'OPEN',
  PENDING_CLIENT = 'PENDING_CLIENT',
  PENDING_STUDIO = 'PENDING_STUDIO',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum ConversationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum MessageSenderType {
  STUDIO_USER = 'STUDIO_USER',
  CLIENT = 'CLIENT',
  SYSTEM = 'SYSTEM',
  COPILOT = 'COPILOT',
}

export enum MessageDeliveryStatus {
  DRAFT = 'DRAFT',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
}

export enum AttachmentStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  SCANNING = 'SCANNING',
  READY = 'READY',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

export enum CommunicationAuditAction {
  CONVERSATION_CREATED = 'CONVERSATION_CREATED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  MESSAGE_EDITED = 'MESSAGE_EDITED',
  MESSAGE_DELETED = 'MESSAGE_DELETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRIORITY_CHANGED = 'PRIORITY_CHANGED',
  ASSIGNED = 'ASSIGNED',
  PARTICIPANT_ADDED = 'PARTICIPANT_ADDED',
  PARTICIPANT_REMOVED = 'PARTICIPANT_REMOVED',
  ATTACHMENT_UPLOADED = 'ATTACHMENT_UPLOADED',
  ATTACHMENT_DELETED = 'ATTACHMENT_DELETED',
  SAVED_REPLY_USED = 'SAVED_REPLY_USED',
  TEMPLATE_APPLIED = 'TEMPLATE_APPLIED',
  RESOLVED = 'RESOLVED',
}

export interface IClientMessageAttachment {
  id: string;
  message_id: string;
  studio_id: string;
  storage_key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  status: AttachmentStatus | string;
  is_image: boolean;
  width?: number | null;
  height?: number | null;
  thumbnail_url?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientMessageRead {
  id: string;
  message_id: string;
  studio_id: string;
  read_by_user_id?: string | null;
  read_by_client_id?: string | null;
  read_at: Date | string;
  ip_address?: string | null;
  user_agent?: string | null;
}

export interface IClientMessage {
  id: string;
  conversation_id: string;
  studio_id: string;
  sender_type: MessageSenderType | string;
  sender_user_id?: string | null;
  sender_client_id?: string | null;
  sender_name: string;
  sender_email?: string | null;
  body: string;
  body_html?: string | null;
  is_internal_note: boolean;
  is_starred: boolean;
  delivery_status: MessageDeliveryStatus | string;
  sent_via_channel: string;
  email_message_id?: string | null;
  parent_message_id?: string | null;
  edited_at?: Date | string | null;
  deleted_at?: Date | string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
  attachments?: IClientMessageAttachment[];
  reads?: IClientMessageRead[];
  replies?: IClientMessage[];
}

export interface IClientConversationParticipant {
  id: string;
  conversation_id: string;
  studio_id: string;
  user_id?: string | null;
  client_id?: string | null;
  role: string;
  is_muted: boolean;
  last_read_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
}

export interface IClientConversation {
  id: string;
  studio_id: string;
  client_id: string;
  project_id?: string | null;
  gallery_id?: string | null;
  order_id?: string | null;
  subject: string;
  status: ConversationStatus | string;
  priority: ConversationPriority | string;
  category: string;
  assigned_to_user_id?: string | null;
  last_message_at?: Date | string | null;
  last_message_preview?: string | null;
  unread_client_count: number;
  unread_studio_count: number;
  resolved_at?: Date | string | null;
  resolved_by_user_id?: string | null;
  is_starred: boolean;
  tags: string[];
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    avatar_url?: string | null;
  };
  project?: {
    id: string;
    name: string;
    status: string;
  } | null;
  gallery?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  order?: {
    id: string;
    order_number: string;
    status: string;
    total_amount: number;
  } | null;
  assigned_to?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string | null;
  } | null;
  messages?: IClientMessage[];
  participants?: IClientConversationParticipant[];
  message_count?: number;
}

export interface IClientSavedReply {
  id: string;
  studio_id: string;
  shortcut: string;
  title: string;
  content: string;
  category: string;
  created_by_user_id?: string | null;
  is_shared: boolean;
  usage_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientMessageTemplate {
  id: string;
  studio_id: string;
  name: string;
  subject_template?: string | null;
  body_template: string;
  category: string;
  variables: string[];
  is_default: boolean;
  usage_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientCommunicationAssignment {
  id: string;
  conversation_id: string;
  studio_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id?: string | null;
  notes?: string | null;
  created_at: Date | string;
}

export interface IClientCommunicationAuditLog {
  id: string;
  conversation_id: string;
  studio_id: string;
  actor_type: MessageSenderType | string;
  actor_user_id?: string | null;
  actor_client_id?: string | null;
  actor_name: string;
  action: CommunicationAuditAction | string;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: Date | string;
}

// DTOs
export interface ICreateConversationDTO {
  client_id: string;
  subject: string;
  category?: string;
  priority?: ConversationPriority | string;
  project_id?: string;
  gallery_id?: string;
  order_id?: string;
  initial_message?: {
    body: string;
    body_html?: string;
    is_internal_note?: boolean;
    attachments?: Array<{
      storage_key: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      is_image?: boolean;
      width?: number;
      height?: number;
    }>;
  };
  assigned_to_user_id?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface IUpdateConversationDTO {
  subject?: string;
  status?: ConversationStatus | string;
  priority?: ConversationPriority | string;
  category?: string;
  assigned_to_user_id?: string | null;
  is_starred?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ISendMessageDTO {
  body: string;
  body_html?: string;
  is_internal_note?: boolean;
  sent_via_channel?: string;
  parent_message_id?: string;
  attachments?: Array<{
    storage_key: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    is_image?: boolean;
    width?: number;
    height?: number;
  }>;
  metadata?: Record<string, any>;
}

export interface IUpdateMessageDTO {
  body?: string;
  body_html?: string;
  is_starred?: boolean;
}

export interface ICreateSavedReplyDTO {
  shortcut: string;
  title: string;
  content: string;
  category?: string;
  is_shared?: boolean;
}

export interface IUpdateSavedReplyDTO {
  shortcut?: string;
  title?: string;
  content?: string;
  category?: string;
  is_shared?: boolean;
}

export interface ICreateMessageTemplateDTO {
  name: string;
  subject_template?: string;
  body_template: string;
  category?: string;
  variables?: string[];
  is_default?: boolean;
}

export interface IUpdateMessageTemplateDTO {
  name?: string;
  subject_template?: string;
  body_template?: string;
  category?: string;
  variables?: string[];
  is_default?: boolean;
}

export interface IAssignConversationDTO {
  assigned_to_user_id: string;
  notes?: string;
}

export interface IConversationFilterDTO {
  client_id?: string;
  project_id?: string;
  gallery_id?: string;
  order_id?: string;
  status?: ConversationStatus | string;
  priority?: ConversationPriority | string;
  category?: string;
  assigned_to_user_id?: string;
  is_starred?: boolean;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'last_message_at' | 'priority' | 'status';
  sort_order?: 'asc' | 'desc';
}

export interface ICommunicationAnalyticsDTO {
  total_conversations: number;
  open_conversations: number;
  pending_client_conversations: number;
  pending_studio_conversations: number;
  resolved_conversations: number;
  total_messages: number;
  total_client_messages: number;
  total_studio_messages: number;
  total_internal_notes: number;
  avg_first_response_time_minutes: number;
  avg_resolution_time_minutes: number;
  conversations_by_category: Record<string, number>;
  conversations_by_priority: Record<string, number>;
  active_clients_count: number;
  unanswered_conversations_count: number;
}

export interface IClientPortalSendMessageDTO {
  body: string;
  conversation_id?: string;
  subject?: string;
  category?: string;
  project_id?: string;
  gallery_id?: string;
  order_id?: string;
  attachments?: Array<{
    storage_key: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    is_image?: boolean;
  }>;
}

export type ClientConversationDTO = IClientConversation;
export type ClientMessageDTO = IClientMessage;
export type ClientMessageAttachmentDTO = IClientMessageAttachment;
export type ClientSavedReplyDTO = IClientSavedReply;
export type ClientMessageTemplateDTO = IClientMessageTemplate;
export type CommunicationAnalyticsDTO = ICommunicationAnalyticsDTO;

// ==========================================
// PHASE 29: STUDIO CRM & CLIENT RELATIONSHIP INTELLIGENCE 2.0
// ==========================================

export enum ClientRelationshipStatus {
  NEW = 'NEW',
  ACTIVE = 'ACTIVE',
  PROSPECTIVE = 'PROSPECTIVE',
  PROJECT_IN_PROGRESS = 'PROJECT_IN_PROGRESS',
  AWAITING_CLIENT = 'AWAITING_CLIENT',
  COMPLETED = 'COMPLETED',
  RETURNING = 'RETURNING',
  PAST = 'PAST',
  DORMANT = 'DORMANT',
  VIP = 'VIP',
  ARCHIVED = 'ARCHIVED',
  MERGED = 'MERGED',
}

export enum ClientLifecycleStage {
  LEAD = 'LEAD',
  PROSPECT = 'PROSPECT',
  BOOKED_CLIENT = 'BOOKED_CLIENT',
  ACTIVE_PROJECT = 'ACTIVE_PROJECT',
  DELIVERED_CLIENT = 'DELIVERED_CLIENT',
  PAST_CLIENT = 'PAST_CLIENT',
  NEW_CLIENT = 'NEW_CLIENT',
  ACTIVE_CLIENT = 'ACTIVE_CLIENT',
  PROJECT_COMPLETED = 'PROJECT_COMPLETED',
  RETURNING_CLIENT = 'RETURNING_CLIENT',
  DORMANT_CLIENT = 'DORMANT_CLIENT',
  ARCHIVED = 'ARCHIVED',
  INACTIVE = 'INACTIVE',
}

export enum ClientCustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  SELECT = 'SELECT',
  MULTI_SELECT = 'MULTI_SELECT',
  URL = 'URL',
}

export enum ClientImportantDateType {
  ANNIVERSARY = 'ANNIVERSARY',
  BIRTHDAY = 'BIRTHDAY',
  CHILD_BIRTHDAY = 'CHILD_BIRTHDAY',
  SESSION_ANNIVERSARY = 'SESSION_ANNIVERSARY',
  CONTRACT_RENEWAL = 'CONTRACT_RENEWAL',
  EVENT_DATE = 'EVENT_DATE',
  COMPANY_MILESTONE = 'COMPANY_MILESTONE',
  CUSTOM = 'CUSTOM',
  OTHER = 'OTHER',
}

export type TimelineCategory =
  | 'ALL'
  | 'PROJECTS'
  | 'COMMUNICATION'
  | 'GALLERY'
  | 'PROOFING'
  | 'ORDERS'
  | 'PAYMENTS'
  | 'BOOKING'
  | 'PRODUCTION'
  | 'FOLLOW_UP'
  | 'LEAD'
  | 'CUSTOM';

export interface IClientCustomFieldDefinitionDTO {
  id: string;
  studio_id: string;
  name: string;
  key: string;
  field_type: ClientCustomFieldType | string;
  options?: string[] | null;
  required: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientCustomFieldValueDTO {
  id: string;
  studio_id: string;
  client_id: string;
  field_id: string;
  value: string;
  field_definition?: IClientCustomFieldDefinitionDTO;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientImportantDateDTO {
  id: string;
  studio_id: string;
  client_id: string;
  title: string;
  date_type: ClientImportantDateType | string;
  date_value: Date | string;
  is_recurring: boolean;
  notes?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientNoteDTO {
  id: string;
  studio_id: string;
  client_id: string;
  author_id?: string | null;
  author_name?: string | null;
  content: string;
  is_pinned: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IClientMergeAuditLogDTO {
  id: string;
  studio_id: string;
  source_client_id: string;
  target_client_id: string;
  performed_by_user_id?: string | null;
  summary: string;
  affected_counts: Record<string, number>;
  created_at: Date | string;
}

export interface IDuplicateCandidateMatch {
  client_id: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  relationship_status: ClientRelationshipStatus | string;
  match_reasons: string[];
  confidence_score: number; // 0.0 to 1.0
  is_exact_email_match: boolean;
  is_exact_phone_match: boolean;
  is_name_similarity_match: boolean;
  projects_count: number;
  galleries_count: number;
  orders_count: number;
}

export interface IDuplicateDetectionResult {
  client_id?: string;
  potential_duplicates: IDuplicateCandidateMatch[];
  total_candidates: number;
}

export interface IClientMergePreviewDTO {
  source_client: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    relationship_status: string;
  };
  target_client: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    relationship_status: string;
  };
  affected_records: {
    projects: number;
    galleries: number;
    proofing_sessions: number;
    fulfillment_orders: number;
    conversations: number;
    client_activities: number;
    custom_field_values: number;
    important_dates: number;
    notes: number;
    follow_ups: number;
    proposals: number;
    contracts: number;
    booking_requests: number;
    calendar_events: number;
  };
  can_merge: boolean;
  validation_errors?: string[];
}

export interface IClientMergeExecuteDTO {
  source_client_id: string;
  target_client_id: string;
  confirmed: boolean;
  notes?: string;
}

export interface IClientTimelineItemDTO {
  id: string;
  category: TimelineCategory;
  event_type: string;
  title: string;
  description: string;
  timestamp: Date | string;
  actor_name?: string;
  source_entity_id?: string;
  source_entity_type?: string;
  metadata?: Record<string, any> | null;
}

export interface IClientTimelineFilterDTO {
  category?: TimelineCategory;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface IFollowUpCenterItemDTO {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  title: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | string;
  due_date: Date | string;
  is_overdue: boolean;
  is_due_today: boolean;
  is_upcoming: boolean;
  waiting_for: 'CLIENT' | 'STUDIO' | 'NONE';
  linked_project_id?: string | null;
  linked_project_name?: string | null;
  linked_gallery_id?: string | null;
  linked_conversation_id?: string | null;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IFollowUpCenterSummaryDTO {
  due_today_count: number;
  overdue_count: number;
  upcoming_count: number;
  waiting_for_client_count: number;
  waiting_for_studio_count: number;
  unanswered_conversations_count: number;
  items: IFollowUpCenterItemDTO[];
}

export interface IPendingActionItemDTO {
  id: string;
  action_type:
    | 'PROPOSAL_AWAITING_RESPONSE'
    | 'CONTRACT_AWAITING_SIGNATURE'
    | 'BOOKING_AWAITING_CONFIRMATION'
    | 'PROOFING_AWAITING_SELECTION'
    | 'INVOICE_AWAITING_PAYMENT'
    | 'QUESTIONNAIRE_INCOMPLETE'
    | 'GALLERY_NOT_OPENED'
    | 'ORDER_AWAITING_CONFIRMATION'
    | 'UNANSWERED_MESSAGE'
    | 'FOLLOW_UP_DUE'
    | 'PROOFING_REVIEW_REQUIRED'
    | 'ORDER_PROCESSING_REQUIRED';
  party: 'CLIENT' | 'STUDIO';
  title: string;
  description: string;
  due_date?: Date | string | null;
  is_urgent: boolean;
  entity_id: string;
  entity_type: string;
}

export interface IClientFinancialIntelligenceDTO {
  total_paid: number;
  total_orders: number;
  completed_projects: number;
  average_order_value: number;
  outstanding_balance: number;
  refunded_amount: number;
  cancelled_amount: number;
  currency: string;
}

export interface IClientHealthIndicatorsDTO {
  communication_status: {
    unread_messages: number;
    last_message_at?: Date | string | null;
    waiting_party: 'CLIENT' | 'STUDIO' | 'NONE';
  };
  project_status: {
    active_projects: number;
    completed_projects: number;
    has_active_project: boolean;
  };
  financial_status: {
    outstanding_balance: number;
    is_settled: boolean;
  };
  workflow_status: {
    pending_client_actions: number;
    pending_studio_actions: number;
  };
  engagement_status: {
    last_gallery_interaction?: Date | string | null;
    total_views: number;
    total_favorites: number;
    total_downloads: number;
  };
  followup_status: {
    has_due_today: boolean;
    has_overdue: boolean;
    next_follow_up_at?: Date | string | null;
  };
  is_returning: boolean;
  is_dormant: boolean;
  dormant_reason?: string;
}

export interface IClient360ComprehensiveDTO {
  client: {
    id: string;
    studio_id: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    phone?: string | null;
    company?: string | null;
    relationship_status: ClientRelationshipStatus | string;
    lifecycle_stage: ClientLifecycleStage | string;
    preferred_channel: string;
    preferred_language: string;
    timezone: string;
    source?: string | null;
    referral_source?: string | null;
    referred_by_client?: { id: string; name: string; email: string } | null;
    assigned_user?: { id: string; name: string; email: string } | null;
    last_interaction_at?: Date | string | null;
    next_follow_up_at?: Date | string | null;
    is_dormant: boolean;
    tags: string[];
    created_at: Date | string;
    updated_at: Date | string;
  };
  financial: IClientFinancialIntelligenceDTO;
  health_indicators: IClientHealthIndicatorsDTO;
  projects: Array<{
    id: string;
    name: string;
    status: string;
    project_type: string;
    shoot_date?: Date | string | null;
    estimated_value?: number | null;
  }>;
  galleries: Array<{
    id: string;
    name: string;
    status: string;
    created_at: Date | string;
    photo_count: number;
  }>;
  proofing_sessions: Array<{
    id: string;
    title: string;
    status: string;
    target_count: number;
    selected_count: number;
  }>;
  orders: Array<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: Date | string;
  }>;
  conversations: Array<{
    id: string;
    subject?: string | null;
    status: string;
    last_message_at?: Date | string | null;
    unread_count: number;
  }>;
  pending_actions: {
    client_actions: IPendingActionItemDTO[];
    studio_actions: IPendingActionItemDTO[];
  };
  follow_ups: IFollowUpCenterItemDTO[];
  notes: IClientNoteDTO[];
  custom_fields: IClientCustomFieldValueDTO[];
  important_dates: IClientImportantDateDTO[];
}

export interface ILeadToClientConversionDTO {
  lead_id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  tags?: string[];
  notes?: string;
  assigned_user_id?: string;
  create_project?: boolean;
  project_name?: string;
  project_type?: string;
}

export interface IClientBulkActionDTO {
  client_ids: string[];
  action: 'ASSIGN' | 'ADD_TAGS' | 'REMOVE_TAGS' | 'UPDATE_STATUS' | 'CREATE_FOLLOW_UP';
  assigned_user_id?: string;
  tags?: string[];
  relationship_status?: ClientRelationshipStatus | string;
  follow_up_title?: string;
  follow_up_reason?: string;
  follow_up_due_date?: string;
}

// ==========================================
// PHASE 30: ADVANCED CLIENT EXPERIENCE & GALLERY EXPERIENCE 2.0
// ==========================================

export interface IContinueWhereLeftOffDTO {
  last_gallery_id?: string | null;
  last_gallery_name?: string | null;
  last_gallery_slug?: string | null;
  last_album_id?: string | null;
  last_album_name?: string | null;
  last_photo_id?: string | null;
  last_photo_thumbnail_url?: string | null;
  last_photo_index?: number | null;
  last_scroll_position?: number | null;
  last_viewed_at?: Date | string | null;
  view_mode?: 'GRID' | 'MASONRY' | 'EXPANDED' | string;
  active_tab?: string | null;
}

export interface IClientExperienceHomeDTO {
  client: {
    id: string;
    studio_id: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
  };
  studio: {
    id: string;
    name: string;
    slug?: string;
    logo_url?: string | null;
    brand_color?: string | null;
    custom_domain?: string | null;
  };
  continue_where_left_off?: IContinueWhereLeftOffDTO | null;
  active_galleries: Array<{
    id: string;
    title: string;
    slug?: string;
    cover_photo_url?: string | null;
    photo_count: number;
    created_at: Date | string;
    status: string;
    is_password_protected?: boolean;
  }>;
  recently_viewed_photos: Array<{
    id: string;
    gallery_id: string;
    gallery_title: string;
    thumbnail_url: string;
    original_url: string;
    viewed_at: Date | string;
  }>;
  favorites: {
    total_count: number;
    sample_photos: Array<{
      id: string;
      gallery_id: string;
      thumbnail_url: string;
      original_url: string;
      created_at: Date | string;
    }>;
  };
  selections: {
    total_count: number;
    sample_photos: Array<{
      id: string;
      gallery_id: string;
      thumbnail_url: string;
      original_url: string;
      created_at: Date | string;
    }>;
  };
  proofing_sessions_requiring_action: Array<{
    id: string;
    title: string;
    gallery_id: string;
    status: string;
    target_count: number;
    selected_count: number;
    deadline?: Date | string | null;
    is_locked: boolean;
  }>;
  recent_messages: Array<{
    id: string;
    conversation_id: string;
    sender_type: 'STUDIO' | 'CLIENT' | string;
    content: string;
    created_at: Date | string;
    is_read: boolean;
  }>;
  unread_messages_count: number;
  latest_orders: Array<{
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    currency: string;
    created_at: Date | string;
    delivery_status?: string | null;
  }>;
  available_downloads: Array<{
    id: string;
    title: string;
    gallery_id: string;
    file_count: number;
    total_size_bytes: number;
    expires_at?: Date | string | null;
    is_ready: boolean;
  }>;
  latest_deliveries: Array<{
    id: string;
    order_id?: string | null;
    status: 'PROCESSING' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | string;
    tracking_number?: string | null;
    carrier?: string | null;
    estimated_delivery?: Date | string | null;
    delivered_at?: Date | string | null;
  }>;
  upcoming_important_dates: Array<{
    id: string;
    title: string;
    date: Date | string;
    date_type: string;
    days_remaining: number;
  }>;
  recommended_photos: Array<{
    id: string;
    gallery_id: string;
    thumbnail_url: string;
    original_url: string;
    reason: string;
  }>;
  notifications_unread_count: number;
}

export interface IClientSafeTimelineItemDTO {
  id: string;
  category: 'GALLERY' | 'PROOFING' | 'ORDER' | 'DELIVERY' | 'COMMUNICATION' | 'PROJECT';
  event_type: string;
  title: string;
  description: string;
  occurred_at: Date | string;
  entity_id?: string | null;
  entity_type?: string | null;
}

export interface IClientSafeTimelineDTO {
  items: IClientSafeTimelineItemDTO[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface IClientGallerySearchDTO {
  query: string;
  gallery_id: string;
  album_id?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export interface IClientGallerySearchResultDTO {
  photos: Array<{
    id: string;
    gallery_id: string;
    album_id?: string | null;
    original_filename?: string | null;
    caption?: string | null;
    thumbnail_url: string;
    original_url: string;
    is_favorite?: boolean;
    is_selected?: boolean;
    tags?: string[];
  }>;
  albums: Array<{
    id: string;
    title: string;
    photo_count: number;
    cover_photo_url?: string | null;
  }>;
  total_photos: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface IClientLightboxPhotoDTO {
  id: string;
  gallery_id: string;
  album_id?: string | null;
  title?: string | null;
  caption?: string | null;
  original_filename?: string | null;
  thumbnail_url: string;
  high_res_url: string;
  width?: number | null;
  height?: number | null;
  aspect_ratio?: number | null;
  is_favorite: boolean;
  is_selected: boolean;
  can_download: boolean;
  can_share: boolean;
  created_at: Date | string;
  next_photo_id?: string | null;
  prev_photo_id?: string | null;
}

export interface IFindMyPhotosExperienceResultDTO {
  matched_photos: Array<{
    id: string;
    gallery_id: string;
    album_id?: string | null;
    thumbnail_url: string;
    original_url: string;
    confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW';
    is_favorite: boolean;
    is_selected: boolean;
  }>;
  total_matches: number;
  gallery_id: string;
  privacy_notice: string;
}

// -------------------------------------------------------------
// PHASE 31: STUDIO TEAM & WORKFORCE MANAGEMENT TYPES
// -------------------------------------------------------------

export type StudioMemberRoleType =
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'PHOTOGRAPHER'
  | 'VIDEOGRAPHER'
  | 'EDITOR'
  | 'ASSISTANT'
  | 'PRODUCER'
  | 'SALES'
  | 'SUPPORT'
  | 'VIEWER';

export type StudioMemberStatusType =
  | 'INVITED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'INACTIVE'
  | 'REMOVED';

export type TeamInvitationStatusType =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REVOKED'
  | 'EXPIRED';

export type MemberLeaveTypeKey =
  | 'LEAVE'
  | 'HOLIDAY'
  | 'PERSONAL'
  | 'BLOCKED';

export type TeamWorkloadStateType =
  | 'AVAILABLE'
  | 'LIGHT'
  | 'NORMAL'
  | 'HEAVY'
  | 'OVERLOADED';

export type TeamPermission =
  | 'TEAM_VIEW'
  | 'TEAM_MANAGE'
  | 'TEAM_ASSIGN'
  | 'PROJECT_VIEW'
  | 'PROJECT_MANAGE'
  | 'TASK_VIEW'
  | 'TASK_ASSIGN'
  | 'TASK_MANAGE'
  | 'CALENDAR_VIEW'
  | 'CALENDAR_MANAGE'
  | 'PRODUCTION_VIEW'
  | 'PRODUCTION_MANAGE'
  | 'EQUIPMENT_VIEW'
  | 'EQUIPMENT_MANAGE'
  | 'COMMUNICATION_VIEW'
  | 'COMMUNICATION_MANAGE'
  | 'CRM_VIEW'
  | 'CRM_MANAGE'
  | 'REPORT_VIEW';

export interface IWorkingHoursConfig {
  days: number[]; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // e.g. "09:00"
  end_time: string; // e.g. "17:00"
}

export interface IStudioTeamMemberDTO {
  id: string;
  user_id: string;
  studio_id: string;
  role: StudioMemberRoleType;
  title?: string | null;
  department?: string | null;
  bio?: string | null;
  phone?: string | null;
  skills: string[];
  status: StudioMemberStatusType;
  timezone: string;
  working_hours?: IWorkingHoursConfig | null;
  notes?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  deactivated_at?: Date | string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string | null;
  };
  workload_state?: TeamWorkloadStateType;
  open_tasks_count?: number;
  active_projects_count?: number;
  upcoming_shoots_count?: number;
}

export interface IUpdateTeamMemberProfileDTO {
  title?: string | null;
  department?: string | null;
  bio?: string | null;
  phone?: string | null;
  skills?: string[];
  timezone?: string;
  working_hours?: IWorkingHoursConfig | null;
  notes?: string | null;
}

export interface IUpdateTeamMemberRoleDTO {
  role: StudioMemberRoleType;
  department?: string | null;
}

export interface IStudioTeamInvitationDTO {
  id: string;
  studio_id: string;
  email: string;
  role: StudioMemberRoleType;
  department?: string | null;
  message?: string | null;
  status: TeamInvitationStatusType;
  invited_by_id?: string | null;
  expires_at: Date | string;
  accepted_at?: Date | string | null;
  created_at: Date | string;
  invited_by?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ICreateTeamInvitationDTO {
  email: string;
  role: StudioMemberRoleType;
  department?: string | null;
  message?: string | null;
  expires_in_days?: number;
}

export interface IAcceptTeamInvitationDTO {
  token: string;
  name?: string;
  password?: string;
}

export interface IStudioDepartmentDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  member_count?: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ICreateDepartmentDTO {
  name: string;
  description?: string | null;
  color?: string | null;
}

export interface IUpdateDepartmentDTO {
  name?: string;
  description?: string | null;
  color?: string | null;
}

export interface IMemberLeaveDTO {
  id: string;
  studio_id: string;
  member_id: string;
  leave_type: MemberLeaveTypeKey;
  start_at: Date | string;
  end_at: Date | string;
  reason?: string | null;
  is_approved: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  member?: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
}

export interface ICreateMemberLeaveDTO {
  leave_type?: MemberLeaveTypeKey;
  start_at: Date | string;
  end_at: Date | string;
  reason?: string | null;
}

export interface IScheduleConflictCheckDTO {
  member_id: string;
  start_at: Date | string;
  end_at: Date | string;
  exclude_event_id?: string;
  exclude_shoot_id?: string;
}

export interface IScheduleConflictResultDTO {
  has_conflict: boolean;
  is_outside_working_hours: boolean;
  is_on_leave: boolean;
  conflicting_shoots: Array<{
    id: string;
    project_id: string;
    project_name?: string;
    start_at: Date | string;
    end_at: Date | string;
    role?: string | null;
  }>;
  conflicting_events: Array<{
    id: string;
    title: string;
    start_at: Date | string;
    end_at: Date | string;
  }>;
  leave_records: Array<{
    id: string;
    leave_type: MemberLeaveTypeKey;
    start_at: Date | string;
    end_at: Date | string;
    reason?: string | null;
  }>;
  warning_message?: string | null;
}

export interface ITeamWorkloadSummaryDTO {
  member_id: string;
  user_name: string;
  user_avatar?: string | null;
  role: StudioMemberRoleType;
  department?: string | null;
  status: StudioMemberStatusType;
  workload_state: TeamWorkloadStateType;
  open_tasks_count: number;
  overdue_tasks_count: number;
  active_projects_count: number;
  upcoming_shoots_count: number;
  assigned_equipment_count: number;
}

export interface ITeamWorkloadDashboardDTO {
  studio_id: string;
  total_members: number;
  active_members: number;
  distribution: {
    available: number;
    light: number;
    normal: number;
    heavy: number;
    overloaded: number;
  };
  members: ITeamWorkloadSummaryDTO[];
}

export interface ITeamDirectoryFilterDTO {
  query?: string;
  role?: StudioMemberRoleType;
  department?: string;
  status?: StudioMemberStatusType;
  skill?: string;
  workload_state?: TeamWorkloadStateType;
  cursor?: string;
  limit?: number;
}

export interface IBulkTaskAssignDTO {
  task_ids: string[];
  assigned_to_member_id: string | null;
}

export interface IMemberReassignmentPlanDTO {
  member_id: string;
  active_tasks: Array<{
    id: string;
    title: string;
    project_id?: string | null;
    project_name?: string | null;
    priority: string;
    due_at?: Date | string | null;
  }>;
  active_projects: Array<{
    id: string;
    name: string;
    status: string;
    shoot_date?: Date | string | null;
  }>;
  upcoming_shoots: Array<{
    id: string;
    project_id: string;
    project_name?: string;
    role: string;
    start_at: Date | string;
    end_at: Date | string;
  }>;
  assigned_equipment: Array<{
    id: string;
    project_id: string;
    item_name: string;
    status: string;
  }>;
  crm_follow_ups: Array<{
    id: string;
    client_id: string;
    title: string;
    due_at?: Date | string | null;
  }>;
}

export interface IMemberReassignmentExecuteDTO {
  source_member_id: string;
  target_member_id: string;
  reassign_tasks?: boolean;
  reassign_projects?: boolean;
  reassign_shoots?: boolean;
  reassign_equipment?: boolean;
  reassign_follow_ups?: boolean;
  deactivate_source?: boolean;
}

export interface ITeamCalendarEventDTO {
  id: string;
  event_type: 'SHOOT' | 'TASK' | 'LEAVE' | 'CALENDAR_EVENT';
  title: string;
  start_at: Date | string;
  end_at: Date | string;
  member_id?: string | null;
  member_name?: string | null;
  department?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  location?: string | null;
  status?: string | null;
}

export interface ITeamActivityDTO {
  id: string;
  studio_id: string;
  member_id?: string | null;
  user_id?: string | null;
  activity_type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date | string;
}

export interface ITeamMetricsDTO {
  studio_id: string;
  total_members: number;
  active_members: number;
  departments_count: number;
  total_open_tasks: number;
  total_completed_tasks_30d: number;
  total_overdue_tasks: number;
  upcoming_shoots_7d: number;
  staff_on_leave_today: number;
}

// -------------------------------------------------------------
// PHASE 32: STUDIO TEAM COLLABORATION & INTERNAL OPERATIONS 2.0
// -------------------------------------------------------------

export enum CollaborationThreadType {
  PROJECT = 'PROJECT',
  TASK = 'TASK',
  CLIENT = 'CLIENT',
  PRODUCTION = 'PRODUCTION',
  EQUIPMENT = 'EQUIPMENT',
  GENERAL = 'GENERAL',
  HANDOFF = 'HANDOFF',
  BLOCKER = 'BLOCKER',
  HELP_REQUEST = 'HELP_REQUEST',
}

export enum CollaborationThreadStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ARCHIVED = 'ARCHIVED',
  CLOSED = 'CLOSED',
}

export enum CollaborationMessageType {
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM',
  HANDOFF = 'HANDOFF',
  BLOCKER = 'BLOCKER',
  HELP_REQUEST = 'HELP_REQUEST',
  STATUS_UPDATE = 'STATUS_UPDATE',
  ACKNOWLEDGEMENT = 'ACKNOWLEDGEMENT',
}

export enum WorkHandoffStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum WorkBlockerSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum WorkBlockerStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum HelpRequestCategory {
  TECHNICAL = 'TECHNICAL',
  PRODUCTION = 'PRODUCTION',
  CLIENT = 'CLIENT',
  EQUIPMENT = 'EQUIPMENT',
  SCHEDULING = 'SCHEDULING',
  EDITING = 'EDITING',
  ADMIN = 'ADMIN',
  OTHER = 'OTHER',
}

export enum HelpRequestPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum HelpRequestStatus {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CANCELLED = 'CANCELLED',
}

export interface ITeamCollaborationThreadDTO {
  id: string;
  studio_id: string;
  project_id?: string | null;
  task_id?: string | null;
  client_id?: string | null;
  gallery_id?: string | null;
  production_project_id?: string | null;
  title?: string | null;
  thread_type: CollaborationThreadType;
  created_by_member_id: string;
  created_by_name?: string | null;
  status: CollaborationThreadStatus;
  created_at: Date | string;
  updated_at: Date | string;
  last_activity_at: Date | string;
  archived_at?: Date | string | null;
  message_count?: number;
  unread_count?: number;
  last_message?: ITeamCollaborationMessageDTO | null;
  participants?: Array<{ member_id: string; name: string; avatar_url?: string | null }>;
}

export interface ITeamCollaborationMessageDTO {
  id: string;
  thread_id: string;
  studio_id: string;
  author_member_id: string;
  author_name?: string | null;
  author_role?: string | null;
  body: string;
  message_type: CollaborationMessageType;
  reply_to_id?: string | null;
  reply_to?: { id: string; author_name: string; body: string } | null;
  created_at: Date | string;
  edited_at?: Date | string | null;
  deleted_at?: Date | string | null;
  mentions?: ITeamMentionDTO[];
  attachments?: ITeamCollaborationAttachmentDTO[];
  acknowledgements?: Array<{ member_id: string; member_name: string; created_at: Date | string }>;
}

export interface ITeamMentionDTO {
  id: string;
  studio_id: string;
  message_id: string;
  mentioned_member_id: string;
  mentioned_member_name?: string | null;
  created_at: Date | string;
  read_at?: Date | string | null;
  thread_id?: string;
  thread_title?: string | null;
  message_body?: string;
}

export interface ITeamHandoffDTO {
  id: string;
  studio_id: string;
  from_member_id: string;
  from_member_name?: string | null;
  to_member_id: string;
  to_member_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  task_id?: string | null;
  task_name?: string | null;
  production_id?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  reason: string;
  summary: string;
  status: WorkHandoffStatus;
  created_at: Date | string;
  accepted_at?: Date | string | null;
  completed_at?: Date | string | null;
}

export interface ITeamBlockerDTO {
  id: string;
  studio_id: string;
  reported_by_member_id: string;
  reporter_name?: string | null;
  assigned_to_member_id?: string | null;
  assignee_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  task_id?: string | null;
  task_name?: string | null;
  production_id?: string | null;
  title: string;
  description: string;
  severity: WorkBlockerSeverity;
  status: WorkBlockerStatus;
  created_at: Date | string;
  resolved_at?: Date | string | null;
  resolved_by_member_id?: string | null;
  resolved_by_name?: string | null;
}

export interface ITeamHelpRequestDTO {
  id: string;
  studio_id: string;
  requester_member_id: string;
  requester_name?: string | null;
  assigned_member_id?: string | null;
  assignee_name?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  task_id?: string | null;
  task_name?: string | null;
  category: HelpRequestCategory;
  title: string;
  description: string;
  priority: HelpRequestPriority;
  status: HelpRequestStatus;
  created_at: Date | string;
  resolved_at?: Date | string | null;
}

export interface ITeamCollaborationAttachmentDTO {
  id: string;
  studio_id: string;
  message_id?: string | null;
  storage_key: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  sha256?: string | null;
  download_url?: string;
  created_by_member_id: string;
  created_by_name?: string | null;
  created_at: Date | string;
  expires_at?: Date | string | null;
}

export interface ITeamAttentionItemDTO {
  id: string;
  item_type: 'MENTION' | 'HANDOFF' | 'BLOCKER' | 'HELP_REQUEST' | 'OVERDUE_TASK' | 'UNREAD_THREAD' | 'ACKNOWLEDGEMENT';
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
  title: string;
  summary: string;
  reference_id: string;
  thread_id?: string | null;
  project_id?: string | null;
  created_at: Date | string;
  actor_name?: string | null;
  action_url: string;
}

export interface ITeamAttentionDTO {
  studio_id: string;
  member_id: string;
  total_attention_count: number;
  critical_count: number;
  high_count: number;
  normal_count: number;
  items: ITeamAttentionItemDTO[];
  mentions_count: number;
  pending_handoffs_count: number;
  open_blockers_count: number;
  open_help_requests_count: number;
  unread_threads_count: number;
  pending_handoffs?: any[];
  open_blockers?: any[];
  unread_mentions?: any[];
  urgent_help_requests?: any[];
}

export interface ICreateThreadDTO {
  project_id?: string;
  task_id?: string;
  client_id?: string;
  gallery_id?: string;
  production_project_id?: string;
  title?: string;
  thread_type?: CollaborationThreadType;
  initial_message?: string;
  attachments?: Array<{
    storage_key: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    sha256?: string;
  }>;
}

export interface ICreateMessageDTO {
  body: string;
  message_type?: CollaborationMessageType;
  reply_to_id?: string;
  mentions?: string[]; // array of member_ids
  attachments?: Array<{
    storage_key: string;
    original_filename: string;
    mime_type: string;
    size_bytes: number;
    sha256?: string;
  }>;
}

export interface ICreateHandoffDTO {
  to_member_id: string;
  project_id?: string;
  task_id?: string;
  production_id?: string;
  client_id?: string;
  reason: string;
  summary: string;
}

export interface ICreateBlockerDTO {
  title: string;
  description: string;
  severity?: WorkBlockerSeverity;
  assigned_to_member_id?: string;
  project_id?: string;
  task_id?: string;
  production_id?: string;
}

export interface ICreateHelpRequestDTO {
  title: string;
  description: string;
  category?: HelpRequestCategory;
  priority?: HelpRequestPriority;
  assigned_member_id?: string;
  project_id?: string;
  task_id?: string;
}

export interface ICollaborationSearchFilterDTO {
  query?: string;
  member_id?: string;
  project_id?: string;
  task_id?: string;
  client_id?: string;
  status?: string;
  type?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface ICollaborationSearchResultDTO {
  threads: ITeamCollaborationThreadDTO[];
  messages: ITeamCollaborationMessageDTO[];
  blockers: ITeamBlockerDTO[];
  handoffs: ITeamHandoffDTO[];
  help_requests: ITeamHelpRequestDTO[];
  total_results: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// -------------------------------------------------------------
// PHASE 33: STUDIO FINANCIAL OPERATIONS & PROFITABILITY 2.0
// -------------------------------------------------------------

export type FinancialAccountType = 'CASH' | 'BANK' | 'CARD' | 'DIGITAL_WALLET' | 'OTHER';
export type FinancialExpenseStatus = 'DRAFT' | 'RECORDED' | 'VOIDED';
export type FinancialPaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type FinancialApprovalStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type FinancialVendorStatus = 'ACTIVE' | 'INACTIVE';
export type FinancialReceivableStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type FinancialPayableStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type FinancialBudgetPeriodType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'CUSTOM';
export type FinancialBudgetStatus = 'ACTIVE' | 'ARCHIVED';
export type FinancialReconciliationStatus = 'UNMATCHED' | 'MATCHED' | 'PARTIALLY_MATCHED' | 'RECONCILED';
export type FinancialAuditEntityType = 'ACCOUNT' | 'EXPENSE' | 'EXPENSE_PAYMENT' | 'VENDOR' | 'RECEIVABLE' | 'PAYABLE' | 'BUDGET' | 'RECONCILIATION' | 'APPROVAL';
export type FinancialCostClassification = 'DIRECT' | 'ALLOCATED';

export interface IStudioFinancialAccountDTO {
  id: string;
  studio_id: string;
  name: string;
  account_type: FinancialAccountType;
  currency: string;
  opening_balance_cents: number;
  current_balance_cents: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioExpenseCategoryDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioVendorDTO {
  id: string;
  studio_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  category?: string | null;
  tax_id?: string | null;
  payment_terms_days?: number | null;
  notes?: string | null;
  status: FinancialVendorStatus;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at?: Date | string | null;
}

export interface IStudioExpenseDTO {
  id: string;
  studio_id: string;
  account_id?: string | null;
  project_id?: string | null;
  client_id?: string | null;
  vendor_id?: string | null;
  category_id: string;
  description: string;
  amount_cents: number;
  tax_cents: number;
  currency: string;
  cost_type: FinancialCostClassification;
  expense_date: Date | string;
  due_date?: Date | string | null;
  status: FinancialExpenseStatus;
  payment_status: FinancialPaymentStatus;
  approval_status: FinancialApprovalStatus;
  approved_by_member_id?: string | null;
  approved_at?: Date | string | null;
  reference?: string | null;
  notes?: string | null;
  created_by_member_id: string;
  created_at: Date | string;
  updated_at: Date | string;
  voided_at?: Date | string | null;
  void_reason?: string | null;
}

export interface IStudioExpensePaymentDTO {
  id: string;
  studio_id: string;
  expense_id: string;
  account_id: string;
  amount_cents: number;
  payment_date: Date | string;
  reference?: string | null;
  created_by_member_id: string;
  idempotency_key: string;
  created_at: Date | string;
}

export interface IStudioReceivableDTO {
  id: string;
  studio_id: string;
  client_id?: string | null;
  project_id?: string | null;
  booking_id?: string | null;
  order_id?: string | null;
  contract_id?: string | null;
  description: string;
  total_amount_cents: number;
  received_amount_cents: number;
  due_date?: Date | string | null;
  currency: string;
  status: FinancialReceivableStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioPayableDTO {
  id: string;
  studio_id: string;
  vendor_id?: string | null;
  project_id?: string | null;
  expense_id?: string | null;
  description: string;
  total_amount_cents: number;
  paid_amount_cents: number;
  due_date?: Date | string | null;
  currency: string;
  status: FinancialPayableStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioBudgetDTO {
  id: string;
  studio_id: string;
  name: string;
  period_type: FinancialBudgetPeriodType;
  start_date: Date | string;
  end_date: Date | string;
  amount_cents: number;
  category_id?: string | null;
  project_id?: string | null;
  status: FinancialBudgetStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioFinancialReconciliationDTO {
  id: string;
  studio_id: string;
  transaction_id?: string | null;
  receivable_id?: string | null;
  payable_id?: string | null;
  expense_id?: string | null;
  matched_amount_cents: number;
  status: FinancialReconciliationStatus;
  notes?: string | null;
  reconciled_by_member_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IProjectProfitabilityDTO {
  project_id: string;
  project_name?: string;
  currency: string;
  revenue_cents: number;
  direct_costs_cents: number;
  allocated_costs_cents: number;
  total_costs_cents: number;
  gross_profit_cents: number;
  profit_margin_pct: number;
  labor_costs_cents: number;
  equipment_depreciation_cents: number;
  vendor_costs_cents: number;
  other_expenses_cents: number;
}

export interface IClientProfitabilityDTO {
  client_id: string;
  client_name?: string;
  currency: string;
  total_revenue_cents: number;
  total_costs_cents: number;
  gross_profit_cents: number;
  profit_margin_pct: number;
  total_projects: number;
  receivables_outstanding_cents: number;
}

export interface IServiceLineProfitabilityDTO {
  service_category: string;
  revenue_cents: number;
  costs_cents: number;
  gross_profit_cents: number;
  profit_margin_pct: number;
  job_count: number;
}

export interface IStudioCashFlowSummaryDTO {
  currency: string;
  total_cash_in_cents: number;
  total_cash_out_cents: number;
  net_cash_flow_cents: number;
  cash_balance_cents: number;
  period_start: Date | string;
  period_end: Date | string;
  receivables_due_cents: number;
  payables_due_cents: number;
  projected_net_cents: number;
}

export interface IStudioTaxSummaryDTO {
  currency: string;
  collected_tax_cents: number;
  paid_tax_cents: number;
  net_tax_liability_cents: number;
  period_start: Date | string;
  period_end: Date | string;
  breakdown_by_rate?: Record<string, number>;
}

export interface ICreateFinancialAccountDTO {
  name: string;
  account_type?: FinancialAccountType;
  currency?: string;
  opening_balance_cents?: number;
}

export interface ICreateExpenseCategoryDTO {
  name: string;
  description?: string;
  parent_id?: string;
}

export interface ICreateVendorDTO {
  name: string;
  email?: string;
  phone?: string;
  category?: string;
  tax_id?: string;
  payment_terms_days?: number;
  notes?: string;
}

export interface ICreateExpenseDTO {
  account_id?: string;
  project_id?: string;
  client_id?: string;
  vendor_id?: string;
  category_id: string;
  description: string;
  amount_cents: number;
  tax_cents?: number;
  currency?: string;
  cost_type?: FinancialCostClassification;
  expense_date: Date | string;
  due_date?: Date | string;
  reference?: string;
  notes?: string;
}

export interface IRecordExpensePaymentDTO {
  expense_id: string;
  account_id: string;
  amount_cents: number;
  payment_date: Date | string;
  reference?: string;
  idempotency_key: string;
}

export interface ICreateBudgetDTO {
  name: string;
  period_type?: FinancialBudgetPeriodType;
  start_date: Date | string;
  end_date: Date | string;
  amount_cents: number;
  category_id?: string;
  project_id?: string;
}

export interface IBookingProfitabilityDTO {
  booking_id: string;
  booking_title?: string;
  client_id?: string;
  currency: string;
  revenue_cents: number;
  direct_costs_cents: number;
  gross_profit_cents: number;
  profit_margin_pct: number;
  session_date?: Date | string | null;
}

export interface IOrderProfitabilityDTO {
  order_id: string;
  order_number?: string;
  client_id?: string;
  currency: string;
  revenue_cents: number;
  product_cost_cents: number;
  fulfillment_cost_cents: number;
  shipping_cost_cents: number;
  other_direct_cost_cents: number;
  total_cost_cents: number;
  gross_profit_cents: number;
  profit_margin_pct: number;
}

export interface IFinancialAgingBucketDTO {
  current_cents: number;
  days_1_30_cents: number;
  days_31_60_cents: number;
  days_61_90_cents: number;
  days_90_plus_cents: number;
  total_cents: number;
  currency: string;
}

export interface IFinancialAgingReportDTO {
  as_of_date: Date | string;
  receivables: IFinancialAgingBucketDTO;
  payables: IFinancialAgingBucketDTO;
}

export interface IFinancialForecastDTO {
  period_start: Date | string;
  period_end: Date | string;
  currency: string;
  predicted_revenue_cents: number;
  predicted_expenses_cents: number;
  predicted_net_profit_cents: number;
  predicted_closing_cash_cents: number;
  confidence_score: number; // 0.0 to 1.0
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_DATA';
  historical_data_points: number;
}

export interface IFinancialDashboardDTO {
  currency: string;
  total_cash_cents: number;
  total_receivables_cents: number;
  overdue_receivables_cents: number;
  total_payables_cents: number;
  overdue_payables_cents: number;
  mtd_revenue_cents: number;
  mtd_expenses_cents: number;
  mtd_net_profit_cents: number;
  mtd_profit_margin_pct: number;
  active_budgets_count: number;
  pending_approval_expenses_count: number;
  recent_expenses: IStudioExpenseDTO[];
  top_receivables: IStudioReceivableDTO[];
  top_payables: IStudioPayableDTO[];
  accounts: IStudioFinancialAccountDTO[];
}

export interface ICreateReconciliationDTO {
  account_id?: string;
  transaction_id?: string;
  receivable_id?: string;
  payable_id?: string;
  expense_id?: string;
  matched_amount_cents: number;
  status?: FinancialReconciliationStatus;
  notes?: string;
}

// -------------------------------------------------------------
// PHASE 34: STUDIO FINANCIAL ACCOUNTING & GENERAL LEDGER 2.0
// -------------------------------------------------------------

export type ChartOfAccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'COGS'
  | 'OTHER_INCOME'
  | 'OTHER_EXPENSE';

export type AccountNormalBalance = 'DEBIT' | 'CREDIT';

export type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'VOID';

export type AccountingPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export type AccountingReferenceType =
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'EXPENSE'
  | 'BOOKING'
  | 'CONTRACT'
  | 'FULFILLMENT_ORDER'
  | 'INVOICE'
  | 'PAYMENT'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'REFUND'
  | 'MANUAL'
  | 'OPENING_BALANCE'
  | 'PERIOD_CLOSE'
  | 'RECONCILIATION'
  | 'TRANSFER';

export interface IStudioChartOfAccountDTO {
  id: string;
  studio_id: string;
  code: string;
  name: string;
  description?: string | null;
  account_type: ChartOfAccountType;
  normal_balance: AccountNormalBalance;
  parent_account_id?: string | null;
  is_system: boolean;
  is_active: boolean;
  currency: string;
  current_balance_minor?: number;
  created_at: Date | string;
  updated_at: Date | string;
  parent_account?: IStudioChartOfAccountDTO | null;
  child_accounts?: IStudioChartOfAccountDTO[];
}

export interface ICreateChartOfAccountDTO {
  code: string;
  name: string;
  description?: string;
  account_type: ChartOfAccountType;
  normal_balance: AccountNormalBalance;
  parent_account_id?: string;
  is_system?: boolean;
  is_active?: boolean;
  currency?: string;
}

export interface IUpdateChartOfAccountDTO {
  name?: string;
  description?: string;
  normal_balance?: AccountNormalBalance;
  parent_account_id?: string | null;
  is_active?: boolean;
}

export interface IStudioAccountingMappingDTO {
  id: string;
  studio_id: string;
  event_type: string;
  debit_account_id: string;
  credit_account_id: string;
  description?: string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  debit_account?: IStudioChartOfAccountDTO;
  credit_account?: IStudioChartOfAccountDTO;
}

export interface ICreateAccountingMappingDTO {
  event_type: string;
  debit_account_id: string;
  credit_account_id: string;
  description?: string;
  is_active?: boolean;
}

export interface IStudioJournalEntryLineDTO {
  id: string;
  studio_id: string;
  journal_entry_id: string;
  account_id: string;
  description?: string | null;
  debit_minor: number;
  credit_minor: number;
  currency: string;
  exchange_rate: number;
  base_debit_minor: number;
  base_credit_minor: number;
  reference_type?: string | null;
  reference_id?: string | null;
  line_order: number;
  created_at: Date | string;
  account?: IStudioChartOfAccountDTO;
}

export interface ICreateJournalEntryLineDTO {
  account_id?: string;
  account_code?: string;
  description?: string;
  debit_minor: number;
  credit_minor: number;
  currency?: string;
  exchange_rate?: number;
  reference_type?: string;
  reference_id?: string;
  line_order?: number;
}

export interface IStudioJournalEntryDTO {
  id: string;
  studio_id: string;
  entry_number: string;
  entry_date: Date | string;
  posting_date?: Date | string | null;
  description: string;
  reference_type?: AccountingReferenceType | null;
  reference_id?: string | null;
  source_event_type?: string | null;
  source_event_id?: string | null;
  status: JournalEntryStatus;
  currency: string;
  total_debit_minor: number;
  total_credit_minor: number;
  reversal_of_entry_id?: string | null;
  idempotency_key?: string | null;
  created_by: string;
  posted_by?: string | null;
  posted_at?: Date | string | null;
  reversed_at?: Date | string | null;
  period_id?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  lines?: IStudioJournalEntryLineDTO[];
  period?: IStudioAccountingPeriodDTO | null;
  reversal_of?: IStudioJournalEntryDTO | null;
}

export interface ICreateJournalEntryDTO {
  entry_date: Date | string;
  description: string;
  reference_type?: AccountingReferenceType;
  reference_id?: string;
  source_event_type?: string;
  source_event_id?: string;
  currency?: string;
  idempotency_key?: string;
  period_id?: string;
  lines: ICreateJournalEntryLineDTO[];
  auto_post?: boolean;
}

export interface IStudioAccountingPeriodDTO {
  id: string;
  studio_id: string;
  name: string;
  start_date: Date | string;
  end_date: Date | string;
  status: AccountingPeriodStatus;
  closed_at?: Date | string | null;
  closed_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ICreateAccountingPeriodDTO {
  name: string;
  start_date: Date | string;
  end_date: Date | string;
}

export interface ITrialBalanceEntryDTO {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: ChartOfAccountType;
  normal_balance: AccountNormalBalance;
  total_debit_minor: number;
  total_credit_minor: number;
  net_debit_minor: number;
  net_credit_minor: number;
}

export interface ITrialBalanceReportDTO {
  as_of_date: Date | string;
  currency: string;
  is_balanced: boolean;
  total_debit_minor: number;
  total_credit_minor: number;
  difference_minor: number;
  accounts: ITrialBalanceEntryDTO[];
}

export interface IGeneralLedgerEntryDTO {
  line_id: string;
  entry_id: string;
  entry_number: string;
  entry_date: Date | string;
  posting_date: Date | string;
  description: string;
  reference_type?: string | null;
  reference_id?: string | null;
  debit_minor: number;
  credit_minor: number;
  running_balance_minor: number;
}

export interface IGeneralLedgerAccountDTO {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: ChartOfAccountType;
  normal_balance: AccountNormalBalance;
  currency: string;
  opening_balance_minor: number;
  total_debits_minor: number;
  total_credits_minor: number;
  closing_balance_minor: number;
  entries: IGeneralLedgerEntryDTO[];
}

export interface IGeneralLedgerReportDTO {
  start_date: Date | string;
  end_date: Date | string;
  currency: string;
  accounts: IGeneralLedgerAccountDTO[];
}

export interface IProfitAndLossSectionDTO {
  accounts: {
    account_id: string;
    account_code: string;
    account_name: string;
    amount_minor: number;
  }[];
  total_minor: number;
}

export interface IProfitAndLossReportDTO {
  period_start: Date | string;
  period_end: Date | string;
  currency: string;
  operating_revenue: IProfitAndLossSectionDTO;
  cost_of_goods_sold: IProfitAndLossSectionDTO;
  gross_profit_minor: number;
  operating_expenses: IProfitAndLossSectionDTO;
  operating_income_minor: number;
  other_income: IProfitAndLossSectionDTO;
  other_expenses: IProfitAndLossSectionDTO;
  net_income_minor: number;
  net_margin_pct: number;
}

export interface IBalanceSheetSectionDTO {
  accounts: {
    account_id: string;
    account_code: string;
    account_name: string;
    amount_minor: number;
  }[];
  total_minor: number;
}

export interface IBalanceSheetReportDTO {
  as_of_date: Date | string;
  currency: string;
  is_balanced: boolean;
  assets: {
    current_assets: IBalanceSheetSectionDTO;
    non_current_assets: IBalanceSheetSectionDTO;
    total_assets_minor: number;
  };
  liabilities: {
    current_liabilities: IBalanceSheetSectionDTO;
    long_term_liabilities: IBalanceSheetSectionDTO;
    total_liabilities_minor: number;
  };
  equity: {
    owner_equity: IBalanceSheetSectionDTO;
    retained_earnings_minor: number;
    current_period_net_income_minor: number;
    total_equity_minor: number;
  };
  total_liabilities_and_equity_minor: number;
  difference_minor: number;
}

export interface IOpeningBalanceLineDTO {
  account_id: string;
  debit_minor: number;
  credit_minor: number;
  description?: string;
}

export interface IOpeningBalanceDTO {
  as_of_date: Date | string;
  description?: string;
  lines: IOpeningBalanceLineDTO[];
}

export interface IAccountingAuditDTO {
  id: string;
  studio_id: string;
  actor_member_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json?: any;
  after_json?: any;
  reason?: string | null;
  created_at: Date | string;
}

// -------------------------------------------------------------
// PHASE 35: STUDIO TAX, GST & COMPLIANCE OPERATIONS 2.0
// -------------------------------------------------------------

export enum TaxRegistrationType {
  UNREGISTERED = 'UNREGISTERED',
  COMPOSITION = 'COMPOSITION',
  REGULAR = 'REGULAR',
  SEZ = 'SEZ',
  EXPORT = 'EXPORT',
  OTHER = 'OTHER',
}

export enum TaxVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED',
}

export enum TaxType {
  STANDARD = 'STANDARD',
  ZERO_RATED = 'ZERO_RATED',
  EXEMPT = 'EXEMPT',
  NIL_RATED = 'NIL_RATED',
  OUT_OF_SCOPE = 'OUT_OF_SCOPE',
  REVERSE_CHARGE = 'REVERSE_CHARGE',
}

export enum TaxCategoryType {
  TAXABLE = 'TAXABLE',
  EXEMPT = 'EXEMPT',
  NIL_RATED = 'NIL_RATED',
  ZERO_RATED = 'ZERO_RATED',
  NON_GST = 'NON_GST',
}

export enum TaxItemSourceType {
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
  PRINT = 'PRINT',
  DIGITAL = 'DIGITAL',
  SHIPPING = 'SHIPPING',
  GOODS = 'GOODS',
  OTHER = 'OTHER',
}

export enum TaxPartyType {
  CLIENT = 'CLIENT',
  VENDOR = 'VENDOR',
}

export enum TaxTransactionType {
  OUTPUT_TAX = 'OUTPUT_TAX',
  INPUT_TAX = 'INPUT_TAX',
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  REVERSE_CHARGE = 'REVERSE_CHARGE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum TaxTransactionStatus {
  DRAFT = 'DRAFT',
  CALCULATED = 'CALCULATED',
  POSTED = 'POSTED',
  VOID = 'VOID',
  REVERSED = 'REVERSED',
}

export enum TaxComponent {
  CGST = 'CGST',
  SGST = 'SGST',
  IGST = 'IGST',
  CESS = 'CESS',
}

export enum TaxItcStatus {
  ELIGIBLE = 'ELIGIBLE',
  PARTIAL = 'PARTIAL',
  INELIGIBLE = 'INELIGIBLE',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum ItcEligibility {
  ELIGIBLE = 'ELIGIBLE',
  INELIGIBLE = 'INELIGIBLE',
  BLOCKED = 'BLOCKED',
  PARTIAL = 'PARTIAL',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum TaxAdjustmentType {
  CREDIT_NOTE = 'CREDIT_NOTE',
  DEBIT_NOTE = 'DEBIT_NOTE',
  TAX_ADJUSTMENT = 'TAX_ADJUSTMENT',
}

export enum TaxPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export enum TaxPeriodStatus {
  OPEN = 'OPEN',
  REVIEW = 'REVIEW',
  READY_TO_FILE = 'READY_TO_FILE',
  FILED = 'FILED',
  CLOSED = 'CLOSED',
}

export enum TaxReconciliationStatus {
  MATCHED = 'MATCHED',
  DIFFERENCE = 'DIFFERENCE',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  RESOLVED = 'RESOLVED',
}

export enum TaxJurisdictionType {
  FEDERAL = 'FEDERAL',
  STATE = 'STATE',
  SPECIAL_ECONOMIC_ZONE = 'SPECIAL_ECONOMIC_ZONE',
  EXPORT = 'EXPORT',
  UNION_TERRITORY = 'UNION_TERRITORY',
}

export enum TaxRoundingMethod {
  ROUND_HALF_UP = 'ROUND_HALF_UP',
  ROUND_FLOOR = 'ROUND_FLOOR',
  ROUND_CEILING = 'ROUND_CEILING',
}

export interface IStudioTaxProfileDTO {
  id: string;
  studio_id: string;
  legal_name: string;
  trade_name?: string | null;
  country: string;
  country_code: string;
  state?: string | null;
  state_code?: string | null;
  registration_type: TaxRegistrationType;
  gst_registered: boolean;
  gstin?: string | null;
  pan?: string | null;
  tan?: string | null;
  cin?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  tax_registration_date?: Date | string | null;
  tax_period_type: string;
  financial_year_start_month: number;
  default_currency: string;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxRegistrationDTO {
  id: string;
  studio_id: string;
  registration_number: string;
  registration_type: TaxRegistrationType;
  jurisdiction: string;
  state_code: string;
  effective_from: Date | string;
  effective_to?: Date | string | null;
  is_primary: boolean;
  is_active: boolean;
  verified_at?: Date | string | null;
  verification_status: TaxVerificationStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxJurisdictionDTO {
  id: string;
  studio_id: string;
  country_code: string;
  state_code: string;
  jurisdiction_code: string;
  name: string;
  is_domestic: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxRateDTO {
  id: string;
  studio_id: string;
  jurisdiction_id?: string | null;
  name: string;
  code: string;
  rate_basis_points: number;
  cgst_basis_points: number;
  sgst_basis_points: number;
  igst_basis_points: number;
  cess_basis_points: number;
  effective_from: Date | string;
  effective_to?: Date | string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxCategoryDTO {
  id: string;
  studio_id: string;
  code: string;
  name: string;
  description?: string | null;
  tax_type: TaxType;
  default_rate_id?: string | null;
  is_taxable: boolean;
  is_zero_rated: boolean;
  is_exempt: boolean;
  is_nil_rated: boolean;
  is_active: boolean;
  default_rate?: IStudioTaxRateDTO | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxItemMappingDTO {
  id: string;
  studio_id: string;
  tax_category_id: string;
  source_type: TaxItemSourceType;
  source_id?: string | null;
  sac_code?: string | null;
  hsn_code?: string | null;
  default_rate_id?: string | null;
  is_active: boolean;
  tax_category?: IStudioTaxCategoryDTO | null;
  default_rate?: IStudioTaxRateDTO | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxPartyProfileDTO {
  id: string;
  studio_id: string;
  party_type: TaxPartyType;
  party_id: string;
  legal_name: string;
  tax_registration_number?: string | null;
  pan?: string | null;
  country_code: string;
  state_code?: string | null;
  tax_residency: string;
  tax_exemption_status: string;
  is_registered: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ITaxDeterminationInputDTO {
  studio_id: string;
  transaction_date?: Date | string;
  source_type?: string;
  source_id?: string;
  party_type?: TaxPartyType;
  party_id?: string;
  item_type?: TaxItemSourceType;
  item_id?: string;
  sac_code?: string;
  hsn_code?: string;
  tax_category_id?: string;
  tax_rate_id?: string;
  taxable_amount_minor: number;
  currency?: string;
  origin_state_code?: string;
  destination_state_code?: string;
  is_reverse_charge?: boolean;
  is_export_sez?: boolean;
}

export interface ITaxDeterminationResultDTO {
  status: 'DETERMINED' | 'TAX_INFORMATION_REQUIRED';
  taxable_amount_minor: number;
  rate_basis_points: number;
  cgst_basis_points: number;
  sgst_basis_points: number;
  igst_basis_points: number;
  cess_basis_points: number;
  cgst_minor: number;
  sgst_minor: number;
  igst_minor: number;
  cess_minor: number;
  total_tax_minor: number;
  total_amount_minor: number;
  currency: string;
  jurisdiction_code?: string;
  is_inter_state: boolean;
  is_reverse_charge: boolean;
  is_zero_rated_export: boolean;
  itc_status: TaxItcStatus;
  reason: string;
  confidence: number;
  missing_fields?: string[];
}

export interface IStudioTaxTransactionLineDTO {
  id: string;
  studio_id: string;
  tax_transaction_id: string;
  source_line_reference?: string | null;
  tax_code: string;
  taxable_amount_minor: number;
  rate_basis_points: number;
  tax_amount_minor: number;
  component: TaxComponent;
  created_at: Date | string;
}

export interface IStudioTaxTransactionDTO {
  id: string;
  studio_id: string;
  transaction_date: Date | string;
  source_type: string;
  source_id: string;
  party_type?: TaxPartyType | null;
  party_id?: string | null;
  party_profile_id?: string | null;
  tax_category_id?: string | null;
  tax_rate_id?: string | null;
  jurisdiction_id?: string | null;
  tax_period_id?: string | null;
  origin_state_code?: string | null;
  destination_state_code?: string | null;
  taxable_amount_minor: number;
  cgst_minor: number;
  sgst_minor: number;
  igst_minor: number;
  cess_minor: number;
  total_tax_minor: number;
  currency: string;
  status: TaxTransactionStatus;
  itc_status: TaxItcStatus;
  is_reverse_charge: boolean;
  is_export_sez: boolean;
  accounting_journal_entry_id?: string | null;
  idempotency_key?: string | null;
  created_by?: string | null;
  posted_at?: Date | string | null;
  posted_by?: string | null;
  lines: IStudioTaxTransactionLineDTO[];
  party_profile?: IStudioTaxPartyProfileDTO | null;
  tax_category?: IStudioTaxCategoryDTO | null;
  tax_rate?: IStudioTaxRateDTO | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxAdjustmentDTO {
  id: string;
  studio_id: string;
  source_tax_transaction_id: string;
  adjustment_type: TaxAdjustmentType;
  reason: string;
  amount_minor: number;
  tax_amount_minor: number;
  reference_number: string;
  adjustment_date: Date | string;
  status: string;
  journal_entry_id?: string | null;
  created_by?: string | null;
  created_at: Date | string;
}

export interface IStudioTaxPeriodDTO {
  id: string;
  studio_id: string;
  period_name: string;
  period_start: Date | string;
  period_end: Date | string;
  status: TaxPeriodStatus;
  total_taxable_minor: number;
  total_cgst_minor: number;
  total_sgst_minor: number;
  total_igst_minor: number;
  total_cess_minor: number;
  input_tax_minor: number;
  eligible_itc_minor: number;
  ineligible_itc_minor: number;
  output_tax_minor: number;
  net_tax_liability_minor: number;
  closed_at?: Date | string | null;
  closed_by?: string | null;
  filed_at?: Date | string | null;
  filed_by?: string | null;
  filing_acknowledgement?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioTaxReconciliationDTO {
  id: string;
  studio_id: string;
  tax_period_id: string;
  ledger_output_tax_minor: number;
  ledger_input_tax_minor: number;
  tax_transaction_output_minor: number;
  tax_transaction_input_minor: number;
  difference_minor: number;
  status: TaxReconciliationStatus;
  reviewed_by?: string | null;
  reviewed_at?: Date | string | null;
  notes?: string | null;
  created_at: Date | string;
}

export interface ITaxSummaryDTO {
  period_start?: Date | string;
  period_end?: Date | string;
  currency: string;
  total_taxable_sales_minor: number;
  total_taxable_purchases_minor: number;
  output_cgst_minor: number;
  output_sgst_minor: number;
  output_igst_minor: number;
  output_cess_minor: number;
  total_output_tax_minor: number;
  input_cgst_minor: number;
  input_sgst_minor: number;
  input_igst_minor: number;
  input_cess_minor: number;
  total_input_tax_minor: number;
  eligible_itc_minor: number;
  ineligible_itc_minor: number;
  net_tax_liability_minor: number;
  posted_transactions_count: number;
  draft_transactions_count: number;
  void_transactions_count: number;
  reversed_transactions_count: number;
}

export interface ITaxComplianceCheckDTO {
  check_key: string;
  title: string;
  description: string;
  severity: 'PASS' | 'WARNING' | 'ERROR';
  details?: string;
  affected_count: number;
  items?: any[];
}

export interface ITaxComplianceReportDTO {
  studio_id: string;
  checked_at: Date | string;
  overall_status: 'PASS' | 'WARNING' | 'ERROR';
  total_checks: number;
  passed_count: number;
  warning_count: number;
  error_count: number;
  checks: ITaxComplianceCheckDTO[];
}

export interface ITaxAuditDTO {
  id: string;
  studio_id: string;
  actor_member_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json?: any;
  after_json?: any;
  reason?: string | null;
  created_at: Date | string;
}

// ==========================================
// PHASE 36: STUDIO BUSINESS PAYMENTS, INVOICING & COLLECTIONS 2.0
// ==========================================

export type StudioInvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'VOID'
  | 'CANCELLED';

export type StudioInvoiceLineSourceType =
  | 'CONTRACT'
  | 'BOOKING'
  | 'PROJECT'
  | 'ORDER'
  | 'CUSTOM'
  | 'OTHER';

export type StudioInvoiceDiscountType = 'FIXED' | 'PERCENTAGE';

export type StudioInvoicePaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export type StudioInvoicePaymentMethod =
  | 'ONLINE'
  | 'BANK_TRANSFER'
  | 'UPI'
  | 'CARD'
  | 'CASH'
  | 'CHEQUE'
  | 'OTHER';

export type StudioPaymentRequestStatus = 'ACTIVE' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export type StudioInvoiceInstallmentStatus =
  | 'PENDING'
  | 'DUE'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type StudioCollectionTaskStatus =
  | 'OPEN'
  | 'CONTACTED'
  | 'PROMISED'
  | 'PAID'
  | 'ESCALATED'
  | 'CLOSED';

export type StudioPaymentPromiseStatus = 'PENDING' | 'KEPT' | 'BROKEN' | 'CANCELLED';

export type StudioCreditDebitNoteStatus = 'DRAFT' | 'ISSUED' | 'VOID';

export interface IStudioInvoiceLineDTO {
  id: string;
  studio_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_minor: number;
  discount_minor: number;
  discount_type?: StudioInvoiceDiscountType | null;
  discount_value?: number | null;
  tax_category_id?: string | null;
  tax_rate_id?: string | null;
  taxable_amount_minor: number;
  tax_minor: number;
  total_minor: number;
  source_type: StudioInvoiceLineSourceType;
  source_id?: string | null;
  sort_order: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioInvoicePaymentDTO {
  id: string;
  studio_id: string;
  invoice_id: string;
  payment_id?: string | null;
  amount_minor: number;
  currency: string;
  payment_method: StudioInvoicePaymentMethod;
  status: StudioInvoicePaymentStatus;
  external_reference?: string | null;
  provider_event_id?: string | null;
  payment_date: Date | string;
  idempotency_key?: string | null;
  failure_reason?: string | null;
  journal_entry_id?: string | null;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioPaymentRequestDTO {
  id: string;
  studio_id: string;
  invoice_id: string;
  token_hash: string;
  amount_minor: number;
  currency: string;
  expires_at: Date | string;
  status: StudioPaymentRequestStatus;
  provider: string;
  external_reference?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioInvoiceInstallmentDTO {
  id: string;
  studio_id: string;
  invoice_id: string;
  sequence: number;
  due_date: Date | string;
  amount_minor: number;
  paid_minor: number;
  status: StudioInvoiceInstallmentStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioInvoiceReceiptDTO {
  id: string;
  studio_id: string;
  receipt_number: string;
  invoice_id: string;
  payment_id: string;
  receipt_date: Date | string;
  amount_minor: number;
  currency: string;
  payment_method: StudioInvoicePaymentMethod;
  balance_due_minor: number;
  notes?: string | null;
  created_by?: string | null;
  created_at: Date | string;
}

export interface IStudioInvoiceCreditNoteDTO {
  id: string;
  studio_id: string;
  credit_note_number: string;
  invoice_id: string;
  reason: string;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  status: StudioCreditDebitNoteStatus;
  tax_transaction_id?: string | null;
  journal_entry_id?: string | null;
  created_by?: string | null;
  created_at: Date | string;
}

export interface IStudioInvoiceDebitNoteDTO {
  id: string;
  studio_id: string;
  debit_note_number: string;
  invoice_id: string;
  reason: string;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  status: StudioCreditDebitNoteStatus;
  tax_transaction_id?: string | null;
  journal_entry_id?: string | null;
  created_by?: string | null;
  created_at: Date | string;
}

export interface IStudioCollectionTaskDTO {
  id: string;
  studio_id: string;
  invoice_id: string;
  assigned_to?: string | null;
  priority: string;
  status: StudioCollectionTaskStatus;
  next_action_at?: Date | string | null;
  notes?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioPaymentPromiseDTO {
  id: string;
  studio_id: string;
  invoice_id: string;
  client_id?: string | null;
  promised_amount_minor: number;
  promised_date: Date | string;
  status: StudioPaymentPromiseStatus;
  notes?: string | null;
  created_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioInvoiceSettingsDTO {
  id: string;
  studio_id: string;
  prefix: string;
  sequence_next: number;
  financial_year_format: string;
  reset_policy: string;
  default_currency: string;
  default_payment_terms_days: number;
  default_notes?: string | null;
  default_terms?: string | null;
  receipt_prefix: string;
  receipt_sequence_next: number;
  credit_note_prefix: string;
  credit_note_sequence_next: number;
  debit_note_prefix: string;
  debit_note_sequence_next: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface IStudioInvoiceDTO {
  id: string;
  studio_id: string;
  invoice_number: string;
  invoice_date: Date | string;
  due_date: Date | string;
  status: StudioInvoiceStatus;
  currency: string;
  subtotal_minor: number;
  discount_minor: number;
  discount_type?: StudioInvoiceDiscountType | null;
  discount_value?: number | null;
  taxable_amount_minor: number;
  tax_minor: number;
  total_minor: number;
  amount_paid_minor: number;
  amount_due_minor: number;
  notes?: string | null;
  terms?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  project_id?: string | null;
  booking_id?: string | null;
  contract_id?: string | null;
  order_id?: string | null;
  receivable_id?: string | null;
  tax_transaction_id?: string | null;
  journal_entry_id?: string | null;
  pdf_artifact_id?: string | null;
  idempotency_key?: string | null;
  created_by?: string | null;
  issued_by?: string | null;
  issued_at?: Date | string | null;
  sent_at?: Date | string | null;
  paid_at?: Date | string | null;
  voided_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  lines?: IStudioInvoiceLineDTO[];
  payments?: IStudioInvoicePaymentDTO[];
  payment_requests?: IStudioPaymentRequestDTO[];
  installments?: IStudioInvoiceInstallmentDTO[];
  receipts?: IStudioInvoiceReceiptDTO[];
  credit_notes?: IStudioInvoiceCreditNoteDTO[];
  debit_notes?: IStudioInvoiceDebitNoteDTO[];
  collection_tasks?: IStudioCollectionTaskDTO[];
  payment_promises?: IStudioPaymentPromiseDTO[];
}

export interface ICreateInvoiceLineDTO {
  description: string;
  quantity?: number;
  unit_price_minor: number;
  discount_minor?: number;
  discount_type?: StudioInvoiceDiscountType;
  discount_value?: number;
  tax_category_id?: string;
  tax_rate_id?: string;
  source_type?: StudioInvoiceLineSourceType;
  source_id?: string;
  sort_order?: number;
}

export interface ICreateInvoiceDTO {
  client_id?: string;
  project_id?: string;
  booking_id?: string;
  contract_id?: string;
  order_id?: string;
  invoice_date?: Date | string;
  due_date?: Date | string;
  currency?: string;
  discount_minor?: number;
  discount_type?: StudioInvoiceDiscountType;
  discount_value?: number;
  notes?: string;
  terms?: string;
  lines: ICreateInvoiceLineDTO[];
  idempotency_key?: string;
}

export interface IUpdateInvoiceDTO {
  client_id?: string;
  project_id?: string;
  booking_id?: string;
  contract_id?: string;
  order_id?: string;
  invoice_date?: Date | string;
  due_date?: Date | string;
  currency?: string;
  discount_minor?: number;
  discount_type?: StudioInvoiceDiscountType;
  discount_value?: number;
  notes?: string;
  terms?: string;
  lines?: ICreateInvoiceLineDTO[];
}

export interface IRecordInvoicePaymentDTO {
  amount_minor: number;
  currency?: string;
  payment_method: StudioInvoicePaymentMethod;
  payment_date?: Date | string;
  external_reference?: string;
  provider_event_id?: string;
  notes?: string;
  idempotency_key?: string;
}

export interface ICreatePaymentRequestDTO {
  amount_minor?: number;
  currency?: string;
  expires_in_hours?: number;
  provider?: 'MOCK' | 'STRIPE' | 'RAZORPAY';
}

export interface ICreateInstallmentsDTO {
  installments: Array<{
    due_date: Date | string;
    amount_minor: number;
  }>;
}

export interface ICreateCreditNoteDTO {
  reason: string;
  subtotal_minor: number;
  tax_minor?: number;
  total_minor?: number;
}

export interface ICreateDebitNoteDTO {
  reason: string;
  subtotal_minor: number;
  tax_minor?: number;
  total_minor?: number;
}

export interface ICreateCollectionTaskDTO {
  assigned_to?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status?: StudioCollectionTaskStatus;
  next_action_at?: Date | string;
  notes?: string;
}

export interface ICreatePaymentPromiseDTO {
  client_id?: string;
  promised_amount_minor: number;
  promised_date: Date | string;
  notes?: string;
}

export interface IUpdatePaymentPromiseDTO {
  status: StudioPaymentPromiseStatus;
  notes?: string;
}

export interface IInvoiceOverviewDTO {
  total_invoiced_minor: number;
  total_collected_minor: number;
  total_outstanding_minor: number;
  total_overdue_minor: number;
  due_this_week_minor: number;
  collection_rate_pct: number;
  average_days_to_payment: number;
  partial_payment_count: number;
  invoice_count: number;
  paid_invoice_count: number;
  overdue_invoice_count: number;
  draft_invoice_count: number;
}

export interface IInvoiceAgingReportDTO {
  current_minor: number;       // 0-30 days
  aging_31_60_minor: number;   // 31-60 days
  aging_61_90_minor: number;   // 61-90 days
  aging_90_plus_minor: number; // >90 days
  total_overdue_minor: number;
}

export interface IPublicInvoiceDTO {
  studio_name: string;
  studio_logo_url?: string | null;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: StudioInvoiceStatus;
  currency: string;
  client_name?: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unit_price_minor: number;
    discount_minor: number;
    tax_minor: number;
    total_minor: number;
  }>;
  subtotal_minor: number;
  discount_minor: number;
  taxable_amount_minor: number;
  tax_minor: number;
  total_minor: number;
  amount_paid_minor: number;
  amount_due_minor: number;
  payment_instructions?: string | null;
  terms?: string | null;
  notes?: string | null;
  payment_token: string;
  payment_request_id?: string;
  expires_at: string;
}

// -------------------------------------------------------------
// PHASE 37: STUDIO FINANCIAL REPORTING, STATEMENTS & COMPLIANCE INTELLIGENCE 2.0
// -------------------------------------------------------------

export enum StudioFinancialReportType {
  PROFIT_LOSS = 'PROFIT_LOSS',
  BALANCE_SHEET = 'BALANCE_SHEET',
  TRIAL_BALANCE = 'TRIAL_BALANCE',
  CASH_FLOW = 'CASH_FLOW',
  AR_AGING = 'AR_AGING',
  AP_AGING = 'AP_AGING',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
  TAX_SUMMARY = 'TAX_SUMMARY',
  GST_SUMMARY = 'GST_SUMMARY',
  PAYMENT_SUMMARY = 'PAYMENT_SUMMARY',
  INVOICE_SUMMARY = 'INVOICE_SUMMARY',
  PROJECT_PROFITABILITY = 'PROJECT_PROFITABILITY',
  ACCOUNT_ACTIVITY = 'ACCOUNT_ACTIVITY',
  GENERAL_LEDGER = 'GENERAL_LEDGER',
  FINANCIAL_POSITION = 'FINANCIAL_POSITION',
  MANAGEMENT_SUMMARY = 'MANAGEMENT_SUMMARY',
}

export enum StudioFinancialReportStatus {
  DRAFT = 'DRAFT',
  FINAL = 'FINAL',
  ARCHIVED = 'ARCHIVED',
  INVALID = 'INVALID',
}

export interface IStudioFinancialReportDTO {
  id: string;
  studio_id: string;
  report_type: StudioFinancialReportType;
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  status: StudioFinancialReportStatus;
  generated_at: string | Date;
  generated_by?: string | null;
  parameters_json?: any;
  summary_json?: any;
  data_json?: any;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ICreateFinancialReportDTO {
  report_type: StudioFinancialReportType;
  period_start: string | Date;
  period_end: string | Date;
  currency?: string;
  parameters?: Record<string, any>;
}

export interface IStudioFinancialSnapshotDTO {
  id: string;
  studio_id: string;
  snapshot_date: string | Date;
  currency: string;
  total_assets_minor: number;
  total_liabilities_minor: number;
  equity_minor: number;
  revenue_minor: number;
  expense_minor: number;
  profit_minor: number;
  cash_minor: number;
  receivables_minor: number;
  payables_minor: number;
  tax_payable_minor: number;
  created_at: string | Date;
}

export interface IStudioReportScheduleDTO {
  id: string;
  studio_id: string;
  report_type: StudioFinancialReportType;
  frequency: string; // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  enabled: boolean;
  recipients_json?: string[];
  format: string; // PDF, CSV, JSON
  timezone: string;
  last_run_at?: string | Date | null;
  next_run_at?: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface ICreateReportScheduleDTO {
  report_type: StudioFinancialReportType;
  frequency?: string;
  enabled?: boolean;
  recipients?: string[];
  format?: 'PDF' | 'CSV' | 'JSON';
  timezone?: string;
}

export interface IUpdateReportScheduleDTO {
  report_type?: StudioFinancialReportType;
  frequency?: string;
  enabled?: boolean;
  recipients?: string[];
  format?: 'PDF' | 'CSV' | 'JSON';
  timezone?: string;
}

export interface IStudioFinancialReportExportDTO {
  id: string;
  studio_id: string;
  report_id?: string | null;
  report_type?: StudioFinancialReportType | null;
  format: string; // CSV, PDF, JSON, ZIP
  status: string; // PENDING, PROCESSING, COMPLETED, FAILED, EXPIRED
  file_reference?: string | null;
  download_token?: string | null;
  expires_at?: string | Date | null;
  created_by?: string | null;
  created_at: string | Date;
}

export interface ICreateReportExportDTO {
  report_type: StudioFinancialReportType;
  format: 'CSV' | 'PDF' | 'JSON' | 'ZIP';
  period_start?: string | Date;
  period_end?: string | Date;
  currency?: string;
  parameters?: Record<string, any>;
}

export interface IStudioFinancialAnomalyDTO {
  id: string;
  studio_id: string;
  anomaly_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  source_type?: string | null;
  source_id?: string | null;
  amount_minor: number;
  description: string;
  detected_at: string | Date;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  resolved_by?: string | null;
  resolved_at?: string | Date | null;
  resolution_note?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IUpdateAnomalyStatusDTO {
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  resolution_note?: string;
}

export interface IArAgingBucketEntryDTO {
  client_id?: string | null;
  client_name?: string | null;
  invoice_id: string;
  invoice_number: string;
  invoice_date: string | Date;
  due_date: string | Date;
  currency: string;
  original_amount_minor: number;
  paid_amount_minor: number;
  outstanding_amount_minor: number;
  days_overdue: number;
  bucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '91_120' | '120_PLUS';
}

export interface IArAgingReportDTO {
  as_of_date: string | Date;
  currency: string;
  total_outstanding_minor: number;
  total_overdue_minor: number;
  buckets: {
    current_minor: number;
    days_1_30_minor: number;
    days_31_60_minor: number;
    days_61_90_minor: number;
    days_91_120_minor: number;
    days_120_plus_minor: number;
  };
  items: IArAgingBucketEntryDTO[];
}

export interface IApAgingBucketEntryDTO {
  vendor_id?: string | null;
  vendor_name?: string | null;
  payable_id: string;
  bill_reference: string;
  bill_date?: string | Date;
  due_date: string | Date;
  currency: string;
  original_amount_minor: number;
  paid_amount_minor: number;
  outstanding_amount_minor: number;
  days_overdue: number;
  bucket: 'CURRENT' | '1_30' | '31_60' | '61_90' | '91_120' | '120_PLUS';
}

export interface IApAgingReportDTO {
  as_of_date: string | Date;
  currency: string;
  total_outstanding_minor: number;
  total_overdue_minor: number;
  buckets: {
    current_minor: number;
    days_1_30_minor: number;
    days_31_60_minor: number;
    days_61_90_minor: number;
    days_91_120_minor: number;
    days_120_plus_minor: number;
  };
  items: IApAgingBucketEntryDTO[];
}

export interface IRevenueBreakdownEntryDTO {
  dimension_key: string;
  dimension_name: string;
  gross_revenue_minor: number;
  discounts_minor: number;
  tax_minor: number;
  net_revenue_minor: number;
  collected_minor: number;
  outstanding_minor: number;
  transaction_count: number;
}

export interface IRevenueReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  gross_revenue_minor: number;
  discounts_minor: number;
  tax_minor: number;
  net_revenue_minor: number;
  collected_minor: number;
  outstanding_minor: number;
  by_month: IRevenueBreakdownEntryDTO[];
  by_service: IRevenueBreakdownEntryDTO[];
  by_client: IRevenueBreakdownEntryDTO[];
  by_project: IRevenueBreakdownEntryDTO[];
}

export interface IExpenseBreakdownEntryDTO {
  dimension_key: string;
  dimension_name: string;
  total_minor: number;
  paid_minor: number;
  unpaid_minor: number;
  expense_count: number;
  percentage_of_total: number;
}

export interface IExpenseReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  total_expenses_minor: number;
  paid_expenses_minor: number;
  unpaid_expenses_minor: number;
  by_category: IExpenseBreakdownEntryDTO[];
  by_vendor: IExpenseBreakdownEntryDTO[];
  by_project: IExpenseBreakdownEntryDTO[];
  by_month: IExpenseBreakdownEntryDTO[];
}

export interface IProjectProfitabilityItemDTO {
  project_id: string;
  project_name: string;
  client_name?: string | null;
  revenue_minor: number;
  cogs_minor: number;
  expenses_minor: number;
  gross_profit_minor: number;
  net_contribution_minor: number;
  margin_percentage: number;
  payments_received_minor: number;
  receivables_minor: number;
}

export interface IProjectProfitabilityReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  total_project_revenue_minor: number;
  total_project_cogs_minor: number;
  total_project_expenses_minor: number;
  total_project_profit_minor: number;
  overall_margin_percentage: number;
  projects: IProjectProfitabilityItemDTO[];
  unallocated_expenses_minor: number;
}

export interface ITaxSummaryReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  taxable_turnover_minor: number;
  output_tax_minor: number;
  cgst_output_minor: number;
  sgst_output_minor: number;
  igst_output_minor: number;
  cess_output_minor: number;
  input_tax_minor: number;
  eligible_itc_minor: number;
  ineligible_itc_minor: number;
  net_tax_liability_minor: number;
  reverse_charge_minor: number;
  export_zero_rated_minor: number;
  tax_adjustments_minor: number;
  status: string; // e.g. "GST-ready report"
}

export interface IGstComplianceReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  gstin?: string | null;
  state_code?: string | null;
  outward_supplies: {
    taxable_value_minor: number;
    cgst_minor: number;
    sgst_minor: number;
    igst_minor: number;
    cess_minor: number;
    total_tax_minor: number;
  };
  inward_supplies: {
    taxable_value_minor: number;
    cgst_minor: number;
    sgst_minor: number;
    igst_minor: number;
    cess_minor: number;
    eligible_itc_minor: number;
    ineligible_itc_minor: number;
  };
  net_gst_payable_minor: number;
  hsn_summary: Array<{
    hsn_sac_code: string;
    description: string;
    taxable_value_minor: number;
    rate_basis_points: number;
    cgst_minor: number;
    sgst_minor: number;
    igst_minor: number;
    total_tax_minor: number;
  }>;
}

export interface ITaxReconciliationReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  ledger_output_tax_minor: number;
  ledger_input_tax_minor: number;
  tax_trans_output_minor: number;
  tax_trans_input_minor: number;
  difference_output_minor: number;
  difference_input_minor: number;
  is_reconciled: boolean;
  exceptions: Array<{
    id: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source_reference: string;
    description: string;
    amount_difference_minor: number;
    status: string;
  }>;
}

export interface ICashFlowReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  method: 'DIRECT' | 'INDIRECT';
  operating_activities: {
    cash_from_customers_minor: number;
    cash_paid_to_vendors_minor: number;
    cash_paid_for_expenses_minor: number;
    tax_paid_minor: number;
    net_operating_cash_flow_minor: number;
  };
  investing_activities: {
    equipment_purchases_minor: number;
    other_investing_minor: number;
    net_investing_cash_flow_minor: number;
  };
  financing_activities: {
    owner_drawings_minor: number;
    capital_injected_minor: number;
    loan_payments_minor: number;
    net_financing_cash_flow_minor: number;
  };
  net_change_in_cash_minor: number;
  opening_cash_balance_minor: number;
  closing_cash_balance_minor: number;
}

export interface IFinancialPositionDTO {
  as_of_date: string | Date;
  currency: string;
  total_assets_minor: number;
  current_assets_minor: number;
  cash_minor: number;
  receivables_minor: number;
  total_liabilities_minor: number;
  current_liabilities_minor: number;
  payables_minor: number;
  tax_liabilities_minor: number;
  equity_minor: number;
  working_capital_minor: number;
  current_ratio: number;
  quick_ratio: number;
  debt_to_equity_ratio: number;
  is_balanced: boolean;
}

export interface IPeriodComparisonDTO {
  metric_name: string;
  current_period_minor: number;
  previous_period_minor: number;
  absolute_change_minor: number;
  percentage_change: number; // e.g. 12.4
  trend: 'UP' | 'DOWN' | 'NEUTRAL';
}

export interface IFinancialInsightsReportDTO {
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  comparisons: IPeriodComparisonDTO[];
  insights: string[];
  anomalies_detected: number;
  critical_reconciliation_exceptions: number;
}

export interface ICloseChecklistItemDTO {
  id: string;
  sequence: number;
  name: string;
  category: 'TRIAL_BALANCE' | 'BANK' | 'CASH' | 'AR' | 'AP' | 'GATEWAY' | 'TAX' | 'EXPENSES' | 'REVENUE' | 'COGS' | 'PROJECTS' | 'ANOMALIES' | 'PERIOD_LOCK';
  description: string;
  status: 'PASSED' | 'WARNING' | 'FAILED' | 'REVIEW_REQUIRED';
  details?: string;
  action_required?: string;
}

export interface IMonthEndCloseStatusDTO {
  period_id: string;
  period_name: string;
  period_start: string | Date;
  period_end: string | Date;
  period_status: 'OPEN' | 'IN_PROGRESS' | 'READY' | 'BLOCKED' | 'CLOSED';
  overall_readiness: 'READY' | 'BLOCKED' | 'REQUIRES_REVIEW' | 'CLOSED';
  checklist: ICloseChecklistItemDTO[];
  blocked_reasons: string[];
  passed_checks_count: number;
  total_checks_count: number;
  closed_at?: string | Date | null;
  closed_by?: string | null;
}

export interface IAccountantHandoffBundleDTO {
  bundle_id: string;
  studio_name: string;
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  generated_at: string | Date;
  documents: Array<{
    name: string;
    type: string;
    file_reference: string;
    size_bytes: number;
    format: 'CSV' | 'PDF' | 'JSON';
  }>;
  download_url: string;
  expires_at: string | Date;
}

export interface IFinancialOverviewDashboardDTO {
  currency: string;
  as_of_date: string | Date;
  revenue_ytd_minor: number;
  expenses_ytd_minor: number;
  net_profit_ytd_minor: number;
  net_margin_pct: number;
  cash_balance_minor: number;
  accounts_receivable_minor: number;
  overdue_receivable_minor: number;
  accounts_payable_minor: number;
  tax_liability_minor: number;
  unreconciled_items_count: number;
  open_anomalies_count: number;
  period_status: string;
  quick_links: Array<{ name: string; href: string; icon: string }>;
}

// =============================================================
// PHASE 38: STUDIO BUSINESS INTELLIGENCE, FORECASTING & DECISION INTELLIGENCE 2.0
// =============================================================

export type BiPeriodType = 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
export type BiComparisonType = 'PREVIOUS_PERIOD' | 'PREVIOUS_YEAR' | 'MOM' | 'QOQ' | 'YOY';

export type BiForecastCategory = 'ACTUAL' | 'COMMITTED' | 'EXPECTED' | 'PIPELINE' | 'FORECAST';
export type BiForecastMethod = 'MOVING_AVERAGE' | 'WEIGHTED_MOVING_AVERAGE' | 'EXPONENTIAL_SMOOTHING' | 'LINEAR_TREND';
export type BiForecastConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type BiProjectOperationalStatus = 'ON_TRACK' | 'FINANCIAL_RISK' | 'DELIVERY_RISK' | 'PAYMENT_RISK' | 'COMPLETED';

export type BiAlertSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type BiAlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
export type BiAlertType =
  | 'REVENUE_DROP'
  | 'PROFIT_DROP'
  | 'CASH_RISK'
  | 'AR_SPIKE'
  | 'OVERDUE_SPIKE'
  | 'PIPELINE_DROP'
  | 'BOOKING_GAP'
  | 'CAPACITY_OVERLOAD'
  | 'PROJECT_MARGIN_RISK'
  | 'EXPENSE_SPIKE'
  | 'TAX_LIABILITY_CHANGE'
  | 'RECONCILIATION_EXCEPTION';

export type BiScorecardStatus = 'HEALTHY' | 'WATCH' | 'ATTENTION';

export interface IBiPeriodComparisonResult<T = number> {
  current: T;
  previous: T;
  absolute_change: T;
  percentage_change: number | null; // null if previous === 0, never NaN / Infinity
  period_type: BiPeriodType;
  current_period_label: string;
  previous_period_label: string;
}

export interface IBiKpiDefinition {
  id: string;
  name: string;
  description: string;
  formula: string;
  source: string;
  period: string;
  currency?: string | null;
  last_updated: string | Date;
  category: 'REVENUE' | 'PROFIT' | 'CASH' | 'SALES' | 'BOOKINGS' | 'PROJECTS' | 'CLIENTS' | 'TEAM';
}

export interface IBiKpiValue {
  id: string;
  name: string;
  value: number;
  formatted_value: string;
  unit: 'CURRENCY_MINOR' | 'PERCENT_BPS' | 'COUNT' | 'RATIO';
  formula: string;
  change_pct: number | null;
  previous_value: number | null;
  trend: 'UP' | 'DOWN' | 'FLAT';
  currency?: string;
}

export interface IBiRevenueOverviewDTO {
  currency: string;
  gross_revenue_minor: number;
  net_revenue_minor: number;
  collected_revenue_minor: number;
  contracted_revenue_minor: number;
  pipeline_revenue_minor: number;
  monthly_trend: Array<{ month: string; actual_minor: number; committed_minor: number; forecast_minor: number }>;
}

export interface IBiProfitOverviewDTO {
  currency: string;
  gross_profit_minor: number;
  operating_profit_minor: number;
  net_profit_minor: number;
  gross_margin_bps: number;
  net_margin_bps: number;
  monthly_trend: Array<{ month: string; revenue_minor: number; expenses_minor: number; net_profit_minor: number; margin_bps: number }>;
}

export interface IBiCashOverviewDTO {
  currency: string;
  cash_balance_minor: number;
  cash_inflow_minor: number;
  cash_outflow_minor: number;
  net_cash_movement_minor: number;
  receivables_minor: number;
  overdue_receivables_minor: number;
  payables_minor: number;
}

export interface IBiPipelineOverviewDTO {
  total_leads_count: number;
  qualified_leads_count: number;
  proposals_count: number;
  accepted_proposals_count: number;
  conversion_rate_bps: number;
  pipeline_value_minor: number;
  weighted_pipeline_minor: number;
  currency: string;
}

export interface IBiBookingOverviewDTO {
  confirmed_bookings_count: number;
  pending_bookings_count: number;
  cancelled_bookings_count: number;
  booking_value_minor: number;
  booking_conversion_bps: number;
  currency: string;
}

export interface IBiProjectOverviewDTO {
  active_count: number;
  completed_count: number;
  delayed_count: number;
  at_risk_count: number;
  total_revenue_minor: number;
  total_cost_minor: number;
  total_margin_bps: number;
  currency: string;
}

export interface IBiTeamCapacityOverviewDTO {
  total_members: number;
  assigned_tasks_count: number;
  overdue_tasks_count: number;
  active_projects_count: number;
  shoot_workload_hours: number;
  available_capacity_hours: number;
  allocated_capacity_hours: number;
  capacity_utilization_bps: number;
  overload_flag: boolean;
}

export interface IBiAlertDTO {
  id: string;
  studio_id: string;
  alert_type: BiAlertType;
  severity: BiAlertSeverity;
  status: BiAlertStatus;
  title: string;
  description: string;
  baseline_value?: number | null;
  current_value?: number | null;
  threshold_value?: number | null;
  metadata?: Record<string, any> | null;
  resolved_at?: string | Date | null;
  resolved_by?: string | null;
  created_at: string | Date;
}

export interface IBiDecisionInsightDTO {
  id: string;
  studio_id: string;
  category: 'REVENUE' | 'PROFIT' | 'CASH' | 'PIPELINE' | 'BOOKING' | 'PROJECT' | 'CAPACITY' | 'CLIENT';
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'CRITICAL';
  title: string;
  explanation: string;
  suggested_review?: string | null;
  supporting_data?: Record<string, any> | null;
  status: 'ACTIVE' | 'DISMISSED' | 'ACTED_UPON';
  created_at: string | Date;
}

export interface IBiRevenueForecastDTO {
  method: BiForecastMethod;
  model_name: string;
  model_version: string;
  historical_periods: number;
  forecast_period: string;
  confidence_level: BiForecastConfidence;
  confidence_reason: string;
  generated_at: string | Date;
  currency: string;
  actual_minor: number;
  committed_minor: number;
  expected_minor: number;
  pipeline_minor: number;
  forecast_minor: number;
  forecast_range_minor?: {
    lower: number;
    upper: number;
  } | null;
  breakdown_by_month: Array<{
    month: string;
    actual_minor: number;
    committed_minor: number;
    expected_minor: number;
    pipeline_minor: number;
    forecast_minor: number;
    lower_bound_minor?: number;
    upper_bound_minor?: number;
  }>;
}

export interface IBiCashHorizonProjectionDTO {
  horizon_days: 7 | 30 | 60 | 90;
  horizon_label: string;
  starting_cash_minor: number;
  known_inflows_minor: number;
  scheduled_inflows_minor: number;
  estimated_inflows_minor: number;
  known_outflows_minor: number;
  scheduled_outflows_minor: number;
  estimated_outflows_minor: number;
  net_cash_movement_minor: number;
  projected_ending_cash_minor: number;
  cash_risk_detected: boolean;
  risk_notes: string[];
}

export interface IBiCashForecastDTO {
  as_of_date: string | Date;
  current_cash_minor: number;
  currency: string;
  projections: IBiCashHorizonProjectionDTO[];
}

export interface IBiPipelineForecastDTO {
  currency: string;
  total_pipeline_value_minor: number;
  weighted_pipeline_value_minor: number;
  unweighted_pipeline_value_minor: number;
  opportunity_count: number;
  qualified_lead_count: number;
  proposals_count: number;
  accepted_proposals_count: number;
  historical_conversion_rate_bps: number;
  opportunities_by_stage: Array<{
    stage: string;
    count: number;
    total_value_minor: number;
    probability_pct: number;
    weighted_value_minor: number;
  }>;
}

export interface IBiBookingForecastDTO {
  currency: string;
  upcoming_bookings_count: number;
  total_booking_value_minor: number;
  booking_density_pct: number;
  booking_gaps_count: number;
  seasonality_detected: boolean;
  seasonality_status: 'INSUFFICIENT_DATA' | 'DETECTED';
  high_demand_months: string[];
  low_demand_months: string[];
  bookings_by_month: Array<{
    month: string;
    count: number;
    value_minor: number;
  }>;
}

export interface IBiProjectRiskDTO {
  risk_type: 'MARGIN_BELOW_THRESHOLD' | 'BUDGET_EXCEEDED' | 'RECEIVABLE_OVERDUE' | 'COST_SPIKE' | 'REVENUE_BELOW_EXPECTED' | 'DEADLINE_TASK_INCOMPLETE';
  severity: BiAlertSeverity;
  source: string;
  reason: string;
  amount_minor?: number;
  detected_at: string | Date;
}

export interface IBiProjectPerformanceDTO {
  id: string;
  project_id: string;
  title: string;
  client_name?: string | null;
  currency: string;
  operational_status: BiProjectOperationalStatus;
  revenue_minor: number;
  cogs_minor: number;
  expenses_minor: number;
  profit_minor: number;
  margin_bps: number;
  payment_collected_minor: number;
  payment_outstanding_minor: number;
  completion_pct: number;
  deadline_status: 'ON_TIME' | 'APPROACHING' | 'OVERDUE';
  risks: IBiProjectRiskDTO[];
}

export interface IBiClientBusinessMetricDTO {
  client_id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  currency: string;
  total_revenue_minor: number;
  orders_count: number;
  projects_count: number;
  bookings_count: number;
  payments_minor: number;
  outstanding_minor: number;
  is_repeat_client: boolean;
  last_activity_at?: string | Date | null;
}

export interface IBiCapacityHorizonDTO {
  horizon_days: 7 | 14 | 30 | 60;
  horizon_label: string;
  available_capacity_hours: number;
  allocated_capacity_hours: number;
  utilization_bps: number;
  overload_periods_count: number;
  capacity_risk: boolean;
}

export interface IBiTeamCapacityMetricsDTO {
  total_members: number;
  available_capacity_hours: number;
  allocated_capacity_hours: number;
  capacity_utilization_bps: number;
  assigned_tasks_count: number;
  overdue_tasks_count: number;
  active_projects_count: number;
  shoot_sessions_count: number;
  overload_risk: boolean;
  capacity_forecast: IBiCapacityHorizonDTO[];
}

export interface IBiScenarioParameters {
  revenue_change_pct: number; // e.g. 10 for +10%, -10 for -10%
  expense_change_pct: number;
  booking_change_pct?: number;
  conversion_change_pct?: number;
  avg_project_value_change_pct?: number;
  capacity_change_pct?: number;
  new_hire_count?: number;
}

export interface IBiScenarioResults {
  is_simulation: true;
  label: 'SCENARIO_NOT_ACTUAL';
  currency: string;
  baseline_revenue_minor: number;
  projected_revenue_minor: number;
  revenue_delta_minor: number;
  baseline_expenses_minor: number;
  projected_expenses_minor: number;
  expenses_delta_minor: number;
  baseline_profit_minor: number;
  projected_profit_minor: number;
  profit_delta_minor: number;
  baseline_margin_bps: number;
  projected_margin_bps: number;
  baseline_cash_minor: number;
  projected_cash_minor: number;
  baseline_utilization_bps: number;
  projected_utilization_bps: number;
}

export interface IBiSensitivityAnalysisDTO {
  currency: string;
  dimension: 'REVENUE' | 'EXPENSE' | 'BOOKINGS' | 'AVERAGE_PROJECT_VALUE';
  base_case: IBiScenarioResults;
  downside_case: IBiScenarioResults;
  upside_case: IBiScenarioResults;
  assumptions: string[];
}

export interface IBiBreakEvenDTO {
  currency: string;
  fixed_costs_minor: number;
  variable_cost_ratio_bps: number;
  contribution_margin_bps: number;
  average_project_value_minor: number;
  break_even_revenue_minor: number | null; // null if contribution margin <= 0
  break_even_projects_count: number | null;
  is_achievable: boolean;
  warning_message?: string | null;
}

export interface IBiScorecardDimension {
  id: string;
  name: string;
  category: 'REVENUE' | 'PROFITABILITY' | 'CASH' | 'PIPELINE' | 'OPERATIONS' | 'CAPACITY' | 'COLLECTION';
  metric: string;
  actual_value: string | number;
  threshold_value: string | number;
  status: BiScorecardStatus;
  reason: string;
}

export interface IBiScorecardDTO {
  dimensions: IBiScorecardDimension[];
  evaluated_at: string | Date;
}

export interface IBiSeasonalityMonthPattern {
  month: number; // 1-12
  month_name: string;
  avg_revenue_minor: number;
  avg_bookings_count: number;
  avg_projects_count: number;
  seasonal_index: number; // 1.0 = average, >1.0 = high season, <1.0 = low season
}

export interface IBiSeasonalityDTO {
  currency: string;
  status: 'DETECTED' | 'INSUFFICIENT_HISTORY';
  historical_months_count: number;
  min_required_months: number;
  monthly_patterns: IBiSeasonalityMonthPattern[];
}

export interface IBiManagementReportDTO {
  studio_id: string;
  studio_name: string;
  period_label: string;
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  generated_at: string | Date;
  executive_summary: string;
  kpis: IBiKpiValue[];
  revenue: IBiRevenueOverviewDTO;
  profitability: IBiProfitOverviewDTO;
  cash: IBiCashOverviewDTO;
  pipeline: IBiPipelineOverviewDTO;
  bookings: IBiBookingOverviewDTO;
  projects: IBiProjectOverviewDTO;
  team_capacity: IBiTeamCapacityOverviewDTO;
  risks: IBiProjectRiskDTO[];
  forecasts: {
    revenue: IBiRevenueForecastDTO;
    cash: IBiCashForecastDTO;
  };
  scorecard: IBiScorecardDTO;
  decision_insights: IBiDecisionInsightDTO[];
}

export interface IBiExecutiveDashboardDTO {
  currency: string;
  as_of_date: string | Date;
  period: string;
  kpis: Record<string, IBiKpiValue>;
  kpis_list: IBiKpiValue[];
  revenue_overview: IBiRevenueOverviewDTO;
  profit_overview: IBiProfitOverviewDTO;
  cash_overview: IBiCashOverviewDTO;
  pipeline_overview: IBiPipelineOverviewDTO;
  booking_overview: IBiBookingOverviewDTO;
  project_overview: IBiProjectOverviewDTO;
  team_overview: IBiTeamCapacityOverviewDTO;
  alerts: IBiAlertDTO[];
  insights: IBiDecisionInsightDTO[];
  scorecard: IBiScorecardDTO;
}

// =========================================================================
// PHASE 39: STUDIO BUSINESS PLANNING, BUDGETING & STRATEGIC PLANNING 2.0
// =========================================================================

export enum BusinessPlanType {
  ANNUAL = 'ANNUAL',
  QUARTERLY = 'QUARTERLY',
  MONTHLY = 'MONTHLY',
  MULTI_YEAR = 'MULTI_YEAR',
  ROLLING_12_MONTH = 'ROLLING_12_MONTH',
  CUSTOM = 'CUSTOM',
}

export enum BusinessPlanStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUPERSEDED = 'SUPERSEDED',
  LOCKED = 'LOCKED',
  ARCHIVED = 'ARCHIVED',
}

export enum BusinessPlanTargetType {
  REVENUE = 'REVENUE',
  COLLECTION = 'COLLECTION',
  COLLECTION_RATE_BPS = 'COLLECTION_RATE_BPS',
  PROFIT = 'PROFIT',
  MARGIN = 'MARGIN',
  GROSS_PROFIT = 'GROSS_PROFIT',
  GROSS_MARGIN_BPS = 'GROSS_MARGIN_BPS',
  NET_PROFIT = 'NET_PROFIT',
  NET_MARGIN_PERCENT = 'NET_MARGIN_PERCENT',
  CASH_RESERVE_MINIMUM = 'CASH_RESERVE_MINIMUM',
  BOOKINGS_COUNT = 'BOOKINGS_COUNT',
  BOOKINGS = 'BOOKINGS',
  PROJECTS = 'PROJECTS',
  ORDERS = 'ORDERS',
  NEW_CLIENTS = 'NEW_CLIENTS',
  REPEAT_CLIENTS = 'REPEAT_CLIENTS',
  CLIENT_ACQUISITIONS = 'CLIENT_ACQUISITIONS',
  CLIENT_ACQUISITION_COUNT = 'CLIENT_ACQUISITION_COUNT',
  ACTIVE_CLIENTS_COUNT = 'ACTIVE_CLIENTS_COUNT',
  CLIENT_RETENTION_RATE_BPS = 'CLIENT_RETENTION_RATE_BPS',
  LEAD_CONVERSION_RATE_BPS = 'LEAD_CONVERSION_RATE_BPS',
  AVERAGE_ORDER_VALUE = 'AVERAGE_ORDER_VALUE',
  PROJECT_DELIVERY_TIME_DAYS = 'PROJECT_DELIVERY_TIME_DAYS',
  CLIENT_SATISFACTION_NPS = 'CLIENT_SATISFACTION_NPS',
  TEAM_UTILIZATION_PERCENT = 'TEAM_UTILIZATION_PERCENT',
  EXPENSE_BUDGET_CAP = 'EXPENSE_BUDGET_CAP',
  REVENUE_PER_PROJECT = 'REVENUE_PER_PROJECT',
  PIPELINE_VALUE = 'PIPELINE_VALUE',
  PIPELINE = 'PIPELINE',
  CASH = 'CASH',
  EXPENSES = 'EXPENSES',
  EXPENSE = 'EXPENSE',
  COGS = 'COGS',
  CAPACITY = 'CAPACITY',
  UTILIZATION = 'UTILIZATION',
}

export enum BusinessPlanTargetUnit {
  CURRENCY = 'CURRENCY',
  COUNT = 'COUNT',
  NUMBER = 'NUMBER',
  PERCENT = 'PERCENT',
  PERCENTAGE = 'PERCENTAGE',
  BASIS_POINTS = 'BASIS_POINTS',
  HOURS = 'HOURS',
  DAYS = 'DAYS',
}

export enum StrategicObjectiveType {
  GROWTH = 'GROWTH',
  REVENUE_GROWTH = 'REVENUE_GROWTH',
  PROFITABILITY = 'PROFITABILITY',
  CUSTOMER_GROWTH = 'CUSTOMER_GROWTH',
  CLIENT_RETENTION = 'CLIENT_RETENTION',
  OPERATIONS = 'OPERATIONS',
  OPERATIONAL_EXCELLENCE = 'OPERATIONAL_EXCELLENCE',
  CAPACITY = 'CAPACITY',
  MARKETING = 'MARKETING',
  SERVICE_EXPANSION = 'SERVICE_EXPANSION',
  CASH_STABILITY = 'CASH_STABILITY',
  EXPANSION = 'EXPANSION',
  EFFICIENCY = 'EFFICIENCY',
  MARKET_PENETRATION = 'MARKET_PENETRATION',
  BRAND_AUTHORITY = 'BRAND_AUTHORITY',
  OTHER = 'OTHER',
}

export enum StrategicInitiativeStatus {
  NOT_STARTED = 'NOT_STARTED',
  IDEA = 'IDEA',
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum StrategicInitiativePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum StrategicMilestoneStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  DELAYED = 'DELAYED',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED',
}

export enum PlanHealthStatus {
  ON_TRACK = 'ON_TRACK',
  WATCH = 'WATCH',
  AT_RISK = 'AT_RISK',
  BLOCKED = 'BLOCKED',
}

export enum VarianceSeverity {
  FAVORABLE = 'FAVORABLE',
  NEUTRAL = 'NEUTRAL',
  NEGLIGIBLE = 'NEGLIGIBLE',
  MODERATE = 'MODERATE',
  SIGNIFICANT = 'SIGNIFICANT',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum PlanReviewStatus {
  SCHEDULED = 'SCHEDULED',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  SKIPPED = 'SKIPPED',
  RESCHEDULED = 'RESCHEDULED',
}

export interface IBusinessPlanTargetDTO {
  id: string;
  plan_id: string;
  studio_id: string;
  target_type: BusinessPlanTargetType;
  period_start: string | Date;
  period_end: string | Date;
  currency?: string | null;
  target_minor: number; // Integer minor units (paise/cents), counts, or basis points
  target_value?: number | null;
  unit: BusinessPlanTargetUnit;
  source?: string | null;
  dimension_type?: string | null;
  dimension_value?: string | null;
  notes?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IStrategicMilestoneDTO {
  id: string;
  initiative_id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  due_date?: string | Date | null;
  status: StrategicMilestoneStatus;
  progress_percent: number;
  completed_at?: string | Date | null;
  owner_user_id?: string | null;
  linked_task_id?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IStrategicInitiativeDTO {
  id: string;
  studio_id: string;
  plan_id: string;
  objective_id?: string | null;
  name: string;
  description?: string | null;
  objective_text?: string | null;
  status: StrategicInitiativeStatus;
  priority: StrategicInitiativePriority;
  owner_user_id?: string | null;
  start_date?: string | Date | null;
  target_date?: string | Date | null;
  completed_at?: string | Date | null;
  progress_percent: number;
  linked_goal_id?: string | null;
  linked_insight_id?: string | null;
  milestones?: IStrategicMilestoneDTO[];
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IStrategicObjectiveDTO {
  id: string;
  studio_id: string;
  plan_id: string;
  name: string;
  description?: string | null;
  objective_type: StrategicObjectiveType;
  target_date?: string | Date | null;
  status: string;
  owner_user_id?: string | null;
  initiatives?: IStrategicInitiativeDTO[];
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IBusinessPlanReviewDTO {
  id: string;
  studio_id: string;
  plan_id: string;
  review_period: string;
  status: PlanReviewStatus;
  summary?: string | null;
  risks?: Array<{ risk: string; severity: string; mitigation?: string }>;
  achievements?: string[];
  variances?: Array<{ metric: string; variance_pct: number; reason: string }>;
  priorities?: string[];
  created_by?: string | null;
  completed_at?: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IBusinessPlanAuditDTO {
  id: string;
  studio_id: string;
  plan_id?: string | null;
  actor_user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state?: any;
  after_state?: any;
  change_reason?: string | null;
  created_at: string | Date;
}

export interface IBusinessPlanDTO {
  id: string;
  studio_id: string;
  name: string;
  description?: string | null;
  plan_type: BusinessPlanType;
  period_start: string | Date;
  period_end: string | Date;
  currency: string;
  status: BusinessPlanStatus;
  version: number;
  version_notes?: string | null;
  previous_version_id?: string | null;
  owner_user_id?: string | null;
  approved_by?: string | null;
  approved_at?: string | Date | null;
  locked_at?: string | Date | null;
  locked_by?: string | null;
  targets?: IBusinessPlanTargetDTO[];
  objectives?: IStrategicObjectiveDTO[];
  initiatives?: IStrategicInitiativeDTO[];
  reviews?: IBusinessPlanReviewDTO[];
  created_at: string | Date;
  updated_at: string | Date;
}

export interface IBudgetPlanLineDTO {
  category_id?: string | null;
  category_name: string;
  is_cogs: boolean;
  planned_minor: number;
  actual_minor: number;
  variance_minor: number;
  variance_pct: number | null;
  is_favorable: boolean;
  period_label: string;
}

export interface IBudgetPlanComparisonDTO {
  plan_id: string;
  studio_id: string;
  currency: string;
  period_label: string;
  planned_revenue_minor: number;
  actual_revenue_minor: number;
  planned_cogs_minor: number;
  actual_cogs_minor: number;
  planned_gross_profit_minor: number;
  actual_gross_profit_minor: number;
  planned_operating_expenses_minor: number;
  actual_operating_expenses_minor: number;
  planned_net_profit_minor: number;
  actual_net_profit_minor: number;
  planned_cash_requirement_minor: number;
  expense_lines: IBudgetPlanLineDTO[];
}

export interface IPlanningVarianceItemDTO {
  targetType: BusinessPlanTargetType;
  unit: string;
  plannedValue: number;
  actualValue: number | null;
  variance: number | null;
  variancePercent: number | null;
  isFavorable: boolean | null;
  severity: VarianceSeverity;
  periodQuarter?: number | null;
  periodMonth?: number | null;
  analysis: string;
  notes?: string | null;
}

export interface IPlanVsActualSummaryDTO {
  totalTargets: number;
  favorableCount: number;
  unfavorableCount: number;
  criticalCount: number;
  hasCriticalVariance: boolean;
}

export interface IPlanVsActualDTO {
  businessPlanId: string;
  planName: string;
  fiscalYear: number;
  periodQuarter: number | null;
  periodMonth: number | null;
  summary: IPlanVsActualSummaryDTO;
  items: IPlanningVarianceItemDTO[];
}

export interface IPlanVsForecastMonthDTO {
  month: number;
  monthName: string;
  planned: number;
  actual: number | null;
  forecast: number;
  varianceToPlan: number;
  variancePercent: number | null;
  status: string;
}

export interface IPlanVsForecastDTO {
  businessPlanId: string;
  planName: string;
  fiscalYear: number;
  targetType: BusinessPlanTargetType;
  plannedAnnual: number;
  forecastedAnnual: number;
  gapToPlan: number;
  gapPercent: number | null;
  alignmentVerdict: string;
  summaryNote: string;
  monthlyBreakdown: IPlanVsForecastMonthDTO[];
}

export interface IPlanVsScenarioDTO {
  scenarioId: string;
  scenarioName: string;
  description: string;
  plannedRevenue: number;
  simulatedRevenue: number;
  variance: number;
  variancePercent: number | null;
  targetFeasibility: string;
}


export interface IPlanHealthDimensionDTO {
  dimension: string; // REVENUE, PROFITABILITY, CASH, BOOKINGS, PIPELINE, OPERATIONS, CAPACITY, STRATEGIC_INITIATIVES
  label: string;
  status: PlanHealthStatus;
  score: number | null;
  metric: string;
  reason: string;
  actionRequired: boolean;
}

export interface IPlanHealthDTO {
  businessPlanId: string;
  planName: string;
  fiscalYear: number;
  overallStatus: PlanHealthStatus;
  overallScore: number;
  evaluatedAt: string;
  dimensions: IPlanHealthDimensionDTO[];
  recommendations: string[];
}

export interface IStrategicPlanningDashboardDTO {
  studio_id: string;
  currency: string;
  as_of_date: string | Date;
  active_plan?: IBusinessPlanDTO | null;
  plan_health: IPlanHealthDTO;
  kpi_comparisons: IPlanVsActualDTO[];
  forecast_alignments: IPlanVsForecastDTO[];
  active_initiatives: IStrategicInitiativeDTO[];
  pending_reviews: IBusinessPlanReviewDTO[];
  recent_variances: IPlanningVarianceItemDTO[];
}

export interface IBusinessPlanCreateInput {
  name: string;
  description?: string;
  plan_type: BusinessPlanType;
  period_start: string | Date;
  period_end: string | Date;
  currency?: string;
  targets?: Array<{
    target_type: BusinessPlanTargetType;
    period_start: string | Date;
    period_end: string | Date;
    target_minor: number;
    target_value?: number;
    unit?: BusinessPlanTargetUnit;
    source?: string;
    dimension_type?: string;
    dimension_value?: string;
    notes?: string;
  }>;
  objectives?: Array<{
    name: string;
    description?: string;
    objective_type: StrategicObjectiveType;
    target_date?: string | Date;
  }>;
}

export interface IBusinessPlanUpdateInput {
  name?: string;
  description?: string;
  status?: BusinessPlanStatus;
  version_notes?: string;
}

export interface IPlanReconciliationResult {
  is_reconciled: boolean;
  plan_type: BusinessPlanType;
  annual_target_minor?: number;
  sum_monthly_targets_minor?: number;
  sum_quarterly_targets_minor?: number;
  mismatches: string[];
}

// =============================================================
// PHASE 40: PLATFORM ADMIN OPERATIONS & GOVERNANCE CENTER 2.0
// =============================================================

export enum AdminPermission {
  STUDIOS_VIEW = 'STUDIOS_VIEW',
  STUDIOS_MANAGE = 'STUDIOS_MANAGE',
  STUDIOS_SUSPEND = 'STUDIOS_SUSPEND',
  USERS_VIEW = 'USERS_VIEW',
  USERS_MANAGE = 'USERS_MANAGE',
  USERS_SUSPEND = 'USERS_SUSPEND',
  PLANS_VIEW = 'PLANS_VIEW',
  PLANS_MANAGE = 'PLANS_MANAGE',
  SUBSCRIPTIONS_VIEW = 'SUBSCRIPTIONS_VIEW',
  SUBSCRIPTIONS_MANAGE = 'SUBSCRIPTIONS_MANAGE',
  PLATFORM_REVENUE_VIEW = 'PLATFORM_REVENUE_VIEW',
  PLATFORM_FINANCE_MANAGE = 'PLATFORM_FINANCE_MANAGE',
  AI_USAGE_VIEW = 'AI_USAGE_VIEW',
  AI_MODELS_VIEW = 'AI_MODELS_VIEW',
  AI_MODELS_MANAGE = 'AI_MODELS_MANAGE',
  STORAGE_VIEW = 'STORAGE_VIEW',
  STORAGE_MANAGE = 'STORAGE_MANAGE',
  EMAIL_VIEW = 'EMAIL_VIEW',
  EMAIL_MANAGE = 'EMAIL_MANAGE',
  FEATURE_FLAGS_VIEW = 'FEATURE_FLAGS_VIEW',
  FEATURE_FLAGS_MANAGE = 'FEATURE_FLAGS_MANAGE',
  FEATURE_FLAG_VIEW = 'FEATURE_FLAGS_VIEW',
  FEATURE_FLAG_MANAGE = 'FEATURE_FLAGS_MANAGE',
  FEATURE_FLAG_APPROVE = 'FEATURE_FLAG_APPROVE',
  RELEASE_VIEW = 'RELEASE_VIEW',
  RELEASE_CREATE = 'RELEASE_CREATE',
  RELEASE_APPROVE = 'RELEASE_APPROVE',
  RELEASE_DEPLOY = 'RELEASE_DEPLOY',
  RELEASE_ROLLBACK = 'RELEASE_ROLLBACK',
  CONFIG_VIEW = 'CONFIG_VIEW',
  CONFIG_MANAGE = 'CONFIG_MANAGE',
  CONFIG_APPROVE = 'CONFIG_APPROVE',
  ENVIRONMENT_VIEW = 'ENVIRONMENT_VIEW',
  SYSTEM_HEALTH_VIEW = 'SYSTEM_HEALTH_VIEW',
  JOBS_VIEW = 'JOBS_VIEW',
  JOBS_MANAGE = 'JOBS_MANAGE',
  SECURITY_VIEW = 'SECURITY_VIEW',
  SECURITY_MANAGE = 'SECURITY_MANAGE',
  PRIVACY_VIEW = 'PRIVACY_VIEW',
  PRIVACY_MANAGE = 'PRIVACY_MANAGE',
  PRIVACY_EXPORT = 'PRIVACY_EXPORT',
  PRIVACY_DELETE = 'PRIVACY_DELETE',
  PRIVACY_LEGAL_HOLD = 'PRIVACY_LEGAL_HOLD',
  PRIVACY_RETENTION_MANAGE = 'PRIVACY_RETENTION_MANAGE',
  PRIVACY_ACCESS_REVIEW = 'PRIVACY_ACCESS_REVIEW',
  AUDIT_VIEW = 'AUDIT_VIEW',
  SUPPORT_VIEW = 'SUPPORT_VIEW',
  SUPPORT_MANAGE = 'SUPPORT_MANAGE',
  SETTINGS_VIEW = 'SETTINGS_VIEW',
  SETTINGS_MANAGE = 'SETTINGS_MANAGE',
  INCIDENTS_VIEW = 'INCIDENTS_VIEW',
  INCIDENTS_MANAGE = 'INCIDENTS_MANAGE',
  ALERTS_VIEW = 'ALERTS_VIEW',
  ALERTS_MANAGE = 'ALERTS_MANAGE',
  ANALYTICS_VIEW = 'ANALYTICS_VIEW',
}

export enum FeatureFlagScope {
  GLOBAL = 'GLOBAL',
  PLAN = 'PLAN',
  STUDIO = 'STUDIO',
}

export enum SupportCasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SupportCaseStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING = 'WAITING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum IncidentSeverity {
  SEV1 = 'SEV1',
  SEV2 = 'SEV2',
  SEV3 = 'SEV3',
  SEV4 = 'SEV4',
}

export enum IncidentStatus {
  DETECTED = 'DETECTED',
  INVESTIGATING = 'INVESTIGATING',
  MITIGATING = 'MITIGATING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum PlatformAlertType {
  SERVICE_DOWN = 'SERVICE_DOWN',
  QUEUE_FAILURE = 'QUEUE_FAILURE',
  EMAIL_FAILURE_SPIKE = 'EMAIL_FAILURE_SPIKE',
  AI_FAILURE_SPIKE = 'AI_FAILURE_SPIKE',
  STORAGE_FAILURE_SPIKE = 'STORAGE_FAILURE_SPIKE',
  PAYMENT_FAILURE_SPIKE = 'PAYMENT_FAILURE_SPIKE',
  SECURITY_SPIKE = 'SECURITY_SPIKE',
  QUOTA_SPIKE = 'QUOTA_SPIKE',
  DATABASE_HEALTH = 'DATABASE_HEALTH',
  REDIS_HEALTH = 'REDIS_HEALTH',
}

export enum PlatformAlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum PlatformAlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum PlatformSettingCategory {
  GENERAL = 'GENERAL',
  SECURITY = 'SECURITY',
  AI = 'AI',
  STORAGE = 'STORAGE',
  EMAIL = 'EMAIL',
  BILLING = 'BILLING',
  USAGE = 'USAGE',
  MAINTENANCE = 'MAINTENANCE',
  PRIVACY = 'PRIVACY',
}

export enum SystemHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
}

export enum UsageStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  EXCEEDED = 'EXCEEDED',
  SUSPENDED = 'SUSPENDED',
}

export interface PlatformFeatureFlagDTO {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  scope: FeatureFlagScope;
  plan_tier?: SubscriptionPlan | null;
  studio_id?: string | null;
  rollout_pct: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  scope?: FeatureFlagScope;
  plan_tier?: SubscriptionPlan;
  studio_id?: string;
  rollout_pct?: number;
}

export interface UpdateFeatureFlagInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  scope?: FeatureFlagScope;
  plan_tier?: SubscriptionPlan | null;
  studio_id?: string | null;
  rollout_pct?: number;
}

export interface PlatformSupportCaseDTO {
  id: string;
  studio_id?: string | null;
  user_id?: string | null;
  subject: string;
  description: string;
  priority: SupportCasePriority;
  status: SupportCaseStatus;
  category: string;
  assigned_admin_id?: string | null;
  resolution_notes?: string | null;
  resolved_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  studio_name?: string | null;
  user_email?: string | null;
  assigned_admin_name?: string | null;
}

export interface CreateSupportCaseInput {
  studio_id?: string;
  user_id?: string;
  subject: string;
  description: string;
  priority?: SupportCasePriority;
  category?: string;
  assigned_admin_id?: string;
}

export interface UpdateSupportCaseInput {
  subject?: string;
  description?: string;
  priority?: SupportCasePriority;
  status?: SupportCaseStatus;
  category?: string;
  assigned_admin_id?: string | null;
  resolution_notes?: string;
}

export interface PlatformIncidentDTO {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affected_service: string;
  started_at: Date | string;
  mitigated_at?: Date | string | null;
  resolved_at?: Date | string | null;
  owner_admin_id?: string | null;
  resolution?: string | null;
  root_cause?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at: Date | string;
  owner_admin_name?: string | null;
}

export interface CreateIncidentInput {
  title: string;
  description: string;
  severity?: IncidentSeverity;
  affected_service: string;
  owner_admin_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  affected_service?: string;
  owner_admin_id?: string | null;
  resolution?: string;
  root_cause?: string;
  metadata?: Record<string, any>;
}

export interface PlatformAlertDTO {
  id: string;
  type: PlatformAlertType;
  title: string;
  message: string;
  severity: PlatformAlertSeverity;
  status: PlatformAlertStatus;
  source: string;
  studio_id?: string | null;
  metadata?: Record<string, any> | null;
  acknowledged_at?: Date | string | null;
  acknowledged_by?: string | null;
  resolved_at?: Date | string | null;
  resolved_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CreateAlertInput {
  type: PlatformAlertType;
  title: string;
  message: string;
  severity?: PlatformAlertSeverity;
  source?: string;
  studio_id?: string;
  metadata?: Record<string, any>;
}

export interface PlatformAdminSettingDTO {
  id: string;
  category: PlatformSettingCategory;
  key: string;
  value: string;
  is_encrypted: boolean;
  is_sensitive: boolean;
  description?: string | null;
  updated_by?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface UpdateAdminSettingInput {
  value: string;
  is_encrypted?: boolean;
  is_sensitive?: boolean;
  description?: string;
}

export interface MaintenanceModeDTO {
  global_maintenance: boolean;
  api_maintenance: boolean;
  worker_maintenance: boolean;
  ai_maintenance: boolean;
  user_facing_message: string;
  scheduled_end?: Date | string | null;
  updated_by?: string | null;
  updated_at: Date | string;
}

export interface PlatformHealthDimensionDTO {
  dimension: string;
  status: SystemHealthStatus;
  score: number; // 0 - 100
  metric_name: string;
  metric_value: string | number;
  threshold: string | number;
  reason: string;
}

export interface PlatformHealthScoreDTO {
  overall_score: number; // 0 - 100
  overall_status: SystemHealthStatus;
  calculated_at: Date | string;
  dimensions: PlatformHealthDimensionDTO[];
  summary: string;
}

export interface PlatformSecurityEventLegacyDTO {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  actor_ip?: string;
  user_id?: string;
  studio_id?: string;
  metadata?: Record<string, any>;
  timestamp: Date | string;
}

export interface PlatformSecurityOverviewDTO {
  total_events_24h: number;
  failed_auth_attempts_24h: number;
  suspensions_24h: number;
  rate_limit_events_24h: number;
  permission_violations_24h: number;
  active_threat_level: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  recent_events: PlatformSecurityEventLegacyDTO[];
}

export interface PlatformAnalyticsMetricsDTO {
  studio_growth_rate_pct: number;
  user_growth_rate_pct: number;
  mrr_minor: number;
  arr_minor: number;
  churn_rate_bps: number;
  net_revenue_retention_bps: number;
  ai_adoption_rate_bps: number;
  storage_growth_bytes_month: number;
  email_delivery_rate_bps: number;
  system_uptime_bps: number;
  as_of_date: Date | string;
}

// =========================================================================
// PHASE 41: PLATFORM RELIABILITY, OBSERVABILITY & DISASTER RECOVERY 2.0
// =========================================================================

export enum CanonicalService {
  WEB = 'WEB',
  API = 'API',
  API_GATEWAY = 'API_GATEWAY',
  AUTH = 'AUTH',
  WORKER = 'WORKER',
  BACKGROUND_WORKER = 'BACKGROUND_WORKER',
  AI_SERVICE = 'AI_SERVICE',
  AI_ENGINE = 'AI_ENGINE',
  DATABASE = 'DATABASE',
  REDIS = 'REDIS',
  REDIS_CACHE = 'REDIS_CACHE',
  BULLMQ = 'BULLMQ',
  STORAGE = 'STORAGE',
  STORAGE_SERVICE = 'STORAGE_SERVICE',
  SEARCH = 'SEARCH',
  SEARCH_SERVICE = 'SEARCH_SERVICE',
  NOTIFICATION = 'NOTIFICATION',
  NOTIFICATION_ENGINE = 'NOTIFICATION_ENGINE',
  EMAIL = 'EMAIL',
  EMAIL_SERVICE = 'EMAIL_SERVICE',
  FINANCE = 'FINANCE',
  PAYMENTS = 'PAYMENTS',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
  CALENDAR = 'CALENDAR',
  AUTOMATION = 'AUTOMATION',
  FULFILLMENT = 'FULFILLMENT',
  COLLABORATION = 'COLLABORATION',
  COMMUNICATION = 'COMMUNICATION',
  INTELLIGENCE = 'INTELLIGENCE',
  ADMIN = 'ADMIN',
  MONITORING_TELEMETRY = 'MONITORING_TELEMETRY',
}

export enum ServiceCriticality {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  TIER_1_CRITICAL = 'CRITICAL',
  TIER_2_STANDARD = 'HIGH',
  TIER_3_DEGRADABLE = 'LOW',
}

export enum ServiceHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  DOWN = 'DOWN',
  UNKNOWN = 'UNKNOWN',
  MAINTENANCE = 'MAINTENANCE',
}

export interface ServiceRegistryEntry {
  service_name: CanonicalService;
  name: CanonicalService | string;
  criticality: ServiceCriticality;
  health_endpoint?: string;
  healthEndpoint?: string;
  timeout_ms: number;
  timeoutMs: number;
  expected_status?: number;
  expectedStatus?: number;
  owner: string;
  enabled: boolean;
  description: string;
  dependencies: (CanonicalService | string)[];
}

export interface ServiceHealthResultDTO {
  service: CanonicalService | string;
  status: ServiceHealthStatus;
  checked_at?: Date | string;
  last_checked_at?: string;
  latency_ms: number;
  criticality?: ServiceCriticality;
  message?: string;
  error_code?: string | null;
  sanitized_message?: string | null;
  error_details?: string;
  dependencies?: string[];
  details?: Record<string, any> | null;
}

export interface PlatformHealthOverviewDTO {
  status?: ServiceHealthStatus;
  overall_status?: ServiceHealthStatus;
  version?: string;
  timestamp?: string;
  uptime_seconds?: number;
  healthy_services_count?: number;
  total_services_count?: number;
  checked_at?: Date | string;
  services: Record<string, ServiceHealthResultDTO> | ServiceHealthResultDTO[];
  dependencies?: DependencyHealthDTO[];
  host_telemetry?: any;
  circuit_breakers?: any[];
  error_summary?: any;
  slos?: any[];
  active_incidents_count?: number;
  open_alerts_count?: number;
  degraded_modes?: string[];
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  environment: string;
  request_id?: string;
  correlation_id?: string;
  event: string;
  duration_ms?: number;
  status?: number | string;
  error_code?: string;
  studio_id?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

export interface CorrelationContext {
  request_id: string;
  correlation_id: string;
  studio_id?: string;
  user_id?: string;
}

export enum PlatformErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum PlatformErrorStatus {
  OPEN = 'OPEN',
  UNRESOLVED = 'UNRESOLVED',
  INVESTIGATING = 'INVESTIGATING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
  SUPPRESSED = 'IGNORED',
}

export interface PlatformErrorEventDTO {
  id: string;
  service: string;
  environment?: string;
  error_code?: string;
  error_name?: string;
  errorName?: string;
  fingerprint: string;
  severity: PlatformErrorSeverity;
  message?: string;
  message_sanitized?: string;
  stack?: string;
  stackTrace?: string;
  stack_hash?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  correlationId?: string | null;
  trace_id?: string | null;
  traceId?: string | null;
  user_id?: string | null;
  userId?: string | null;
  studio_id?: string | null;
  studioId?: string | null;
  endpoint?: string | null;
  status: PlatformErrorStatus | string;
  occurrence_count: number;
  occurrences?: number;
  first_seen_at: Date | string;
  firstSeenAt?: Date | string;
  last_seen_at: Date | string;
  lastSeenAt?: Date | string;
  resolved_at?: Date | string | null;
  resolved_by?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface ErrorFilterParams {
  service?: string;
  status?: PlatformErrorStatus;
  severity?: PlatformErrorSeverity;
  error_code?: string;
  search?: string;
  from?: Date | string;
  to?: Date | string;
  limit?: number;
  page?: number;
}

export interface ErrorSummaryDTO {
  total_errors_24h?: number;
  total_24h?: number;
  unhandled_count?: number;
  total_open?: number;
  resolved_count?: number;
  total_critical?: number;
  by_severity?: Record<string, number>;
  by_service?: Record<string, number>;
  top_frequent?: any[];
  top_fingerprints?: { fingerprint: string; count: number; error_code: string; service: string; message: string }[];
  services_affected?: string[];
}

export enum MetricType {
  COUNTER = 'COUNTER',
  GAUGE = 'GAUGE',
  HISTOGRAM = 'HISTOGRAM',
}

export interface PlatformMetricDTO {
  name: string;
  type: MetricType;
  value: number;
  unit: string;
  service: string;
  labels?: Record<string, string>;
  timestamp: Date | string;
  sampling_rate?: number;
}

export interface LatencyPercentilesDTO {
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  sample_count: number;
  service?: string;
  route?: string;
  method?: string;
  window?: string;
}

export enum SLOStatus {
  MEETING = 'MEETING',
  AT_RISK = 'AT_RISK',
  BREACHED = 'BREACHED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  HEALTHY = 'MEETING',
  WARNING = 'AT_RISK',
}

export interface ReliabilitySLIDTO {
  id?: string;
  name: string;
  description?: string;
  metric_name?: string;
  service?: string;
  formula: string;
  good_events_filter?: string;
  valid_events_filter?: string;
  window?: string;
  value?: number | null;
  unit?: string;
  source?: string;
  sample_count?: number;
}

export interface ReliabilitySLODTO {
  id: string;
  name: string;
  service: string;
  metric?: string;
  target?: number; // e.g. 99.9
  target_percent?: number;
  targetPercent?: number;
  window?: string;
  window_days?: number;
  enabled?: boolean;
  current_sli_percent?: number;
  currentPercent?: number;
  error_budget_target?: number | null;
  error_budget_remaining_percent?: number;
  errorBudgetRemainingPercent?: number;
  burn_rate?: number;
  burnRate?: number;
  status?: SLOStatus | string;
  sli_definition?: ReliabilitySLIDTO;
  description?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SLOEvaluationDTO {
  slo_id: string;
  service?: string;
  metric?: string;
  target?: number;
  target_percent?: number;
  sli_value_percent?: number;
  actual?: number | null;
  status: SLOStatus;
  error_budget_total?: number;
  error_budget_consumed?: number;
  error_budget_remaining_percent?: number;
  error_budget_remaining_pct?: number | null;
  error_budget_burn_rate?: number | null;
  burn_rate?: number;
  window?: string;
  evaluated_at: Date | string;
  message?: string;
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  failure_threshold: number; // e.g. 5 failures
  open_duration_ms: number;  // e.g. 30000ms cooldown
  probe_count: number;       // e.g. 3 probes
  half_open_success_threshold: number;
}

export interface CircuitBreakerStats {
  service?: string;
  service_name: string;
  state: CircuitState;
  failure_count: number;
  success_count: number;
  consecutive_failures?: number;
  failure_rate_percent?: number;
  last_state_change?: string;
  last_failure_time?: string;
  last_success_time?: string;
  next_retry_at?: string;
  last_failure_at?: Date | string | null;
  last_state_change_at?: Date | string;
}

export interface DependencyHealthDTO {
  dependency: string;
  provider: string;
  status: ServiceHealthStatus;
  latency_ms: number;
  circuit_state: CircuitState;
  error_message?: string | null;
  last_checked_at: Date | string;
}

export enum BackupType {
  FULL = 'FULL',
  INCREMENTAL = 'INCREMENTAL',
  DIFFERENTIAL = 'DIFFERENTIAL',
  DATABASE = 'DATABASE',
  OBJECT_STORAGE = 'OBJECT_STORAGE',
  CONFIGURATION = 'CONFIGURATION',
}

export enum BackupStatus {
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
}

export interface BackupRecordDTO {
  id: string;
  backup_type: BackupType;
  status: BackupStatus;
  database_name?: string;
  storage_location?: string;
  size_bytes: number;
  checksum_sha256?: string;
  checksum?: string | null;
  is_verified?: boolean;
  last_verified_at?: Date | string | null;
  retention_days?: number;
  expires_at?: Date | string | null;
  created_by?: string;
  started_at?: Date | string;
  completed_at?: Date | string | null;
  location_reference?: string | null;
  verified_at?: Date | string | null;
  retention_until?: Date | string | null;
  metadata?: Record<string, any> | null;
  created_at: Date | string;
  updated_at?: Date | string;
}

export enum RecoveryStatus {
  PENDING = 'PENDING',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SUCCESS = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface RecoveryRunDTO {
  id: string;
  plan_id?: string;
  backup_id?: string | null;
  type?: string;
  is_drill?: boolean;
  status: RecoveryStatus;
  started_at: Date | string;
  completed_at?: Date | string | null;
  duration_seconds?: number;
  actual_rto_minutes?: number;
  actual_rpo_minutes?: number;
  executed_by?: string;
  operator?: string;
  target_region?: string;
  target_environment?: string;
  verification_results?: Record<string, any> | null;
  verification_result?: Record<string, any> | null;
  execution_logs?: Array<{ step_number: number; message: string; duration_ms: number; status: string }>;
  notes?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export enum DRPlanStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
  READY = 'READY',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  FAILED_TEST = 'FAILED_TEST',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
}

export interface DisasterRecoveryPlanDTO {
  id: string;
  name: string;
  description: string;
  target_rto_minutes: number;
  target_rpo_minutes: number;
  status: DRPlanStatus;
  failover_steps: Array<{
    step_number: number;
    title: string;
    description: string;
    command_or_action: string;
    estimated_duration_seconds: number;
    automated: boolean;
  }>;
  last_drill_at?: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export enum DeploymentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  ROLLED_BACK = 'ROLLED_BACK',
  FAILED = 'FAILED',
}

export interface DeploymentRecordDTO {
  id: string;
  version: string;
  git_commit_sha: string;
  git_branch: string;
  environment: string;
  status: DeploymentStatus;
  deployed_by: string;
  started_at: Date | string;
  completed_at?: Date | string | null;
  duration_seconds?: number;
  migration_applied?: string | null;
  rollback_available?: boolean;
  health_check_passed?: boolean;
  release_notes?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface MigrationValidationResultDTO {
  is_safe?: boolean;
  safe?: boolean;
  migration_name?: string;
  pending_migrations_count?: number;
  has_destructive_changes?: boolean;
  has_breaking_changes?: boolean;
  drift_detected?: boolean;
  warnings: string[];
  schema_version?: string;
  rollback_safe?: boolean;
  checked_at?: string;
}

export interface RollbackValidationResultDTO {
  is_allowed?: boolean;
  can_rollback?: boolean;
  deployment_id?: string;
  target_version?: string;
  current_version?: string;
  requires_schema_revert?: boolean;
  database_compatible?: boolean;
  reason?: string;
  blockers?: string[];
  safe_previous_version?: string;
  checked_at?: string;
}

// ==========================================
// PHASE 42: SEPARATE SUPER ADMIN AUTH & SECURE PORTAL 2.0
// ==========================================

export enum AdminSessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  ROTATED = 'ROTATED',
}

export enum AdminMfaStatus {
  DISABLED = 'DISABLED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ENABLED = 'ENABLED',
  ENFORCED = 'ENFORCED',
}

export enum AdminInvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum AdminPasswordResetStatus {
  PENDING = 'PENDING',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export enum AdminAuthEventType {
  ADMIN_LOGIN_ATTEMPT = 'ADMIN_LOGIN_ATTEMPT',
  ADMIN_LOGIN_SUCCESS = 'ADMIN_LOGIN_SUCCESS',
  ADMIN_LOGIN_FAILURE = 'ADMIN_LOGIN_FAILURE',
  ADMIN_LOGOUT = 'ADMIN_LOGOUT',
  ADMIN_SESSION_REVOKED = 'ADMIN_SESSION_REVOKED',
  ADMIN_LOGOUT_ALL = 'ADMIN_LOGOUT_ALL',
  ADMIN_PASSWORD_RESET_REQUEST = 'ADMIN_PASSWORD_RESET_REQUEST',
  ADMIN_PASSWORD_RESET = 'ADMIN_PASSWORD_RESET',
  ADMIN_MFA_ENROLLED = 'ADMIN_MFA_ENROLLED',
  ADMIN_MFA_VERIFIED = 'ADMIN_MFA_VERIFIED',
  ADMIN_MFA_FAILED = 'ADMIN_MFA_FAILED',
  ADMIN_MFA_DISABLED = 'ADMIN_MFA_DISABLED',
  ADMIN_INVITATION_CREATED = 'ADMIN_INVITATION_CREATED',
  ADMIN_INVITATION_ACCEPTED = 'ADMIN_INVITATION_ACCEPTED',
  ADMIN_ACCOUNT_SUSPENDED = 'ADMIN_ACCOUNT_SUSPENDED',
  ADMIN_ACCOUNT_REACTIVATED = 'ADMIN_ACCOUNT_REACTIVATED',
}

export enum AdminAccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DISABLED = 'DISABLED',
  PENDING = 'PENDING',
  REVOKED = 'REVOKED',
}

export interface AdminSessionDTO {
  id: string;
  session_id?: string;
  admin_user_id: string;
  platform_role: string;
  status: AdminSessionStatus;
  created_at: Date | string;
  last_seen_at: Date | string;
  expires_at: Date | string;
  revoked_at?: Date | string | null;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  device_name?: string | null;
  authentication_version: number;
  mfa_verified: boolean;
  idle_timeout_minutes: number;
  absolute_timeout_minutes: number;
  is_current?: boolean;
}

export interface AdminMfaDTO {
  id: string;
  admin_user_id: string;
  status: AdminMfaStatus;
  enrolled_at?: Date | string | null;
  last_verified_at?: Date | string | null;
  failed_attempts_count?: number;
  locked_until?: Date | string | null;
  recovery_codes_remaining?: number;
}

export interface AdminMfaEnrollResponseDTO {
  secret: string;
  qr_code_uri: string;
  recovery_codes: string[];
}

export interface AdminInvitationDTO {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  status: AdminInvitationStatus;
  expires_at: Date | string;
  accepted_at?: Date | string | null;
  created_at: Date | string;
}

export interface AdminPasswordResetDTO {
  id: string;
  admin_user_id: string;
  email: string;
  status: AdminPasswordResetStatus;
  expires_at: Date | string;
  used_at?: Date | string | null;
  created_at: Date | string;
}

export interface AdminAuthEventDTO {
  id: string;
  admin_user_id?: string | null;
  email?: string | null;
  event_type: AdminAuthEventType;
  status: string;
  request_id?: string | null;
  correlation_id?: string | null;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  details?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date | string;
}

export interface AdminLoginRequestDTO {
  email: string;
  password: string;
  remember_me?: boolean;
  mfa_code?: string;
}

export interface AdminLoginResponseDTO {
  success: boolean;
  mfa_required?: boolean;
  temp_token?: string;
  session?: AdminSessionDTO;
  session_token?: string;
  admin?: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
  message?: string;
}

export interface AdminMfaVerifyRequestDTO {
  temp_token?: string;
  session_token?: string;
  mfa_code: string;
  is_recovery_code?: boolean;
}

export interface AdminSessionSummaryDTO {
  total_active_sessions: number;
  unique_admins_count: number;
  sessions_by_role: Record<string, number>;
  mfa_enforced_percentage: number;
}

export interface AdminSecurityStatsDTO {
  active_sessions_count: number;
  mfa_enabled_count: number;
  mfa_enforced_count: number;
  recent_failed_logins_24h: number;
  recent_security_events_count: number;
  suspended_admins_count: number;
}

export interface AdminPasswordResetRequestDTO {
  email: string;
}

export interface AdminPasswordResetExecuteDTO {
  token: string;
  new_password: string;
}

export interface AdminInvitationCreateDTO {
  email: string;
  role: string;
}

export interface AdminInvitationAcceptDTO {
  token: string;
  name: string;
  password: string;
}

// ==========================================
// PHASE 43: PLATFORM SECURITY OPERATIONS CENTER (SOC) & THREAT DETECTION 2.0
// ==========================================

export enum SecurityEventCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  SESSION = 'SESSION',
  API_ABUSE = 'API_ABUSE',
  RATE_LIMIT = 'RATE_LIMIT',
  TENANT_SECURITY = 'TENANT_SECURITY',
  PRIVILEGE = 'PRIVILEGE',
  STORAGE = 'STORAGE',
  OAUTH = 'OAUTH',
  PAYMENT = 'PAYMENT',
  WEBHOOK = 'WEBHOOK',
  CLIENT_PORTAL = 'CLIENT_PORTAL',
  AI = 'AI',
  DOWNLOAD = 'DOWNLOAD',
  COMMUNICATION = 'COMMUNICATION',
  AUTOMATION = 'AUTOMATION',
  CONFIGURATION = 'CONFIGURATION',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  DATA_ACCESS = 'DATA_ACCESS',
}

export enum SecuritySeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum SecurityConfidence {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum SecurityEventStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  SUPPRESSED = 'SUPPRESSED',
}

export enum SecurityInvestigationStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  CONTAINED = 'CONTAINED',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

export interface PlatformSecurityEventDTO {
  id: string;
  event_type: string;
  category: SecurityEventCategory;
  severity: SecuritySeverity;
  confidence: SecurityConfidence;
  status: SecurityEventStatus;
  service: string;
  source: string;
  studio_id?: string | null;
  user_id?: string | null;
  admin_user_id?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  fingerprint: string;
  reason_code: string;
  sanitized_metadata: Record<string, unknown>;
  first_seen_at: Date | string;
  last_seen_at: Date | string;
  occurrence_count: number;
  created_at: Date | string;
  updated_at: Date | string;
  investigations?: PlatformSecurityInvestigationDTO[];
}

export interface SecurityInvestigationNoteDTO {
  id: string;
  admin_id: string;
  admin_name?: string;
  note: string;
  created_at: Date | string;
}

export interface PlatformSecurityInvestigationDTO {
  id: string;
  security_event_id: string;
  status: SecurityInvestigationStatus;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  opened_at: Date | string;
  closed_at?: Date | string | null;
  resolution?: string | null;
  notes: SecurityInvestigationNoteDTO[];
  created_at: Date | string;
  updated_at: Date | string;
  security_event?: PlatformSecurityEventDTO;
}

export interface PlatformSecurityRuleDTO {
  id: string;
  rule_id: string;
  name: string;
  description: string;
  category: SecurityEventCategory;
  severity: SecuritySeverity;
  enabled: boolean;
  threshold: number;
  window_seconds: number;
  cooldown_seconds: number;
  action: string;
  suppressed_until?: Date | string | null;
  suppressed_reason?: string | null;
  suppressed_by?: string | null;
  last_triggered_at?: Date | string | null;
  trigger_count: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SecurityIngestEventDTO {
  event_type: string;
  category?: SecurityEventCategory;
  severity?: SecuritySeverity;
  confidence?: SecurityConfidence;
  service?: string;
  source?: string;
  studio_id?: string | null;
  user_id?: string | null;
  admin_user_id?: string | null;
  request_id?: string | null;
  correlation_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  resource_type?: string | null;
  resource_id?: string | null;
  reason_code: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityEventFilterDTO {
  category?: SecurityEventCategory | string;
  severity?: SecuritySeverity | string;
  status?: SecurityEventStatus | string;
  service?: string;
  studio_id?: string;
  search?: string;
  fingerprint?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface SecurityOverviewMetricsDTO {
  open_events_count: number;
  high_severity_count: number;
  critical_events_count: number;
  authentication_failures_count: number;
  authorization_denials_count: number;
  rate_limit_events_count: number;
  webhook_failures_count: number;
  active_investigations_count: number;
  enabled_rules_count: number;
  suppressed_rules_count: number;
  total_events_24h: number;
  status_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
}

export interface SecurityTimelineFilterDTO {
  service?: string;
  studio_id?: string;
  actor_id?: string;
  category?: string;
  severity?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export interface SecurityTimelineItemDTO {
  id: string;
  item_type: 'SECURITY_EVENT' | 'PLATFORM_ALERT' | 'PLATFORM_INCIDENT' | 'ADMIN_AUTH' | 'RELIABILITY' | 'CONFIG_CHANGE';
  timestamp: Date | string;
  title: string;
  summary: string;
  severity: string;
  source: string;
  studio_id?: string | null;
  correlation_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SecurityRuleUpdateDTO {
  enabled?: boolean;
  threshold?: number;
  window_seconds?: number;
  cooldown_seconds?: number;
  severity?: SecuritySeverity;
}

export interface SecurityRuleSuppressDTO {
  suppressed_until: Date | string;
  suppressed_reason: string;
  suppressed_by: string;
}

export interface SecurityFalsePositiveDTO {
  reason: string;
}

export interface SecurityInvestigationCreateDTO {
  security_event_id: string;
  assigned_admin_id?: string;
  initial_note?: string;
}

export interface SecurityInvestigationUpdateDTO {
  status?: SecurityInvestigationStatus;
  assigned_admin_id?: string | null;
  resolution?: string;
}

// =========================================================================
// PHASE 44: PLATFORM DATA GOVERNANCE, PRIVACY & COMPLIANCE CENTER 2.0
// =========================================================================

export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  PERSONAL = 'PERSONAL',
  SENSITIVE_PERSONAL = 'SENSITIVE_PERSONAL',
  BIOMETRIC = 'BIOMETRIC',
  FINANCIAL = 'FINANCIAL',
  AUTHENTICATION_SECRET = 'AUTHENTICATION_SECRET',
  SECURITY_DATA = 'SECURITY_DATA',
  SYSTEM_DATA = 'SYSTEM_DATA',
}

export enum DataCategory {
  IDENTITY = 'IDENTITY',
  SECURITY = 'SECURITY',
  BIOMETRIC = 'BIOMETRIC',
  MEDIA = 'MEDIA',
  METADATA = 'METADATA',
  CONTRACTUAL = 'CONTRACTUAL',
  FINANCIAL = 'FINANCIAL',
  COMMUNICATIONS = 'COMMUNICATIONS',
  AUDIT_LOGS = 'AUDIT_LOGS',
  ANALYTICS = 'ANALYTICS',
  AI_METADATA = 'AI_METADATA',
  STORAGE_INTEGRATION = 'STORAGE_INTEGRATION',
  TECHNICAL = 'TECHNICAL',
  COLLABORATION = 'COLLABORATION',
  OPERATIONAL = 'OPERATIONAL',
  COMPLIANCE = 'COMPLIANCE',
  MARKETING = 'MARKETING',
  USER_PROFILE = 'USER_PROFILE',
  STUDIO_PROFILE = 'STUDIO_PROFILE',
  GALLERY_MEDIA = 'GALLERY_MEDIA',
  BIOMETRIC_DATA = 'BIOMETRIC_DATA',
  CLIENT_DATA = 'CLIENT_DATA',
  ORDER_PAYMENT = 'ORDER_PAYMENT',
  ACCOUNTING_TAX = 'ACCOUNTING_TAX',
  LEGAL_CONTRACT = 'LEGAL_CONTRACT',
  COMMUNICATION = 'COMMUNICATION',
  TEAM_WORKFORCE = 'TEAM_WORKFORCE',
  SYSTEM_AUDIT_SECURITY = 'SYSTEM_AUDIT_SECURITY',
}

export enum DataOwnerType {
  STUDIO_USER = 'STUDIO_USER',
  PLATFORM_INTERNAL = 'PLATFORM_INTERNAL',
  END_CLIENT = 'END_CLIENT',
  STUDIO_PHOTOGRAPHER = 'STUDIO_PHOTOGRAPHER',
  PLATFORM = 'PLATFORM',
  STUDIO = 'STUDIO',
  USER = 'USER',
  CLIENT = 'CLIENT',
  SYSTEM = 'SYSTEM',
}

export enum DataProcessingPurpose {
  GALLERY_DELIVERY = 'GALLERY_DELIVERY',
  PHOTO_PROCESSING = 'PHOTO_PROCESSING',
  FACE_MATCHING = 'FACE_MATCHING',
  AI_INDEXING = 'AI_INDEXING',
  SERVICE_DELIVERY = 'SERVICE_DELIVERY',
  CLIENT_COMMUNICATION = 'CLIENT_COMMUNICATION',
  COMMUNICATIONS = 'COMMUNICATIONS',
  BILLING = 'BILLING',
  ACCOUNTING = 'ACCOUNTING',
  FINANCIAL_REPORTING = 'FINANCIAL_REPORTING',
  SECURITY = 'SECURITY',
  SECURITY_AUDIT = 'SECURITY_AUDIT',
  RELIABILITY = 'RELIABILITY',
  ANALYTICS = 'ANALYTICS',
  LEGAL_RECORD = 'LEGAL_RECORD',
  LEGAL_COMPLIANCE = 'LEGAL_COMPLIANCE',
  AUTHENTICATION = 'AUTHENTICATION',
}

export enum RetentionAction {
  DELETE = 'DELETE',
  ANONYMIZE = 'ANONYMIZE',
  ARCHIVE = 'ARCHIVE',
  RETAIN = 'RETAIN',
}

export enum RetentionTrigger {
  ACCOUNT_CLOSURE = 'ACCOUNT_CLOSURE',
  GALLERY_EXPIRATION = 'GALLERY_EXPIRATION',
  CLIENT_REQUEST = 'CLIENT_REQUEST',
  PROJECT_COMPLETION = 'PROJECT_COMPLETION',
  CONTRACT_COMPLETION = 'CONTRACT_COMPLETION',
  ORDER_COMPLETION = 'ORDER_COMPLETION',
  SECURITY_EVENT_RESOLUTION = 'SECURITY_EVENT_RESOLUTION',
  SYSTEM_POLICY = 'SYSTEM_POLICY',
}

export enum LegalHoldStatus {
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export enum PrivacyRequestType {
  ACCESS = 'ACCESS',
  EXPORT = 'EXPORT',
  DELETION = 'DELETION',
  RECTIFICATION = 'RECTIFICATION',
  RESTRICTION = 'RESTRICTION',
}

export enum PrivacyRequestStatus {
  RECEIVED = 'RECEIVED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  IDENTITY_REVIEW = 'IDENTITY_REVIEW',
  IN_REVIEW = 'IN_REVIEW',
  IN_PROGRESS = 'IN_PROGRESS',
  PROCESSING = 'PROCESSING',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  FLAGGED_FOR_REVIEW = 'FLAGGED_FOR_REVIEW',
}

export enum PrivacyRequestActor {
  END_CLIENT = 'END_CLIENT',
  CLIENT = 'CLIENT',
  STUDIO_USER = 'STUDIO_USER',
  STUDIO_OWNER = 'STUDIO_OWNER',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

export enum PrivacyDeletionState {
  REQUESTED = 'REQUESTED',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  IN_PROGRESS = 'IN_PROGRESS',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  BLOCKED_BY_LEGAL_HOLD = 'BLOCKED_BY_LEGAL_HOLD',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum AccessReviewStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  NEEDS_REMEDIATION = 'NEEDS_REMEDIATION',
  CURRENT = 'CURRENT',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
  EXPIRED = 'EXPIRED',
}

export enum ConsentStatus {
  GRANTED = 'GRANTED',
  REVOKED = 'REVOKED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

export interface PlatformDataAssetDTO {
  id: string;
  assetKey: string;
  name: string;
  description?: string;
  classification: DataClassification;
  category: DataCategory;
  ownerType: DataOwnerType;
  storageEngine: string;
  tableName?: string;
  personalData: boolean;
  sensitivePersonalData: boolean;
  biometricData: boolean;
  financialData: boolean;
  purposes: DataProcessingPurpose[];
  legalBasis: string;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  retentionDays?: number;
  anonymizationMethod?: string;
  exportable: boolean;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PlatformDataLineageDTO {
  id: string;
  sourceAssetId: string;
  targetAssetId: string;
  transformationType: string;
  processingPurpose: DataProcessingPurpose;
  syncFrequency?: string;
  description?: string;
  metadata?: Record<string, any>;
  sourceAssetName?: string;
  targetAssetName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DataRetentionPolicyDTO {
  id: string;
  name: string;
  description?: string;
  assetId?: string;
  classification?: DataClassification;
  durationDays: number;
  action: RetentionAction;
  trigger: RetentionTrigger;
  legalJustification: string;
  enabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DataLegalHoldDTO {
  id: string;
  name: string;
  caseNumber: string;
  custodian: string;
  reason: string;
  assetId?: string;
  studioId?: string;
  userId?: string;
  status: LegalHoldStatus;
  issuedAt: Date | string;
  releasedAt?: Date | string;
  releaseReason?: string;
  metadata?: Record<string, any>;
  assetName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PlatformPrivacyRequestDTO {
  id: string;
  requestType: PrivacyRequestType;
  actorType: PrivacyRequestActor;
  status: PrivacyRequestStatus;
  subjectEmail: string;
  subjectName?: string;
  userId?: string;
  studioId?: string;
  details?: string;
  identityVerified: boolean;
  verifiedAt?: Date | string;
  deadline: Date | string;
  completedAt?: Date | string;
  rejectionReason?: string;
  assignedAdminId?: string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PrivacyExportRecordDTO {
  id: string;
  privacyRequestId?: string;
  userId?: string;
  subjectEmail: string;
  exportFormat: string;
  fileSizeBytes: number;
  downloadToken: string;
  downloadUrl?: string;
  checksumSha256: string;
  expiresAt: Date | string;
  includedCategories: string[];
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DataDeletionExecutionDTO {
  id: string;
  privacyRequestId?: string;
  userId?: string;
  subjectEmail: string;
  state: PrivacyDeletionState;
  approvedByAdminId?: string;
  itemsDeletedCount: number;
  itemsAnonymizedCount: number;
  itemsRetainedCount: number;
  executionReport?: Record<string, any>;
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface DataAccessReviewDTO {
  id: string;
  title: string;
  description?: string;
  assetIds: string[];
  status: AccessReviewStatus;
  dueDate: Date | string;
  reviewerAdminId?: string;
  findingsSummary?: string;
  revocationsCount: number;
  completedAt?: Date | string;
  metadata?: Record<string, any>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PrivacyConsentRecordDTO {
  id: string;
  userId?: string;
  studioId?: string;
  consentType: string;
  status: ConsentStatus;
  purpose: string;
  version: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  consentedAt: Date | string;
  revokedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ThirdPartyProviderMapDTO {
  id: string;
  name: string;
  category: string;
  purpose: string;
  dataTransferred: string[];
  dataClassification: DataClassification;
  countryOrRegion: string;
  transferMechanism: string;
  dpaStatus: string;
  securityCertifications: string[];
  lastReviewedAt: Date | string;
}

export interface PrivacyOverviewMetricsDTO {
  totalDataAssets: number;
  personalDataAssetsCount: number;
  sensitivePersonalDataAssetsCount: number;
  biometricDataAssetsCount: number;
  financialDataAssetsCount: number;
  assetsByClassification: Record<string, number>;
  assetsByOwnerType: Record<string, number>;
  activeRetentionPolicies: number;
  activeLegalHolds: number;
  totalPrivacyRequests: number;
  pendingPrivacyRequests: number;
  completedPrivacyRequests: number;
  rejectedPrivacyRequests: number;
  requestsByType: Record<string, number>;
  requestsByStatus: Record<string, number>;
  activeAccessReviews: number;
  thirdPartyProvidersCount: number;
  consentsGranted: number;
  consentsRevoked: number;
  completedDeletionsCount: number;
}

export interface PrivacyRequestFilterDTO {
  requestType?: PrivacyRequestType;
  status?: PrivacyRequestStatus;
  actorType?: PrivacyRequestActor;
  studioId?: string;
  userId?: string;
  search?: string;
}

export interface DataAssetFilterDTO {
  classification?: DataClassification;
  category?: DataCategory;
  ownerType?: DataOwnerType;
  personalData?: boolean;
  sensitivePersonalData?: boolean;
  biometricData?: boolean;
  financialData?: boolean;
  exportable?: boolean;
  search?: string;
}

// =============================================================
// PHASE 45: PLATFORM CONFIGURATION, FEATURE FLAGS & CONTROLLED RELEASE MANAGEMENT 2.0
// =============================================================

export enum FeatureFlagType {
  BOOLEAN = 'BOOLEAN',
  PERCENTAGE = 'PERCENTAGE',
  VARIANT = 'VARIANT',
  ALLOWLIST = 'ALLOWLIST',
  PLAN = 'PLAN',
  STUDIO = 'STUDIO',
  ENVIRONMENT = 'ENVIRONMENT',
}

export enum FeatureFlagState {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ROLLED_BACK = 'ROLLED_BACK',
  ARCHIVED = 'ARCHIVED',
}

export enum PlatformEnvironment {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
}

export enum PlatformConfigCategory {
  PLATFORM = 'PLATFORM',
  SECURITY = 'SECURITY',
  RELIABILITY = 'RELIABILITY',
  AI = 'AI',
  AI_PROCESSING = 'AI_PROCESSING',
  STORAGE = 'STORAGE',
  EMAIL = 'EMAIL',
  PAYMENTS = 'PAYMENTS',
  CLIENT_PORTAL = 'CLIENT_PORTAL',
  FINANCE = 'FINANCE',
  COMMUNICATION = 'COMMUNICATION',
  AUTOMATION = 'AUTOMATION',
  PRIVACY = 'PRIVACY',
  SYSTEM = 'SYSTEM',
}

export enum PlatformConfigType {
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON',
  ENUM = 'ENUM',
  SECRET_REFERENCE = 'SECRET_REFERENCE',
}

export enum ChangeRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum ChangeRequestType {
  FEATURE_FLAG = 'FEATURE_FLAG',
  CONFIGURATION = 'CONFIGURATION',
  RELEASE = 'RELEASE',
  EMERGENCY_KILL_SWITCH = 'EMERGENCY_KILL_SWITCH',
}

export enum ChangeRequestStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  ROLLED_BACK = 'ROLLED_BACK',
}

export enum ChangeApprovalDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PlatformReleaseStatus {
  DRAFT = 'DRAFT',
  VALIDATING = 'VALIDATING',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  DEPLOYING = 'DEPLOYING',
  HEALTH_CHECK = 'HEALTH_CHECK',
  ACTIVE = 'ACTIVE',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  CANCELLED = 'CANCELLED',
}

export enum ReleaseHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
}

export enum DriftStatus {
  DETECTED = 'DETECTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
}

export interface FeatureFlagVariant {
  key: string;
  name: string;
  weight_pct: number;
  payload?: any;
}

export interface FeatureFlagTargetingRules {
  studios_allowlist?: string[];
  studios_blocklist?: string[];
  users_allowlist?: string[];
  plans_allowlist?: SubscriptionPlan[];
  environments?: PlatformEnvironment[];
  custom_attributes?: Record<string, any>;
}

export interface FeatureFlagVersionDTO {
  id: string;
  flag_id: string;
  version: number;
  configuration: {
    enabled: boolean;
    state: FeatureFlagState;
    type: FeatureFlagType;
    rollout_pct: number;
    variants?: FeatureFlagVariant[];
    default_variant?: string | null;
    targeting?: FeatureFlagTargetingRules;
    kill_switch_enabled?: boolean;
    kill_switch_reason?: string | null;
  };
  change_reason?: string | null;
  changeReason?: string | null;
  created_by?: string | null;
  approved_by?: string | null;
  created_at?: Date | string;
  createdAt?: Date | string;
}

export interface PlatformFeatureFlagV2DTO {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  flag_type: FeatureFlagType;
  type?: FeatureFlagType;
  state: FeatureFlagState;
  enabled: boolean;
  environment: PlatformEnvironment;
  scope?: FeatureFlagScope;
  plan_tier?: SubscriptionPlan | null;
  studio_id?: string | null;
  rollout_pct?: number;
  percentage?: number;
  variants?: FeatureFlagVariant[];
  default_variant?: string | null;
  targeting?: FeatureFlagTargetingRules;
  allowedPlans?: string[];
  allowedStudios?: string[];
  blockedStudios?: string[];
  environments?: string[];
  current_version: number;
  version?: number;
  kill_switch_enabled: boolean;
  kill_switch_reason?: string | null;
  kill_switch_activated_at?: Date | string | null;
  kill_switch_activated_by?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface EvaluationContext {
  studio_id?: string;
  user_id?: string;
  plan?: SubscriptionPlan;
  environment?: PlatformEnvironment | string;
  attributes?: Record<string, any>;
}

export interface FeatureFlagEvaluationResult {
  enabled: boolean;
  flag_key: string;
  variant?: string | null;
  reason: string;
  bucket?: number;
  version: number;
  kill_switch_active?: boolean;
}

export interface PlatformConfigurationDTO {
  id: string;
  category: PlatformConfigCategory;
  key: string;
  name?: string;
  type: PlatformConfigType;
  value: any;
  raw_value?: string;
  rawValue?: string;
  environment: PlatformEnvironment;
  version: number;
  risk_level?: ChangeRiskLevel;
  riskLevel?: ChangeRiskLevel;
  description?: string | null;
  validation_schema?: {
    min_value?: number;
    max_value?: number;
    allowed_values?: string[];
    regex_pattern?: string;
    required_fields?: string[];
  } | null;
  validationRules?: any;
  is_secret_reference?: boolean;
  isSecret?: boolean;
  secret_reference_key?: string | null;
  secretReferenceKey?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ConfigurationDiffDTO {
  config_key?: string;
  configKey?: string;
  environment: PlatformEnvironment;
  old_version?: number;
  new_version?: number;
  previousVersion?: number;
  proposedVersion?: number;
  old_value?: any;
  new_value?: any;
  previousValue?: any;
  proposedValue?: any;
  diff_type?: 'MODIFIED' | 'ADDED' | 'REMOVED';
  diffType?: 'MODIFIED' | 'ADDED' | 'REMOVED';
  risk_level?: ChangeRiskLevel;
  riskLevel?: ChangeRiskLevel;
  is_secret?: boolean;
  isSecret?: boolean;
  requires_two_person_approval?: boolean;
  requiresTwoPersonApproval?: boolean;
}

export interface PlatformChangeApprovalDTO {
  id: string;
  request_id?: string;
  requestId?: string;
  target_version?: number;
  targetVersion?: number;
  approver_id?: string;
  approverId?: string;
  approver_email?: string;
  approverEmail?: string;
  decision: ChangeApprovalDecision;
  reason?: string;
  comment?: string;
  decided_at?: Date | string;
  createdAt?: Date | string;
}

export interface PlatformChangeRequestDTO {
  id: string;
  type: ChangeRequestType;
  title: string;
  description?: string;
  reason?: string;
  target_resource_id?: string | null;
  target_resource_key?: string;
  targetResourceId?: string | null;
  targetKey?: string;
  target_version?: number;
  targetVersion?: number;
  environment: PlatformEnvironment;
  risk_level?: ChangeRiskLevel;
  riskLevel?: ChangeRiskLevel;
  status: ChangeRequestStatus;
  requested_by?: string;
  requestedBy?: string;
  requested_by_email?: string;
  requested_at?: Date | string;
  scheduled_at?: Date | string | null;
  expires_at?: Date | string | null;
  executed_at?: Date | string | null;
  executed_by?: string | null;
  cancelled_at?: Date | string | null;
  cancellation_reason?: string | null;
  diff_payload?: Record<string, any>;
  proposedValue?: any;
  impact_analysis?: {
    affected_services: string[];
    affected_routes: string[];
    affected_flags?: string[];
    affected_configurations?: string[];
    estimated_blast_radius: 'LOW' | 'MEDIUM' | 'HIGH' | 'PLATFORM_WIDE';
  };
  impactAnalysis?: any;
  approvals: PlatformChangeApprovalDTO[];
  requires_two_person_approval?: boolean;
  requiresTwoPersonApproval?: boolean;
  metadata?: Record<string, any>;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PlatformReleaseDTO {
  id: string;
  version: string;
  name?: string;
  description?: string;
  environment: PlatformEnvironment;
  status: PlatformReleaseStatus;
  commit_reference?: string;
  commitReference?: string;
  release_notes?: {
    summary: string;
    changes: string[];
    fixes?: string[];
    breaking_changes?: string[];
    migration_notes?: string[];
    rollback_notes?: string[];
  };
  created_by?: string;
  approved_by?: string | null;
  started_at?: Date | string;
  completed_at?: Date | string | null;
  deployedAt?: Date | string | null;
  rolloutPercentage?: number;
  health_check_status?: ReleaseHealthStatus;
  healthStatus?: ReleaseHealthStatus;
  health_metrics?: {
    error_rate_pct: number;
    latency_p95_ms: number;
    availability_pct: number;
    queue_backlog_count: number;
    active_incidents_count: number;
    observation_window_minutes: number;
  };
  healthMetrics?: any;
  rollback_available?: boolean;
  rollback_reason?: string | null;
  rolled_back_at?: Date | string | null;
  rolled_back_by?: string | null;
  metadata?: Record<string, any>;
  created_at?: Date | string;
  updated_at?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ConfigurationDriftEventDTO {
  id: string;
  environment: PlatformEnvironment;
  resource_type?: 'CONFIGURATION' | 'FEATURE_FLAG' | 'MIGRATION';
  resource_key?: string;
  key?: string;
  expected_value?: any;
  expectedValue?: any;
  actual_value?: any;
  actualValue?: any;
  status: DriftStatus;
  detected_at?: Date | string;
  detectedAt?: Date | string;
  acknowledged_at?: Date | string | null;
  acknowledged_by?: string | null;
  resolved_at?: Date | string | null;
  resolved_by?: string | null;
}

export interface EnvironmentComparisonItemDTO {
  resource_key?: string;
  key?: string;
  resource_type?: 'CONFIGURATION' | 'FEATURE_FLAG';
  development_value?: any;
  devValue?: any;
  staging_value?: any;
  stagingValue?: any;
  production_value?: any;
  prodValue?: any;
  is_drift?: boolean;
  match?: boolean;
  risk_level?: ChangeRiskLevel;
  is_secret?: boolean;
  isSecret?: boolean;
}

export interface ReleaseOverviewMetricsDTO {
  active_releases_count?: number;
  activeReleases?: number;
  pending_change_requests?: number;
  pendingChangeRequests?: number;
  scheduled_changes_count?: number;
  active_feature_flags_count?: number;
  activeFeatureFlags?: number;
  totalFeatureFlags?: number;
  totalConfigurations?: number;
  kill_switches_active_count?: number;
  configuration_keys_count?: number;
  detected_drifts_count?: number;
  unresolvedDriftEvents?: number;
  unhealthy_releases_count?: number;
  production_health_status?: ReleaseHealthStatus;
}













