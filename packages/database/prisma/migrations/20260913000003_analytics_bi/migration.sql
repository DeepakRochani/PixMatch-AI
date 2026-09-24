-- CreateTable: studio_analytics_daily
CREATE TABLE "studio_analytics_daily" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "gallery_views" INTEGER NOT NULL DEFAULT 0,
    "unique_gallery_visitors" INTEGER NOT NULL DEFAULT 0,
    "photo_views" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "selections" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "download_bytes" BIGINT NOT NULL DEFAULT 0,
    "find_my_photos_searches" INTEGER NOT NULL DEFAULT 0,
    "find_my_photos_matches" INTEGER NOT NULL DEFAULT 0,
    "photos_processed" INTEGER NOT NULL DEFAULT 0,
    "faces_detected" INTEGER NOT NULL DEFAULT 0,
    "processing_completed" INTEGER NOT NULL DEFAULT 0,
    "processing_failed" INTEGER NOT NULL DEFAULT 0,
    "storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "active_clients" INTEGER NOT NULL DEFAULT 0,
    "new_clients" INTEGER NOT NULL DEFAULT 0,
    "gallery_deliveries" INTEGER NOT NULL DEFAULT 0,
    "gallery_opens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable: gallery_analytics_daily
CREATE TABLE "gallery_analytics_daily" (
    "id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "photo_views" INTEGER NOT NULL DEFAULT 0,
    "favorites" INTEGER NOT NULL DEFAULT 0,
    "selections" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "download_bytes" BIGINT NOT NULL DEFAULT 0,
    "find_my_photos_searches" INTEGER NOT NULL DEFAULT 0,
    "find_my_photos_matches" INTEGER NOT NULL DEFAULT 0,
    "delivery_sends" INTEGER NOT NULL DEFAULT 0,
    "delivery_opens" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gallery_analytics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ai_search_logs
CREATE TABLE "ai_search_logs" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "gallery_id" TEXT NOT NULL,
    "faces_detected" INTEGER NOT NULL DEFAULT 0,
    "matches_count" INTEGER NOT NULL DEFAULT 0,
    "processing_time_ms" INTEGER NOT NULL DEFAULT 0,
    "sensitivity" TEXT NOT NULL DEFAULT '0.58',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_analytics_daily_studio_id_date_key" ON "studio_analytics_daily"("studio_id", "date");
CREATE INDEX "studio_analytics_daily_studio_id_idx" ON "studio_analytics_daily"("studio_id");
CREATE INDEX "studio_analytics_daily_date_idx" ON "studio_analytics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_analytics_daily_gallery_id_date_key" ON "gallery_analytics_daily"("gallery_id", "date");
CREATE INDEX "gallery_analytics_daily_gallery_id_idx" ON "gallery_analytics_daily"("gallery_id");
CREATE INDEX "gallery_analytics_daily_studio_id_idx" ON "gallery_analytics_daily"("studio_id");
CREATE INDEX "gallery_analytics_daily_date_idx" ON "gallery_analytics_daily"("date");

-- CreateIndex
CREATE INDEX "ai_search_logs_studio_id_idx" ON "ai_search_logs"("studio_id");
CREATE INDEX "ai_search_logs_gallery_id_idx" ON "ai_search_logs"("gallery_id");
CREATE INDEX "ai_search_logs_created_at_idx" ON "ai_search_logs"("created_at");

-- AddForeignKey
ALTER TABLE "studio_analytics_daily" ADD CONSTRAINT "studio_analytics_daily_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gallery_analytics_daily" ADD CONSTRAINT "gallery_analytics_daily_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gallery_analytics_daily" ADD CONSTRAINT "gallery_analytics_daily_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_search_logs" ADD CONSTRAINT "ai_search_logs_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_search_logs" ADD CONSTRAINT "ai_search_logs_gallery_id_fkey" FOREIGN KEY ("gallery_id") REFERENCES "galleries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
