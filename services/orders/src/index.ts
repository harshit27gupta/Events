import express from 'express';
import { getLogger, getMongoDb, getRedis } from '@events/common';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';

const app = express();
const logger = getLogger();
const PORT = parseInt(process.env.PORT || '4003', 10);
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/orders';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const HOLD_TTL_SECONDS = parseInt(process.env.HOLD_TTL_SECONDS || '300', 10);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'orders' });
});

type Seat = { seatId: string; row: number; number: number; state: 'reserved' };
type SeatDoc = { _id?: any; eventId: ObjectId; seats: Seat[] };

let db: any;
let seatsCol: any;
let redis: any;

function seatKey(eventId: string, seatId: string) {
  return `hold:${eventId}:${seatId}`;
}
function holdSetKey(holdId: string) {
  return `holdset:${holdId}`;
}

app.get('/seats/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  if (!ObjectId.isValid(eventId)) return res.status(400).json({ error: 'invalid eventId' });
  let doc: SeatDoc | null = await seatsCol.findOne({ eventId: new ObjectId(eventId) });
  if (!doc) {
    // initialize a simple 5x10 grid
    const seats: Seat[] = [];
    for (let r = 1; r <= 5; r++) {
      for (let n = 1; n <= 10; n++) {
        seats.push({ seatId: `R${r}-S${n}`, row: r, number: n, state: 'reserved' as any });
        // note: state 'reserved' is only persisted when actually reserved; otherwise available/held derived from Redis
        seats[seats.length - 1].state = undefined as unknown as any;
      }
    }
    const newDoc: SeatDoc = { eventId: new ObjectId(eventId), seats } as any;
    await seatsCol.insertOne(newDoc);
    doc = newDoc;
  }
  const ensuredDoc = doc as SeatDoc;
  // derive availability from Redis
  const result = [] as any[];
  for (const s of ensuredDoc.seats) {
    if ((s as any).state === 'reserved') {
      result.push({ ...s, state: 'reserved' });
    } else {
      const val = await redis.get(seatKey(eventId, s.seatId));
      if (val) result.push({ ...s, state: 'held' });
      else result.push({ ...s, state: 'available' });
    }
  }
  res.json({ eventId, seats: result });
});

app.post('/holds', async (req, res) => {
  const { eventId, seatIds } = req.body || {};
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) return res.status(400).json({ error: 'eventId and seatIds required' });
  if (!ObjectId.isValid(eventId)) return res.status(400).json({ error: 'invalid eventId' });
  const doc: SeatDoc | null = await seatsCol.findOne({ eventId: new ObjectId(eventId) });
  if (!doc) return res.status(404).json({ error: 'event seats not found' });
  const reservedSet = new Set(doc.seats.filter(s => s.state === 'reserved').map(s => s.seatId));
  const conflicts: string[] = [];
  const holdId = randomUUID();
  const createdKeys: string[] = [];
  for (const sid of seatIds) {
    if (reservedSet.has(sid)) { conflicts.push(sid); continue; }
    const key = seatKey(eventId, sid);
    const ok = await redis.set(key, holdId, 'NX', 'EX', HOLD_TTL_SECONDS);
    if (ok) {
      createdKeys.push(key);
      await redis.sadd(holdSetKey(holdId), key);
      await redis.expire(holdSetKey(holdId), HOLD_TTL_SECONDS);
    } else {
      conflicts.push(sid);
    }
  }
  if (conflicts.length) {
    // rollback created keys
    if (createdKeys.length) await redis.del(...createdKeys);
    await redis.del(holdSetKey(holdId));
    return res.status(409).json({ error: 'conflict', conflicts });
  }
  res.status(201).json({ holdId, expiresInSeconds: HOLD_TTL_SECONDS });
});

app.delete('/holds/:holdId', async (req, res) => {
  const { holdId } = req.params;
  const setKey = holdSetKey(holdId);
  const keys = await redis.smembers(setKey);
  if (keys.length) await redis.del(...keys);
  await redis.del(setKey);
  res.status(204).send();
});

// Get remaining TTL for a hold
app.get('/holds/:holdId/ttl', async (req, res) => {
  const { holdId } = req.params;
  const setKey = holdSetKey(holdId);
  const members = await redis.smembers(setKey);
  if (members.length === 0) return res.json({ holdId, ttl: 0 });
  let minTtl = Number.MAX_SAFE_INTEGER;
  for (const key of members) {
    const ttl = await redis.ttl(key);
    if (ttl >= 0 && ttl < minTtl) minTtl = ttl;
  }
  if (minTtl === Number.MAX_SAFE_INTEGER) minTtl = 0;
  res.json({ holdId, ttl: minTtl });
});

// Refresh a hold TTL atomically
app.post('/holds/:holdId/refresh', async (req, res) => {
  const { holdId } = req.params;
  const { extendSeconds } = req.body || {};
  const extra = parseInt(extendSeconds || HOLD_TTL_SECONDS, 10);
  const setKey = holdSetKey(holdId);
  const members = await redis.smembers(setKey);
  if (members.length === 0) return res.status(404).json({ error: 'hold not found' });
  for (const key of members) {
    await redis.expire(key, extra);
  }
  await redis.expire(setKey, extra);
  res.json({ holdId, ttl: extra });
});

app.post('/purchase', async (req, res) => {
  const { eventId, holdId, seatIds } = req.body || {};
  const idempotencyKey = (req.headers['idempotency-key'] as string) || '';
  if (!eventId || !holdId || !Array.isArray(seatIds) || seatIds.length === 0) return res.status(400).json({ error: 'eventId, holdId, seatIds required' });
  if (!ObjectId.isValid(eventId)) return res.status(400).json({ error: 'invalid eventId' });
  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`);
    if (cached) return res.status(201).send(JSON.parse(cached));
  }
  // verify holds
  for (const sid of seatIds) {
    const v = await redis.get(seatKey(eventId, sid));
    if (v !== holdId) return res.status(409).json({ error: 'hold missing', seatId: sid });
  }
  // reserve in DB
  const doc: SeatDoc | null = await seatsCol.findOne({ eventId: new ObjectId(eventId) });
  if (!doc) return res.status(404).json({ error: 'event seats not found' });
  const nextSeats = doc.seats.map(s => seatIds.includes(s.seatId) ? { ...s, state: 'reserved' as const } : s);
  await seatsCol.updateOne({ _id: doc._id }, { $set: { seats: nextSeats } });
  // clear holds
  const setKey = holdSetKey(holdId);
  const keys = await redis.smembers(setKey);
  if (keys.length) await redis.del(...keys);
  await redis.del(setKey);
  const orderId = randomUUID();
  const response = { orderId, eventId, seatIds, status: 'reserved' };
  if (idempotencyKey) await redis.set(`idem:${idempotencyKey}`, JSON.stringify(response), 'EX', 600);
  res.status(201).json(response);
});

async function start() {
  db = await getMongoDb(MONGO_URL);
  seatsCol = db.collection('seats');
  await seatsCol.createIndex({ eventId: 1 });
  redis = getRedis(REDIS_URL);
  app.listen(PORT, () => logger.info({ PORT }, 'Orders listening'));
}

start().catch((err) => {
  logger.error({ err }, 'Orders failed to start');
  process.exit(1);
});


