# Data Ingestion Module — Architecture & Project Structure

This document describes the **code-only** structure for a Node.js/TypeScript module that ingests metadata from arbitrary sources (e.g., image boards), performs **minimal mapping**, and persists results to **MongoDB**. It avoids operational specifics (rates, lookbacks, schedules) and focuses exclusively on **folders, files, contracts, and composition**.

---

## High-level goals

* **Source-agnostic** core with **pluggable sources**.
* **One universal pipeline** (`items`) per run; **one Mongo collection per source** (name decided by the plugin).
* **Unified header** across all collections + **per-source consistent body** (minimal, shallow mapping).
* **Backfill + incremental** ingestion; default incremental strategy is **timestamp** (design only).
* **Static plugin registry** (empty by default); a **template plugin** is included as an example but **not registered**.
* Strong **TypeScript typing at composition time** (TS-first), plus optional **runtime schemas per plugin**.
* Built-in **observability**: `runs`, `events`, `problems`, `failures` and **local artifact snapshots** with retention.
* Module is **CLI/worker**; `/src/index.ts` is a thin CLI bootstrap (no public programmatic API).

---

## Repository layout (folders & files)

```
/src
  /app
    types.ts              # Strictly typed plugin contract & helpers (TS1)
    registry.ts           # Static registry (empty by default, `as const`)
    compose.ts            # Type-safe DI: adapter/mapper/repo/state for a plugin
  /cli
    main.ts
    commands/
      backfill.ts
      incremental.ts
      list-sources.ts
      runs-list.ts
      runs-show.ts
      events-tail.ts
      problems-list.ts
      problems-show.ts
      problems-redrive.ts
      failures-list.ts
      failures-show.ts
      artifacts-cleanup.ts
  /core
    /entities
      Header.ts           # Unified document header for all collections
    /ports                # (barrel index.ts allowed here)
      SourceAdapter.ts    # Page-wise pull from a source
      ShallowMapper.ts    # Minimal body mapping per source collection
      Repository.ts       # Upsert by naturalKey
      StateStore.ts       # Checkpoints: timestamp/id/cursor
      Logger.ts
      Metrics.ts
      Diagnostics.ts      # runs/events/problems/failures (+ snapshots)
    /errors
      ErrorCodes.ts
      SourceError.ts
      PersistenceError.ts
    /usecases
      ingest.ts           # pull → map → upsert → checkpoint (+ diagnostics hooks)
      backfill.ts
      incremental.ts
  /infra
    /db
      mongoClient.ts
      MongoRepository.ts
      MongoStateStore.ts
      indexes.ts          # Base indexes: naturalKey, postId, updatedAt
    /http
      httpClient.ts       # Fetch wrapper (structure only)
    /scraper
      browser.ts          # Playwright launcher (structure only)
    /observability
      consoleLogger.ts
      noopMetrics.ts
      /MongoDiagnostics
        index.ts
        runs.store.ts
        events.store.ts
        problems.store.ts
        failures.store.ts
        retention.ts      # “keep last N” artifacts (N = configurable, unspecified)
      /artifacts
        localFsStore.ts   # Local file storage for artifact snapshots
        paths.ts
        safeFs.ts
      /sanitizers         # (barrel index.ts allowed here)
        redact.ts
        trim.ts
        errorFingerprint.ts
        htmlToSnippet.ts
  /pipelines
    buildIngestPipeline.ts
    options.ts            # Pipeline option *types* (hooks only; no values)
  /sources
    /template             # Example plugin (NOT registered)
      options.ts          # Adapter/mapper option types exported to /app (TS1)
      schemas.ts          # Optional runtime schemas (e.g., Zod) for options/body
      types.ts            # Body type (consistent per this collection)
      adapter.ts          # Implements SourceAdapter<Raw>
      mapper.ts          # Implements ShallowMapper<Raw, Body>
      index.ts            # plugin: { name, collectionName, factories, schemas?, ensureIndexes? }
      __tests__/contracts/
        adapter.contract.test.ts
        mapper.contract.test.ts
        indexes.contract.test.ts
      __fixtures__/...
  /jobs
    runBackfill.ts
    runIncremental.ts
  /shared                 # Cross-module, pure utilities (barrel index.ts per subfolder)
    /strings { normalize.ts, index.ts }
    /dates   { parse.ts, index.ts }
    /hash    { contentHash.ts, index.ts }
    /guards  { isNonEmpty.ts, isRecord.ts, index.ts }
    /types   { primitives.ts, index.ts }
    /validation { zod-helpers.ts, index.ts }
    /constants { naming.ts, index.ts }
/tests
  /integration/observability
    runs.integration.test.ts
    events.integration.test.ts
    problems.integration.test.ts
    failures.integration.test.ts
    retention.integration.test.ts
  /_shared
    mongoTestEnv.ts
    tmpDir.ts
    memoryDiagnostics.ts
    noopLogger.ts
    noopMetrics.ts
```

> **Barrel files** (`index.ts`) are **allowed only** in: `/core/ports`, `/shared/**`, and `/infra/observability/{sanitizers,artifacts}`.
> CLI command files use **kebab-case** (e.g., `runs-list.ts`).
> `/src/index.ts` exists as a thin CLI bootstrap in Pickie; there is no public programmatic API.

---

## Core concepts

### Pipeline

* Single, universal logical pipeline: **`items`**.
* Two high-level use cases: **`backfill`** and **`incremental`** (no operational parameters here).

### Collections

* **One MongoDB collection per source**.
* **Name is defined by the plugin** (e.g., `my-source_items`).
* Base indexes applied to each collection:

  * `naturalKey` (**unique**),
  * `postId` (ascending),
  * `updatedAt` (descending).

### Data model

* All collections share the same **header**; each source has a local **body** shape that is consistent within that source’s collection.

```ts
// /core/entities/Header.ts
export interface DocHeader {
  naturalKey: string;   // e.g., `${source}:${postId}`
  source: string;       // plugin's name (registry key)
  postId: string;       // ID in the source
  pageUrl?: string;
  createdAt?: Date;     // from source if available
  updatedAt?: Date;     // from source if available
  fetchedAt: Date;      // time of ingestion
}
```

* **Body**: a **minimal**, **consistent-per-source** set of fields (e.g., `tags?: string[]`, `media?: { url; kind?; … }[]`, `rating?: 'safe'|'nsfw'`, `extra?: Record<string, unknown>`).
  *No deep normalization in this module.*

---

## Contracts (ports)

```ts
// /core/ports/SourceAdapter.ts
export interface PullOpts { updatedAfter?: Date; cursor?: string; pageSize?: number }
export interface SourceItem<R> {
  postId: string; payload: R; pageUrl?: string; createdAt?: Date; updatedAt?: Date
}
export interface PullPage<R> { items: SourceItem<R>[]; next?: string; maxSeenTimestamp?: string }
export interface SourceAdapter<R=unknown> { name: string; pullPage(opts?: PullOpts): Promise<PullPage<R>> }
```

```ts
// /core/ports/ShallowMapper.ts
import { DocHeader } from '../entities/Header';
import { SourceItem } from './SourceAdapter';
export interface ShallowMapper<R, Body> {
  toHeader(item: SourceItem<R>, source: string): DocHeader;
  toBody  (item: SourceItem<R>, source: string): Body; // minimal, consistent-per-source body
}
```

```ts
// /core/ports/Repository.ts
export interface Repository<T extends { naturalKey: string }> {
  upsertMany(items: T[]): Promise<void>;
}
```

```ts
// /core/ports/StateStore.ts
export type IncrementalStrategy =
  | { kind: 'timestamp'; field: 'updatedAt'|'createdAt'; value: string }
  | { kind: 'id'; lastSeenId: string }
  | { kind: 'cursor'; cursor: string };

export interface Checkpoint { source: string; pipeline: string; value: IncrementalStrategy; updatedAt: Date }
export interface StateStore { get(source: string, pipeline: string): Promise<Checkpoint|null>; set(cp: Checkpoint): Promise<void> }
```

```ts
// /core/ports/Logger.ts
export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info (msg: string, meta?: Record<string, unknown>): void;
  warn (msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}
```

```ts
// /core/ports/Metrics.ts
export interface Metrics {
  inc(name: string, labels?: Record<string,string>, value?: number): void;
  observe(name: string, value: number, labels?: Record<string,string>): void;
  set(name: string, value: number, labels?: Record<string,string>): void;
}
```

```ts
// /core/ports/Diagnostics.ts (shape only; implementations in /infra/observability)
export type Stage = 'fetch'|'scrape'|'parse'|'map'|'upsert';
export type Severity = 'info'|'warn'|'error';

export interface ProblemReport {
  stage: Stage; severity: Severity; source: string; pipeline: string;
  itemKey?: string; code?: string; message: string; fingerprint?: string;
  context?: Record<string, unknown>; occurredAt: Date;
}

export interface EventRecord {
  runId: string; stage: Stage; message: string; at: Date;
  itemKey?: string; elapsedMs?: number; extra?: Record<string, unknown>;
}

export type Snapshot =
  | { kind: 'text';  text: string; meta?: Record<string, unknown> }
  | { kind: 'json';  json: unknown; meta?: Record<string, unknown> }
  | { kind: 'html';  html: string; meta?: Record<string, unknown> }
  | { kind: 'artifact-ref'; ref: { storage: 'fs'|'s3'|'none'; path?: string; contentType?: string }; meta?: Record<string, unknown> };

export interface FailureRecord {
  runId: string; stage: Stage; source: string; pipeline: string;
  itemKey?: string; reason: string; code?: string; snapshot?: Snapshot; createdAt: Date;
}

export interface Diagnostics {
  startRun(meta: { source: string; pipeline: string; params?: Record<string,unknown> }): Promise<{ runId: string }>;
  endRun(runId: string, meta?: { stats?: Record<string,number>; error?: string }): Promise<void>;
  emitEvent(ev: EventRecord): Promise<void>;
  reportProblem(p: ProblemReport & { runId: string }): Promise<void>;
  enqueueFailure?(f: FailureRecord): Promise<void>; // DLQ (optional)
}
```

---

## Use cases (structure)

* `/core/usecases/ingest.ts` — composes adapter → pages → mapper → repo → state updates, and invokes diagnostics hooks around stages (`fetch`, `map`, `upsert`, etc.).
* `/core/usecases/backfill.ts` and `/core/usecases/incremental.ts` — thin wrappers over `ingest` (design only; no schedules/params).

---

## Infra (Mongo, HTTP, scraper)

* **MongoRepository**: bulk **upsert by `naturalKey`**; no domain logic.
* **MongoStateStore**: persists per-source/per-pipeline checkpoints.
* **Indexes**: `naturalKey` (unique), `postId`, `updatedAt` (descending) for every source collection.
* **HTTP**/**scraper**: structural wrappers only; retry/limits/etc. are **not** part of this document.

---

## Observability & debugging

### Collections (under `observability.*`)

* `runs` — one document per pipeline run (`runId`, `source`, `pipeline`, `status`, `stats`, timestamps).
* `events` — breadcrumbs per stage & item (`runId`, `stage`, `message`, `at`, …).
* `problems` — **aggregated** issues by `fingerprint` (first/last seen, count, samples).
* `failures` — DLQ entries with **optional snapshots** (inline text/json/html or **local artifact ref**).

### Local artifacts

* Artifacts (e.g., screenshots, small dumps) are saved to **local FS**; `failures.snapshot` holds a **ref** path.
* Built-in retention: **“keep last N”** artifacts per grouping (exact grouping rule deferred by implementation; hook provided).
* Sanitization helpers (`/infra/observability/sanitizers`) for redaction and trimming of snapshots.

---

## CLI (structure & naming)

* All command files live **flat** under `/cli/commands` using **kebab-case** file names:

  * `backfill.ts`, `incremental.ts`, `list-sources.ts`
  * `runs-list.ts`, `runs-show.ts`, `events-tail.ts`
  * `problems-list.ts`, `problems-show.ts`, `problems-redrive.ts`
  * `failures-list.ts`, `failures-show.ts`, `failures-redrive.ts`
  * `artifacts-cleanup.ts`
* CLI parses arguments and delegates to jobs/use-cases.
* No `/bin` wrappers.

---

## Plugins (sources)

### Static registry

* `/src/app/registry.ts` is **static** and **empty by default**.
* The template plugin **exists** in `/src/sources/template/` but is **not registered**.

### Plugin contract (strict, TS1)

```ts
// /src/app/types.ts (excerpt)
export type SourcePlugin<Raw, Body, AOpts, MOpts> = {
  readonly name: string;              // literal name (registry key)
  readonly collectionName: string;    // exact Mongo collection name (per plugin)
  createAdapter(opts?: AOpts): SourceAdapter<Raw>;
  createMapper (opts?: MOpts): ShallowMapper<Raw, Body>;
  ensureIndexes?(col: Collection): Promise<void>;
  schemas?: {                         // optional runtime schemas (e.g., Zod)
    adapterOptions?: z.ZodType<AOpts>;
    mapperOptions?:  z.ZodType<MOpts>;
    body?:           z.ZodType<Body>;
  };
};
```

### Template plugin (example only)

* Files: `options.ts`, `schemas.ts`, `types.ts`, `adapter.ts`, `mapper.ts`, `index.ts`.
* **Body**: define a minimal, consistent shape for that source’s collection.
* **Indexes**: plugin may add specific ones via `ensureIndexes`.

---

## Testing strategy

### Unit tests (Jest)

* Location: co-located with implementation files (e.g., `/src/infra/db/MongoRepository.spec.ts`).
* Focus: pure logic and DB calls mocked/stubbed.

### Integration tests (Jest + mongodb-memory-server)

* Location: `/tests/integration/**`.
* Use `mongodb-memory-server` to run real MongoDB operations in-memory (indexes, upserts, state).
* Ensure tests are deterministic and isolated.

---

## Conventions & decisions (recap)

* **Language:** TypeScript only.
* **Module shape:** CLI/worker only (thin `/src/index.ts` bootstrap; no public programmatic API).
* **Pipeline:** single universal `items`.
* **Collections:** **per source**, name supplied by plugin (not templated).
* **Header:** standardized across all collections; **body**: minimal & consistent per source.
* **Backfill + Incremental** design; **timestamp** is the default incremental strategy (design only).
* **Registry:** static; **template plugin not registered**.
* **Typing:** **TS1** — strong typings in `registry/compose`; options/types exported by plugins.
* **Runtime schemas:** optional per plugin (`schemas.ts`) for CLI/body validation & better messages.
* **Observability:** runs/events/problems/failures; local artifact snapshots with “keep last N” (N configurable, not specified here).
* **CLI filenames:** **kebab-case**; flat command list.
* **Barrel files:** only in `/core/ports`, `/shared/**`, `/infra/observability/{sanitizers,artifacts}`.
* **No** `/src/config`, **no** `/migrations`, **no** `/examples`.
* **Docs** live under `/docs` (architecture, plugin template, observability, testing, CLI).

---

## “Definition of Done” — adding a new source (structure-only)

* Create `/src/sources/<your-source>/` with: `options.ts`, `schemas.ts` (optional), `types.ts`, `adapter.ts`, `mapper.ts`, `index.ts`.
* Ensure the body type is **consistent** across the collection.
* Implement `ensureIndexes` (optional) for source-specific needs (base indexes are applied by infra).
* Add contract tests under `__tests__/contracts/`.
* Register the plugin in `/src/app/registry.ts` when ready.

---

That’s the **complete, code-structure-first** blueprint for the module.

---

### Pickie integration notes

- Monorepo: npm workspaces; TypeScript extends root `tsconfig.base.json`; modules are **CommonJS**.
- Entry/runtime: container and `npm start` run `node dist/index.js`, built from `/src/index.ts`.
- Libraries: official `mongodb` driver; `playwright` for JS-required pages; native `fetch` (Undici) for HTTP.
- Environment: values are supplied via `datasource/.env` (Compose `env_file`). Example:

```bash
# datasource/.env.example
NODE_ENV=production
LOG_LEVEL=info
MONGODB_URI=mongodb://mongo:27017/pickie_staging
ARTIFACTS_DIR=/app/artifacts
```

- Tests: Jest is used for unit and integration tests within the datasource module.
