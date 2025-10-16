import express from 'express';
import { getLogger, getMongoDb } from '@events/common';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

type User = { _id?: any; email: string; passwordHash: string; name?: string; role?: 'user' | 'organizer' | 'admin' };

const app = express();
const logger = getLogger();
const PORT = parseInt(process.env.PORT || '4001', 10);
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

let usersCol: any;

app.post('/signup', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const existing = await usersCol.findOne({ email });
  if (existing) return res.status(409).json({ error: 'user exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = { email, passwordHash, name, role: 'user' };
  const result = await usersCol.insertOne(user);
  const token = signToken({ userId: result.insertedId.toString(), email, role: user.role });
  res.status(201).json({ token });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const user: User | null = await usersCol.findOne({ email });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const token = signToken({ userId: user._id.toString(), email, role: user.role });
  res.json({ token });
});

app.get('/me', authMiddleware, async (req: any, res) => {
  const { userId } = req.user;
  const user = await usersCol.findOne({ _id: new ObjectId(userId) });
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json({ email: user.email, name: user.name, role: user.role, userId });
});

async function start() {
  const db = await getMongoDb(MONGO_URL);
  usersCol = db.collection('users');
  await usersCol.createIndex({ email: 1 }, { unique: true });
  app.listen(PORT, () => logger.info({ PORT }, 'Auth listening'));
}

start().catch((err) => {
  logger.error({ err }, 'Auth failed to start');
  process.exit(1);
});


