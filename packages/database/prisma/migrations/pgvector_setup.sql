-- ====================================================================
-- PixMatch AI - PostgreSQL pgvector Extension & Cosine Distance Index
-- Phase 3.1 Production Migration
-- ====================================================================

-- 1. Enable the pgvector extension in PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add native 512-dimensional vector column for InsightFace buffalo_l
-- (Prisma manages standard fields, pgvector operates natively in PostgreSQL)
ALTER TABLE face_detections 
ADD COLUMN IF NOT EXISTS embedding_vec vector(512);

-- 3. Backfill embedding_vec from float array if present
UPDATE face_detections 
SET embedding_vec = embedding::text::vector(512)
WHERE embedding_vec IS NULL AND embedding IS NOT NULL AND cardinality(embedding) = 512;

-- 4. Create HNSW Cosine Distance Index for sub-10ms vector similarity searches
-- HNSW provides fast recall and handles high concurrent search queries
CREATE INDEX IF NOT EXISTS face_detections_embedding_hnsw_idx 
ON face_detections 
USING hnsw (embedding_vec vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. Create Compound Index for Tenant + Gallery Scoped Filtering
CREATE INDEX IF NOT EXISTS idx_face_detections_studio_gallery_vec 
ON face_detections (studio_id, gallery_id);
