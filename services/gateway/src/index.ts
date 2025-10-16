import express from 'express';
import cors from 'cors';
import axios from 'axios';
import CircuitBreaker from 'opossum';
import { getLogger } from '@events/common';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors({ origin: [/^http:\/\/localhost:5173$/], credentials: false }));
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
app.use('/api/auth', express.json(), async (req, res) => {
  const url = `${AUTH_SERVICE_URL}${req.url}`;
  try {
    const r = await axios({ url, method: req.method as any, data: req.body, headers: { authorization: req.headers['authorization'] || '' } });
    res.status(r.status).set(r.headers as any).send(r.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).send(err.response?.data || { error: 'upstream error' });
  }
});

app.use('/api/events', express.json(), async (req, res) => {
  const suffix = req.url === '/' ? '' : req.url;
  const url = `${EVENTS_SERVICE_URL}/events${suffix}`;
  try {
    const r = await axios({ url, method: req.method as any, data: req.body });
    res.status(r.status).set(r.headers as any).send(r.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    res.status(status).send(err.response?.data || { error: 'upstream error' });
  }
});

app.use('/api/orders', express.json(), async (req, res) => {
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


