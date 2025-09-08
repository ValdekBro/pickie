import type { Collection } from 'mongodb';
import { ensureBaseIndexes } from './indexes';

describe('ensureBaseIndexes', () => {
    it('creates expected indexes', async () => {
        const createIndexes = jest.fn().mockResolvedValue([]);
        const collection = { createIndexes } as unknown as Collection<any>;
        await ensureBaseIndexes(collection);
        expect(createIndexes).toHaveBeenCalledTimes(1);
        const specs = createIndexes.mock.calls[0][0];
        expect(specs).toEqual([
            { key: { naturalKey: 1 }, name: 'naturalKey_unique', unique: true },
            { key: { postId: 1 }, name: 'postId' },
            { key: { updatedAt: -1 }, name: 'updatedAt_desc' },
        ]);
    });
});


