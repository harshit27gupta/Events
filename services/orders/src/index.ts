import express from 'express';
import { getLogger, getMongoDb, getRedis, getMongoClient } from '@events/common';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requestIdMiddleware, errorHandler, asyncHandler, AppError } from '@events/common';

const app = express();
const logger = getLogger();
const PORT = parseInt(process.env.PORT || '4003', 10);
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/orders';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const HOLD_TTL_SECONDS = parseInt(process.env.HOLD_TTL_SECONDS || '300', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

app.use(express.json());
app.use(requestIdMiddleware);
app.use(errorHandler);

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ promise, reason }, 'Unhandled Rejection');
});
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught Exception');
  process.exit(1);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'orders' });
});

function requireAuth(req: any, res: any, next: any) {
  const authHeader = (req.headers['authorization'] as string) || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

type Seat = { seatId: string; row: number; number: number; state: 'reserved' };
type SeatDoc = { _id?: any; eventId: ObjectId; seats: Seat[] };

let db: any;
let seatsCol: any;
let ordersCol: any;
let redis: any;

function seatKey(eventId: string, seatId: string) {
  return `hold:${eventId}:${seatId}`;
}
function holdSetKey(holdId: string) {
  return `holdset:${holdId}`;
}

app.get('/seats/:eventId', asyncHandler(async (req, res) => {
  const eventId = req.params.eventId;
  if (!ObjectId.isValid(eventId)) throw new AppError(400, 'INVALID_EVENT_ID', 'Invalid eventId');
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
}));

app.post('/holds', requireAuth, asyncHandler(async (req, res) => {
  const { eventId, seatIds } = req.body || {};
  if (!eventId || !Array.isArray(seatIds) || seatIds.length === 0) throw new AppError(400, 'INVALID_INPUT', 'eventId and seatIds required');
  if (!ObjectId.isValid(eventId)) throw new AppError(400, 'INVALID_EVENT_ID', 'Invalid eventId');
  const doc: SeatDoc | null = await seatsCol.findOne({ eventId: new ObjectId(eventId) });
  if (!doc) throw new AppError(404, 'EVENT_SEATS_NOT_FOUND', 'Event seats not found');
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
    throw new AppError(409, 'CONFLICT_SEATS', 'Seat hold conflict', { conflicts });
  }
  res.status(201).json({ holdId, expiresInSeconds: HOLD_TTL_SECONDS });
}));

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

// List current user's orders
app.get('/orders', requireAuth, async (req: any, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'unauthorized' });
  const items = await ordersCol
    .find({ userId })
    .project({ _id: 1, eventId: 1, seatIds: 1, paymentIntentId: 1, status: 1, createdAt: 1 })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  res.json({ orders: items });
});

// Public ticket lookup by order id (demo-only; returns limited fields)
app.get('/public/orders/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  if (!orderId) throw new AppError(400, 'ORDER_ID_REQUIRED', 'orderId required');
  const doc = await ordersCol.findOne({ _id: orderId }, { projection: { _id: 1, eventId: 1, seatIds: 1, status: 1, createdAt: 1 } });
  if (!doc) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
  res.json({ order: { orderId: doc._id, eventId: String(doc.eventId), seatIds: doc.seatIds, status: doc.status, createdAt: doc.createdAt } });
}));

// Refresh a hold TTL atomically
app.post('/holds/:holdId/refresh', requireAuth, async (req, res) => {
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

// Simulated payments
const intentSchema = z.object({ amount: z.number().positive(), currency: z.string().min(1) });
app.post('/payments/intent', requireAuth, async (req, res) => {
  const parsed = intentSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const paymentIntentId = `pi_${randomUUID()}`;
  const clientSecret = `secret_${randomUUID()}`;
  await redis.set(`pi:${paymentIntentId}`, JSON.stringify({ status: 'requires_confirmation', clientSecret }), 'EX', 900);
  res.status(201).json({ paymentIntentId, clientSecret, status: 'requires_confirmation' });
});

const confirmSchema = z.object({ paymentIntentId: z.string().min(1), clientSecret: z.string().min(1) });
app.post('/payments/confirm', requireAuth, async (req, res) => {
  const parsed = confirmSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { paymentIntentId, clientSecret } = parsed.data;
  const raw = await redis.get(`pi:${paymentIntentId}`);
  if (!raw) return res.status(404).json({ error: 'paymentIntent not found' });
  const pi = JSON.parse(raw);
  if (pi.clientSecret !== clientSecret) return res.status(401).json({ error: 'invalid client secret' });
  await redis.set(`pi:${paymentIntentId}`, JSON.stringify({ ...pi, status: 'succeeded' }), 'EX', 900);
  res.json({ paymentIntentId, status: 'succeeded' });
});

const purchaseSchema = z.object({ eventId: z.string().min(1), holdId: z.string().min(1), seatIds: z.array(z.string()).min(1), paymentIntentId: z.string().min(1) });
app.post('/purchase', requireAuth, asyncHandler(async (req, res) => {
  const parsed = purchaseSchema.safeParse(req.body || {});
  if (!parsed.success) throw new AppError(400, 'INVALID_PAYLOAD', 'Invalid payload');
  const { eventId, holdId, seatIds, paymentIntentId } = parsed.data as any;
  const idempotencyKey = (req.headers['idempotency-key'] as string) || '';
  if (!ObjectId.isValid(eventId)) throw new AppError(400, 'INVALID_EVENT_ID', 'Invalid eventId');
  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`);
    if (cached) return res.status(201).send(JSON.parse(cached));
  }
  // payment check
  const piRaw = await redis.get(`pi:${paymentIntentId}`);
  if (!piRaw) throw new AppError(400, 'PAYMENT_INTENT_MISSING', 'Payment intent missing');
  const pi = JSON.parse(piRaw);
  if (pi.status !== 'succeeded') throw new AppError(402, 'PAYMENT_REQUIRED', 'Payment required');
  // verify holds
  for (const sid of seatIds) {
    const v = await redis.get(seatKey(eventId, sid));
    if (v !== holdId) throw new AppError(409, 'HOLD_NOT_FOUND', 'Hold not found', { seatId: sid });
  }
  // transactional reserve in DB and create order (fallback if transactions unsupported)
  const client = getMongoClient();
  const session = client?.startSession();
  let response: any;
  try {
    await session?.withTransaction(async () => {
      const doc: SeatDoc | null = await seatsCol.findOne({ eventId: new ObjectId(eventId) }, { session });
      if (!doc) throw new AppError(404, 'EVENT_SEATS_NOT_FOUND', 'Event seats not found');
      const reservedSet = new Set(doc.seats.filter(s => s.state === 'reserved').map(s => s.seatId));
      for (const sid of seatIds) {
        if (reservedSet.has(sid)) throw new AppError(409, 'SEAT_ALREADY_RESERVED', 'Seat already reserved', { seatId: sid });
      }
      const nextSeats = doc.seats.map(s => seatIds.includes(s.seatId) ? { ...s, state: 'reserved' as const } : s);
      await seatsCol.updateOne({ _id: doc._id }, { $set: { seats: nextSeats } }, { session });
      const orderId = randomUUID();
      const orderDoc = { _id: orderId, userId: (req as any).user?.userId, eventId: new ObjectId(eventId), seatIds, paymentIntentId, status: 'reserved', createdAt: new Date() };
      await ordersCol.insertOne(orderDoc, { session });
      response = { orderId, eventId, seatIds, status: 'reserved' };
    });
  } catch (err: any) {
    if (String(err?.message || '').includes('Transaction numbers are only allowed')) {
      const doc: SeatDoc | null = await seatsCol.findOne({ eventId: new ObjectId(eventId) });
      if (!doc) throw new AppError(404, 'EVENT_SEATS_NOT_FOUND', 'Event seats not found');
      const reservedSet = new Set(doc.seats.filter((s: any) => s.state === 'reserved').map((s: any) => s.seatId));
      for (const sid of seatIds) {
        if (reservedSet.has(sid)) throw new AppError(409, 'SEAT_ALREADY_RESERVED', 'Seat already reserved', { seatId: sid });
      }
      const nextSeats = doc.seats.map((s: any) => seatIds.includes(s.seatId) ? { ...s, state: 'reserved' as const } : s);
      const upd = await seatsCol.updateOne({ _id: doc._id, 'seats.seatId': { $in: seatIds } }, { $set: { seats: nextSeats } });
      if (!upd.acknowledged) throw new AppError(500, 'RESERVATION_FAILED', 'Failed to reserve seats');
      const orderId = randomUUID();
      const orderDoc = { _id: orderId, userId: (req as any).user?.userId, eventId: new ObjectId(eventId), seatIds, paymentIntentId, status: 'reserved', createdAt: new Date() };
      await ordersCol.insertOne(orderDoc);
      response = { orderId, eventId, seatIds, status: 'reserved' };
    } else {
      throw err;
    }
  } finally {
    await session?.endSession();
  }
  // clear holds
  const setKey = holdSetKey(holdId);
  const keys = await redis.smembers(setKey);
  if (keys.length) await redis.del(...keys);
  await redis.del(setKey);
  if (idempotencyKey) await redis.set(`idem:${idempotencyKey}`, JSON.stringify(response), 'EX', 600);
  return res.status(201).json(response);
}));

// Get hold details: eventId, seatIds, and ttl
app.get('/holds/:holdId/details', requireAuth, async (req, res) => {
  const { holdId } = req.params;
  const setKey = holdSetKey(holdId);
  let members: string[] = await redis.smembers(setKey);
  if (members.length === 0) {
    // Fallback: reconstruct membership by scanning keys whose value == holdId
    // Dev-friendly and small scale; acceptable for this project.
    let cursor = '0';
    const found: string[] = [];
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'hold:*:*', 'COUNT', 200);
      cursor = next;
      if (keys && keys.length) {
        const vals = await redis.mget(...keys);
        for (let i = 0; i < keys.length; i++) {
          if (vals[i] === holdId) found.push(keys[i]);
        }
      }
    } while (cursor !== '0');
    members = found;
    if (members.length === 0) return res.status(404).json({ error: 'hold not found' });
  }
  // members are like hold:<eventId>:<seatId>
  const seatIds: string[] = [];
  let eventId: string | null = null;
  for (const m of members) {
    const parts = m.split(':');
    if (parts.length >= 3) {
      eventId = parts[1];
      seatIds.push(parts.slice(2).join(':'));
    }
  }
  // compute min TTL like TTL endpoint
  let minTtl = Number.MAX_SAFE_INTEGER;
  for (const key of members) {
    const ttl = await redis.ttl(key);
    if (ttl >= 0 && ttl < minTtl) minTtl = ttl;
  }
  if (minTtl === Number.MAX_SAFE_INTEGER) minTtl = 0;
  return res.json({ holdId, eventId, seatIds, ttl: minTtl });
});

async function start() {
  db = await getMongoDb(MONGO_URL);
  seatsCol = db.collection('seats');
  await seatsCol.createIndex({ eventId: 1 });
  ordersCol = db.collection('orders');
  await ordersCol.createIndex({ userId: 1, createdAt: -1 });
  redis = getRedis(REDIS_URL);
  app.listen(PORT, () => logger.info({ PORT }, 'Orders listening'));
}

start().catch((err) => {
  logger.error({ err }, 'Orders failed to start');
  process.exit(1);
});


