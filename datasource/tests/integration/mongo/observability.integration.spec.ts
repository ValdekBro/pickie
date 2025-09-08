import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { ensureBaseIndexes } from '../../../src/infra/db/indexes';
import { MongoRepository } from '../../../src/infra/db/MongoRepository';
import { MongoStateStore } from '../../../src/infra/db/MongoStateStore';

describe('Mongo infra integration', () => {
    let mongod: MongoMemoryServer;
    let client: MongoClient;

    beforeAll(async () => {
        mongod = await MongoMemoryServer.create();
        client = new MongoClient(mongod.getUri());
        await client.connect();
    });

    afterAll(async () => {
        await client.close();
        await mongod.stop();
    });

    it('applies indexes and performs repo/state operations', async () => {
        const db = client.db('testdb');
        const col = db.collection<{ naturalKey: string; postId?: string; updatedAt?: Date }>('items');

        await ensureBaseIndexes(col);
        const indexes = await col.indexes();
        const names = indexes.map((i) => i.name);
        expect(names).toEqual(expect.arrayContaining(['naturalKey_unique', 'postId', 'updatedAt_desc']));

        const repo = new MongoRepository(col);
        await repo.upsertMany([
            { naturalKey: 's:1', postId: '1', updatedAt: new Date() },
            { naturalKey: 's:2', postId: '2', updatedAt: new Date() },
        ]);
        const count = await col.countDocuments();
        expect(count).toBe(2);

        const stateCol = db.collection('state');
        const state = new MongoStateStore(stateCol as any);
        const cp = { source: 'a', pipeline: 'p', value: { kind: 'timestamp', field: 'updatedAt', value: new Date().toISOString() }, updatedAt: new Date() } as const;
        await state.set(cp);
        const got = await state.get('a', 'p');
        expect(got).toEqual({ ...cp });
    });
});


