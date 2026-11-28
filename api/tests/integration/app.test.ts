import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '@/app.js';
import { createRateLimiter } from '@/middleware/rate-limit.js';
import { initTestConfig } from '../helpers/test-runtime.js';

describe('Express 5 app foundation', () => {
  beforeAll(() => {
    initTestConfig();
  });

  it('returns 200 OK on GET /api/v1/health with X-Request-Id header', async () => {
    const app = createApp(express.Router());
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('echoes valid X-Request-Id and replaces unsafe values', async () => {
    const app = createApp(express.Router());
    const validRes = await request(app).get('/api/v1/health').set('X-Request-Id', 'req_123-abc');
    expect(validRes.headers['x-request-id']).toBe('req_123-abc');

    const unsafeRes = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', 'bad id with spaces;drop');
    expect(unsafeRes.headers['x-request-id']).not.toBe('bad id with spaces;drop');
    expect(unsafeRes.headers['x-request-id']).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('returns 404 NOT_FOUND for unknown routes', async () => {
    const app = createApp(express.Router());
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND' } });
  });

  it('returns 400 MALFORMED_REQUEST for invalid JSON bodies', async () => {
    const router = express.Router();
    router.post('/echo', (_req, res) => res.status(200).json({ ok: true }));
    const app = createApp(router);

    const res = await request(app)
      .post('/api/v1/echo')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: { code: 'MALFORMED_REQUEST' } });
  });

  it('returns 500 INTERNAL_ERROR without leaking error messages or stack traces', async () => {
    const router = express.Router();
    router.get('/boom', async () => {
      throw new Error('SELECT * FROM users WHERE secret = 123');
    });
    const app = createApp(router);

    const res = await request(app).get('/api/v1/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR' } });
    expect(JSON.stringify(res.body)).not.toContain('SELECT');
  });

  it('returns 413 PAYLOAD_TOO_LARGE when JSON body exceeds 100kb', async () => {
    const router = express.Router();
    router.post('/echo', (_req, res) => res.status(200).json({ ok: true }));
    const app = createApp(router);

    const res = await request(app)
      .post('/api/v1/echo')
      .send({ data: 'a'.repeat(110_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: { code: 'PAYLOAD_TOO_LARGE' } });
  });

  it('returns 429 RATE_LIMITED via express-rate-limit wrapper', async () => {
    const router = express.Router();
    router.get('/limited', createRateLimiter({ windowMs: 60_000, limit: 1 }), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    const app = createApp(router);

    expect((await request(app).get('/api/v1/limited')).status).toBe(200);
    const second = await request(app).get('/api/v1/limited');
    expect(second.status).toBe(429);
    expect(second.body).toEqual({ error: { code: 'RATE_LIMITED' } });
  });
});
