export interface PullOpts {
    updatedAfter?: Date;
    cursor?: string;
    pageSize?: number;
}

export interface SourceItem<R> {
    postId: string;
    payload: R;
    pageUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PullPage<R> {
    items: SourceItem<R>[];
    next?: string;
    maxSeenTimestamp?: string;
}

export interface SourceAdapter<R = unknown> {
    name: string;
    pullPage(opts?: PullOpts): Promise<PullPage<R>>;
}

