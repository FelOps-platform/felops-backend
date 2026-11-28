import { and, asc, count, eq } from 'drizzle-orm';
import { getDb } from '../../config/db.js';
import type { DbExecutor } from '../../config/db.js';
import { agents } from '../../database/agents.js';
import { users } from '../../database/auth.js';
import { workspaces } from '../../database/workspaces.js';

export type WorkspaceRecord = typeof workspaces.$inferSelect;
export type WorkspaceWithAgentCount = WorkspaceRecord & { agentsCount: number };

const workspaceWithAgentCountSelect = {
  id: workspaces.id,
  name: workspaces.name,
  ownerId: workspaces.ownerId,
  createdAt: workspaces.createdAt,
  agentsCount: count(agents.id),
};

export async function listWorkspacesByOwner(
  ownerId: number,
  tx: DbExecutor = getDb(),
): Promise<WorkspaceWithAgentCount[]> {
  const rows = await tx
    .select(workspaceWithAgentCountSelect)
    .from(workspaces)
    .leftJoin(agents, eq(agents.workspaceId, workspaces.id))
    .where(eq(workspaces.ownerId, ownerId))
    .groupBy(workspaces.id)
    .orderBy(asc(workspaces.createdAt), asc(workspaces.id));

  return rows.map(toWorkspaceRecord);
}

export async function findOwnedWorkspaceById(
  input: { workspaceId: number; ownerId: number },
  tx: DbExecutor = getDb(),
): Promise<WorkspaceWithAgentCount | null> {
  const [row] = await tx
    .select(workspaceWithAgentCountSelect)
    .from(workspaces)
    .leftJoin(agents, eq(agents.workspaceId, workspaces.id))
    .where(and(eq(workspaces.id, input.workspaceId), eq(workspaces.ownerId, input.ownerId)))
    .groupBy(workspaces.id)
    .limit(1);

  return row ? toWorkspaceRecord(row) : null;
}

export async function lockWorkspaceOwner(
  ownerId: number,
  tx: DbExecutor = getDb(),
): Promise<boolean> {
  const rows = await tx
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, ownerId))
    .for('update');
  return rows.length > 0;
}

export async function countOwnedWorkspaces(
  ownerId: number,
  tx: DbExecutor = getDb(),
): Promise<number> {
  const [row] = await tx
    .select({ total: count(workspaces.id) })
    .from(workspaces)
    .where(eq(workspaces.ownerId, ownerId));
  return Number(row?.total ?? 0);
}

export async function insertWorkspace(
  input: { ownerId: number; name: string },
  tx: DbExecutor = getDb(),
): Promise<WorkspaceWithAgentCount> {
  const [row] = await tx
    .insert(workspaces)
    .values({ ownerId: input.ownerId, name: input.name })
    .returning();

  return { ...row, agentsCount: 0 };
}

function toWorkspaceRecord(
  row: WorkspaceRecord & { agentsCount: number | string },
): WorkspaceWithAgentCount {
  return { ...row, agentsCount: Number(row.agentsCount) };
}
