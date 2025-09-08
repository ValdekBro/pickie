import type { ErrorCode } from './ErrorCodes';

export class SourceError extends Error {
    public readonly code: ErrorCode;
    public readonly source: string;
    public readonly stage?: 'fetch' | 'scrape' | 'parse';
    public readonly causeError?: unknown;

    constructor(params: { message: string; code: ErrorCode; source: string; stage?: 'fetch' | 'scrape' | 'parse'; cause?: unknown }) {
        super(params.message);
        this.name = 'SourceError';
        this.code = params.code;
        this.source = params.source;
        this.stage = params.stage;
        this.causeError = params.cause;
    }
}


