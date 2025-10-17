import { MongoClient, Db } from 'mongodb';
import { getLogger } from './logger';

let client: MongoClient | null = null;
let dbCache: Record<string, Db> = {};

export async function getMongoDb(url: string): Promise<Db> {
  if (!client) {
    client = new MongoClient(url);
    await client.connect();
    getLogger().info('Mongo connected');
  }
  const dbName = url.split('/').pop() || 'default';
  if (!dbCache[dbName]) {
    dbCache[dbName] = client.db(dbName);
  }
  return dbCache[dbName];
}

export function getMongoClient(): MongoClient | null {
  return client;
}


