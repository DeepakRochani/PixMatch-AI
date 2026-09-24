# PIXMatch AI — Phase 12: Advanced AI Photo Intelligence & Smart Albums

## 1. Overview & Architectural Goals
Phase 12 introduces deep visual quality scoring, perceptual deduplication, biometric facial clustering, multi-signal best shot ranking, and rule-based Smart Albums into PixMatch AI.

The architecture expands PixMatch AI's capabilities with:
1. **Multi-Signal Quality Assessment**: Analyzes Laplacian sharpness variance, luminance histogram distribution, contrast ratio, high-frequency sensor noise estimation, and composition balance.
2. **Perceptual 64-Bit Difference Hash (dHash)**: Computes 64-bit gradient difference hashes for rapid exact and burst near-duplicate clustering using Hamming distance calculation ($\le 8$ bits threshold).
3. **Multi-Tenant People Clustering (ArcFace DBSCAN)**: Groups gallery faces into recognized identity clusters using 512-dimensional ArcFace cosine similarity clustering strictly bounded to `[studio_id, gallery_id]`.
4. **Best Shot Candidate Selection**: Scores photos dynamically combining composite sharpness, open-eye ratio, smile expressiveness, composition, and exposure balance.
5. **Declarative Rule-Based Smart Albums (AST Engine)**: Sandboxed AST condition evaluator (`eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `in`, `nin`, `is_null`, `not_null` with `AND`/`OR` conjunctions) powering instant smart filtering for photographers and clients.
6. **Background Worker Asynchronous Processing**: BullMQ `photo-intelligence` queue processing with retry mechanics, idempotency, and concurrency controls.
7. **Strict Biometric Privacy & Zero Embedding Leakage**: Strict security rules guaranteeing raw 512-d embeddings, face crops, and client selfies are never returned in public client API payloads.

---

## 2. Database Schema & Data Models

### Enums
- `JobType.PHOTO_INTELLIGENCE`: Asynchronous queue worker job type.
- `ExposureClass`: `['UNDEREXPOSED', 'NORMAL', 'OVEREXPOSED']`.
- `SmartAlbumType`: `['SYSTEM', 'CUSTOM']`.
- `ModelType`: `['DETECTION', 'EMBEDDING', 'QUALITY', 'SCENE', 'PHOTO_INTELLIGENCE']`.

### Models Added

```prisma
model PhotoAIAnalysis {
  id                      String           @id @default(cuid())
  photo_id                String           @unique
  gallery_id              String
  studio_id               String
  model_version           String           @default("photo-intelligence:v1")
  quality_score           Float            @default(0.0)
  sharpness_score         Float            @default(0.0)
  blur_score              Float            @default(0.0)
  is_blurry               Boolean          @default(false)
  exposure_score          Float            @default(0.0)
  exposure_class          ExposureClass    @default(NORMAL)
  contrast_score          Float            @default(0.0)
  noise_score             Float            @default(0.0)
  composition_score       Float            @default(0.0)
  scene_category          String           @default("Unknown")
  scene_confidence        Float            @default(0.0)
  moment_category         String           @default("Unknown")
  moment_confidence       Float            @default(0.0)
  duplicate_group_id      String?
  near_duplicate_group_id String?
  perceptual_hash         String?
  is_best_shot            Boolean          @default(false)
  best_shot_score         Float            @default(0.0)
  eyes_open_score         Float            @default(1.0)
  smile_score             Float            @default(0.0)
  people_count            Int              @default(0)
  analysis_status         ProcessingStatus @default(PENDING)
  analysis_error          String?
  created_at              DateTime         @default(now())
  updated_at              DateTime         @updatedAt

  photo                   Photo            @relation(fields: [photo_id], references: [id], onDelete: Cascade)
  gallery                 Gallery          @relation(fields: [gallery_id], references: [id], onDelete: Cascade)
  studio                  Studio           @relation(fields: [studio_id], references: [id], onDelete: Cascade)

  @@index([gallery_id, studio_id])
  @@index([gallery_id, is_best_shot])
  @@index([gallery_id, scene_category])
  @@index([gallery_id, duplicate_group_id])
  @@index([gallery_id, near_duplicate_group_id])
}

model PersonCluster {
  id              String                @id @default(cuid())
  studio_id       String
  gallery_id      String
  name            String                @default("Unnamed Person")
  cover_face_id   String?
  cover_photo_id  String?
  face_count      Int                   @default(0)
  photo_count     Int                   @default(0)
  is_hidden       Boolean               @default(false)
  created_at      DateTime              @default(now())
  updated_at      DateTime              @updatedAt

  gallery         Gallery               @relation(fields: [gallery_id], references: [id], onDelete: Cascade)
  studio          Studio                @relation(fields: [studio_id], references: [id], onDelete: Cascade)
  members         PersonClusterMember[]

  @@index([gallery_id, studio_id])
}

model SmartAlbum {
  id                   String         @id @default(cuid())
  studio_id            String
  gallery_id           String
  name                 String
  description          String?
  type                 SmartAlbumType @default(CUSTOM)
  rule_json            Json
  is_system            Boolean        @default(false)
  is_visible_to_client Boolean        @default(true)
  sort_mode            String         @default("CHRONOLOGICAL")
  created_at           DateTime       @default(now())
  updated_at           DateTime       @updatedAt

  gallery              Gallery        @relation(fields: [gallery_id], references: [id], onDelete: Cascade)
  studio               Studio         @relation(fields: [studio_id], references: [id], onDelete: Cascade)

  @@index([gallery_id, studio_id])
  @@index([gallery_id, is_visible_to_client])
}
```

---

## 3. Fastify REST Endpoints

### Photographer / Studio Gallery AI Endpoints
- `GET /api/v1/galleries/:id/ai/overview`: Aggregated AI intelligence metrics (quality distribution, best shots count, people clusters count, duplicates count, scene classification breakdown).
- `POST /api/v1/galleries/:id/ai/analyze`: Trigger asynchronous or inline AI photo intelligence indexing for all gallery photos.
- `GET /api/v1/galleries/:id/ai/best-shots`: Fetch ranked best shots with scoring factors breakdown.
- `GET /api/v1/galleries/:id/ai/duplicates`: Grouped near-duplicate and exact-duplicate series with primary photo recommendation.
- `GET /api/v1/galleries/:id/ai/quality`: Gallery-wide quality, sharpness, blur, and exposure distribution summary.
- `GET /api/v1/galleries/:id/ai/people`: List named and unnamed people clusters with sample photos.
- `PUT /api/v1/galleries/:id/ai/people/:clusterId`: Rename, hide, or set cover photo for a person cluster.

### Smart Album Management Endpoints
- `GET /api/v1/galleries/:id/smart-albums`: List all smart albums (System & Custom) with matching photo counts.
- `POST /api/v1/galleries/:id/smart-albums`: Create custom smart album with AST rule definition.
- `GET /api/v1/galleries/:id/smart-albums/:albumId/photos`: Retrieve photos evaluated and filtered by smart album AST.
- `PUT /api/v1/galleries/:id/smart-albums/:albumId`: Update smart album name, rules, client visibility, and sort mode.
- `DELETE /api/v1/galleries/:id/smart-albums/:albumId`: Delete custom smart album.

### Public Client Gallery Endpoints
- `GET /api/v1/galleries/public/:slug/smart-albums`: List client-visible smart albums for gallery.
- `GET /api/v1/galleries/public/:slug/smart-albums/:albumId/photos`: Retrieve photos matching smart album with zero biometric leakage.

---

## 4. Default System Smart Albums
1. **Highlights**: Best shot flag, non-blurry, balanced exposure (Client Visible).
2. **Portraits & Candids**: Solo portraits and candid captures (Client Visible).
3. **Couples**: Two-person captures (Client Visible).
4. **Group & Family Photos**: 3+ people captures (Client Visible).
5. **Ceremony**: Ring exchange, vows, rituals, ceremony scenes (Client Visible).
6. **Reception & Dance**: Dance, cake cutting, speeches, reception moments (Client Visible).
7. **High Quality**: $\ge 85\%$ quality score (Studio Internal).
8. **Blurry Photos (Review)**: Photos flagged with camera shake or blur (Studio Internal).
9. **Potential Duplicates**: Exact and near-duplicate bursts (Studio Internal).

---

## 5. Security & Multi-Tenant Isolation
- **Biometric Privacy**: Vector embeddings (512-dim ArcFace vectors), face bounding crops, and client selfies are never included in public API schemas.
- **Tenant Isolation**: All queries enforce compound indexes on `[studio_id, gallery_id]`.
- **AST Sandbox**: AST condition evaluation uses declarative switch cases with type and range checks. Arbitrary code execution (`eval`, `Function`) is strictly prohibited.
