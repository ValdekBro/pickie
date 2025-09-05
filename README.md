# Pickie – Project Description

## Overview
**Pickie** is a personal recommendation platform designed for a **single user only**.  
The system’s purpose is to display and recommend images based entirely on the user’s own preferences.  
Unlike most recommendation systems, **Pickie does not use collaborative filtering or other users’ data**, since there will only ever be one user — the project’s author.
Images are not stored by Pickie; the database stores only external image URLs (for now).

## Core Entities
- **Image**  
  Each image is the central element of the platform.  

- **Tags**  
  Every image is described by multiple categories of tags:
  - **Author Tags** – indicate the creator of the artwork.  
  - **Content Tags** – describe objects, themes, or details present in the image.  
  - **Character Tags** – list characters depicted in the image.  
  - **Copyright Tags** – reference the original source or franchise a character belongs to.  
  - **Meta Tags** – additional metadata for classification.

## Recommendation Mechanism
- The user can **rate each image from 1 to 5**.  
- Recommendations are generated **exclusively** from the history of ratings and the tags associated with previously rated images.  
- There is **no dependency on external users or third-party preference datasets**.  
- After rating the current image, the **next recommendation** is displayed.

## User Flow
1. The platform shows a recommended image.  
2. The system lists all its tags grouped by category.  
3. The user provides a rating (1–5).  
4. Based on the rating and tag relevance, the next image is recommended.  
5. This cycle repeats indefinitely.

## Key Features
- **Private and personal** – built for one user only.  
- **Tag-driven recommendations** – evaluation of preferences relies entirely on image tags and ratings.  
- **No authentication required** – since the system is intended for a single user.  
- **Minimal interface** – just an image viewer with tags and a rating block.

---
# Recommendation Algorithm

## Approach
Since **Pickie** is designed for a **single-user recommendation system**, the algorithm must rely **entirely on personal preferences** and the semantic meaning of tags.  
No collaborative filtering or external datasets are involved. Instead, the recommendation engine combines **content-based filtering** with **tag-weight scoring**.

## Selected Methods and Implementation Details

### 1. Content-Based Filtering
**Concept:**  
Every image is described by its tags. The recommendation process searches for images with tags similar to those the user has previously rated highly.  

**Implementation (logical steps):**
1. For each image, collect all tags (author, content, character, copyright, meta).  
2. For each rated image, record the rating and associated tags.  
3. Compare unrated images against the weighted history of rated images.  
4. Rank candidate images by similarity score.  

This ensures that the system **always learns from the user’s own choices** and never depends on external data.

### 2. Tag-Weight Scoring
**Concept:**  
Tags receive dynamic weights that reflect the user’s preferences.  

**Implementation (logical steps):**
1. Initialize all tags with a **neutral weight (0)**.  
2. When the user rates an image:  
   - For each associated tag:  
     - Add or subtract from its weight based on the rating value.  
     - Example:  
       - Rating = 5 → tag weight increases significantly.  
       - Rating = 1 → tag weight decreases significantly.  
       - Rating = 3 → minor/no change (neutral).  
3. To score an unrated image:  
   - Sum all the weights of its tags.  
   - Images with higher scores are considered more relevant.  

This creates a **direct feedback loop** where each rating immediately influences future recommendations.

### 3. Decay Function for Tag Weights
**Concept:**  
Old ratings lose importance over time to reflect current tastes.  

**Implementation (logical steps):**
1. Associate each tag weight with a timestamp of the last update.  
2. Periodically reduce the magnitude of older weights.  
   - Example: each time a new rating is added, slightly reduce all previous tag weights.  
3. Ensure that more recent ratings always have **greater influence** than older ones.  

This mechanism prevents the recommendation engine from being biased by outdated preferences.

### 4. Diversity Adjustment (Optional)
**Concept:**  
To avoid repetitive results, occasionally include images with less common or weaker tags.  

**Implementation (logical steps):**
1. After scoring images by tag weights, apply a **diversity factor**.  
2. Slightly boost images that:  
   - Contain rare tags not often seen.  
   - Have moderate scores but introduce variety.  
3. Introduce these images occasionally into the recommendation flow (e.g., every 5–10th recommendation).  

This ensures that the user has opportunities to **discover new interests**, while the majority of recommendations remain highly relevant.

## Full Recommendation Cycle
1. **Display image** with its tag list.  
2. **User rates** the image (1–5).  
3. **Update tag weights** based on rating.  
4. **Apply decay** to older weights.  
5. **Score all unrated images** using current tag weights.  
6. **Rank images** by score, with optional diversity adjustment.  
7. **Present the next image** (highest-ranked).  

This cycle repeats indefinitely, producing an **adaptive, evolving, and fully personalized recommendation system** tailored for the single user.

---

# Architecture

This section describes the **software architecture** of Pickie based on the chosen stack:

- **Language**: Node.js + TypeScript  
- **Backend Framework**: NestJS  
- **Database**: PostgreSQL + MongoDB
- **Search/Filters**: GIN + `tsvector`, `pg_trgm`  
- **ORM**: Prisma  
- **Frontend**: React + Tailwind  
- **Package Manager**: npm  
- **Lint/Format**: ESLint + Prettier

## 1) High‑Level Overview

Pickie is a **single‑user**, **content‑based** recommendation system. The application is split into a **React** client and a **NestJS** API. The API exposes endpoints for:
- fetching the **next recommended image**,
- recording **ratings** (1–5),
- administering **images** and **tags**.

All application data lives in **PostgreSQL** (accessed via **Prisma**). Datasource staging (raw ingestion) lives in **MongoDB**. Scoring and ranking are done in the backend; **GIN/`tsvector`** and **`pg_trgm`** accelerate tag lookup, similarity, and light text search.
Image binaries are never stored by the backend or database; only external image URLs are persisted.

## 2) Backend Modules (NestJS)

### 2.1 API Layer (Controllers)
- **RecommendationController**
  - `GET /recommendations/next` – returns one image (image URL, grouped tags, current score explanation).
  - `POST /recommendations/skip` – optional, records a skip (for diversity logic).
- **RatingsController**
  - `POST /ratings` – submits a rating (1–5) for a shown image.
- **ImagesController (admin)**
  - CRUD for image references (external URLs) and bulk import of links; no file uploads.
- **TagsController (admin)**
  - CRUD for tags and tag categories.
- **ExplainController (optional)**
  - `GET /explain/:imageId` – returns score breakdown by tag weights (debug/analytics).

> Note: Authentication is **not used** (single‑user). CSRF and basic rate‑limit remain enabled.

### 2.2 Domain Services
- **RecommendationService**
  - Computes **image score** = Σ(tag weights) + diversity adjustments.
  - Applies **decay** to older signals (on read or scheduled recompute).
  - Enforces **business rules**: show one image at a time; next image requires a rating.
- **ScoringService**
  - Maintains **tag weights** from ratings (positive/negative reinforcement).
  - Provides **explainability**: per‑tag contribution for any image.
- **DiversityService (optional)**
  - Injects controlled randomness/novelty (e.g., every Nth recommendation).
- **RatingsService**
  - Persists ratings; triggers recalculation hooks.
- **ImagesService**
  - CRUD of image references (URLs), imports of links, integrity checks (ensures tag categories exist); no media storage.
- **TagsService**
  - CRUD, lookup, synonyms/aliases (optional).
- **SearchService**
  - Utilizes **GIN + `tsvector`** for fast tag/category searches.
  - Uses **`pg_trgm`** for similarity queries (fuzzy tag match, optional).

### 2.3 Infrastructure Services
- **PrismaService**
  - Centralized Prisma client, request‑scoped transactions (for “rate → update weights”).
- **TaskScheduler (optional)**
  - Periodic recomputation (e.g., decay sweep, cache warming).
- **ConfigService**
  - Validated config (env schema via Zod/class‑validator).
- **Logger**
  - Structured logging of scoring decisions & latency.

## 3) Data Model (Conceptual)

- **Image**
  - id, externalUrl (http/https), width/height (optional), createdAt
  - relations: `ImageTag[]`, `Rating[]`
- **Tag**
  - id, name, **category** ∈ {author, content, character, copyright, meta}
  - optional: normalized name, alias/synonym list
- **ImageTag**
  - imageId, tagId (composite PK), optional weight (for intra‑image emphasis)
- **Rating**
  - imageId, value (1–5), createdAt
  - single user → no userId
- **TagPreference (materialized / derived)**
  - tagId, weight (floating), lastUpdatedAt
  - stores learned preference per tag (result of ratings + decay)
- **ImageScore (cache/derived, optional)**
  - imageId, score, breakdown(jsonb), computedAt

> **Derived tables** (`TagPreference`, `ImageScore`) are optional optimizations. They can be recalculated on write (rating) or on schedule.

## 4) Request/Response Lifecycle

1. **Client opens recommendations page**
   - `GET /recommendations/next`  
   - Backend:
     - Ensures last image was rated (gatekeeping).
     - Computes or retrieves **next best image**:
       - Load **TagPreference** map.
       - For each **candidate image** (unrated): sum tag weights; apply diversity & tie‑breakers.
       - Return **top‑1** image with grouped tags and optional explain data.
2. **User rates image (1–5)**
   - `POST /ratings { imageId, value }`
   - Backend:
     - Persist rating (transaction).
     - Update **TagPreference** for each tag of the image (reinforce or penalize).
     - Optionally recompute cached **ImageScore** for a small candidate set.
3. **Next image**
   - Client calls `GET /recommendations/next` again; loop continues.

## 5) Frontend (React + Tailwind)

- **Pages/Routes**
  - `/` → Recommendations: shows one image, grouped tags, rating widget (1–5), optional “skip”.
  - `/library` (admin) → Image list/import tool.
  - `/tags` (admin) → Tag management.
  - `/debug` (optional) → Explain panel (per‑image tag contributions, weight history).

- **Components**
  - `ImageViewer` – responsive image, zoom (optional).
  - `TagChips` – grouped by category (author/content/character/copyright/meta).
  - `RatingBar` – discrete 1..5 control; posts to `/ratings`.
  - `ScoreExplain` (dev only) – shows score breakdown.
  - `ImportForm` (admin) – bulk import links (external URLs) and tags.

- **State/Data Fetching**
  - Minimal client state; **server is source of truth**.
  - Fetch via `fetch`/`axios` or TanStack Query (retry/cache).
  - After rating, **invalidate** and refetch `next` item.

- **Styling**
  - Tailwind + utility classes.
  - A11y: keyboard rating, high‑contrast focus rings.

---

- **Primary indexes**
  - `ratings(imageId)` (for “already rated?” checks)
  - `image_tags(imageId)`, `image_tags(tagId)`
  - `tags(name)` with **`pg_trgm`** (fuzzy) and **unique normalized name** (exact)
- **Search indexes**
  - `tags.tsv` (`tsvector` of name/aliases) with **GIN** for quick lookup
- **Derived/cached**
  - `tag_preferences(tagId)` (PK) for O(1) access on scoring
  - Optional `image_scores(imageId)` for fast `ORDER BY score DESC`

- **Queries**
  - **Next image**:
    - filter out rated images
    - join `image_tags` → `tag_preferences`
    - aggregate Σ(tag weight)
    - apply diversity/tie‑breakers
    - limit 1

## 6) Datasource & Mapping Subsystem

This subsystem is responsible for collecting raw image metadata from external sources (scrapers/parsers), storing it in a separate NoSQL staging database (**MongoDB**), and mapping it into the canonical schema used by the main Pickie application.

### Overview

- **Isolation**: All collection happens in a dedicated **MongoDB** database (the "staging DB"), fully separated from the main application DB.
- **Per‑source collections**: Each datasource writes into its own collection with a format tailored to that source. No attempt is made to enforce a global schema at collection time.
- **Mapping pipeline**: A deterministic normalization job converts staging rows to the canonical entities (`Image`, `Tag`, `ImageTag`, optional `TagPreference` seed data), then upserts them into the main DB.
- **Idempotent + replayable**: The mapping step can be safely re‑run; checksum/unique constraints prevent duplicates and allow incremental updates.

```mermaid
flowchart LR
  A[Scrapers / Parsers<br/>per source] --> B[Staging MongoDB<br/>per‑source collections]
  B --> C[Mapper / Normalizer<br/>(batch or streaming)]
  C --> D[Canonical Model in Main DB<br/>Image / Tag / ImageTag]
  C --> E[(Mapping Logs / Metrics)]
```

### Staging Database (MongoDB, per‑source collections)

- **Database**: Separate MongoDB database, e.g. `pickie_staging`.
- **Collection per source**: Naming convention `ds_<source>_items` (examples: `ds_artstation_items`, `ds_pixiv_items`).
- **Recommended fields** (adapt as needed per source):
  - `_id` (ObjectId), `source` (string), `source_item_id` (string), `external_url` (string)
  - `title` (string), `description` (string)
  - `tags_raw` (array<string> or object), `author_raw` (string), `characters_raw` (array<string> or object)
  - `copyright_raw` (array<string> or object), `meta_raw` (object)
  - `width`/`height` (number, optional), `rating_raw` (number, optional), `license_raw` (string, optional)
  - `checksum` (string; md5/sha of normalized (url+tags+meta))
  - `fetched_at` (Date), `updated_at` (Date)
  - `raw_payload` (object), `parse_errors` (string), `status` (string enum: collected|parsed|invalid)
- **Indexes**:
  - Compound unique on `{ source: 1, source_item_id: 1 }`
  - Sparse/partial unique on `{ checksum: 1 }` where `checksum` exists
  - Multikey index on `tags_raw` (array) and optional text index on `title`/`description`
  - Index on `fetched_at`

> Rationale: Keep ingestion cheap and flexible. Normalize later where we have richer context and shared utilities.

### Mapping to Canonical Schema

The mapper reads new/changed rows from staging and produces upserts in the main DB.

1. **Eligibility & windowing**
   - Select documents with `updated_at > last_mapped_at` (tracked in a state collection `ds_ingest_state`) or consume via MongoDB Change Streams for near‑real‑time mapping.
2. **Validation**
   - Ensure `external_url` is http/https; minimal fields present; discard invalid rows with reason.
3. **Normalization**
   - Clean text (trim, collapse whitespace, case normalization, punctuation rules).
   - Tokenize `tags_raw` and map to canonical categories: author/content/character/copyright/meta.
   - Apply per‑source rules (regexes, field splits) and global rules (stop‑words, casing, language hints).
4. **Tag resolution**
   - Lookup or create `Tag` rows; use alias/synonym tables for canonicalization.
   - Optional fuzzy match (pg_trgm) gated by thresholds.
5. **Deduplication**
   - Check existing `Image` by `externalUrl` and/or `checksum`; prefer update over insert.
6. **Upserts**
   - Insert/update `Image` (externalUrl, optional width/height) and `ImageTag` relations with categories.
7. **Bookkeeping**
   - Record `last_mapped_at`, write per‑row mapping status and error summaries; emit metrics.

### Idempotency & Consistency

- Use deterministic `checksum` to detect no‑op updates.
- Enforce unique constraints in the main DB on `images.externalUrl` and on `image_tags(imageId, tagId)`.
- Run mapping in transactions per item or small batches; retry on conflicts.

### Scheduling & Orchestration

- **Scrapers**: run on cron or via a lightweight queue; each writes into its own collection.
- **Mapper**: can run
  - as a NestJS background worker (BullMQ/Agenda) inside the API service, or
  - as a separate worker service connecting to MongoDB (staging) and PostgreSQL (main DB).
- **Modes**: batch backfills (historical) and continuous incremental mapping.

### Operational Concerns

- **Observability**: counts of collected vs mapped rows; error rates; dedup rate; lag since `fetched_at`.
- **Backpressure**: pause scrapers when mapping lag grows beyond threshold.
- **Data retention**: keep raw staging documents for N days (optionally via TTL index); archive older ones.
- **Safety**: never modify or delete original staging rows; emits separate `mapping_status` rows.
- **Security**: both DBs use least‑privilege credentials; staging DB contains only metadata (no PII).

### Adding a New Datasource

1. Create a new MongoDB collection `ds_<source>_items` with fields that best fit that source.
2. Implement scraper/parser that populates the collection (insert or upsert by `source_item_id`).
3. Add per‑source mapping rules (tag splits, field mappings, category hints).
4. Register the source in the mapper config (collection name, primary key, select window, rate limits).
5. Run a small backfill; validate mapping outputs; then enable continuous ingestion.

## 7) Recommendation Logic Placement

- **Online path** (synchronous per request):
  - Read current **TagPreference** map.
  - Score top candidates (either:
    - *all unrated* for small sets, or
    - *windowed subset* using heuristics: recent imports, random sample, or cached shortlist).
- **Offline/periodic** (optional):
  - **Decay sweep**: reduce old weights.
  - **Score cache refresh**: precompute `image_scores` for faster `next`.
  - **Diversity pools**: maintain a rotating set of “explore” images.

> For a single user and modest dataset, **pure online scoring** is sufficient. Add caches/periodics only if latency grows.

## 8) Cross‑Cutting Concerns

- **Validation**: DTOs with class‑validator/Zod; **strict schemas** for ratings and imports.
- **Error Handling**: Standardized error envelope; user‑friendly messages on the UI.
- **Security (even for 1 user)**:
  - CSRF protection on POSTs
  - Basic rate limiting
  - Input sanitization
- **Observability**:
  - Request logs (method, path, duration)
  - **Scoring traces** (which tags influenced the result)
  - Error tracking (Sentry)
- **Testing**:
  - Unit tests: services (Scoring/Recommendation)
  - Integration: Prisma + test DB
  - E2E: headless flow “next → rate → next”
- **Quality**:
  - ESLint + Prettier, strict TypeScript
  - Git hooks (lint/test on commit, optional)

## 9) Configuration & Environments

- **Config** via env variables (validated at boot):
  - DB URL, storage paths/buckets, feature flags (diversity on/off).
- **Environments**:
  - **Dev**: local Postgres, file storage; verbose logging.
  - **Prod**: managed Postgres, backups enabled; logs with PII‑safe fields.

## 10) Deployment Notes (implementation‑agnostic)

- Single API service (NestJS) + static assets (images via CDN or signed URLs).
- Rolling updates; DB migrations via Prisma Migrate.
- Backups & retention policy for PostgreSQL.

## 11) Non‑Goals

- No multi‑user accounts or collaborative filtering.
- No social features.
- No external preference datasets.

## 12) Repository Structure (Monorepo)

This project uses a simple, native npm workspaces monorepo. No extra orchestration tools are required initially.

- **Approach**: npm workspaces only (minimal complexity)
- **Runtime/tooling**: Node 20 LTS, npm 10, **CommonJS** modules
- **Layout**:
  - `apps/api` – NestJS API (CJS)
  - `apps/web` – React app (CJS)
  - `packages/` – optional shared libraries to be added later (e.g., `shared`, `eslint-config`, `tsconfig`)
- **Workspaces**: defined in the root `package.json` → `"workspaces": ["apps/*"]`
- **Execution patterns**:
  - Per app:
    ```bash
    npm -w apps/api run dev
    npm -w apps/web run dev
    ```
  - All apps (parallel when defined):
    ```bash
    npm run -ws --if-present dev --parallel
    npm run -ws --if-present build
    ```
- **TypeScript config** (to be added): root `tsconfig.base.json`; per app `tsconfig.json` extending the base and using project references.
- **Lint/format** (to be added): root ESLint + Prettier configs; per app can extend.
- **Evolution**: If build times or task orchestration become complex, consider adding Turborepo or Nx later (only upon explicit approval).

## 13) Project Info Files

- **Done**
  - `LICENSE` (MIT)
  - `.editorconfig` – consistent indentation/charset/EOL (4 spaces for code; 2 for JSON/YAML/XML; LF)
  - `.gitattributes` – enforce LF line endings; mark binary assets
  - `SECURITY.md` – private reporting policy and timelines
  - `.env.example` per app:
    - `apps/api/env.example`
    - `apps/web/env.example`

- **Planned**
  - `apps/api/README.md`, `apps/web/README.md` – purpose, dev commands, env vars
  - `CODE_OF_CONDUCT.md` – expected behavior and reporting
  - `CONTRIBUTING.md` – how to run dev, branch/commit style, PR rules
  - `CHANGELOG.md` – Keep a Changelog; link to releases
  - `.github/` directory:
    - `ISSUE_TEMPLATE/bug_report.md`, `ISSUE_TEMPLATE/feature_request.md`
    - `PULL_REQUEST_TEMPLATE.md`
    - `CODEOWNERS` (optional: you as owner for now)