# PixMatch AI — Phase 24: Advanced Media Culling, Editing Workflow & AI-Assisted Post-Production

## Overview
Phase 24 establishes an enterprise-grade media culling, non-destructive editing, preset management, and multi-format export engine for professional photography studios. It seamlessly bridges raw media ingestion from Phase 23's production DAG directly into post-production review, automated AI adjustments, client proof watermarking, and final client gallery handoff.

---

## Key Capabilities & Core Invariants

### 1. 8-Factor Deterministic Culling Engine
- **Mathematical Scoring Formula**:
  $$\text{CullingScore} = \sum_{i=1}^8 (\text{Metric}_i \times \text{Weight}_i)$$
  - Sharpness (0.25)
  - Eyes & Facial Expressions (0.20)
  - Exposure Quality (0.15)
  - Composition & Framing (0.10)
  - Technical Quality & Noise (0.10)
  - Uniqueness & Diversity (0.10)
  - Color & Contrast Balance (0.05)
  - Background Quality & Bokeh (0.05)
- **Early Rejection Rule**: Photos with severe blur (sharpness < 25) or closed eyes with no smile are immediately flagged as `AI_RECOMMENDED_REJECT` regardless of other factor scores.
- **AI Recommendation Thresholds**:
  - Score $\ge 70$: `AI_RECOMMENDED_KEEP`
  - Score $45 - 69$: `AI_RECOMMENDED_MAYBE`
  - Score $< 45$: `AI_RECOMMENDED_REJECT`
- **Non-Destructive Invariant**: Rejection decisions never delete raw master assets from storage.

### 2. Burst Shot Sequence & Duplicate Detection
- **Proximity Clustering**: Shots captured within $\le 2000\text{ms}$ are candidate clustered into burst groups.
- **dHash & Hamming Distance**: 64-bit gradient difference hashes (`dHash`) evaluated with normalized Hamming distances.
  - $\text{Distance} \le 12$: Qualifies as visual similarity sequence.
  - $\text{Distance} = 0$: Exact duplicate.
- **Best-of-Burst Election**: Evaluates sharpness, facial expressiveness, and eye open ratio to nominate a primary representative photo per burst cluster.

### 3. Multi-User Review & Conflict Resolution
- **Selection Locks with TTL**: Photographers and editors acquire exclusive 5-minute review locks on individual photos to prevent collision during concurrent live reviews.
- **Audit Trail & Undo Stack**: Every decision (`KEEP`, `REJECT`, `MAYBE`, star rating 1-5, color label) is logged with previous and new states. A user-scoped LIFO undo stack enables instant single-click rollbacks.
- **Offline Action Reconciliation**: Uses Last-Write-Wins (LWW) resolution based on client-side capture timestamps to merge offline mobile/tablet review sessions.

### 4. Non-Destructive Editing Engine & Color Presets
- **Master Immutability**: Original raw files are read-only. All edits are stored as parametric derivative versions (`PhotoEditVersion` v1, v2, v3).
- **Parameter Validation & Clamping**: Exposure, Contrast, Highlights, Shadows, Temperature, Tint, Saturation, and Sharpness are bounded and clamped to $[-100, 100]$.
- **7 Default System Presets**:
  1. Clean Natural
  2. Warm Portrait
  3. Moody Film
  4. B&W High Contrast
  5. Golden Hour
  6. Cool Editorial
  7. Soft Pastel
- **AI Auto-Enhance**: Human-in-the-loop suggestion lifecycle (`MOCK_AI_ENHANCE_V1`) allows photographers to review and approve/dismiss parameter deltas before creating version derivatives.

### 5. Multi-Format Export Engine & Privacy Policies
- **Target Formats**: JPEG, WebP, PNG, TIFF with resolution downsampling (`2048px`, `1080px`, `4K Web`, `Original`).
- **Integrity Verification**: SHA-256 hex checksums computed and recorded for every rendered artifact.
- **Metadata Privacy Policies**:
  - `PRESERVE_ALL`: Retains all EXIF/IPTC/XMP tags.
  - `STRIP_ALL`: Removes all metadata.
  - `STRIP_GPS_PERSONAL`: Strips GPS coordinates and camera serial numbers while preserving copyright and camera model.
  - `COPYRIGHT_ONLY`: Strips all metadata except copyright attribution.
- **Watermarking Engine**: Configurable client proof watermarking (custom text, center/bottom-right/tiled positioning, opacity 0.0–1.0).
- **ZIP Packaging**: Batch aggregation into downloadable archive bundles.

---

## Copilot Tool Registry Integration (12 Tools)

| Tool Name | Type | Requires Approval | Purpose |
| :--- | :--- | :--- | :--- |
| `getCullingSummary` | Read | No | Studio-wide culling statistics & keep rates |
| `listCullCandidates` | Read | No | Query culling candidates with scores & filters |
| `getBurstGroups` | Read | No | Retrieve burst sequences and representatives |
| `getEditingQueue` | Read | No | Inspect active and queued edit jobs |
| `getEditSuggestions` | Read | No | Retrieve AI auto-enhance adjustment suggestions |
| `getExportStatus` | Read | No | Query export job progress and artifact URLs |
| `createCullSession` | Mutation | **Yes** | Initialize a new culling session for a gallery |
| `applyCullDecision` | Mutation | **Yes** | Apply Keep/Reject/Maybe decision to a photo |
| `bulkCullDecision` | Mutation | **Yes** | Apply batch culling decisions to multiple photos |
| `createEditJob` | Mutation | **Yes** | Enqueue a new non-destructive edit job |
| `approveEdit` | Mutation | **Yes** | Approve AI edit suggestion and generate version |
| `createExportJob` | Mutation | **Yes** | Create batch export job across formats |

---

## Automation Triggers (Phase 16 Integration)
- `MEDIA_INGESTION_COMPLETED`: Triggered when Phase 23 raw media backup verifies.
- `CULLING_READY`: Initiates AI candidate scoring and burst grouping.
- `CULLING_COMPLETED`: Advances production milestone and unlocks editing queue.
- `EDITING_READY`: Emitted when keeper list is finalized for post-processing.
- `EDITING_COMPLETED`: Triggers final batch export and gallery handoff.

---

## Test Verification Matrix
All 82 test groups and 222 assertions pass with 100% success:
- **Test File**: `tests/phase24-media-post-production.test.ts`
- **Execution Command**: `npm run test:phase24`
- **Results**: 222 passed, 0 failed, 0 regressions across Phase 1–23 suites.
