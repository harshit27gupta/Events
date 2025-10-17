import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import { getLogger, cookieBridgeMiddleware } from '@events/common';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(helmet());
const corsOriginsEnv = process.env.CORS_ORIGINS || 'http://localhost:5173';
const allowedOrigins = corsOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
const logger = getLogger();

const PORT = parseInt(process.env.PORT || '8080', 10);
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const EVENTS_SERVICE_URL = process.env.EVENTS_SERVICE_URL || 'http://localhost:4002';
const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://localhost:4003';
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

const axiosBreaker = new CircuitBreaker((url: string) => axios.get(url), {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 5000
});

// Global middlewares
app.use(express.json({ limit: '1mb' }));
app.use(cookieBridgeMiddleware(JWT_SECRET));
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
app.use(globalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'gateway' });
});

app.get('/auth/health', async (_req, res) => {
  try {
    const r = await axiosBreaker.fire(`${AUTH_SERVICE_URL}/health`);
    res.status(r.status).json(r.data);
  } catch (err) {
    logger.error({ err }, 'auth health failed');
    res.status(503).json({ status: 'down', service: 'auth' });
  }
});

app.get('/events/health', async (_req, res) => {
  try {
    const r = await axiosBreaker.fire(`${EVENTS_SERVICE_URL}/health`);
    res.status(r.status).json(r.data);
  } catch (err) {
    logger.error({ err }, 'events health failed');
    res.status(503).json({ status: 'down', service: 'events' });
  }
});

app.get('/orders/health', async (_req, res) => {
  try {
    const r = await axiosBreaker.fire(`${ORDERS_SERVICE_URL}/health`);
    res.status(r.status).json(r.data);
  } catch (err) {
    logger.error({ err }, 'orders health failed');
    res.status(503).json({ status: 'down', service: 'orders' });
  }
});

// Proxy minimal routes to services
app.use('/api/auth', async (req, res) => {
  const url = `${AUTH_SERVICE_URL}${req.url}`;
  try {
    const r = await axios({ url, method: req.method as any, data: req.body, headers: { authorization: req.headers['authorization'] || '' } });
    res.status(r.status).set(r.headers as any).send(r.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).send(err.response?.data || { error: 'upstream error' });
  }
});

app.use('/api/events', async (req, res) => {
  const suffix = req.url === '/' ? '' : req.url;
  const url = `${EVENTS_SERVICE_URL}/events${suffix}`;
  // RBAC for mutations
  if (['POST', 'PUT', 'DELETE'].includes(req.method.toUpperCase())) {
    const authHeader = (req.headers['authorization'] as string) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'missing token' });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      const role = decoded?.role;
      if (!['organizer', 'admin'].includes(role)) return res.status(403).json({ error: 'forbidden' });
    } catch {
      return res.status(401).json({ error: 'invalid token' });
    }
  }
  try {
    const r = await axios({ url, method: req.method as any, data: req.body });
    res.status(r.status).set(r.headers as any).send(r.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).send(err.response?.data || { error: 'upstream error' });
  }
});

const ordersLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use('/api/orders', ordersLimiter, async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing token' });
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'invalid token' });
  }
  const url = `${ORDERS_SERVICE_URL}${req.url}`;
  try {
    const r = await axios({
      url,
      method: req.method as any,
      data: req.body,
      headers: {
        authorization: req.headers['authorization'] || '',
        'idempotency-key': (req.headers['idempotency-key'] as string) || ''
      }
    });
    res.status(r.status).set(r.headers as any).send(r.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).send(err.response?.data || { error: 'upstream error' });
  }
});

app.listen(PORT, () => {
  logger.info({ PORT }, 'Gateway listening');
});


