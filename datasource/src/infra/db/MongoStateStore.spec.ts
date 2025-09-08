import type { Collection } from 'mongodb';
import { MongoStateStore } from './MongoStateStore';

describe('MongoStateStore', () => {
    it('set upserts by source+pipeline and get returns without _id', async () => {
        const updateOne = jest.fn().mockResolvedValue({});
        const findOne = jest.fn().mockResolvedValue({ _id: 'x', source: 'a', pipeline: 'p', value: { kind: 'cursor', cursor: 'c' }, updatedAt: new Date() });
        const collection = { updateOne, findOne } as unknown as Collection<any>;
        const store = new MongoStateStore(collection);

        const cp = { source: 'a', pipeline: 'p', value: { kind: 'id', lastSeenId: '42' }, updatedAt: new Date() } as const;
        await store.set(cp);
        expect(updateOne).toHaveBeenCalledWith(
            { source: 'a', pipeline: 'p' },
            { $set: cp },
            { upsert: true }
        );

        const got = await store.get('a', 'p');
        expect(got).toBeTruthy();
        expect(got).toEqual({ source: 'a', pipeline: 'p', value: { kind: 'cursor', cursor: 'c' }, updatedAt: expect.any(Date) });
    });
});


