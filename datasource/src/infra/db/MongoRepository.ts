import type { AnyBulkWriteOperation, Collection, Filter, UpdateFilter } from 'mongodb';
import type { Repository } from '../../core/ports/Repository';

export class MongoRepository<T extends { naturalKey: string }> implements Repository<T> {
    private readonly collection: Collection<T>;

    constructor(collection: Collection<T>) {
        this.collection = collection;
    }

    async upsertMany(items: T[]): Promise<void> {
        if (items.length === 0) {
            return;
        }
        const operations: AnyBulkWriteOperation<T>[] = items.map((doc: T) => ({
            updateOne: {
                filter: { naturalKey: doc.naturalKey } as Filter<T>,
                update: { $set: doc } as UpdateFilter<T>,
                upsert: true,
            },
        }));
        await this.collection.bulkWrite(operations, { ordered: false });
    }
}


