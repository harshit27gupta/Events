import express from 'express';
import { getLogger, getMongoDb } from '@events/common';
import { ObjectId } from 'mongodb';

type Event = { _id?: any; title: string; description?: string; date: string; location?: string; organizerId?: string; tags?: string[] };

const app = express();
const logger = getLogger();
const PORT = parseInt(process.env.PORT || '4002', 10);
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/events';

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'events' });
});

let eventsCol: any;

app.get('/events', async (_req, res) => {
  const items = await eventsCol.find({}).sort({ date: 1 }).limit(100).toArray();
  const normalized = items.map((d: any) => ({
    _id: d._id,
    title: d.title,
    description: d.description ?? null,
    date: d.date,
    location: d.location ?? null,
    tags: Array.isArray(d.tags) ? d.tags : []
  }));
  res.json(normalized);
});

app.post('/events', async (req, res) => {
  const { title, description, date, location, tags } = req.body || {};
  if (!title || !date) return res.status(400).json({ error: 'title and date are required' });
  const event: any = {
    title,
    description: description ?? null,
    date,
    location: location ?? null,
    tags: Array.isArray(tags) ? tags : []
  };
  const result = await eventsCol.insertOne(event);
  res.status(201).json({ _id: result.insertedId, ...event });
});

app.get('/events/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const doc = await eventsCol.findOne({ _id: new ObjectId(id) });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json({
      _id: doc._id,
      title: doc.title,
      description: (doc as any).description ?? null,
      date: doc.date,
      location: (doc as any).location ?? null,
      tags: Array.isArray((doc as any).tags) ? (doc as any).tags : []
    });
  } catch {
    res.status(400).json({ error: 'invalid id' });
  }
});

app.put('/events/:id', async (req, res) => {
  const id = req.params.id;
  const update = req.body || {};
  try {
    const r = await eventsCol.findOneAndUpdate({ _id: new ObjectId(id) }, { $set: update }, { returnDocument: 'after' });
    if (!r || !r.value) return res.status(404).json({ error: 'not found' });
    res.json(r.value);
  } catch {
    res.status(400).json({ error: 'invalid id' });
  }
});

app.delete('/events/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const r = await eventsCol.deleteOne({ _id: new ObjectId(id) });
    if (r.deletedCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).send();
  } catch {
    res.status(400).json({ error: 'invalid id' });
  }
});

async function start() {
  const db = await getMongoDb(MONGO_URL);
  eventsCol = db.collection('events');
  await eventsCol.createIndex({ date: 1 });
  app.listen(PORT, () => logger.info({ PORT }, 'Events listening'));
}

start().catch((err) => {
  logger.error({ err }, 'Events failed to start');
  process.exit(1);
});


