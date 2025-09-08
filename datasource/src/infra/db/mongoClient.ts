import { MongoClient, type Db, type Collection } from 'mongodb';

let cachedClient: MongoClient | null = null;

export async function getMongoClient(uri?: string): Promise<MongoClient> {
    const effectiveUri = uri ?? process.env.MONGODB_URI;
    if (!effectiveUri) {
        throw new Error('MONGODB_URI is not set');
    }
    if (cachedClient) {
        return cachedClient;
    }
    const client = new MongoClient(effectiveUri);
    await client.connect();
    cachedClient = client;
    return client;
}

export async function getDb(dbName?: string, uri?: string): Promise<Db> {
    const client = await getMongoClient(uri);
    return dbName ? client.db(dbName) : client.db();
}

export function getCollection<T>(db: Db, name: string): Collection<T> {
    return db.collection<T>(name);
}

export async function closeMongoClient(): Promise<void> {
    if (cachedClient) {
        await cachedClient.close();
        cachedClient = null;
    }
}


