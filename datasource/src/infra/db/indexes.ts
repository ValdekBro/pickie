import type { Collection, IndexDescription } from 'mongodb';

export async function ensureBaseIndexes<T extends { naturalKey: string; postId?: string; updatedAt?: Date }>(
    col: Collection<T>
): Promise<void> {
    const indexSpecs: IndexDescription[] = [
        { key: { naturalKey: 1 }, name: 'naturalKey_unique', unique: true },
        { key: { postId: 1 }, name: 'postId' },
        { key: { updatedAt: -1 }, name: 'updatedAt_desc' },
    ];
    await col.createIndexes(indexSpecs);
}


