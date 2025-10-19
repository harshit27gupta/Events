import request from 'supertest';
import { app } from './index';

jest.mock('@events/common', () => {
  const actual = jest.requireActual('@events/common');
  return {
    ...actual,
    getMongoDb: jest.fn(async () => ({ collection: () => ({ findOne: jest.fn(), createIndex: jest.fn() }) })),
    getRedis: jest.fn(() => ({ get: jest.fn(), set: jest.fn(), del: jest.fn(), expire: jest.fn() })),
  };
});

describe('Auth Service Error Handling', () => {
  it('returns 401 for missing token on /me', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('missing token');
  });

  it('returns 400 for invalid signup payload', async () => {
    const res = await request(app).post('/signup').send({ email: 'bad', password: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid payload');
  });
});
