import express from 'express';
import { getLogger, getMongoDb, getRedis, requestIdMiddleware, signAccessToken, verifyToken, setCookie, clearCookie, parseCookies } from '@events/common';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

type User = { _id?: any; email: string; passwordHash: string; name?: string; role?: 'user' | 'organizer' | 'admin' };

const app = express();
const logger = getLogger();
const PORT = parseInt(process.env.PORT || '4001', 10);
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ACCESS_TOKEN_TTL_SECONDS = parseInt(process.env.ACCESS_TOKEN_TTL_SECONDS || '900', 10); // 15m
const REFRESH_TOKEN_TTL_SECONDS = parseInt(process.env.REFRESH_TOKEN_TTL_SECONDS || '1209600', 10); // 14d
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '';
const COOKIE_SECURE = (process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true';

app.use(express.json());
app.use(requestIdMiddleware);

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
app.use('/login', loginLimiter);
app.use('/signup', loginLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

function authMiddleware(req: any, res: any, next: any) {
  const header = (req.headers['authorization'] as string) || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : (parseCookies(req.headers['cookie'] as string | undefined)['access_token'] || null);
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    const decoded = verifyToken(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
}

let usersCol: any;
let redis: any;

function setAuthCookies(res: express.Response, accessToken: string, refreshToken: string) {
  setCookie(res, 'access_token', accessToken, {
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN || undefined,
    httpOnly: true,
    sameSite: 'lax',
    maxAgeMs: ACCESS_TOKEN_TTL_SECONDS * 1000,
    path: '/',
  });
  setCookie(res, 'refresh_token', refreshToken, {
    secure: COOKIE_SECURE,
    domain: COOKIE_DOMAIN || undefined,
    httpOnly: true,
    sameSite: 'lax',
    maxAgeMs: REFRESH_TOKEN_TTL_SECONDS * 1000,
    // Restrict refresh cookie to gateway path
    path: '/api/auth/refresh',
  });
}

async function issueTokens(user: User) {
  const payload = { userId: (user._id as any).toString(), email: user.email, role: user.role };
  const accessToken = signAccessToken(payload, JWT_SECRET, ACCESS_TOKEN_TTL_SECONDS);
  const jti = randomUUID();
  const refreshToken = jwt.sign({ ...payload, jti }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_TTL_SECONDS });
  await redis.set(`refresh:${jti}`, JSON.stringify({ userId: payload.userId }), 'EX', REFRESH_TOKEN_TTL_SECONDS);
  return { accessToken, refreshToken };
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
});

app.post('/signup', authLimiter, async (req, res) => {
  const parsed = signupSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { email, password, name } = parsed.data;
  const existing = await usersCol.findOne({ email });
  if (existing) return res.status(409).json({ error: 'user exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user: User = { email, passwordHash, name, role: 'user' };
  const result = await usersCol.insertOne(user);
  const fullUser = { ...user, _id: result.insertedId } as User;
  const { accessToken, refreshToken } = await issueTokens(fullUser);
  setAuthCookies(res, accessToken, refreshToken);
  res.status(201).json({ userId: result.insertedId.toString(), email, role: user.role });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

app.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: 'invalid payload' });
  const { email, password } = parsed.data;
  const user: User | null = await usersCol.findOne({ email });
  if (!user) return res.status(401).json({ error: 'invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'invalid credentials' });
  const { accessToken, refreshToken } = await issueTokens(user);
  setAuthCookies(res, accessToken, refreshToken);
  res.json({ userId: user._id.toString(), email, role: user.role });
});

app.post('/refresh', async (req, res) => {
  const cookies = parseCookies(req.headers['cookie'] as string | undefined);
  const token = cookies['refresh_token'];
  if (!token) return res.status(401).json({ error: 'missing refresh token' });
  try {
    const decoded = verifyToken<{ userId: string; jti?: string }>(token, JWT_SECRET);
    if (!decoded.jti) return res.status(401).json({ error: 'invalid refresh token' });
    const key = `refresh:${decoded.jti}`;
    const exists = await redis.get(key);
    if (!exists) return res.status(401).json({ error: 'refresh revoked' });
    await redis.del(key);
    const user = await usersCol.findOne({ _id: new ObjectId(decoded.userId) });
    if (!user) return res.status(401).json({ error: 'user not found' });
    const { accessToken, refreshToken } = await issueTokens(user);
    setAuthCookies(res, accessToken, refreshToken);
    res.json({ ok: true });
  } catch {
    return res.status(401).json({ error: 'invalid refresh token' });
  }
});

app.post('/logout', async (req, res) => {
  const cookies = parseCookies(req.headers['cookie'] as string | undefined);
  const token = cookies['refresh_token'];
  if (token) {
    try {
      const decoded = verifyToken<{ jti?: string }>(token, JWT_SECRET);
      if (decoded.jti) await redis.del(`refresh:${decoded.jti}`);
    } catch {
      // ignore
    }
  }
  clearCookie(res, 'access_token', { path: '/' });
  clearCookie(res, 'refresh_token', { path: '/api/auth/refresh' });
  res.status(204).send();
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
  redis = getRedis(REDIS_URL);
  app.listen(PORT, () => logger.info({ PORT }, 'Auth listening'));
}

start().catch((err) => {
  logger.error({ err }, 'Auth failed to start');
  process.exit(1);
});


