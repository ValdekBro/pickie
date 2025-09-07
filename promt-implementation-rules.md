## Prompt Implementation Rules (AI-Optimized)

These rules guide reliable, incremental delivery in this repository. Favor clarity, safety, and compatibility over novelty.

### Unbroken rules
1. **Understand before you act.** Read local docs, decide scope, list assumptions.
2. **Prefer reliability over cleverness.** Choose boring, proven patterns first.
3. **Make small, reversible changes.** Ship vertical slices; keep diffs reviewable.
4. **Compatibility is mandatory.** Don’t break behavior, contracts, or data.
5. **Safety nets on.** Types, validation, tests, and linting must pass before merge.
6. **Be explicit.** Document decisions, trade‑offs, and deferrals (with rationale).
7. **Escalate on risk.** No guesswork with security, data integrity, or money.
8. **Minimize dependencies.** Reuse stdlib/local utils; add libs only with approval.
9. **Respect repo conventions.** Strict TS, ESLint+Prettier, LF EOL, one final newline.
10. **Environment hygiene.** Load from .env files; never inline secrets in compose or code.
11. **Tooling discipline.** Use Cursor file tools only.

### Default Implementation Flow (follow in order)
Use as a strict execution plan. Do not skip a step unless it is provably N/A. Each step ends with a STOP‑GATE.

#### 1) Read & Collect Context
- Read: `README.md`, task/issue, related modules, configs, env examples, ADRs (if any).
- Skim recent commits for related changes and conventions.
- Identify ownership and code style norms.

**STOP‑GATE**
- [ ] I can explain the feature in 2–3 sentences.
- [ ] I know affected module(s)/APIs and boundaries.
- [ ] Assumptions + unknowns listed (and whether they block me).

#### 2) Scope & Acceptance Criteria
- Convert the task into clear acceptance criteria (functional + non‑functional).
- Define out‑of‑scope explicitly.
- Define rollback/disable path (feature flag or config switch when applicable).

**STOP‑GATE**
- [ ] Acceptance criteria documented.
- [ ] Out‑of‑scope written.
- [ ] Rollback/flag decided (or N/A).

#### 3) Research & Prior Art
- Check official docs for libraries/frameworks involved.
- Cite three credible references for tricky parts.
- Note API limitations, pitfalls, breaking changes.

**STOP‑GATE**
- [ ] 3+ credible references cited.
- [ ] Risks/edge cases identified with handling strategy.

#### 4) Design the Change
- Choose patterns matching the codebase (API: controller/service/repo; Web: components/hooks; Datasource: ports/usecases/infra).
- Define data contracts, DTOs, schemas, migrations, and error handling.
- Plan observability: logs, metrics, and trace points.
- Agree on performance/reliability budgets (latency, memory, retries, idempotency).

**STOP‑GATE**
- [ ] Sequence diagram or bullet flow drafted.
- [ ] Data/schema changes backward‑compatible.
- [ ] Error/timeout/retry/idempotency strategy defined.

#### 5) Plan Tasks & Todos
Create granular to‑dos (≤1–2 hours each): implementation, migrations, tests, docs.

**STOP‑GATE**
- [ ] Ordered to‑do list created with estimates.
- [ ] Rollout plan (behind flag or small PRs) decided.

#### 6) Implement Safely
- Follow architecture boundaries; keep functions focused; no hidden side effects.
- Validate all inputs at edges; sanitize external data.
- Use strict types; avoid `any`; narrow casts; handle null/undefined.
- Add structured, actionable logs (no secrets/PII).
- Prefer DI over singletons where helpful; keep state localized.
- Keep changes minimal; avoid unrelated refactors.

**STOP‑GATE**
- [ ] Logs and errors are clear and scrubbed.

#### 7) Tests First (or Very Early)
- Write/update tests alongside code: unit for logic, integration/contract for APIs.
- Provide fixtures and deterministic seeds; test failure modes.

**STOP‑GATE**
- [ ] New logic covered by unit tests.
- [ ] External interactions mocked or exercised in integration tests.
- [ ] Negative paths tested (timeouts, invalid input, conflicts).

#### 8) Run, Fix, and Harden
- Run: typecheck → lint → unit → integration → E2E.
- Profile if relevant; fix obvious bottlenecks.
- Add guards for edge cases found by tests.

**STOP‑GATE**
- [ ] All tests pass locally/CI.
- [ ] Performance/regression checks pass or are accepted with rationale.
- [ ] No flaky tests introduced.

#### 9) Update Docs & Examples
- Update `README`/module docs, API docs, examples; include rollout/migration notes.
- Add troubleshooting entries if relevant.

**STOP‑GATE**
- [ ] User‑facing and developer docs updated.
- [ ] Example snippets validated.

### Project Conventions Snapshot (context cues)
- Single‑user, tag‑driven recommendation system.
- Stack: Node.js + TypeScript; API often NestJS; Postgres (primary), MongoDB (staging); React + Tailwind; npm workspaces.
- TypeScript: strict, prefer upgrading over downgrading; avoid `any`.
- Formatting: LF EOL, UTF‑8, one trailing newline in new files.
- CI quality gates: lint, format, typecheck, tests (unit/integration/E2E).
- Config via `.env` files; compose uses env files; no secrets in code.

### Reliability, Safety & Quality Rules

Inputs, Errors, Idempotency
- Validate and sanitize all external inputs (HTTP, CLI, DB, files).
- Fail fast with typed errors and clear messages; never swallow errors.
- Ensure idempotent handlers where retries can occur; guard duplicates.

Data & Schema Changes
- Migrations are backward‑compatible; use expand → migrate → contract.
- Never repurpose/destroy fields in one step; deprecate then remove.

Code Style & Structure
- Follow repo lint/format settings; no unrelated reformatting.
- Keep modules small; prefer pure functions and composition.
- Write self‑documenting code with precise names; JSDoc for public APIs.

### Definition of Done (DoD)
- [ ] All acceptance criteria satisfied.
- [ ] Typesafe, lint‑clean, formatted.
- [ ] Unit + integration (and E2E if applicable) tests added and passing.
- [ ] Backward‑compatible migrations (if any) applied and documented.
- [ ] Logs/metrics/traces added as needed.
- [ ] Docs/README/examples updated.
- [ ] PR created with checklist complete.
- [ ] Rollback plan documented; feature flag used if risky.


### Anti‑Patterns (avoid)
- Silent breaking changes or schema rewrites in one step.
- Skipping tests or testing only the happy path.
- Catch‑all try/catch that hides real errors.
- Adding heavy dependencies without strong justification and prior approval.
- Inline secrets, credentials, or magical env coupling.

When ambiguous and not security‑critical, choose a conservative default, proceed, and leave a clearly marked TODO with rationale and a suggested follow‑up.
