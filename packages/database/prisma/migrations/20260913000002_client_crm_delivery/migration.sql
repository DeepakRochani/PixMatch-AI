-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_SENT', 'QUEUED', 'SENT', 'OPENED', 'ACTIVE', 'FAILED', 'EXPIRED', 'COMPLETED');

-- AlterTable
ALTER TABLE "clients"
  ALTER COLUMN "gallery_id" DROP NOT NULL,
  ADD COLUMN "first_name" TEXT,
  ADD COLUMN "last_name" TEXT,
  ADD COLUMN "company" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "deleted_at" TIMESTAMP(3),
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");
CREATE INDEX "clients_deleted_at_idx" ON "clients"("deleted_at");

-- CreateTable
CREATE TABLE "client_galleries" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "relationship_type" TEXT NOT NULL DEFAULT 'PRIMARY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_galleries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_galleries_studio_id_idx" ON "client_galleries"("studio_id");
CREATE INDEX "client_galleries_client_id_idx" ON "client_galleries"("client_id");
CREATE INDEX "client_galleries_gallery_id_idx" ON "client_galleries"("gallery_id");
CREATE UNIQUE INDEX "client_galleries_client_id_gallery_id_key" ON "client_galleries"("client_id", "gallery_id");

-- AddForeignKey
ALTER TABLE "client_galleries" ADD CONSTRAINT "client_galleries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_galleries" ADD CONSTRAINT "client_galleries_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_galleries" ADD CONSTRAINT "client_galleries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "client_activities" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "gallery_id" TEXT,
    "activity_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "client_activities_studio_id_idx" ON "client_activities"("studio_id");
CREATE INDEX "client_activities_client_id_idx" ON "client_activities"("client_id");
CREATE INDEX "client_activities_gallery_id_idx" ON "client_activities"("gallery_id");
CREATE INDEX "client_activities_created_at_idx" ON "client_activities"("created_at");

-- AddForeignKey
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_activities" ADD CONSTRAINT "client_activities_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "gallery_deliveries" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT,
    "custom_message" TEXT,
    "delivery_type" TEXT NOT NULL DEFAULT 'INITIAL',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SENT',
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened_at" TIMESTAMP(3),
    "last_accessed_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "idempotency_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gallery_deliveries_studio_id_idx" ON "gallery_deliveries"("studio_id");
CREATE INDEX "gallery_deliveries_gallery_id_idx" ON "gallery_deliveries"("gallery_id");
CREATE INDEX "gallery_deliveries_client_id_idx" ON "gallery_deliveries"("client_id");
CREATE INDEX "gallery_deliveries_idempotency_key_idx" ON "gallery_deliveries"("idempotency_key");
CREATE INDEX "gallery_deliveries_status_idx" ON "gallery_deliveries"("status");

-- AddForeignKey
ALTER TABLE "gallery_deliveries" ADD CONSTRAINT "gallery_deliveries_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_deliveries" ADD CONSTRAINT "gallery_deliveries_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_deliveries" ADD CONSTRAINT "gallery_deliveries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
