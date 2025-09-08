export interface Repository<T extends { naturalKey: string }> {
    upsertMany(items: T[]): Promise<void>;
}

