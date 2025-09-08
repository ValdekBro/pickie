import type { Collection } from 'mongodb';
import { MongoRepository } from './MongoRepository';

describe('MongoRepository', () => {
    it('upsertMany builds bulkWrite ops with naturalKey filter and $set', async () => {
        const bulkWrite = jest.fn().mockResolvedValue({});
        const collection = { bulkWrite } as unknown as Collection<{ naturalKey: string }>;
        const repo = new MongoRepository(collection);
        const docs = [
            { naturalKey: 's:1', foo: 1 } as any,
            { naturalKey: 's:2', foo: 2 } as any,
        ];

        await repo.upsertMany(docs);

        expect(bulkWrite).toHaveBeenCalledTimes(1);
        const ops = bulkWrite.mock.calls[0][0];
        expect(ops).toHaveLength(2);
        expect(ops[0]).toEqual({
            updateOne: { filter: { naturalKey: 's:1' }, update: { $set: docs[0] }, upsert: true },
        });
        expect(ops[1]).toEqual({
            updateOne: { filter: { naturalKey: 's:2' }, update: { $set: docs[1] }, upsert: true },
        });
        const opts = bulkWrite.mock.calls[0][1];
        expect(opts).toMatchObject({ ordered: false });
    });

    it('no-ops on empty array', async () => {
        const bulkWrite = jest.fn();
        const collection = { bulkWrite } as unknown as Collection<{ naturalKey: string }>;
        const repo = new MongoRepository(collection);
        await repo.upsertMany([]);
        expect(bulkWrite).not.toHaveBeenCalled();
    });
});


