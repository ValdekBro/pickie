export type IncrementalStrategy =
    | { kind: 'timestamp'; field: 'updatedAt' | 'createdAt'; value: string }
    | { kind: 'id'; lastSeenId: string }
    | { kind: 'cursor'; cursor: string };

export interface Checkpoint {
    source: string;
    pipeline: string;
    value: IncrementalStrategy;
    updatedAt: Date;
}

export interface StateStore {
    get(source: string, pipeline: string): Promise<Checkpoint | null>;
    set(cp: Checkpoint): Promise<void>;
}


