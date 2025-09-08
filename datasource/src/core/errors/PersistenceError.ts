import type { ErrorCode } from './ErrorCodes';

export class PersistenceError extends Error {
    public readonly code: ErrorCode;
    public readonly collection?: string;
    public readonly causeError?: unknown;

    constructor(params: { message: string; code: ErrorCode; collection?: string; cause?: unknown }) {
        super(params.message);
        this.name = 'PersistenceError';
        this.code = params.code;
        this.collection = params.collection;
        this.causeError = params.cause;
    }
}


