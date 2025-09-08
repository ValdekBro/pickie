export type Stage = 'fetch' | 'scrape' | 'parse' | 'map' | 'upsert';
export type Severity = 'info' | 'warn' | 'error';

export interface ProblemReport {
    stage: Stage;
    severity: Severity;
    source: string;
    pipeline: string;
    itemKey?: string;
    code?: string;
    message: string;
    fingerprint?: string;
    context?: Record<string, unknown>;
    occurredAt: Date;
}

export interface EventRecord {
    runId: string;
    stage: Stage;
    message: string;
    at: Date;
    itemKey?: string;
    elapsedMs?: number;
    extra?: Record<string, unknown>;
}

export type Snapshot =
    | { kind: 'text'; text: string; meta?: Record<string, unknown> }
    | { kind: 'json'; json: unknown; meta?: Record<string, unknown> }
    | { kind: 'html'; html: string; meta?: Record<string, unknown> }
    | {
          kind: 'artifact-ref';
          ref: { storage: 'fs' | 's3' | 'none'; path?: string; contentType?: string };
          meta?: Record<string, unknown>;
      };

export interface FailureRecord {
    runId: string;
    stage: Stage;
    source: string;
    pipeline: string;
    itemKey?: string;
    reason: string;
    code?: string;
    snapshot?: Snapshot;
    createdAt: Date;
}

export interface Diagnostics {
    startRun(meta: { source: string; pipeline: string; params?: Record<string, unknown> }): Promise<{ runId: string }>;
    endRun(runId: string, meta?: { stats?: Record<string, number>; error?: string }): Promise<void>;
    emitEvent(ev: EventRecord): Promise<void>;
    reportProblem(p: ProblemReport & { runId: string }): Promise<void>;
    enqueueFailure?(f: FailureRecord): Promise<void>;
}


