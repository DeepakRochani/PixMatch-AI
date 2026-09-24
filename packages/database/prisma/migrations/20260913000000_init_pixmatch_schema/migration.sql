-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'STUDIO_OWNER', 'STUDIO_MEMBER', 'CLIENT');

-- CreateEnum
CREATE TYPE "StudioMemberRole" AS ENUM ('OWNER', 'ADMIN', 'PHOTOGRAPHER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "GalleryAccessType" AS ENUM ('PUBLIC', 'UNLISTED', 'PASSWORD', 'PRIVATE');

-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StorageProviderType" AS ENUM ('PLATFORM', 'GOOGLE_DRIVE', 'DROPBOX', 'ONEDRIVE', 'S3', 'CLOUDFLARE_R2', 'GENERIC_S3', 'EXTERNAL_URL');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('PENDING', 'UPLOADING', 'UPLOADED', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('PHOTO_PROCESSING', 'IMAGE_UPLOAD', 'THUMBNAIL_GENERATION', 'METADATA_EXTRACTION', 'FACE_INDEXING', 'AI_PROCESSING', 'AI_FACE_SEARCH', 'STORAGE_SYNC', 'GALLERY_CLEANUP');

-- CreateEnum
CREATE TYPE "PhotoVersionType" AS ENUM ('ORIGINAL', 'THUMBNAIL_SM', 'THUMBNAIL_MD', 'THUMBNAIL_LG');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'STARTER', 'PRO', 'STUDIO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "StorageMode" AS ENUM ('IMPORT', 'CONNECTED');

-- CreateEnum
CREATE TYPE "StorageSyncStatus" AS ENUM ('IDLE', 'QUEUED', 'SYNCING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StorageConnectionStatus" AS ENUM ('ACTIVE', 'CONNECTED', 'SYNCING', 'ERROR', 'REAUTH_REQUIRED', 'DISCONNECTED', 'READY');

-- CreateEnum
CREATE TYPE "DownloadJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDIO_OWNER',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studios" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "role" "StudioMemberRole" NOT NULL DEFAULT 'PHOTOGRAPHER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "galleries" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "event_type" TEXT NOT NULL DEFAULT 'Wedding',
    "event_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "cover_photo_url" TEXT,
    "access_type" "GalleryAccessType" NOT NULL DEFAULT 'PUBLIC',
    "status" "GalleryStatus" NOT NULL DEFAULT 'ACTIVE',
    "password_hash" TEXT,
    "enable_ai_face_search" BOOLEAN NOT NULL DEFAULT true,
    "ai_indexing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "face_match_sensitivity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "total_faces_detected" INTEGER NOT NULL DEFAULT 0,
    "ai_indexed_photos_count" INTEGER NOT NULL DEFAULT 0,
    "is_unlisted" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "downloads_enabled" BOOLEAN NOT NULL DEFAULT true,
    "download_originals_enabled" BOOLEAN NOT NULL DEFAULT true,
    "bulk_download_enabled" BOOLEAN NOT NULL DEFAULT true,
    "watermark_mode" TEXT NOT NULL DEFAULT 'NONE',
    "client_views_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "galleries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "cover_photo_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "album_id" TEXT,
    "storage_provider" "StorageProviderType" NOT NULL DEFAULT 'PLATFORM',
    "storage_path" TEXT NOT NULL,
    "external_file_id" TEXT,
    "source_provider" "StorageProviderType",
    "source_file_id" TEXT,
    "source_path" TEXT,
    "source_modified_at" TIMESTAMP(3),
    "source_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "storage_connection_id" TEXT,
    "original_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "original_filename" TEXT,
    "file_hash" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL DEFAULT 'image/jpeg',
    "processing_status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "face_count" INTEGER NOT NULL DEFAULT 0,
    "is_face_indexed" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_versions" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "version_type" "PhotoVersionType" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL DEFAULT 'image/webp',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_detections" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "bounding_box" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "face_quality_score" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "embedding" DOUBLE PRECISION[],
    "embedding_model" TEXT NOT NULL DEFAULT 'buffalo_l',
    "embedding_dimension" INTEGER NOT NULL DEFAULT 512,
    "model_version" TEXT NOT NULL DEFAULT '1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_detections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_connections" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "provider" "StorageProviderType" NOT NULL DEFAULT 'PLATFORM',
    "display_name" TEXT NOT NULL,
    "provider_account_id" TEXT,
    "provider_account_email" TEXT,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expires_at" TIMESTAMP(3),
    "storage_mode" "StorageMode" NOT NULL DEFAULT 'IMPORT',
    "metadata" JSONB,
    "configuration" JSONB,
    "status" "StorageConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "storage_used_bytes" BIGINT NOT NULL DEFAULT 0,
    "last_sync_at" TIMESTAMP(3),
    "last_successful_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storage_sync_jobs" (
    "id" TEXT NOT NULL,
    "storage_connection_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "status" "StorageSyncStatus" NOT NULL DEFAULT 'QUEUED',
    "storage_mode" "StorageMode" NOT NULL DEFAULT 'IMPORT',
    "files_discovered" INTEGER NOT NULL DEFAULT 0,
    "files_imported" INTEGER NOT NULL DEFAULT 0,
    "files_skipped" INTEGER NOT NULL DEFAULT 0,
    "files_updated" INTEGER NOT NULL DEFAULT 0,
    "files_deleted" INTEGER NOT NULL DEFAULT 0,
    "files_failed" INTEGER NOT NULL DEFAULT 0,
    "current_cursor" TEXT,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "gallery_id" TEXT,
    "photo_id" TEXT,
    "job_type" "JobType" NOT NULL,
    "status" "ProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "storage_limit_bytes" BIGINT NOT NULL DEFAULT 2147483648,
    "photo_limit" INTEGER NOT NULL DEFAULT 500,
    "ai_search_limit" INTEGER NOT NULL DEFAULT 50,
    "current_period_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_client_sessions" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "ip_hash" TEXT,
    "user_agent_hash" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_client_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_favorites" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_selections" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_download_jobs" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "status" "DownloadJobStatus" NOT NULL DEFAULT 'QUEUED',
    "photo_count" INTEGER NOT NULL DEFAULT 0,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "download_url" TEXT,
    "storage_path" TEXT,
    "error_message" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_download_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "studios_slug_key" ON "studios"("slug");

-- CreateIndex
CREATE INDEX "studios_slug_idx" ON "studios"("slug");

-- CreateIndex
CREATE INDEX "studio_memberships_studio_id_idx" ON "studio_memberships"("studio_id");

-- CreateIndex
CREATE INDEX "studio_memberships_user_id_idx" ON "studio_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_memberships_user_id_studio_id_key" ON "studio_memberships"("user_id", "studio_id");

-- CreateIndex
CREATE INDEX "galleries_studio_id_idx" ON "galleries"("studio_id");

-- CreateIndex
CREATE INDEX "galleries_slug_idx" ON "galleries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "galleries_studio_id_slug_key" ON "galleries"("studio_id", "slug");

-- CreateIndex
CREATE INDEX "albums_gallery_id_idx" ON "albums"("gallery_id");

-- CreateIndex
CREATE INDEX "albums_studio_id_idx" ON "albums"("studio_id");

-- CreateIndex
CREATE INDEX "photos_studio_id_idx" ON "photos"("studio_id");

-- CreateIndex
CREATE INDEX "photos_gallery_id_idx" ON "photos"("gallery_id");

-- CreateIndex
CREATE INDEX "photos_album_id_idx" ON "photos"("album_id");

-- CreateIndex
CREATE INDEX "photos_gallery_id_file_hash_idx" ON "photos"("gallery_id", "file_hash");

-- CreateIndex
CREATE INDEX "photos_storage_connection_id_idx" ON "photos"("storage_connection_id");

-- CreateIndex
CREATE INDEX "photos_source_file_id_idx" ON "photos"("source_file_id");

-- CreateIndex
CREATE INDEX "photos_processing_status_idx" ON "photos"("processing_status");

-- CreateIndex
CREATE INDEX "photos_sort_order_idx" ON "photos"("sort_order");

-- CreateIndex
CREATE INDEX "photo_versions_photo_id_idx" ON "photo_versions"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "photo_versions_photo_id_version_type_key" ON "photo_versions"("photo_id", "version_type");

-- CreateIndex
CREATE INDEX "face_detections_studio_id_idx" ON "face_detections"("studio_id");

-- CreateIndex
CREATE INDEX "face_detections_gallery_id_idx" ON "face_detections"("gallery_id");

-- CreateIndex
CREATE INDEX "face_detections_photo_id_idx" ON "face_detections"("photo_id");

-- CreateIndex
CREATE INDEX "face_detections_gallery_id_photo_id_idx" ON "face_detections"("gallery_id", "photo_id");

-- CreateIndex
CREATE INDEX "face_detections_studio_id_gallery_id_idx" ON "face_detections"("studio_id", "gallery_id");

-- CreateIndex
CREATE INDEX "clients_studio_id_idx" ON "clients"("studio_id");

-- CreateIndex
CREATE INDEX "clients_gallery_id_idx" ON "clients"("gallery_id");

-- CreateIndex
CREATE INDEX "clients_email_idx" ON "clients"("email");

-- CreateIndex
CREATE INDEX "storage_connections_studio_id_idx" ON "storage_connections"("studio_id");

-- CreateIndex
CREATE INDEX "storage_connections_provider_idx" ON "storage_connections"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "storage_connections_studio_id_provider_key" ON "storage_connections"("studio_id", "provider");

-- CreateIndex
CREATE INDEX "storage_sync_jobs_storage_connection_id_idx" ON "storage_sync_jobs"("storage_connection_id");

-- CreateIndex
CREATE INDEX "storage_sync_jobs_gallery_id_idx" ON "storage_sync_jobs"("gallery_id");

-- CreateIndex
CREATE INDEX "storage_sync_jobs_studio_id_idx" ON "storage_sync_jobs"("studio_id");

-- CreateIndex
CREATE INDEX "storage_sync_jobs_status_idx" ON "storage_sync_jobs"("status");

-- CreateIndex
CREATE INDEX "processing_jobs_studio_id_idx" ON "processing_jobs"("studio_id");

-- CreateIndex
CREATE INDEX "processing_jobs_status_idx" ON "processing_jobs"("status");

-- CreateIndex
CREATE INDEX "processing_jobs_job_type_idx" ON "processing_jobs"("job_type");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_studio_id_key" ON "subscriptions"("studio_id");

-- CreateIndex
CREATE INDEX "audit_logs_studio_id_idx" ON "audit_logs"("studio_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_client_sessions_session_token_hash_key" ON "gallery_client_sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "gallery_client_sessions_gallery_id_idx" ON "gallery_client_sessions"("gallery_id");

-- CreateIndex
CREATE INDEX "gallery_client_sessions_session_token_hash_idx" ON "gallery_client_sessions"("session_token_hash");

-- CreateIndex
CREATE INDEX "gallery_favorites_gallery_id_idx" ON "gallery_favorites"("gallery_id");

-- CreateIndex
CREATE INDEX "gallery_favorites_session_id_idx" ON "gallery_favorites"("session_id");

-- CreateIndex
CREATE INDEX "gallery_favorites_photo_id_idx" ON "gallery_favorites"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_favorites_gallery_id_session_id_photo_id_key" ON "gallery_favorites"("gallery_id", "session_id", "photo_id");

-- CreateIndex
CREATE INDEX "gallery_selections_gallery_id_idx" ON "gallery_selections"("gallery_id");

-- CreateIndex
CREATE INDEX "gallery_selections_session_id_idx" ON "gallery_selections"("session_id");

-- CreateIndex
CREATE INDEX "gallery_selections_photo_id_idx" ON "gallery_selections"("photo_id");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_selections_gallery_id_session_id_photo_id_key" ON "gallery_selections"("gallery_id", "session_id", "photo_id");

-- CreateIndex
CREATE INDEX "client_download_jobs_gallery_id_idx" ON "client_download_jobs"("gallery_id");

-- CreateIndex
CREATE INDEX "client_download_jobs_session_id_idx" ON "client_download_jobs"("session_id");

-- CreateIndex
CREATE INDEX "client_download_jobs_status_idx" ON "client_download_jobs"("status");

-- AddForeignKey
ALTER TABLE "studio_memberships" ADD CONSTRAINT "studio_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_memberships" ADD CONSTRAINT "studio_memberships_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "galleries" ADD CONSTRAINT "galleries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_storage_connection_id_fkey" FOREIGN KEY ("storage_connection_id") REFERENCES "storage_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_versions" ADD CONSTRAINT "photo_versions_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_detections" ADD CONSTRAINT "face_detections_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_detections" ADD CONSTRAINT "face_detections_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_detections" ADD CONSTRAINT "face_detections_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_connections" ADD CONSTRAINT "storage_connections_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_sync_jobs" ADD CONSTRAINT "storage_sync_jobs_storage_connection_id_fkey" FOREIGN KEY ("storage_connection_id") REFERENCES "storage_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_sync_jobs" ADD CONSTRAINT "storage_sync_jobs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storage_sync_jobs" ADD CONSTRAINT "storage_sync_jobs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_client_sessions" ADD CONSTRAINT "gallery_client_sessions_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "gallery_client_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_favorites" ADD CONSTRAINT "gallery_favorites_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_selections" ADD CONSTRAINT "gallery_selections_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_selections" ADD CONSTRAINT "gallery_selections_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "gallery_client_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_selections" ADD CONSTRAINT "gallery_selections_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_download_jobs" ADD CONSTRAINT "client_download_jobs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_download_jobs" ADD CONSTRAINT "client_download_jobs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "gallery_client_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

