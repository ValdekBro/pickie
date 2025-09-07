## Datasource Module — Implementation TODOs

This plan implements the datasource as a Node.js + TypeScript CLI/worker, following `README.md` and `datasource/DOCUMENTATION.md`. We proceed from generic → specific: foundations → abstractions → infrastructure → composition → CLI → template plugin → real sources.

### 0) Preflight & Project Wiring
- [ ] Confirm Node 20 / npm 10 in workspace; CommonJS modules.
- [ ] Create `datasource/.env.example` from doc snippet (`MONGODB_URI`, `LOG_LEVEL`, `ARTIFACTS_DIR`).
- [ ] Confirm Compose `datasource` service runs `node dist/index.js` and reads `datasource/.env`.
- [ ] With approval, add base deps to `datasource/package.json`: `mongodb`, `playwright` (core), optional `zod` (schemas). Add scripts: `start`, `dev`, `typecheck`, `lint`, `format`.
- [ ] Ensure TS config extends root `tsconfig.base.json` and outputs to `dist/`.

### 1) Core types and ports (generic contracts)
- [ ] `src/core/entities/Header.ts` — `DocHeader` (naturalKey, source, postId, timestamps, pageUrl, fetchedAt).
- [ ] `src/core/ports/SourceAdapter.ts` — `PullOpts`, `SourceItem`, `PullPage`, `SourceAdapter`.
- [ ] `src/core/ports/ShallowMapper.ts` — `ShallowMapper<R, Body>`: `toHeader`, `toBody`.
- [ ] `src/core/ports/Repository.ts` — `upsertMany(items)` by `naturalKey`.
- [ ] `src/core/ports/StateStore.ts` — `IncrementalStrategy`, `Checkpoint`, `StateStore`.
- [ ] `src/core/ports/Logger.ts`, `src/core/ports/Metrics.ts`, `src/core/ports/Diagnostics.ts`.
- [ ] `src/core/errors/{ErrorCodes.ts,SourceError.ts,PersistenceError.ts}`.
- [ ] Unit tests (types/shape) or stub tests for contracts.

### 2) Infrastructure — MongoDB and state (generic persistence)
- [ ] `src/infra/db/mongoClient.ts` — shared client factory, lifecycle.
- [ ] `src/infra/db/MongoRepository.ts` — bulk upsert by `naturalKey` (ordered=false), returns void.
- [ ] `src/infra/db/MongoStateStore.ts` — get/set `Checkpoint` by (`source`,`pipeline`).
- [ ] `src/infra/db/indexes.ts` — ensure base indexes (`naturalKey` unique, `postId`, `updatedAt` desc).
- [ ] Tests: repository upsert behavior; state store read/write; indexes existence.

### 3) Infrastructure — IO wrappers & observability (generic)
- [ ] `src/infra/http/httpClient.ts` — thin fetch wrapper (timeouts, UA; no policies yet).
- [ ] `src/infra/scraper/browser.ts` — Playwright launcher (headless, single context factory).
- [ ] `src/infra/observability/consoleLogger.ts`, `src/infra/observability/noopMetrics.ts`.
- [ ] `src/infra/observability/MongoDiagnostics/{index.ts,runs.store.ts,events.store.ts,problems.store.ts,failures.store.ts,retention.ts}`.
- [ ] `src/infra/observability/artifacts/{localFsStore.ts,paths.ts,safeFs.ts}`.
- [ ] `src/infra/observability/sanitizers/{redact.ts,trim.ts,errorFingerprint.ts,htmlToSnippet.ts}`.
- [ ] Tests: diagnostics write paths; artifact retention policy hook.

### 4) Use cases and pipeline composition (generic orchestration)
- [ ] `src/core/usecases/ingest.ts` — pages → map → upsert → checkpoint with diagnostics hooks.
- [ ] `src/core/usecases/{backfill.ts,incremental.ts}` — thin wrappers over `ingest`.
- [ ] `src/pipelines/buildIngestPipeline.ts` — compose adapter/mapper/repo/state/diagnostics.
- [ ] `src/pipelines/options.ts` — types for pipeline hooks/options (no values).
- [ ] Tests: ingest happy-path with fakes; error paths produce problems/failures.

### 5) App composition (generic DI) and registry (empty)
- [ ] `src/app/types.ts` — `SourcePlugin<Raw,Body,AOpts,MOpts>` signature.
- [ ] `src/app/compose.ts` — wire plugin factories into pipeline deps; call `ensureIndexes`.
- [ ] `src/app/registry.ts` — empty static registry (export `as const`).
- [ ] Tests: compose builds a runnable pipeline for a fake plugin.

### 6) CLI and jobs (generic runner)
- [ ] `src/cli/main.ts` — argument parsing; commands routing; shared flags (env, log-level).
- [ ] `src/cli/commands/{backfill.ts,incremental.ts,list-sources.ts,runs-list.ts,runs-show.ts,events-tail.ts,problems-list.ts,problems-show.ts,problems-redrive.ts,failures-list.ts,failures-show.ts,failures-redrive.ts,artifacts-cleanup.ts}` — placeholders calling jobs.
- [ ] `src/jobs/{runBackfill.ts,runIncremental.ts}` — invoke use cases.
- [ ] `src/index.ts` — thin bootstrap delegating to `cli/main.ts`.
- [ ] Tests: smoke test CLI (in-memory fakes) and help output.

### 7) Template plugin (specific example; not registered)
- [ ] `src/sources/template/{options.ts,schemas.ts,types.ts,adapter.ts,mapper.ts,index.ts}`.
- [ ] Implement minimal adapter that yields fixture pages; mapper builds header/body.
- [ ] `ensureIndexes` for any plugin-specific needs.
- [ ] Contract tests under `__tests__/contracts/` for adapter/mapper/indexes.

### 8) Integration tests (generic → specific validation)
- [ ] `/tests/_shared/{mongoTestEnv.ts,tmpDir.ts,memoryDiagnostics.ts,noopLogger.ts,noopMetrics.ts}` helpers.
- [ ] `/tests/integration/observability/{runs,events,problems,failures,retention}.integration.test.ts`.
- [ ] End-to-end ingest with template plugin: pages → Mongo upserts → diagnostics persisted.

### 9) Operational wiring & DX
- [ ] Provide `datasource/.env.example`; document envs in `datasource/DOCUMENTATION.md` and link from `README.md`.
- [ ] Update `docker-compose.yml` notes if CLI flags/envs change; avoid inline secrets.
- [ ] Add npm scripts: `dev`, `start`, `build`, `typecheck`, `lint`, `format` and ensure root tasks fan out.
- [ ] Enforce lint/format in CI or pre-commit (follow project policy).

### 10) First real source (specific)
- [ ] Pick initial source (e.g., `artstation` or `pixiv`) and create `/src/sources/<source>/`.
- [ ] Implement adapter (fetch/Playwright) and mapper (minimal body) against live HTML/API.
- [ ] Add plugin-specific indexes if needed; extend tests with fixtures/mocks.
- [ ] Validate collection writes and diagnostics; iterate thresholds/timeouts as needed.

### 11) Optional: Canonical mapping into Postgres
- [ ] Decide integration path with you: direct Prisma vs API endpoints.
- [ ] Implement a mapper job that reads staging collections and upserts into canonical tables.
- [ ] Add tests around deduplication and transactional integrity.

### 12) Documentation & housekeeping
- [ ] Keep `datasource/DOCUMENTATION.md` in sync with structure and decisions.
- [ ] Cross-link `README.md` and CLI usage; add `docs/cli.md` inside datasource if needed.
- [ ] Ensure LF EOL, UTF-8, single trailing newline; trim trailing whitespace.
