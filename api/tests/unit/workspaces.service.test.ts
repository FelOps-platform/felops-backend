import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createUser } from '@/modules/auth/auth.repository.js';
import {
  MAX_OWNED_WORKSPACES,
  createWorkspace,
  getWorkspace,
  listWorkspaces,
} from '@/modules/workspaces/workspaces.service.js';
import { createTestRuntime } from '../helpers/test-runtime.js';
import type { TestRuntime } from '../helpers/test-runtime.js';

describe('workspaces.service (PGlite PostgreSQL)', () => {
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

  it('lists, creates, and isolates workspaces by owner', async () => {
    const user1 = await createUser({ name: 'Hana', email: 'hana@acm.com', passwordHash: 'hash' });
    const user2 = await createUser({ name: 'Omar', email: 'omar@acm.com', passwordHash: 'hash' });

    expect(await listWorkspaces(user1.id)).toEqual([]);

    const created = await createWorkspace({ userId: user1.id, name: '  Acme Studio  ' });
    expect(created).toMatchObject({
      name: 'Acme Studio',
      role: 'owner',
      agentsCount: 0,
    });

    expect(await listWorkspaces(user1.id)).toHaveLength(1);
    expect(await listWorkspaces(user2.id)).toEqual([]);

    expect(await getWorkspace({ userId: user1.id, workspaceId: created.id })).toEqual(created);
    await expect(getWorkspace({ userId: user2.id, workspaceId: created.id })).rejects.toMatchObject(
      {
        statusCode: 404,
        code: 'NOT_FOUND',
        details: [{ resource: 'workspace' }],
      },
    );
  });

  it('caps owned workspaces at 10 per user', async () => {
    const user = await createUser({ name: 'Hana', email: 'hana@acm.com', passwordHash: 'hash' });

    for (let i = 1; i <= MAX_OWNED_WORKSPACES; i++) {
      await createWorkspace({ userId: user.id, name: `Workspace ${i}` });
    }

    await expect(createWorkspace({ userId: user.id, name: 'Workspace 11' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'WORKSPACE_LIMIT_REACHED',
    });
    expect(await listWorkspaces(user.id)).toHaveLength(MAX_OWNED_WORKSPACES);
  });
});
