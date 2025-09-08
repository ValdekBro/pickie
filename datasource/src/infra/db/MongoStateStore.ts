import type { Collection } from 'mongodb';
import type { Checkpoint, StateStore } from '../../core/ports/StateStore';

type StateDoc = Checkpoint & { _id?: unknown };

export class MongoStateStore implements StateStore {
    private readonly collection: Collection<StateDoc>;

    constructor(collection: Collection<StateDoc>) {
        this.collection = collection;
    }

    async get(source: string, pipeline: string): Promise<Checkpoint | null> {
        const doc = await this.collection.findOne({ source, pipeline });
        if (!doc) return null;
        const { _id, ...rest } = doc;
        return rest;
    }

    async set(cp: Checkpoint): Promise<void> {
        await this.collection.updateOne(
            { source: cp.source, pipeline: cp.pipeline },
            { $set: cp },
            { upsert: true }
        );
    }
}


