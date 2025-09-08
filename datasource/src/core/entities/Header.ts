export interface DocHeader {
    /**
     * Deterministic unique key for the document, usually `${source}:${postId}`.
     */
    naturalKey: string;

    /**
     * Registry key of the source plugin that produced this document.
     */
    source: string;

    /**
     * Identifier of the item in the external source.
     */
    postId: string;

    /**
     * Optional public page URL of the item in the external source.
     */
    pageUrl?: string;

    /**
     * Original creation timestamp from the source, if available.
     */
    createdAt?: Date;

    /**
     * Original update timestamp from the source, if available.
     */
    updatedAt?: Date;

    /**
     * Timestamp when this document was fetched/ingested by the pipeline.
     */
    fetchedAt: Date;
}

