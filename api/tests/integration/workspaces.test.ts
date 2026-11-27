import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '@/app.js';
import { signAccessToken } from '@/modules/auth/auth.crypto.js';
import { createUser } from '@/modules/auth/auth.repository.js';
import { createTestRuntime } from '../helpers/test-runtime.js';
import type { TestRuntime } from '../helpers/test-runtime.js';

describe('Workspaces HTTP integration (/api/v1/workspaces)', () => {
  let runtime: TestRuntime;

  beforeAll(async () => {
    runtime = await createTestRuntime();
  });

  afterAll(async () => {
    await runtime.close();
  });

  beforeEach(async () => {
    await runtime.reset();
  });

  it('requires authentication, creates and lists workspaces, and isolates non-owners with 404', async () => {
    const app = createApp();

    const unauth = await request(app).get('/api/v1/workspaces');
    expect(unauth.status).toBe(401);
    expect(unauth.body).toEqual({ error: { code: 'UNAUTHENTICATED' } });

    const user1 = await createUser({ name: 'Hana', email: 'hana@acm.com', passwordHash: 'hash' });
    const user2 = await createUser({ name: 'Omar', email: 'omar@acm.com', passwordHash: 'hash' });
    const user1Token = await signAccessToken({ userId: user1.id, sessionId: 'sess-1' });
    const user2Token = await signAccessToken({ userId: user2.id, sessionId: 'sess-2' });

    const emptyList = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(emptyList.status).toBe(200);
    expect(emptyList.body).toEqual({ data: [] });

    const invalidCreate = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: '   ' });
    expect(invalidCreate.status).toBe(422);
    expect(invalidCreate.body.error.code).toBe('VALIDATION_ERROR');

    const created = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: '  Acme Studio  ' });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: 'Acme Studio',
      role: 'owner',
      agentsCount: 0,
    });

    const workspaceId = created.body.data.id;

    const listAfterCreate = await request(app)
      .get('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(listAfterCreate.status).toBe(200);
    expect(listAfterCreate.body.data).toHaveLength(1);

    const ownerDetail = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${user1Token}`);
    expect(ownerDetail.status).toBe(200);
    expect(ownerDetail.body.data.name).toBe('Acme Studio');

    const nonOwnerDetail = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${user2Token}`);
    expect(nonOwnerDetail.status).toBe(404);
    expect(nonOwnerDetail.body).toEqual({
      error: { code: 'NOT_FOUND', details: [{ resource: 'workspace' }] },
    });

    const badParam = await request(app)
      .get('/api/v1/workspaces/not-a-number')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(badParam.status).toBe(422);
    expect(badParam.body.error.code).toBe('VALIDATION_ERROR');

    const overflowParam = await request(app)
      .get('/api/v1/workspaces/999999999999')
      .set('Authorization', `Bearer ${user1Token}`);
    expect(overflowParam.status).toBe(422);
    expect(overflowParam.body.error.code).toBe('VALIDATION_ERROR');

    for (let i = 2; i <= 10; i++) {
      const res = await request(app)
        .post('/api/v1/workspaces')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: `Workspace ${i}` });
      expect(res.status).toBe(201);
    }

    const overLimit = await request(app)
      .post('/api/v1/workspaces')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ name: 'Workspace 11' });
    expect(overLimit.status).toBe(409);
    expect(overLimit.body).toEqual({ error: { code: 'WORKSPACE_LIMIT_REACHED' } });
  });
});
